# Plugin MCP — como o advogado entra no escritorio

O plugin e a ficha; `privacy-gateway/` e o cofre. Aqui nao ha politica, PII,
SafeDTO nem RBAC: so transporte e identidade de conexao.

## Ligar

```bash
cd privacy-gateway && npm install
cd ../plugin && npm install && npm run config
```

`npm run config` escreve `mcp.generated.json` com o caminho absoluto desta
maquina. Cola o conteudo em `claude_desktop_config.json` (Claude Desktop) ou
`.cursor/mcp.json` (Cursor) e reinicia o cliente. O advogado "entra" chamando
`enter_office` com `caseId: case-banco-001`.

## Trocar de papel

Identidade vem do processo, nunca dos argumentos da tool. Um processo por
pessoa:

```bash
npm run config -- adv-ana:advogado est-lia:estagiario socio-paulo:socio
```

Isso gera uma entrada de servidor por papel. Nao partilhes um processo entre
socio e estagiario: seria a mesma credencial usada por duas pessoas.

## Provar

```bash
npm run verify
```

Sobe o gateway pelo mesmo launcher que o Claude Desktop usa e tenta furar a
fronteira de fora: identidade nos argumentos, `execute_sql`, reutilizacao de
sessao alheia. Oito verificacoes, todas tem de passar.

## Limites, ditos por extenso

- **stdio esta comprovado.** Hosting e OAuth de producao sao o proximo passo, nao
  estao feitos.
- O launcher `.cmd` e o par Windows do `run-mcp.sh`; nenhum dos dois faz mais do
  que trocar de diretorio e executar o servidor.
- **Nao ha claim de conformidade LGPD aqui.** O que existe e um conjunto de
  controlos tecnicos; o juizo juridico e do DPO.
