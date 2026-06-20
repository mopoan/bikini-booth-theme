# Command Cheat‑Sheet — Bikini Booth theme workflow

Your store handle: **`bikini-booth.myshopify.com`**
Theme folder: **`bikini-booth-theme`** (run the Shopify/git commands from inside it)
Get theme IDs anytime with `shopify theme list` (look for `[live]`, `[unpublished]`, `[development]`).

---

## 1. Terminal basics

| Command | What it does |
|---|---|
| `pwd` | Print the folder you're currently in. |
| `ls` | List files in the current folder. `ls -la` shows hidden files + details. |
| `cd foldername` | Go into a folder. Tip: type `cd ` then **drag the folder** from Finder onto the terminal. |
| `cd ..` | Go up one folder. `cd ~` goes to your home folder. |
| `clear` | Clear the screen (history is still there). |
| **Up arrow** | Recall your previous command (keep pressing for older ones). |
| **Tab** | Auto‑complete a file or folder name. |
| **Ctrl+C** | Stop a running command (e.g. the `theme dev` server). |

---

## 2. Shopify CLI — themes (your core workflow)

| Command | What it does |
|---|---|
| `shopify theme dev --store bikini-booth.myshopify.com` | Start a **local preview** at `http://127.0.0.1:9292` from your local files, with hot‑reload. **Does not touch your live store.** Stop with Ctrl+C. |
| `shopify theme list --store bikini-booth.myshopify.com` | List all themes with their IDs and roles (live / unpublished / development). |
| `shopify theme push --store bikini-booth.myshopify.com --theme <ID> --only sections/FILE.liquid` | Upload **one file** to the theme `<ID>`. Safest deploy — leaves everything else (incl. `product.json`) untouched. |
| `shopify theme push --store bikini-booth.myshopify.com --theme <ID>` | Push **all** local files to theme `<ID>`. ⚠️ Overwrites remote files, including JSON templates — use `--only` unless you really mean all. |
| `shopify theme push --store bikini-booth.myshopify.com --unpublished --theme "Backup 2026-06-19"` | Create a **new unpublished theme** from your local files (good for backups). |
| `shopify theme pull --store bikini-booth.myshopify.com --theme <ID>` | **Download** a theme's files into your local folder (use to sync local to what's live). |
| `shopify theme check` | **Lint/validate** the theme. Catches schema errors, bad Liquid, etc. — the kind of thing that silently blocked your saves before. Run before deploying. |
| `shopify theme open --store bikini-booth.myshopify.com` | Open the theme's preview/editor links in your browser. |
| `shopify version` | Show your installed Shopify CLI version. |
| `npm install -g @shopify/cli@latest` | Update the Shopify CLI to the latest version. |

Handy push flags: `--only path` (just those files) · `--ignore path` (skip those) · `--nodelete` (don't delete remote files missing locally).

---

## 3. Git (version control)

| Command | What it does |
|---|---|
| `git status` | Show what's changed / staged. Your starting point. |
| `git add path/to/file` | Stage one file for commit. `git add -A` stages everything. |
| `git commit -m "message"` | Save a snapshot of staged changes with a message. |
| `git push` | Send your commits up to GitHub. |
| `git pull` | Bring down the latest commits from GitHub. |
| `git log --oneline` | Compact list of past commits. |
| `git diff` | Show unstaged changes line‑by‑line. `git diff --staged` for staged. |
| `git restore path/to/file` | Discard local changes to a file (revert it to the last commit). |
| `git branch` | List branches (you're usually on `main`). |

---

## 4. Claude Code & the Shopify AI Toolkit

| Command | What it does |
|---|---|
| `claude` | Start a Claude Code session in the current folder (terminal). |
| `claude --version` | Show the Claude Code CLI version. |
| `claude plugin list` | List installed plugins. |
| `claude plugin marketplace add Shopify/shopify-ai-toolkit` | Add Shopify's plugin marketplace. |
| `claude plugin install shopify-plugin@shopify-ai-toolkit` | Install the Shopify AI Toolkit plugin. |
| `claude mcp list` | List configured MCP servers. |
| `claude mcp add shopify-dev-mcp -- npx -y @shopify/dev-mcp@latest` | Add Shopify's Dev MCP server (docs + schema validation). Add `--scope user` to make it global. |
| `npm install -g @anthropic-ai/claude-code` | Install/update the Claude Code CLI. |

Inside a Claude Code session, type slash commands: `/help`, `/mcp` (check MCP servers), `/clear` (reset the conversation).
In VS Code: **Cmd+Shift+P → "Developer: Reload Window"** to pick up new plugins/MCP servers, then start a **new** Claude Code session.

---

## 5. Common recipes (your actual flow)

**Preview local changes safely (no risk to live):**
```
cd bikini-booth-theme
shopify theme dev --store bikini-booth.myshopify.com
```
Open `http://127.0.0.1:9292`, check it, then Ctrl+C to stop.

**Validate a file before deploying:**
```
shopify theme check
```

**Deploy one file to your dev theme:**
```
shopify theme list --store bikini-booth.myshopify.com         # find your dev theme ID
shopify theme push --store bikini-booth.myshopify.com --theme <DEV_THEME_ID> --only sections/FILE.liquid
```

**Save your work to git:**
```
git add -A
git commit -m "describe the change"
git push
```

**Make a backup before a risky change:**
Admin → Online Store → Themes → "..." → **Duplicate** (rename it with a date).
Or from the CLI: `shopify theme push --store bikini-booth.myshopify.com --unpublished --theme "Backup YYYY-MM-DD"`.

---

## 6. Safety reminders

- `shopify theme dev` **never** changes your live store — it's a temporary preview. Temp dev themes auto‑delete after ~7 days.
- Prefer `--only sections/FILE.liquid` when pushing, so you never overwrite `product.json` (the theme editor owns it).
- After pasting a file into the Shopify **code editor**, confirm the last line is `{% endschema %}`.
- Run `shopify theme check` before deploying — it would have caught the `label_size` schema bug instantly.
- Always know which theme you're targeting: `[live]` vs your `[development]` theme in `shopify theme list`.
