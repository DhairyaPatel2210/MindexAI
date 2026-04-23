# MindexAI

**Your AI knows how to code. It doesn't know your codebase. MindexAI fixes that.**

MindexAI is a VS Code extension that reads your entire project and generates a plain-English map of every file, every function, and every relationship between them. Attach that map to any AI coding tool and it immediately understands your project — producing suggestions that actually fit, not generic code that breaks everything else.

No technical background required to use it. No code leaves your machine if you choose a local model.

---

## The Problem It Solves

AI assistants like Cursor, Copilot, and Cline are powerful — but they only know what you show them in the moment. Without context, they guess. They invent function names that don't exist. They suggest patterns that conflict with your architecture. They write code that compiles but silently breaks other parts of your app.

**MindexAI gives your AI a complete map of your project before it writes a single word.**

The result: suggestions that follow your patterns, use your real function names, and fit seamlessly into what you've already built.

---

## Who Is This For

| If you are… | MindexAI helps you… |
|-------------|---------------------|
| **A software engineer** | Get AI suggestions grounded in your actual codebase — not generic boilerplate |
| **New to a codebase** | Understand what the entire project does in minutes, not weeks |
| **A product manager or founder building with AI** | Write features with AI that don't break what already works |
| **Vibe coding** | Move fast without the AI making up APIs or patterns that don't exist in your app |
| **Non-technical and trying to understand a project** | Read a plain-English description of the entire codebase — no coding knowledge needed |

---

## Features

- **Plain-English codebase index** — Every file and function described in natural language your AI can reason about
- **Works with every major AI tool** — Cursor, GitHub Copilot, Cline, Aider, Claude Code, ChatGPT, and more
- **Any AI provider** — OpenAI, Google Gemini, Anthropic Claude, Ollama, llama.cpp, or any OpenAI-compatible server
- **Completely private option** — Use Ollama or a local model and your code never leaves your machine
- **Branch-aware indexing** — Maintains a separate index per git branch; switching branches loads the right one automatically
- **Incremental updates** — Only re-analyzes files that changed; unchanged files load instantly from cache
- **Auto-update mode** — Keeps the index current as you save files and switch branches — no manual reruns
- **One-click sidebar panel** — Everything in the Activity Bar; no commands to memorize
- **15+ languages supported** — TypeScript, JavaScript, Python, Go, Rust, Java, C/C++, C#, Swift, Kotlin, and more
- **Token usage tracking** — See exactly how many tokens each run costs, down to per-provider averages

---

## What Gets Generated

After running MindexAI, a `.mindexai/current/` folder appears in your project with:

| File | What it contains |
|------|-----------------|
| `CONTEXT.md` | A human-readable map of the entire codebase — great for onboarding, AI context, and documentation |
| `index.json` | A structured lookup of every function, class, and interface with plain-English descriptions |
| `graph.json` | A file dependency map showing what imports what across the project |
| `context/<file>.md` | A detailed plain-English description for each individual source file |

> **Non-technical users:** Open `CONTEXT.md` in any Markdown viewer for an instant plain-English tour of the entire codebase.

---

## How It Works with AI Tools

### Cursor

Add this to your `.cursor/rules` file (or project system prompt):

```
Before responding to any task, read .mindexai/current/CONTEXT.md to understand
the project structure. For detailed information on a specific file, reference
.mindexai/current/context/<path>.md.
```

Cursor will now consult your codebase map before every suggestion — no more invented APIs, no more patterns that clash with your existing code.

---

### GitHub Copilot

Open `.mindexai/current/CONTEXT.md` in an editor tab while you code.

Copilot treats open editor tabs as additional context for its suggestions. Keeping this file open is enough — Copilot reads it passively and produces suggestions that align with your project's actual structure.

---

### Cline

In Cline's system prompt settings, add:

```
At the start of every task, read .mindexai/current/CONTEXT.md to understand
the codebase. Never assume a function or file exists without checking the index.
```

Cline becomes significantly more accurate for multi-step tasks — it knows your project's shape before it starts planning.

---

### Aider

Pass the context file as read-only background knowledge when starting a session:

```bash
aider --read .mindexai/current/CONTEXT.md
```

