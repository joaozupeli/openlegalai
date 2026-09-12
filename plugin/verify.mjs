#!/usr/bin/env node
/**
 * Plugin-side acceptance run.
 *
 * This is a client, not a server: it spawns the gateway exactly the way Claude
 * Desktop or Cursor will and then tries to break the boundary from the outside.
 * Everything it asserts is a property the plugin must not be able to violate —
 * which is why the negative cases matter more than the happy path. A connector
 * that only proves `enter_office` works has proven nothing about the cofre.
 */
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const here = dirname(fileURLToPath(import.meta.url));
const GATEWAY = resolve(here, '../privacy-gateway');
const CASE_ID = 'case-banco-001';

const CANARIES = [
  'Joao da Silva',
  'João da Silva',
  '123.456.789-00',
  '12345-6',
  'R$ 482.391,00',
  '0001234-56.2026.8.16.0001',
];

const isWindows = process.platform === 'win32';

function launcher() {
  return isWindows
    ? { command: 'cmd', args: ['/c', join(GATEWAY, 'scripts', 'run-mcp.cmd')] }
    : { command: join(GATEWAY, 'scripts', 'run-mcp.sh'), args: [] };
}

async function connect(userId, role) {
  const { command, args } = launcher();
  const transport = new StdioClientTransport({
    command,
    args,
    env: { ...process.env, OFFICE_USER_ID: userId, OFFICE_ROLE: role },
  });
  const client = new Client({ name: 'openlegal-plugin-verify', version: '0.1.0' });
  await client.connect(transport);
  return client;
}

const results = [];
function check(name, passed, detail = '') {
  results.push({ name, passed, detail });
  const mark = passed ? 'PASSOU' : 'FALHOU';
  console.log(`${mark}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
  const advogado = await connect('adv-ana', 'advogado');

  const { tools } = await advogado.listTools();
  const names = tools.map((t) => t.name).sort();
  check(
    'tools/list expoe apenas a allowlist',
    names.length === 4 &&
      ['ask_office', 'enter_office', 'get_safe_summary', 'leave_office'].every(
        (n) => names.includes(n),
      ),
    names.join(', '),
  );

  // Identity must have no slot on the wire at all. If a schema accepted `role`,
  // a well-behaved client could send it in good faith and the boundary would
  // depend on the server catching it every single time.
  const principalKeys = tools.flatMap((t) =>
    Object.keys(t.inputSchema?.properties ?? {}).filter((k) =>
      ['user', 'userId', 'role', 'principal'].includes(k),
    ),
  );
  check(
    'nenhum schema aceita identidade como argumento',
    principalKeys.length === 0,
    principalKeys.length ? principalKeys.join(', ') : 'nenhum',
  );

  const entered = await advogado.callTool({
    name: 'enter_office',
    arguments: { caseId: CASE_ID },
  });
  const sessionId = entered.structuredContent?.sessionId ?? '';
  check('enter_office devolve sessao opaca', sessionId.startsWith('ofs_'), sessionId);

  const summary = await advogado.callTool({
    name: 'get_safe_summary',
    arguments: { sessionId },
  });
  const wire = JSON.stringify(summary);
  const leaked = CANARIES.filter((c) => wire.includes(c));
  check(
    'get_safe_summary nao carrega nome, CPF, conta, valor ou numero do processo',
    leaked.length === 0,
    leaked.length ? `VAZOU: ${leaked.join(', ')}` : `${wire.length} chars limpos`,
  );

  const extraKeys = Object.keys(summary.structuredContent ?? {}).filter(
    (k) =>
      ![
        'schemaVersion',
        'sessionId',
        'releaseId',
        'summary',
        'decisions',
        'tasks',
        'safeReferences',
        'warnings',
      ].includes(k),
  );
  check(
    'SafeDTO nao traz campo fora do contrato',
    extraKeys.length === 0,
    extraKeys.length ? extraKeys.join(', ') : 'so os 8 campos',
  );

  const smuggled = await advogado.callTool({
    name: 'get_safe_summary',
    arguments: { sessionId, role: 'socio' },
  });
  check('role nos arguments e recusado', smuggled.isError === true);

  let sqlDenied = false;
  try {
    const sql = await advogado.callTool({
      name: 'execute_sql',
      arguments: { query: 'select * from clientes' },
    });
    sqlDenied = sql.isError === true;
  } catch {
    sqlDenied = true;
  }
  check('execute_sql e recusado', sqlDenied);

  await advogado.close();

  // Two processes, two identities: the session is bound to the connection that
  // opened it, so a leaked session id is not a usable credential.
  const estagiario = await connect('est-lia', 'estagiario');
  const internEntry = await estagiario.callTool({
    name: 'enter_office',
    arguments: { caseId: CASE_ID },
  });
  const internSession = internEntry.structuredContent?.sessionId ?? '';
  await estagiario.close();

  const socio = await connect('socio-paulo', 'socio');
  const stolen = await socio.callTool({
    name: 'get_safe_summary',
    arguments: { sessionId: internSession },
  });
  check(
    'sessao de estagiario nao e reutilizavel por socio',
    stolen.isError === true,
    internSession,
  );
  await socio.close();

  const failed = results.filter((r) => !r.passed);
  console.log(
    `\n${results.length - failed.length}/${results.length} verificacoes passaram.`,
  );
  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
