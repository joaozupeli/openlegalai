#!/usr/bin/env node
/**
 * Emits the MCP client config for this machine.
 *
 * The absolute path is the step people get wrong by hand, and a wrong path fails
 * as a silent "server disconnected" with no hint of which half broke. Generating
 * it removes that failure mode.
 *
 * Usage: node make-config.mjs [adv-ana:advogado] [est-lia:estagiario] ...
 */
import { writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const GATEWAY = resolve(here, '../privacy-gateway');
const ROLES = new Set(['socio', 'advogado', 'estagiario']);

const requested = process.argv.slice(2);
const principals = (requested.length ? requested : ['adv-ana:advogado']).map(
  (pair) => {
    const [id, role] = pair.split(':');
    if (!id || !ROLES.has(role)) {
      throw new Error(`principal invalido: "${pair}" (use id:socio|advogado|estagiario)`);
    }
    return { id, role };
  },
);

const isWindows = process.platform === 'win32';
const launcher = isWindows
  ? { command: 'cmd', args: ['/c', join(GATEWAY, 'scripts', 'run-mcp.cmd')] }
  : { command: join(GATEWAY, 'scripts', 'run-mcp.sh'), args: [] };

// One server entry per principal, never one entry reused. Identity lives in the
// process environment, so two roles sharing a process would be two people
// sharing one credential.
const mcpServers = {};
for (const { id, role } of principals) {
  const name =
    principals.length === 1 ? 'openlegalai-office' : `openlegalai-office-${role}`;
  mcpServers[name] = {
    command: launcher.command,
    ...(launcher.args.length ? { args: launcher.args } : {}),
    env: { OFFICE_USER_ID: id, OFFICE_ROLE: role },
  };
}

const config = { mcpServers };
const json = `${JSON.stringify(config, null, 2)}\n`;

writeFileSync(join(here, 'mcp.generated.json'), json);
console.log(json);
console.log(`Escrito em ${join(here, 'mcp.generated.json')}`);
console.log(
  'Claude Desktop: claude_desktop_config.json | Cursor: .cursor/mcp.json — mesma forma.',
);