Aider will use the index as a reference for every change it proposes, keeping edits consistent with the rest of the codebase.

---

### Claude Code

Add the context file when starting a session or include it in your project instructions:

```bash
claude --context .mindexai/current/CONTEXT.md
```

Or reference specific file context inline as you work:
```
Read .mindexai/current/context/src/api/routes.md before editing the routes file.
```

---

### ChatGPT, Claude.ai, or Any Chat Interface

Copy the contents of `.mindexai/current/CONTEXT.md` into your chat, or upload it as a file attachment. The AI will have a complete picture of your project for the entire conversation.

---

## Getting Started

### 1 — Install

**From the VS Code Marketplace:**
Open Extensions (`Ctrl+Shift+X`), search **MindexAI**, click Install.

**From a downloaded `.vsix` file:**
```bash
code --install-extension mindexai-*.vsix
```

Once installed, the **MindexAI icon** appears in the left Activity Bar.

---

### 2 — Connect an AI Provider

Click the MindexAI icon in the Activity Bar, then click the **gear icon (Configure)**.

Choose your provider and enter your credentials. Not sure which to pick?

| Provider | Cost | Privacy | Recommended for |
|----------|------|---------|-----------------|
| **Google Gemini** | Free tier available | Cloud | Best starting point — generous free tier |
| **OpenAI GPT-4o** | Pay-per-use | Cloud | Best quality for large projects |
| **Anthropic Claude** | Pay-per-use | Cloud | Excellent for nuanced codebases |
| **Ollama (local)** | Free | **100% local** | Privacy-sensitive projects |
| **OpenAI-Compatible** | Varies | Your server | Private infrastructure |

