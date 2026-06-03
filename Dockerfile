# Dockerfile for the grok_search MCP server.
#
# Used by registries (e.g. Glama) to start the server and run an MCP
# introspection check. The server speaks MCP over stdio and answers
# `initialize` / `tools/list` without needing the `grok` CLI to be present
# (the local `grok` binary is only invoked on an actual `tools/call`), so the
# container starts and responds to introspection out of the box.
#
# The server is dependency-free, so there is nothing to `npm install`.
FROM node:20-slim

WORKDIR /app

# Only what the server needs at runtime (mirrors package.json "files").
COPY package.json ./
COPY NOTICE ./
COPY plugins/grok/scripts/grok-mcp.mjs ./plugins/grok/scripts/grok-mcp.mjs
COPY plugins/grok/scripts/lib/ ./plugins/grok/scripts/lib/

# MCP over stdio.
ENTRYPOINT ["node", "plugins/grok/scripts/grok-mcp.mjs"]
