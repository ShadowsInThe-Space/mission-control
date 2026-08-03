# Mission Control

**AI Agent Mission Control Dashboard** — eine lokale, dark-themed Web-Oberfläche zur Verwaltung von KI-Agenten (Hermes Agent, OpenClaw, Claude Code) mit Sessions, Kanban-Taskboard und Obsidian-Log-Export.

---

## Quick start

```bash
nvm use 22                        # Node 22.22.3 (matches .nvmrc)
npm install
cp .env.example .env.local        # then edit values for your setup
npm run dev                       # http://localhost:3000
```

## Scripts

| Script              | Purpose                                          |
|---------------------|--------------------------------------------------|
| `npm run dev`       | Next.js dev server (port 3000)                   |
| `npm run build`     | Production build                                 |
| `npm run start`     | Run the production build                         |
| `npm run lint`      | ESLint (Next + TypeScript rules)                 |
| `npm run typecheck` | TypeScript no-emit check                         |
| `npm test`          | Vitest (32 → 46 tests across 7 files)            |
| `npm run test:watch`| Vitest watch mode                                |

## Endpoints

| Path                   | Purpose                                              |
|------------------------|------------------------------------------------------|
| `/api/health`          | Liveness/readiness probe (cheap, no network calls)   |
| `/api/agents/status`   | Live status of every registered agent                |
| `/api/agents/chat`     | Chat bridge (POST `{ agentId, message }`)            |
| `/api/seo/scrape`      | RankForge-backed audit trigger (needs `RANKFORGE_API_KEY`) |
| `/api/obsidian`        | mywiki vault listing / sync                          |

## Registered agents

The agent registry in `src/lib/agent-registry.ts` is the single source of truth. As of M2 it knows about 17 agents across four kinds:

- **CLI agents** (8): `hermes`, `openclaw`, `claude`, `gemini`, `mmx`, `codex`, `ollama`, `antigravity`
- **Feature services** (8): `rankforge`, `firecrawl`, `notebooklm`, `blog-studio`, `image-studio`, `video-studio`, `podcast-studio`, `vision-studio`
- **Workspace** (1): `mywiki`

CLI agents can answer chat messages if they have a `chatCommand` template; feature services expose health probes via `health`.

## Deployment

See [DEPLOY.md](./DEPLOY.md) for the Docker / host rollout guide. The compose file at `deploy/docker-compose.yml` ships a stateless Next.js container that mounts the Obsidian vault and should be paired with `deploy/.env` (template: `deploy/.env.example`). By default it binds loopback-only on `127.0.0.1:3001`.

## Architecture notes

- **No new core model tools** are added in M2. Everything goes through the existing `agent-registry` + `agent-status-service` + `agent-chat` libs.
- **The 9 remaining lint warnings** are pre-existing in uncommitted SEO/Sessions/Kanban files. M1 deliberately did not touch them. Run `npm run lint` to see the list.
- **The `chatCommand` template** is per-agent; the runtime in `agent-chat.ts` substitutes `{{message}}` or appends the message as the last positional arg.

---

## Features

### 🖥️ Agent Bridge
- **Live-Status** aller drei Agents via CLI-Bridge
- Auto-Refresh alle 30 Sekunden
- Manueller Refresh-Button
- Installationshinweise wenn ein Agent offline ist

### 💬 Sessions Panel
- Persistente Session-Liste mit Agent-Typ, Status, Message-Count
- Session-Details: Erstellungsdatum, letzte Aktivität, Titel/Preview
- Sessions erstellen und löschen

### 📋 Kanban Board
- 4 Spalten: **Backlog → In Progress → Review → Done**
- **Drag-and-Drop** Taskverschiebung (@dnd-kit)
- Tasks mit Priorität (low/medium/high/critical), Beschreibung, Agent-Zuweisung
- Tasks erstellen und löschen

### 📜 Logs Panel
- Gefilterter Log-Stream (nach Source und Level)
- **Export nach Obsidian**: ein Klick → schreibt nach `~/obsidian-vault/journals/YYYY-MM-DD.md`
- Farbcodierte Level: info, warn, error, debug