See [Provider Setup](#provider-setup) below for detailed instructions.

---

### 3 — Choose What to Analyze

**Default — analyze everything**
MindexAI automatically finds all source files by extension. No configuration needed.

**Recommended for large projects — pin specific folders**
Create a `.include.mindexai` file in your project root:

```
src/
lib/
tests/
README.md
```

One path per line. Blank lines and lines starting with `#` are ignored.

> **Quick start:** In the MindexAI panel, click **Configure** → **Create Include File** to generate this file automatically.

---

### 4 — Run the Analysis

Click **▶ Run Full Analysis** in the sidebar panel.

Progress appears in VS Code's notification area. When it finishes:

```
MindexAI: Analysis complete in 47s — 132 files (89 from cache), 1,240 symbols
```

Your index is ready. Point your AI tool at `.mindexai/current/CONTEXT.md` and start building.

---

## Sidebar Panel Reference

| Button | What it does |
|--------|-------------|
| ▶ **Run Full Analysis** | Index the entire workspace |
| ↻ **Update Index** | Re-analyze only files that changed since the last run |
| ⚙ **Configure** | Open provider setup, API keys, and settings |
| 📖 **View Index** | Open `CONTEXT.md` in Markdown preview |
| 📊 **Statistics** | See token usage, files analyzed, and cost breakdown |

While an analysis runs, a spinner appears with a **Cancel** button. Completed run stats are shown inline in the panel.

---

## Keeping the Index Current

### Manual Updates

After making code changes, click **↻ Update Index**. MindexAI checks which files changed and re-analyzes only those — unchanged files load from cache in milliseconds.

### Auto-Update (Optional)

Enable `mindexai.autoUpdate` in VS Code Settings to keep the index current automatically:

- **On file save** — waits 3 seconds after your last save, then updates incrementally
- **On branch switch** — automatically loads or rebuilds the index for the new branch

Auto-update is off by default to avoid unexpected API calls. Enable it once you're comfortable with how MindexAI works.

---

## Provider Setup

### OpenAI

1. Get an API key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. In MindexAI Configure panel → **OpenAI** tab → paste your key

| Model | Quality | Cost |
|-------|---------|------|
| `gpt-4o` | Best | Moderate |
| `gpt-4o-mini` | Very good | Low |
| `gpt-3.5-turbo` | Good | Very low |

---

### Google Gemini

1. Get a free API key at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. In MindexAI Configure panel → **Gemini** tab → paste your key

| Model | Notes |
|-------|-------|
| `gemini-2.5-flash` | Recommended — fast, high quality, 15 RPM free |
| `gemini-2.5-flash-lite` | Fastest, lowest cost |

> MindexAI defaults to 12 requests/minute to stay safely within Gemini's free tier limit of 15.

---

### Anthropic Claude

1. Get an API key at [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
2. In MindexAI Configure panel → **Claude** tab → paste your key

| Model | Notes |
|-------|-------|
| `claude-opus-4-6` | Highest quality |
| `claude-sonnet-4-6` | Balanced speed and quality |
| `claude-haiku-4-5-20251001` | Fastest and most economical |

---

### Ollama (Local — Free & Private)

Run models entirely on your machine. No API key, no cost, nothing sent to the cloud.

**Setup:**
```bash
# Install Ollama from https://ollama.com/download, then:
ollama serve
ollama pull mistral   # or llama3, codellama, phi3, qwen2.5-coder, etc.
```

**In MindexAI Configure panel → Local Model tab:**

| Field | Value |
|-------|-------|
| Base URL | `http://localhost:11434/v1` |
| Model | `mistral` (or whichever you pulled) |
| API Type | `Ollama` |

---

### OpenAI-Compatible Remote Server

Works with vLLM, LiteLLM, Together AI, Anyscale, text-generation-inference, and any server that exposes `/v1/chat/completions`.

**In MindexAI Configure panel → OpenAI-Compatible tab:**

| Field | Value |
|-------|-------|
| Base URL | `http://your-server:8000/v1` |
| Model | Your model name |
| Context Size | Token window of the model |

---

## Configuration Reference

Open VS Code Settings (`Ctrl+,`) and search `mindexai` to see and edit all options.

### Provider

| Setting | Default | What it controls |
|---------|---------|-----------------|
| `mindexai.llmProvider` | `openai` | Which provider to use: `openai` · `gemini` · `claude` · `local` · `openai-compat` |
| `mindexai.openaiModel` | `gpt-4o` | OpenAI model name |
| `mindexai.geminiModel` | `gemini-2.5-flash` | Gemini model name |
| `mindexai.claudeModel` | `claude-opus-4-6` | Claude model name |
| `mindexai.localBaseUrl` | `http://localhost:11434/v1` | URL of your local inference server |
| `mindexai.localModel` | `""` | Model name for local server (e.g. `mistral`) |
| `mindexai.localApiType` | `openai-compat` | `openai-compat` or `ollama` |
| `mindexai.localContextSize` | `4096` | Token context window of your local model |
| `mindexai.openaiCompatBaseUrl` | `""` | Base URL of your remote OpenAI-compatible server |
| `mindexai.openaiCompatModel` | `""` | Model name on the remote server |
| `mindexai.openaiCompatContextSize` | `8192` | Token context window of the remote model |

### Speed & Cost

| Setting | Default | What it controls |
|---------|---------|-----------------|
| `mindexai.requestsPerMinute` | `12` | Max API calls per minute. Increase on paid tiers for faster indexing. |
| `mindexai.concurrentRequests` | `1` | Number of parallel API calls (1–20). Higher = faster, more API quota used. |
| `mindexai.maxFileSizeKB` | `200` | Files larger than this limit are automatically split before analysis. |

### File Selection

| Setting | Default | What it controls |
|---------|---------|-----------------|
| `mindexai.includedExtensions` | 15+ extensions | File types to include in analysis |
| `mindexai.excludePatterns` | `node_modules`, `dist`, `build`, etc. | Glob patterns to skip. Add your own generated folders here. |

### Behavior

| Setting | Default | What it controls |
|---------|---------|-----------------|
| `mindexai.autoUpdate` | `false` | Automatically update index on file save and branch switch |
| `mindexai.autoAddToGitignore` | `true` | Add `.mindexai/` to `.gitignore` automatically on first use |

---

## Supported Languages

MindexAI provides two levels of support depending on the language.

### Deep Support — Symbol Index + Dependency Graph

These languages get a fully structured symbol index (every function, class, method, and type with line numbers), plus an import dependency graph showing exactly which files depend on which:

| Language | Extensions | Symbols Extracted |
|----------|-----------|-------------------|
| TypeScript | `.ts` · `.tsx` | function, class, interface, type, enum, method, arrow function |
| JavaScript | `.js` · `.jsx` | function, class, method, arrow function |
| Python | `.py` | function, class, method, decorated definitions |
| Go | `.go` | function, method, struct, interface, type alias |
| Rust | `.rs` | fn, struct, enum, trait, impl, type |
| Java | `.java` | class, interface, enum, annotation, method, constructor |
| Vue | `.vue` | components (script block parsed as TypeScript or JavaScript) |

### Broad Support — AI Analysis

These languages are fully analyzed by the AI — you get plain-English descriptions of every file and its purpose — but without the structured symbol-level index or import graph:

| Language | Extensions |
|----------|-----------|
| C | `.c` · `.h` |
| C++ | `.cpp` · `.hpp` · `.h` |
| C# | `.cs` |
| Ruby | `.rb` |
| PHP | `.php` |
| Swift | `.swift` |
| Kotlin | `.kt` |
| Scala | `.scala` |
| Svelte | `.svelte` |

> **In practice:** For most AI coding use cases, broad support is more than sufficient — the AI gets a complete plain-English description of what each file does and can work with it accurately.

---

## Privacy & Security

- **API keys** are stored in VS Code's built-in system keychain — never written to disk, never in any config file
- **Your source code** is sent only to the AI provider you configure. Choose Ollama or llama.cpp to keep everything entirely on your machine
- **The generated index** is automatically added to `.gitignore` so it is never committed to version control or shared with your team

---

## FAQ

**How much does it cost to run?**
A 100-file TypeScript project costs under $0.05 with GPT-4o-mini or Gemini Flash. After the first run, only changed files are re-analyzed — so day-to-day updates cost a fraction of the initial index. Ollama is completely free.

**How long does the first analysis take?**
For a 100-file project: 1–3 minutes at default settings. Increase `concurrentRequests` (up to 20) on paid API tiers to run significantly faster.

**Does it work with monorepos?**
Yes. Create a `.include.mindexai` file listing only the sub-packages you care about. You can maintain separate indexes by opening different workspace folders in VS Code.

**Can I use it on a private or air-gapped network?**
Yes. Use the `openai-compat` provider and point it at your internal server. Any server implementing `/v1/chat/completions` is supported — including vLLM, LiteLLM, and Ollama.

**What if analysis fails for some files?**
Failed files are listed individually in the completion message. The rest of the index is unaffected. Running **↻ Update Index** retries only the failed files.

**Can non-technical people read the output?**
Yes. `.mindexai/current/CONTEXT.md` is written entirely in plain English. Open it in any Markdown viewer — no coding knowledge needed to understand what the project does.

**Can I commit the index to git so my whole team can use it?**

Yes — but MindexAI blocks this by default, and for good reason. Here is the full picture so you can decide what is right for your team.

**Why it's blocked by default**

When MindexAI first runs, it automatically adds `.mindexai/` to your `.gitignore`. This is controlled by the `mindexai.autoAddToGitignore` setting (default: on). The index is regenerated every time code changes — committing it would create constant, noisy git history with no real benefit for most teams.

**When committing the index makes sense**

Committing makes sense when your teammates don't have their own API keys, or when you want to guarantee everyone is working from the same snapshot of the index without each person running their own analysis. In that case, the useful thing to share is `.mindexai/current/` — the stable folder that always contains the latest index (`CONTEXT.md`, `index.json`, `graph.json`, and per-file context files).

**How to commit the index if you want to**

1. Open VS Code Settings (`Ctrl+,`), search `mindexai`, and turn off **Auto Add to Gitignore**.
2. Open your `.gitignore` and remove the `.mindexai/` line (if it was already added).
3. To share only the current index (recommended over committing everything), add this to `.gitignore` instead:
   ```
   .mindexai/branches/
   .mindexai/cache/
   ```
   This keeps the branch-specific working files and cache out of git, but lets `.mindexai/current/` — the part your team actually needs — be committed and shared.
4. Commit and push as normal.

**Recommendation for most teams**

Keep the default (don't commit). Every developer runs MindexAI once locally — it takes 1–3 minutes and costs very little. The index stays fresh on each machine automatically. Committing it adds maintenance overhead without a meaningful benefit unless you have a specific reason to share a single frozen snapshot.

---