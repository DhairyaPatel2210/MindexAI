# CodeAtlas

**CodeAtlas** generates a rich, human-readable semantic index of your codebase using an LLM of your choice. The index describes every file, every public symbol, and how they relate to each other — in plain English — so that AI coding assistants (Cursor, GitHub Copilot, Cline, Aider, etc.) get accurate, grounded context about your project.

---

## Features

- **Semantic indexing** — LLM-generated descriptions of every file and symbol, not just syntax trees
- **Multi-provider** — OpenAI, Google Gemini, Anthropic Claude, Ollama, any OpenAI-compatible remote server, or a local GGUF model via llama.cpp
- **Incremental updates** — Only re-analyzes files that have changed since the last run; unchanged files come from a content-hash cache
- **Branch-aware** — Maintains separate indexes per git branch; switching branches auto-triggers the right index
- **Activity Bar panel** — Sidebar panel for one-click analysis, configuration, and stats — no need to remember command names
- **Auto-update** — Optionally watches for file saves and branch switches and updates the index automatically
- **Java support** — Full symbol extraction and import resolution for Java projects
- **Token usage statistics** — Cumulative totals and per-run averages, broken down by provider
- **Local model support** — Built-in management of a `llama-server` (llama.cpp) subprocess

---

## Installation

1. Install from the VS Code Extension Marketplace (search **CodeAtlas**), or download the `.vsix` and install with:
   ```
   code --install-extension codeatlas-*.vsix
   ```
2. Click the circuit-board icon in the Activity Bar to open the CodeAtlas panel.
3. Click **Configure** and enter your LLM provider credentials.
4. Click **Run Full Analysis**.

---

## Getting Started

### Step 1 — Open the Activity Bar

Click the **⚡ circuit-board icon** in the left Activity Bar. The panel shows:

| Item | Description |
|------|-------------|
| ▶ Run Full Analysis | Analyze the entire workspace |
| ↻ Update Index | Incremental update (changed files only) |
| ⎋ Analyze Current File | Analyze just the active editor tab |
| 📖 View Semantic Index | Open CONTEXT.md in Markdown preview |
| ⚙ Configure | Open the LLM setup panel |
| 📊 Statistics | Usage stats and token counters |

### Step 2 — Configure an LLM Provider

Click **⚙ Configure** (or run `CodeAtlas: Configure LLM Provider` from the Command Palette). The panel has cards for each provider:

#### OpenAI
```
Provider: openai
Model:    gpt-4o (recommended) | gpt-4o-mini | gpt-4-turbo | gpt-3.5-turbo
Key:      sk-...  → platform.openai.com/api-keys
```

#### Google Gemini
```
Provider: gemini
Model:    gemini-2.5-flash (recommended) | gemini-2.5-flash-lite
Key:      AIza...  → aistudio.google.com/app/apikey
```

#### Anthropic Claude
```
Provider: claude
Model:    claude-opus-4-6 | claude-sonnet-4-6 | claude-haiku-4-5-20251001
Key:      sk-ant-...  → console.anthropic.com/settings/keys
```

#### Ollama (local)
```
Provider:  local (Ollama tab)
Base URL:  http://localhost:11434/v1  (default)
Model:     mistral | llama3 | codellama | etc.
API type:  Ollama
```
Requires Ollama running: `ollama serve` and `ollama pull <model>`.

#### OpenAI-Compatible Remote
```
Provider:  openai-compat
Base URL:  http://192.168.1.10:8000/v1
Model:     mistral-7b-instruct  (or whatever the server exposes)
```
Works with vLLM, LiteLLM, Together AI, Anyscale, text-generation-inference, and any server that implements `/v1/chat/completions`.

### Step 3 — Select Files to Analyze

**Option A — `.include.codeatlas` file** (recommended for large projects):

Create a `.include.codeatlas` file in your workspace root listing the files or directories you want indexed. One path per line, relative to the workspace root:

```
src/
lib/
tests/
README.md
```

Lines starting with `#` are comments. Blank lines are ignored.

**Option B — Extension patterns** (default):

Without a `.include.codeatlas` file, CodeAtlas scans the workspace for files matching the `includedExtensions` setting (default: `.ts .tsx .js .jsx .py .go .rs .java .cpp .c .cs .rb .php .swift .kt .scala`).

