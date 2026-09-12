# Plugin MCP — como o advogado entra no escritorio

O plugin e a ficha; `privacy-gateway/` e o cofre. Aqui nao ha politica, PII,
SafeDTO nem RBAC: so transporte e identidade de conexao.

## Ligar

```bash
cd privacy-gateway && npm install
cd ../plugin && npm install && npm run config
```

`npm run config` escreve `mcp.generated.json` com o caminho absoluto desta
maquina — nao vai para o repo. A forma esta em `mcp.example.json`. Cola o
conteudo em `claude_desktop_config.json` (Claude Desktop) ou `.cursor/mcp.json`
(Cursor) e reinicia o cliente. O advogado "entra" chamando `enter_office` com
`caseId: case-banco-001`.

## Trocar de papel

Identidade vem do processo, nunca dos argumentos da tool. Um processo por
pessoa:

```bash
npm run config -- adv-ana:advogado est-lia:estagiario socio-paulo:socio
```

Isso gera uma entrada de servidor por papel. Nao partilhes um processo entre
socio e estagiario: seria a mesma credencial usada por duas pessoas.

## Provar

`enter_office` verde nao prova nada. O que prova e o que a fronteira **recusa**.

```bash
npm run verify          # no plugin: 8 verificacoes, sobe pelo launcher real
npm run evidence        # na raiz do repo: gateway intacto
```

As quatro provas exigidas:

| # | Prova | Resultado |
|---|---|---|
| 1 | `role` / `user` nos arguments | **erro** — e nenhum schema sequer declara o campo |
| 2 | `execute_sql` | **erro** — fora da allowlist |
| 3 | JSON de `get_safe_summary` | sem `Joao da Silva`, CPF, conta, valor ou numero do processo |
| 4 | `npm run evidence` + `mcp:smoke` | **28 testes**, exit 0 — gateway nao foi tocado |

Saida de `npm run verify`:

```
PASSOU  tools/list expoe apenas a allowlist — ask_office, enter_office, get_safe_summary, leave_office
PASSOU  nenhum schema aceita identidade como argumento — nenhum
PASSOU  enter_office devolve sessao opaca — ofs_d87680ce512a
PASSOU  get_safe_summary nao carrega nome, CPF, conta, valor ou numero do processo — 2310 chars limpos
PASSOU  SafeDTO nao traz campo fora do contrato — so os 8 campos
PASSOU  role nos arguments e recusado
PASSOU  execute_sql e recusado
PASSOU  sessao de estagiario nao e reutilizavel por socio — ofs_e7cf9bc5e944

8/8 verificacoes passaram.
```

A ultima e a que costuma faltar: um `sessionId` que vazou nao e credencial. A
sessao esta presa a conexao que a abriu, entao um processo de socio nao consegue
usar a sessao aberta por um estagiario.

## Limites, ditos por extenso

- **stdio esta comprovado.** Hosting e OAuth de producao sao o proximo passo, nao
  estao feitos.
- O launcher `.cmd` e o par Windows do `run-mcp.sh`; nenhum dos dois faz mais do
  que trocar de diretorio e executar o servidor.
- **Nao ha claim de conformidade LGPD aqui.** O que existe e um conjunto de
  controlos tecnicos; o juizo juridico e do DPO.
