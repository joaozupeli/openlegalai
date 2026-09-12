@echo off
rem Windows twin of run-mcp.sh. Same contract: stdio in, stdio out, nothing else.
rem `@echo off` matters more than it looks — a single stray line on stdout is not
rem a log line to an MCP client, it is a malformed frame, and the session dies
rem before enter_office is ever called.
setlocal
cd /d "%~dp0.."
npx tsx src/mcp/stdio-server.ts