### 🎨 Design
- **Dark Theme** — konsistente CSS-Variablen
- **Indigo Accent** (#6366f1) + Agent-Farbcodes (Hermes=Orange, OpenClaw=Grün, Claude=Lila)
- Inter + JetBrains Mono Fonts
- Responsive Sidebar (kollabierbar)

---

## Tech Stack

| Layer        | Technology                                 |
|-------------|--------------------------------------------|
| Framework   | Next.js 16 (App Router, Turbopack)         |
| Styling     | Tailwind CSS v4 + CSS Custom Properties     |
| State       | Zustand                                     |
| DnD         | @dnd-kit/core + @dnd-kit/sortable           |
| Icons       | Lucide React                                |
| Fonts       | Google Fonts (Inter, JetBrains Mono)         |
| Language    | TypeScript (strict)                         |

---

## Architecture

```
src/
├── app/
│   ├── layout.tsx          # Root layout + Google Fonts
│   ├── page.tsx            # Main shell (Sidebar + active view)
│   ├── globals.css         # CSS variables + dark theme
│   └── api/
│       └── agents/
│           └── status/
│               └── route.ts  # GET /api/agents/status
├── components/
│   ├── Sidebar.tsx         # Collapsible nav + active session preview
│   ├── SessionsPanel.tsx   # Session list + detail view
│   ├── KanbanBoard.tsx     # Drag-and-drop kanban
│   ├── LogsPanel.tsx       # Log stream + Obsidian export
│   └── AgentsPanel.tsx     # Agent status cards + CLI commands
└── lib/
    ├── store.ts            # Zustand global state
    ├── agent-bridge.ts     # Agent type definitions + client stubs
    ├── agent-shell.ts      # Server-only: child_process spawn wrapper
    └── obsidian-export.ts  # Obsidian vault file operations
```

---

## API Endpoints

### `GET /api/agents/status`
Gibt den Live-Status aller drei Agents zurück:

```json
{
  "hermes": {
    "type": "hermes",
    "name": "Hermes Agent",
    "version": "Hermes Agent v0.13.0 ...",
    "status": "online",
    "lastSeen": 1779015199231,
    "info": { "version": "...", "project": "/path/to/project" }
  },
  "openclaw": { ... },
  "claude": { ... }
}
```

### `POST /api/obsidian`
Exportiert Logs nach Obsidian:

```json
// Request — Journal
{ "type": "journal", "date": "2026-05-17", "content": "..." }

// Request — Memory
{ "type": "memory", "title": "Session Summary", "content": "...", "tags": ["ai", "session"] }

// Response
{ "success": true, "path": "/home/user/obsidian-vault/journals/2026-05-17.md" }
```

---

## Agent CLI Bridge

Jeder Agent wird über seine native CLI angesprochen:

| Agent       | CLI Command             | Status Check                  |
|------------|------------------------|-------------------------------|
| Hermes     | `hermes --version`      | `~/.local/bin/hermes`         |
| OpenClaw   | `openclaw --version`    | `npm i -g openclaw`           |
| Claude     | `claude-code --version` | `npm i @anthropic-ai/claude-code` |

---

## Installation

```bash
# 1. Repository klonen
git clone https://github.com/Shadows-In-The-Space/mission-control.git
cd mission-control

# 2. Dependencies installieren
npm install

# 3. Agents installieren (falls nicht vorhanden)
# Hermes (falls nicht vorhanden):
curl -fsSL https://raw.githubusercontent.com/nousresearch/hermes-agent/main/install.sh | bash

# OpenClaw:
npm i -g openclaw

# Claude Code:
npm i @anthropic-ai/claude-code

# 4. Obsidian Vault path anpassen (optional)
# In src/lib/obsidian-export.ts: VAULT_PATH constant editieren

# 5. Dev Server starten
npm run dev
# → http://localhost:3000
```

---

## Obsidian Integration

Das Dashboard schreibt zwei Arten von Dateien in den Obsidian Vault:

### Journal Entries
```
~/obsidian-vault/journals/YYYY-MM-DD.md
---
date: 2026-05-17
tags: [journal, mission-control]
---

## [HH:MM:SS] INFO | hermes
Mission-control project initialized...

---
## [HH:MM:SS] WARN | system
Claude CLI not found in PATH...
```

### Memory Notes
```
~/obsidian-vault/memories/{slug}.md
---
title: Session Summary
tags: [memory, ai, session]
created: 2026-05-17
---

Session content...
```

---

## Development

```bash
# TypeScript check
npm run lint

# Production build
npm run build

# Start production server
npm start
```

---

## License

MIT — Shadows-In-The-Space
