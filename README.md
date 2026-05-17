# Mission Control

**AI Agent Mission Control Dashboard** — eine lokale, dark-themed Web-Oberfläche zur Verwaltung von KI-Agenten (Hermes Agent, OpenClaw, Claude Code) mit Sessions, Kanban-Taskboard und Obsidian-Log-Export.

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
