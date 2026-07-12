# grok-build-plugin: Grok Build for any coding agent

Bring **Grok Build's live X (Twitter) + web search** — and its coding agent — into the tools you already use. A thin, auditable wrapper around your local `grok` CLI, consumable two ways:

- **`grok_search` MCP tool** — real-time X/web search with sources, for **any MCP-capable agent** (Claude Code, Codex, Cursor, Gemini CLI, ...).
- **Claude Code / Grok plugin** — slash commands (`/grok:search`, `/grok:review`, `/grok:rescue`, ...) plus a delegation subagent, with the MCP tool auto-wired in.

## Built with

[**AgentKit**](https://agentkit.best/?ref=RCRJ2I8M) helps maintain and update this plugin. If you find the plugin useful, check it out *(referral link — supports this project)*.

## Requirements

- [Grok Build CLI](https://docs.x.ai) on your `PATH` as `grok` (or set `GROK_BIN`), signed in via `grok login`. Usage counts toward your Grok limits.
- Node.js 18.18+

## Quick start

### Claude Code (full plugin)

```
/plugin marketplace add nightwalker89/grok-build-plugin
/plugin install grok@grok-build-plugin
/grok:setup     # verifies grok is installed and signed in
```

### Any other MCP agent (search tool only)

```jsonc
{
  "mcpServers": {
    "grok": { "command": "npx", "args": ["-y", "grok-build-x-search-mcp"] }
  }
}
```

| Agent | Setup |
| --- | --- |
| OpenAI Codex | `codex mcp add grok -- npx -y grok-build-x-search-mcp` |
| Gemini CLI | JSON block above in `~/.gemini/settings.json` |
| Antigravity (`agy`) | JSON block above in `~/.gemini/config/mcp_config.json` |
| Cursor | JSON block above in `~/.cursor/mcp.json` |
| Claude Code / Grok | auto-wired by the plugin |

Then just ask your agent to "search X for ..." — it calls `grok_search(query)` and gets a synthesized answer with sources (including `x.com` links). Read-only; uses your local `grok` login.

## Commands

| Command | What it does |
| --- | --- |
| `/grok:search <query>` | Live X + web search with sources. Read-only. |
| `/grok:review [--base <ref>]` | Read-only Grok review of uncommitted changes (or branch vs `--base`). Trailing text = reviewer focus. |
| `/grok:rescue <task>` | Delegate a coding/investigation task to Grok. Write-capable by default. |
| `/grok:status` / `/grok:result` / `/grok:cancel` | Manage background jobs (`--job <id>` targets a specific one). |
| `/grok:setup` | Check install + auth. |

Useful flags:

- `--background` on search/review/rescue runs the job detached; check it with `/grok:status`.
- `/grok:rescue` accepts `--read-only`, `--resume-last` / `--fresh`, `--model <id>`, `--effort <low|medium|high>`.
- You can also just ask in natural language ("Ask Grok to redesign the retry logic") — Claude routes it to the `grok:grok-rescue` subagent.

## How it works

The plugin shells out to the `grok` CLI's headless mode (`grok -p "<prompt>" --output-format json`). No separate server or daemon:

- Same Grok install, login, and session store you use directly — `/grok:result` prints the session id, so you can continue any run in the Grok TUI with `grok -r <id>`.
- Read-only runs (search, review, `--read-only` rescue) deny the write/shell tools (`run_terminal_cmd`, `search_replace`), so Grok cannot modify your repo during them.
- Background jobs run detached, logging to `~/.grok/cc-plugin/jobs/`.

| Env var | Purpose |
| --- | --- |
| `GROK_BIN` | Path to the `grok` binary if it isn't `grok` on `PATH`. |
| `GROK_CC_STATE_DIR` | Override the background-job state dir (used by tests). |

<details>
<summary><strong>Why <code>npx grok-build-x-search-mcp</code> for MCP?</strong></summary>

MCP clients resolve plugin paths differently: Claude Code and Grok substitute `${CLAUDE_PLUGIN_ROOT}`, but Codex does not, so a path-based manifest fails there. Launching via npm (`npx -y grok-build-x-search-mcp`, or `npx -y github:nightwalker89/grok-build-plugin` for development) gives every harness a correct absolute path with one manifest.

</details>

<details>
<summary><strong>Install in Grok Build itself</strong></summary>

The plugin follows the shared plugin spec, so it also installs natively into Grok:

```bash
grok plugin validate ./plugins/grok
grok plugin install ./plugins/grok --trust          # local
grok plugin install nightwalker89/grok-build-plugin#plugins/grok --trust
grok plugin list
```

Mainly useful for format parity and multi-harness marketplaces — inside Grok the search/review capabilities are largely native, and the companion runs a nested `grok -p`.

</details>

## Development

```bash
npm test    # runtime unit tests + MCP server smoke tests (no Grok account needed)
```

Runtime lives in `plugins/grok/scripts/`: `grok-mcp.mjs` (MCP server, published to npm as `grok-build-x-search-mcp`), `grok-companion.mjs` (CLI behind the slash commands), and shared helpers in `lib/`. See [CONTRIBUTING.md](./CONTRIBUTING.md).

## FAQ

**Do I need a separate Grok account?** No — it uses your local `grok` CLI auth.

**Is the review really read-only?** Yes. Search and review runs deny Grok the file-edit and shell tools. `/grok:rescue` is write-capable unless you pass `--read-only`.

## Credits & License

Apache-2.0 ([LICENSE](./LICENSE)). Independent implementation; plugin layout inspired by [openai/codex-plugin-cc](https://github.com/openai/codex-plugin-cc) (Apache-2.0, no code copied — see [NOTICE](./NOTICE)).

> **Unofficial / community project.** Not affiliated with or endorsed by xAI, Anthropic, OpenAI, Google, or any other vendor; trademarks are used only to describe interoperability. You are responsible for complying with xAI and X terms when using your Grok CLI through this tool.
