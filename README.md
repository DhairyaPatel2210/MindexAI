# MindexAI

**Your AI knows how to code. It doesn't know your codebase. MindexAI fixes that.**

MindexAI is a VS Code extension that reads your entire project and generates a plain-English map of every file, every function, and every relationship between them. Attach that map to any AI coding tool — Cursor, Copilot, Cline, Claude Code, ChatGPT — and it immediately understands your project, producing suggestions that actually fit rather than generic code that breaks everything else.

No technical background required. No code leaves your machine if you choose a local model.

---

## Table of Contents

- [Who Is This For](#who-is-this-for)
- [Features](#features)
- [What Gets Generated](#what-gets-generated)
- [Getting Started](#getting-started)
  - [Step 1 — Install the Extension](#step-1--install-the-extension)
  - [Step 2 — Open the MindexAI Panel](#step-2--open-the-mindexai-panel)
  - [Step 3 — Configure MindexAI](#step-3--configure-mindexai)
- [LLM Providers Tab](#llm-providers-tab)
  - [Provider Comparison](#provider-comparison)
  - [Cloud Providers](#cloud-providers)
    - [Google Gemini](#google-gemini)
    - [OpenAI](#openai)
    - [Anthropic Claude](#anthropic-claude)
  - [Local / Open-Source Models](#local--open-source-models)
    - [Option A — Ollama](#option-a--ollama-easiest-local-setup)
    - [Option B — GGUF File with llama-server](#option-b--gguf-file-with-llama-server-full-offline-more-control)
  - [OpenAI-Compatible Remote Server](#openai-compatible-remote-server)
- [Settings Tab](#settings-tab)
  - [File Selection](#file-selection)
  - [Performance & Rate Limiting](#performance--rate-limiting)
  - [Automation](#automation)
- [Statistics Tab](#statistics-tab)
- [Step 4 — Run the Analysis](#step-4--run-the-analysis)
- [Keeping the Index Current](#keeping-the-index-current)
- [Using the Index with AI Tools](#using-the-index-with-ai-tools)
  - [Cursor](#cursor)
  - [GitHub Copilot](#github-copilot)
  - [Cline](#cline)
  - [Aider](#aider)
  - [Claude Code](#claude-code)
  - [ChatGPT, Claude.ai, or Any Chat Interface](#chatgpt-claudeai-or-any-chat-interface)
- [Supported Languages](#supported-languages)
- [Privacy & Security](#privacy--security)
- [FAQ](#faq)
- [Sidebar Panel Quick Reference](#sidebar-panel-quick-reference)

---

## Who Is This For

| If you are… | MindexAI helps you… |
|---|---|
| **A software engineer** | Get AI suggestions grounded in your actual codebase — not generic boilerplate |
| **New to a codebase** | Understand what an entire project does in minutes, not weeks |
| **A product manager or founder building with AI** | Write features with AI that don't break what already works |
| **Vibe coding** | Move fast without the AI making up APIs or patterns that don't exist in your app |
| **Non-technical and trying to understand a project** | Read a plain-English description of the entire codebase — no coding knowledge needed |

---

## Features

- **Plain-English codebase map** — Reads your entire project and produces a human-readable description of every file, every function, and how they connect. Anyone can open it and understand what the project does — no coding knowledge required
- **Works with any AI tool** — Attach the generated map to Cursor, GitHub Copilot, Cline, Aider, Claude Code, ChatGPT, or any chat interface. Your AI gets the full picture of your project before it writes a single line
- **Any AI provider** — OpenAI, Google Gemini (free tier available), Anthropic Claude, Ollama, llama.cpp, or any OpenAI-compatible server. Pick whatever fits your budget and privacy requirements
- **Completely private option** — Use Ollama or a local GGUF model and your source code never leaves your machine. Nothing is sent to the internet
- **15+ programming languages** — TypeScript, JavaScript, Python, Go, Rust, Java, C/C++, C#, Swift, Kotlin, Vue, Svelte, and more
- **Symbol-level index** — Every function, class, interface, and method is captured with its line number and a plain-English description of what it does
- **File dependency graph** — A full map of which files import which, so you and your AI always know how the pieces connect
- **Branch-aware indexing** — Keeps a separate index for every git branch. Switch branches and MindexAI automatically loads the right index for that branch
- **Incremental updates** — Only re-analyzes files that changed since the last run. Unchanged files load from cache in milliseconds, keeping updates fast regardless of project size
- **Auto-update mode** — Optionally keep the index current in the background as you save files and switch branches, with no manual reruns needed
- **Selective indexing** — Focus the analysis on specific folders with a simple `.include.mindexai` file. Useful for monorepos or when you only care about part of a large project
- **One-click sidebar panel** — Everything is in the VS Code Activity Bar. Run an analysis, update the index, open the map, and configure your provider — all without leaving the editor or memorizing commands
- **Token usage tracking** — See how many tokens each analysis used, broken down by provider and run, so you always know what things cost

---

## What Gets Generated

After running MindexAI, a `.mindexai/current/` folder appears in your project with:

| File | What it contains |
|---|---|
| `CONTEXT.md` | A human-readable map of the entire codebase — great for onboarding, AI context, and documentation |
| `index.json` | A structured lookup of every function, class, and interface with plain-English descriptions |
| `graph.json` | A file dependency map showing what imports what across the project |
| `context/<file>.md` | A detailed plain-English description for each individual source file |

> **Non-technical users:** Open `CONTEXT.md` in any Markdown viewer for an instant plain-English tour of the entire codebase. No coding knowledge required.

---

## Getting Started

### Step 1 — Install the Extension

**From the VS Code Marketplace (recommended):**

Open the Extensions panel with `Ctrl+Shift+X` (Windows/Linux) or `Cmd+Shift+X` (Mac), search for **MindexAI**, and click **Install**.

**From a downloaded `.vsix` file:**

```bash
code --install-extension mindexai-*.vsix
```

Once installed, the **MindexAI icon** appears in the left Activity Bar — it looks like a small sparkle symbol (`✦`). Click it to open the MindexAI sidebar panel.

---

### Step 2 — Open the MindexAI Panel

Click the **MindexAI icon** (`✦`) in the Activity Bar on the left side of VS Code.

The sidebar opens and shows:

| Button | What it does |
|---|---|
| **▶ Run Full Analysis** | Index the entire workspace from scratch |
| **↻ Update Index** | Re-analyze only files that changed since the last run |
| **📄 Analyze Current File** | Analyze only the file you have open right now |
| **📖 View Index** | Open `CONTEXT.md` in Markdown preview |
| **⚙ Configure** | Open the full configuration panel |

A status bar indicator at the bottom of VS Code also shows the current state: idle, running, or completed.

---

### Step 3 — Configure MindexAI

Click the **⚙ Configure** button in the sidebar (or the gear icon next to the provider status indicator). This opens the full configuration panel with four tabs: **LLM Providers**, **Settings**, **Statistics**, and **About**.

> **The only required step before running an analysis is configuring an LLM Provider.** Everything else has sensible defaults.

---

## LLM Providers Tab

This is the most important tab. MindexAI needs an AI model to generate descriptions of your code. Choose the provider that fits your situation.

### Provider Comparison

| Provider | Cost | Privacy | Speed | Best for |
|---|---|---|---|---|
| **Google Gemini** | Free tier available | Cloud | Fast | Best starting point — generous free tier |
| **OpenAI** | Pay-per-use | Cloud | Fast | Large or complex projects |
| **Anthropic Claude** | Pay-per-use | Cloud | Fast | Nuanced, large codebases |
| **Ollama** | Free | **100% local** | Slower | Privacy-sensitive projects |
| **llama.cpp (GGUF)** | Free | **100% local** | Depends on hardware | Full offline, no internet required |
| **OpenAI-Compatible Server** | Varies | Your infrastructure | Fast | Self-hosted or third-party APIs (Cerebras, Modal, Together AI, etc.) |

---

### Cloud Providers

#### Google Gemini

1. Go to [aistudio.google.com](https://aistudio.google.com/app/apikey) and create a free API key.
2. In the **LLM Providers** tab, click the **Gemini** card.
3. Paste your API key into the **API Key** field.
4. Choose a model:
   - `gemini-2.5-flash` — Recommended. Fast, high quality, 15 requests/minute on the free tier.
   - `gemini-2.5-flash-lite` — Fastest and lowest cost.
5. Click **Test Connection** to verify it works.
6. Click **Save Config**.

> MindexAI defaults to 12 requests per minute to stay safely within Gemini's free tier limit of 15.

---

#### OpenAI

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys) and create an API key.
2. In the **LLM Providers** tab, click the **OpenAI** card.
3. Paste your API key.
4. Choose a model:
   - `gpt-4o` — Best quality. Good for large, complex projects.
   - `gpt-4o-mini` — Very good quality at lower cost. Recommended for most projects.
   - `gpt-3.5-turbo` — Fastest and cheapest, suitable for simple projects.
5. Click **Test Connection**, then **Save Config**.

---

#### Anthropic Claude

1. Go to [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) and create an API key.
2. In the **LLM Providers** tab, click the **Claude** card.
3. Paste your API key.
4. Choose a model:
   - `claude-opus-4-6` — Highest quality. Best for large, complex codebases.
   - `claude-sonnet-4-6` — Balanced speed and quality.
   - `claude-haiku-4-5-20251001` — Fastest and most economical.
5. Click **Test Connection**, then **Save Config**.

---

### Local / Open-Source Models

Use a local model to keep your code entirely on your machine — nothing is sent to the internet.

---

#### Option A — Ollama (Easiest Local Setup)

Ollama manages local models for you with a simple interface.

**1. Install Ollama**

Download and install from [ollama.com](https://ollama.com/download).

**2. Pull a model**

Open your terminal and run:

```bash
ollama serve
ollama pull llama3.1        # 8B parameter model — good balance of quality and speed
# or
ollama pull mistral         # Compact and fast
# or
ollama pull qwen2.5-coder   # Optimized for code understanding
```

**3. Configure in MindexAI**

In the **LLM Providers** tab, click the **Local / Open-Source** card and fill in:

| Field | Value |
|---|---|
| **API Type** | `Ollama Native` |
| **Base URL** | `http://localhost:11434/v1` |
| **Model** | The model name you pulled (e.g. `llama3.1`) |
| **Context Size** | Token context window (e.g. `8192` for llama3.1) |

Click **Test Connection** — you should see a success message. Then click **Save Config**.

---

#### Option B — GGUF File with llama-server (Full Offline, More Control)

This option lets you run any GGUF-format model entirely offline with fine-grained control over GPU layers and memory usage.

**1. Download a GGUF model file**

GGUF files are quantized model weights hosted on Hugging Face. A good starting point:

```bash
# Install the Hugging Face CLI (requires Python)
pip install huggingface_hub

# Download a quantized llama3.1 8B model (~4.7 GB, good balance of quality and size)
huggingface-cli download \
  bartowski/Meta-Llama-3.1-8B-Instruct-GGUF \
  Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf \
  --local-dir ~/models
```

Alternatively, browse [huggingface.co](https://huggingface.co/models?library=gguf) and download any `.gguf` file directly. Files ending in `Q4_K_M` or `Q5_K_M` are a good quality-to-size trade-off.

**2. Install llama-server**

**Mac (Homebrew):**
```bash
brew install llama.cpp
```

**Windows:**

Download the latest release from the [llama.cpp GitHub releases page](https://github.com/ggerganov/llama.cpp/releases). Look for a zip file named something like `llama-<version>-bin-win-cuda-cu12.2.0-x64.zip` (with CUDA if you have an NVIDIA GPU) or `llama-<version>-bin-win-avx2-x64.zip` (CPU-only). Extract the zip and note the path to `llama-server.exe` — you will enter this path in the **Advanced Options** section of the MindexAI panel.

**3. Configure in MindexAI**

In the **LLM Providers** tab, click the **Local / Open-Source** card and fill in:

| Field | Value | Notes |
|---|---|---|
| **Model File** | Path to your `.gguf` file | Click the folder icon to browse |
| **Port** | `8080` | Any open port on your machine |
| **GPU Layers** | `0` (CPU only) or `99` (full GPU) | Set to `0` if you have no dedicated GPU. If you have a GPU, set to `99` to load the entire model into VRAM for best speed. |
| **Context Size** | `4096` or `8192` | Larger = better quality but slower and more memory. See note below. |

> **Context Size trade-off:** This is the maximum number of tokens the model can process at once. A larger context window means MindexAI can handle bigger files in a single pass, producing better descriptions. However, larger context = more memory used and longer per-file processing time. Start with `4096` and increase if your hardware allows.

Under **Advanced Options**, if you installed llama-server to a custom location (especially on Windows), click the folder icon next to **Binary Path** and select your `llama-server` or `llama-server.exe` file.

**4. Start the server**

Click **Start Instance**. Watch the terminal output in the **Server Logs** panel — once you see a line containing `llama server listening`, the server is ready.

**5. Finish configuration**

- Set **API Type** to `OpenAI Compatible`
- Set **Base URL** to `http://localhost:8080/v1` (using the port you chose)
- Click **Test Connection** — you should see a success message
- Click **Save Config**

> **Performance note:** Local inference is significantly slower than cloud APIs and depends entirely on your hardware. For reference: indexing approximately 70,000 input tokens on an Apple M1 Mac takes around **30 minutes** with a context size of 4096 and the llama3.1-8B model. On a machine with a powerful NVIDIA GPU and GPU layers set to 99, expect roughly 3–5x faster throughput.

---

### OpenAI-Compatible Remote Server

Use this option for self-hosted inference servers or third-party APIs that expose an OpenAI-compatible endpoint — including Cerebras, Modal, Together AI, Anyscale, vLLM, LiteLLM, text-generation-inference, and others.

In the **LLM Providers** tab, click the **OpenAI-Compatible Server** card and fill in:

| Field | Value |
|---|---|
| **Base URL** | The full base URL of your server (e.g. `https://api.cerebras.ai/v1`) |
| **Model** | The model identifier used by your server |
| **API Key** | Your API key for the service (if required) |
| **Context Size** | The token context window of the model |

Click **Test Connection**, then **Save Config**.

> **Cloud speed note:** Cloud-hosted OpenAI-compatible services are significantly faster than local inference. For reference: indexing approximately 70,000 input tokens using Cerebras or a similar fast inference provider with llama3.1-8B and a context window of 8192 takes under **1 minute** — compared to around 30 minutes on an M1 Mac running locally. Your actual speed depends on the provider, your plan tier, and network conditions.

---

## Settings Tab

The Settings tab lets you control what MindexAI analyzes and how it behaves. All settings have sensible defaults — you only need to change them if your project has specific requirements.

---

### File Selection

#### Include File (`.include.mindexai`)

By default, MindexAI analyzes every source file it can find. For large projects, you may want to pin the analysis to specific folders.

Create a `.include.mindexai` file in your project root with one path per line:

```
src/
lib/
tests/
README.md
```

MindexAI will only look inside these directories. Lines starting with `#` are treated as comments and ignored.

In the Settings tab, click **Create Include File** to generate this file automatically and open it for editing.

> **Why use this?** A monorepo with 500 files across multiple packages can be expensive to index. Pinning to the packages you actively work on cuts cost and time significantly.

---

#### Included Extensions

Controls which file types are analyzed. Defaults include all major languages (`.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.go`, `.rs`, `.java`, `.vue`, `.cs`, `.rb`, `.php`, `.swift`, `.kt`, `.cpp`, `.c`, `.h`, and more).

Edit this list to add a custom file extension your project uses, or remove extensions you want to exclude from analysis.

**Example:** If your project uses `.graphql` files with important schema definitions, add `.graphql` to the list. MindexAI will include those files in the analysis.

---

#### Exclude Patterns

Glob patterns for directories and files to skip entirely. Defaults include `node_modules`, `dist`, `build`, `.git`, and other common generated folders.

Add your own patterns to skip anything project-specific you don't want indexed.

**Examples:**

```
**/vendor/**        # Skip vendored dependencies
**/generated/**     # Skip auto-generated code
**/*.test.ts        # Skip test files
**/migrations/**    # Skip database migration files
```

> **Why this matters:** Excluding generated code keeps the index focused on the source of truth. Indexing auto-generated files wastes tokens and can confuse AI tools.

---

### Performance & Rate Limiting

#### Requests Per Minute

Controls how many API calls MindexAI makes per minute. This prevents you from hitting your provider's rate limit.

| Provider | Free tier limit | Recommended setting |
|---|---|---|
| Gemini Flash | 15 RPM | `12` (default) |
| OpenAI (paid) | Varies by tier | `30`–`60` |
| Claude (paid) | Varies by tier | `30`–`60` |
| Local (Ollama/GGUF) | No limit | `60`–`120` |

**Side effect:** Increasing this speeds up indexing proportionally but risks rate limit errors if set above your plan's actual limit. If you see rate limit errors during analysis, reduce this value.

---

#### Concurrent Requests

Controls how many files are analyzed in parallel at the same time. Default is `1` (sequential).

- **Set to 1** when you're on a free tier or want to minimize API quota usage.
- **Set to 3–5** on a paid API tier to noticeably speed up large projects.
- **Set to 10–20** if you have a high-quota enterprise plan and want maximum speed.

**Side effect:** Higher concurrency = faster analysis but multiplied quota usage per minute. A setting of `5` with `30 RPM` effectively caps throughput at 150 file-analyses per minute. Don't set this higher than your rate limit can sustain.

---

#### Max File Size (KB)

Files larger than this limit are automatically split into chunks before analysis. Default is `200 KB`.

**Why this matters:** Most LLM providers have context window limits. Very large files (e.g., a single 2,000-line module) can exceed what the model can process in one shot. MindexAI splits them automatically, but splitting means the description is assembled from parts, which can be slightly less coherent than a single-shot analysis.

- **Increase this** (e.g., to `500` or `1000`) if your project has large files and you want them analyzed in fewer chunks — requires a model with a larger context window.
- **Decrease this** (e.g., to `100`) if you're hitting context limit errors on a model with a small context window.

---

### Automation

#### Auto-Update Index

When enabled, MindexAI automatically re-runs an incremental update whenever you save a file or switch git branches.

- **On file save:** waits 3 seconds after your last save, then re-analyzes only the files you changed. Quick and mostly invisible.
- **On branch switch:** automatically loads or rebuilds the index for the branch you just switched to.

**Side effect:** Enabling this means API calls happen in the background as you work. For free-tier providers this can exhaust your daily quota quickly on large projects. Recommended only on paid plans or with a local model.

> Disabled by default. Enable it once you're comfortable with MindexAI's behavior and you've verified it won't surprise your API quota.

---

#### Auto Add to Gitignore

When enabled (default), MindexAI automatically adds `.mindexai/` to your `.gitignore` the first time it runs. This prevents the generated index from being accidentally committed to version control.

**Disable this** only if you deliberately want to commit and share the index with your team. See the FAQ below for the full picture on when committing makes sense.

---

## Statistics Tab

The Statistics tab shows a breakdown of all token usage and analysis activity since you first installed MindexAI.

### What You'll See

**Global Summary:**
- Total workflow runs (how many times you've run a full analysis)
- First and last used dates

**Per-Provider Breakdown:**
- Total input and output tokens used per provider
- Number of files analyzed (and how many came from cache rather than a fresh API call)
- Total requests made and errors encountered
- Average tokens per run — useful for estimating cost per future analysis
- Total time spent on analysis per provider

**Run History:**
- The 20 most recent individual runs, each showing: date/time, provider used, tokens consumed, files analyzed, cache hits, duration, and errors

Use the **Refresh** button to load the latest data, and the **Reset Statistics** button to clear all history and start fresh.

---

### A Note on Token Counts

The token counts shown in Statistics are **approximations**. Different LLM providers count tokens differently, and some providers return combined input+output counts rather than splitting them. The numbers shown represent what MindexAI tracked during its requests — they may not match exactly what your provider bills you.

For exact usage and billing information, always check your provider's dashboard directly:

- OpenAI: [platform.openai.com/usage](https://platform.openai.com/usage)
- Google Gemini: [aistudio.google.com](https://aistudio.google.com)
- Anthropic Claude: [console.anthropic.com](https://console.anthropic.com)

---

## Step 4 — Run the Analysis

Once your provider is configured, click **▶ Run Full Analysis** in the sidebar.

Progress appears in VS Code's notification area and the status bar at the bottom shows `⟳ MindexAI` while running. When it finishes:

```
MindexAI: Analysis complete in 47s — 132 files (89 from cache), 1,240 symbols
```

Your index is ready in `.mindexai/current/`. Point your AI tool at `CONTEXT.md` and start building.

---

## Keeping the Index Current

### Manual Updates

After making code changes, click **↻ Update Index** in the sidebar. MindexAI checks which files changed since the last run and re-analyzes only those. Unchanged files load from cache in milliseconds — so an incremental update on a large project is typically much faster than the initial analysis.

### Auto-Update

Enable **Auto-Update Index** in the Settings tab to have MindexAI keep the index current automatically as you save files and switch branches. See the [Settings Tab](#settings-tab) section above for trade-offs.

---

## Using the Index with AI Tools

### Cursor

Add this to your `.cursor/rules` file:

```
Before responding to any task, read .mindexai/current/CONTEXT.md to understand
the project structure. For detailed information on a specific file, reference
.mindexai/current/context/<path>.md.
```

Cursor will consult your codebase map before every suggestion — no more invented APIs or patterns that clash with your existing architecture.

---

### GitHub Copilot

Open `.mindexai/current/CONTEXT.md` in an editor tab while you code. Copilot treats open editor tabs as additional context for its suggestions. Keeping this file open is enough — Copilot reads it passively and produces suggestions that align with your project's actual structure.

---

### Cline

In Cline's system prompt settings, add:

```
At the start of every task, read .mindexai/current/CONTEXT.md to understand
the codebase. Never assume a function or file exists without checking the index.
```

---

### Aider

```bash
aider --read .mindexai/current/CONTEXT.md
```

---

### Claude Code

```bash
claude --context .mindexai/current/CONTEXT.md
```

Or reference a specific file inline:

```
Read .mindexai/current/context/src/api/routes.md before editing the routes file.
```

---

### ChatGPT, Claude.ai, or Any Chat Interface

Copy the contents of `.mindexai/current/CONTEXT.md` into your chat, or upload it as a file attachment. The AI will have a complete picture of your project for the entire conversation.

---

## Supported Languages

### Deep Support — Symbol Index + Dependency Graph

Full structured symbol extraction (every function, class, method, and type with line numbers) plus an import dependency graph:

| Language | Extensions |
|---|---|
| TypeScript | `.ts` · `.tsx` |
| JavaScript | `.js` · `.jsx` |
| Python | `.py` |
| Go | `.go` |
| Rust | `.rs` |
| Java | `.java` |
| Vue | `.vue` |

### Broad Support — AI Analysis

Fully analyzed by the AI with plain-English descriptions for every file and its purpose:

| Language | Extensions |
|---|---|
| C | `.c` · `.h` |
| C++ | `.cpp` · `.hpp` · `.h` |
| C# | `.cs` |
| Ruby | `.rb` |
| PHP | `.php` |
| Swift | `.swift` |
| Kotlin | `.kt` |
| Scala | `.scala` |
| Svelte | `.svelte` |

> For most AI coding use cases, broad support is more than sufficient — the AI gets a complete plain-English description of what each file does and works with it accurately.

---

## Privacy & Security

- **API keys** are stored in VS Code's built-in system keychain — never written to disk, never in any config file
- **Your source code** is sent only to the AI provider you configure. Choose Ollama or llama.cpp to keep everything entirely on your machine
- **The generated index** is automatically added to `.gitignore` so it is never committed to version control

---

## FAQ

**How much does it cost to run?**
A 100-file TypeScript project costs under $0.05 with GPT-4o-mini or Gemini Flash. After the first run, only changed files are re-analyzed — so day-to-day updates cost a fraction of the initial index. Ollama is completely free.

**How long does the first analysis take?**
Depends heavily on your provider and project size:
- **Cloud providers (Gemini, OpenAI, Claude):** 1–5 minutes for most projects at default settings. Increase `Concurrent Requests` to run significantly faster on paid plans.
- **Fast cloud inference (Cerebras, Modal, etc.):** Under 1 minute for ~70,000 input tokens with an 8B model.
- **Local — Apple M1 with llama3.1-8B (no GPU):** ~30 minutes for ~70,000 input tokens at a context size of 4096.
- **Local — machine with dedicated GPU:** 3–10x faster than CPU-only, depending on VRAM.

**Does it work with monorepos?**
Yes. Create a `.include.mindexai` file listing only the sub-packages you care about. You can maintain separate indexes by opening different workspace folders in VS Code.

**Can I use it on a private or air-gapped network?**
Yes. Use the `OpenAI-Compatible Server` provider and point it at your internal server. Any server implementing `/v1/chat/completions` is supported — including vLLM, LiteLLM, and Ollama.

**What if analysis fails for some files?**
Failed files are listed individually in the completion message. The rest of the index is unaffected. Running **↻ Update Index** retries only the failed files.

**Can non-technical people read the output?**
Yes. `.mindexai/current/CONTEXT.md` is written entirely in plain English. Open it in any Markdown viewer — no coding knowledge needed to understand what the project does.

**Can I commit the index to git so my whole team can use it?**

Yes, but MindexAI blocks this by default. The index is regenerated every time code changes — committing it creates constant, noisy git history for most teams.

When committing makes sense: if your teammates don't have their own API keys, or you want everyone working from the same snapshot. In that case, share only `.mindexai/current/` — the stable folder containing `CONTEXT.md`, `index.json`, `graph.json`, and per-file context files.

**How to commit the index:**

1. Open VS Code Settings (`Ctrl+,`), search `mindexai`, and turn off **Auto Add to Gitignore**.
2. Remove the `.mindexai/` line from your `.gitignore`.
3. To share only the current index (recommended), add this to `.gitignore` instead:
   ```
   .mindexai/branches/
   .mindexai/cache/
   ```
4. Commit and push as normal.

**Recommendation for most teams:** Keep the default. Every developer runs MindexAI once locally — it takes a few minutes and costs very little. The index stays fresh on each machine automatically.

---

## Sidebar Panel Quick Reference

| Element | Location | Purpose |
|---|---|---|
| **✦ MindexAI icon** | Activity Bar (left) | Opens the MindexAI sidebar panel |
| **▶ Run Full Analysis** | Sidebar | Index the entire workspace |
| **↻ Update Index** | Sidebar | Incremental re-analysis of changed files |
| **📄 Analyze Current File** | Sidebar | Analyze only the currently open file |
| **📖 View Index** | Sidebar | Open `CONTEXT.md` in Markdown preview |
| **⚙ Configure** | Sidebar | Open the full configuration panel |
| **Status indicator** | Bottom status bar | Shows current state: idle, running, or completed with file/symbol counts |
| **LLM Providers tab** | Configure panel | Set up and test your AI provider |
| **Settings tab** | Configure panel | File selection, rate limits, automation |
| **Statistics tab** | Configure panel | Token usage history and run breakdown |