### Step 4 — Run the Analysis

Click **▶ Run Full Analysis** in the Activity Bar, or press `Ctrl+Shift+P` → **CodeAtlas: Run Full Analysis**.

Progress is shown in the VS Code notification area. When complete, you'll see a summary:

```
CodeAtlas: Analysis complete in 47.3s — 132 files (89 from cache), 1,240 symbols
```

---

## Using the Generated Index

After analysis, CodeAtlas writes these files under `.codeatlas/current/` (always points to the latest indexed branch):

| File | Description |
|------|-------------|
| `CONTEXT.md` | Human-readable overview of the entire codebase |
| `index.json` | Machine-readable semantic index (symbols, files, keywords) |
| `graph.json` | Dependency graph (imports, exports) |
| `context/<file>.md` | Per-file symbol documentation |

### With Cursor

Add this to your `.cursor/rules` or system prompt:
```
Read .codeatlas/current/CONTEXT.md for the codebase structure, then reference
.codeatlas/current/context/<path>.md for detailed information about specific files.
```

### With GitHub Copilot / Cline / Aider

Point the tool at `.codeatlas/current/CONTEXT.md` as additional context, or add the path to your system instructions.

### With the Index Directly

The `index.json` exposes:
- `symbols` — flat map of symbol name → `{ kind, file, line, purpose, behavior, limitations }`
- `files` — per-file map of `{ overview, language, symbols[], dependencies[], importedBy[] }`
- `keywords` — inverted keyword → symbol references for lightweight semantic search

---

## Incremental Updates

After the initial full analysis, most subsequent runs are much faster because CodeAtlas:

1. Detects which files changed since the last indexed commit (`git diff`)
2. Looks up unchanged files from a shared **content-hash cache**
3. Only sends changed files to the LLM

Run incremental updates with:
- Activity Bar: **↻ Update Index**
- Command: `CodeAtlas: Update Index (Incremental)`
- Auto-update: enable in Settings to trigger on every file save

---

## Configuration Reference

All settings are under `codeatlas.*` in VS Code Settings.

| Setting | Default | Description |
|---------|---------|-------------|
| `llmProvider` | `openai` | Active provider: `openai`, `gemini`, `claude`, `local`, `openai-compat` |
| `openaiModel` | `gpt-4o` | OpenAI model name |
| `geminiModel` | `gemini-2.5-flash` | Gemini model name |
| `claudeModel` | `claude-opus-4-6` | Claude model name |
| `localBaseUrl` | `http://localhost:8080/v1` | Local server base URL |
| `localModel` | `""` | Local model name |
| `localApiType` | `openai-compat` | `openai-compat` or `ollama` |
| `localContextSize` | `4096` | Token context window for local model |
| `openaiCompatBaseUrl` | `""` | Remote OpenAI-compatible server URL |
| `openaiCompatModel` | `""` | Remote model name |
| `requestsPerMinute` | `12` | Rate limit (requests per minute) |
| `concurrentRequests` | `1` | Parallel LLM requests (1–20) |
| `maxFileSizeKB` | `200` | Files larger than this (×5 KB) are chunked |
| `includedExtensions` | (many) | File extensions to analyze |
| `excludePatterns` | `[]` | Glob patterns to exclude |
| `autoUpdate` | `false` | Watch files and auto-update index |

---

## Supported Languages

CodeAtlas extracts symbols and resolves imports for these languages:

| Language | Extensions | Symbol Types |
|----------|-----------|--------------|
| TypeScript | `.ts`, `.tsx` | function, class, interface, type, enum, const |
| JavaScript | `.js`, `.jsx` | function, class, const |
| Python | `.py` | function, class, method |
| Go | `.go` | function, method, struct, interface |
| Rust | `.rs` | fn, struct, trait, enum |
| **Java** | `.java` | class, interface, enum, annotation, method |
| C/C++ | `.c`, `.cpp`, `.h`, `.hpp` | function, struct |
| C# | `.cs` | class, method |
| Ruby | `.rb` | def, class |
| PHP | `.php` | function, class |
| Swift | `.swift` | func, class, struct |
| Kotlin | `.kt` | fun, class |
| Scala | `.scala` | def, class, object |
| Vue | `.vue` | component |
| Svelte | `.svelte` | component |

---

## Activity Bar Panel

The Activity Bar icon (circuit-board) opens a sidebar with:

**Quick Actions** — Buttons for all common operations. While a workflow runs, a spinning indicator appears with a Cancel button. When complete, the last run's stats appear inline.

**Configuration** — Shows the active provider and whether credentials are configured. Click to open the full setup panel.

**Statistics** — Summarizes total token usage and per-run averages. Full details open in the statistics tab of the setup panel.

---

## Usage Statistics

The **Statistics** tab in the setup panel shows:

```
Provider: openai
Total Tokens:     1,234,567  (890,123 in + 344,444 out)
Avg per run:      12,346 in / 3,444 out
Requests:         234
Files Analyzed:   89  (67 from cache)
Errors:           0
Duration:         12.3 min
```

- **Total Tokens** — cumulative across all workflow runs
- **Avg per run** — total ÷ number of workflow runs
- **Files from cache** — files reused from content-hash cache (no LLM call made)

To reset statistics, click **Reset Stats** at the bottom of the Statistics tab.

---

## Local Model (llama.cpp)

CodeAtlas can manage a `llama-server` (llama.cpp) subprocess directly.

**Requirements:**
- llama-server installed: `brew install llama.cpp` (macOS) or [download from GitHub](https://github.com/ggerganov/llama.cpp/releases)
- A `.gguf` model file (e.g., `mistral-7b-instruct-v0.2.Q4_K_M.gguf`)

**Setup:**
1. Open the setup panel → Local / Open-Source Model
2. Browse to your `.gguf` file
3. Set GPU layers (0 = CPU only, higher = more GPU offload)
4. Click **Start Server**

The server log streams in real-time so you can see when it's ready.

---

## Auto-Update

When `autoUpdate` is enabled, CodeAtlas:

1. Watches for file saves matching your `includedExtensions`
2. Debounces 3 seconds then triggers an incremental update
3. Polls for git branch switches every 5 seconds
4. On branch switch: runs incremental update if an index exists, or prompts for full analysis

---

## CLI Support (Coming Soon)

CodeAtlas is being extended with a CLI for use outside VS Code — in CI/CD pipelines, git hooks, and shell scripts. The planned commands are:

```
codeatlas index         # Generate full index
codeatlas update        # Incremental update after commits
codeatlas status        # Show current index state
codeatlas stats         # Show token usage statistics
codeatlas config        # Configure the tool interactively
```

The core analysis engine is already factored out from VSCode-specific code, making this straightforward to implement.

---

## FAQ

**Q: How much does it cost per analysis?**
A: Depends on your codebase size and model. A 100-file TypeScript project with GPT-4o-mini typically costs under $0.10. The content-hash cache means subsequent runs cost much less — only changed files are re-analyzed.

**Q: Where is the index stored?**
A: Under `.codeatlas/` in your workspace root. The stable path for AI tools is `.codeatlas/current/`. Add `.codeatlas/` to `.gitignore` to avoid committing it.

**Q: Can I use it with a private/air-gapped server?**
A: Yes. Use the **OpenAI-Compatible Remote** provider and point it at your server. The OpenAI-compatible endpoint (`/v1/chat/completions`) is supported by vLLM, LiteLLM, Ollama, text-generation-inference, and many others.

**Q: Is my code sent to the cloud?**
A: Code is sent to whichever LLM provider you configure. Use a local provider (Ollama, llama-server) to keep everything on-device. API keys are stored in VS Code's system keychain, never on disk.

**Q: What if analysis fails for some files?**
A: Errors are collected per-file and reported in the completion message. Successfully analyzed files are indexed normally. Re-running an incremental update will retry failed files.

**Q: Does it work with monorepos?**
A: Yes. Use `.include.codeatlas` to limit analysis to a specific sub-package. You can maintain separate indexes by running from different workspace folders.

---

## Contributing

1. Clone the repo and open in VS Code
2. `npm install`
3. Press `F5` to launch the extension in a new Extension Development Host window
4. Run tests: `npm test`

Issues and pull requests welcome at [github.com/codeatlas/codeatlas](https://github.com/codeatlas/codeatlas).
