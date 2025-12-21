# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Obsidian AI Workspace - A Docker-based microservices solution with four independent containers:
- **Agent Service** - NestJS executor manager with WebUI (port 8000)
- **Obsidian** - Desktop app via noVNC (optional, port 3000)
- **Claude Code Executor** - Claude Code CLI HTTP API (port 3002)
- **Puppeteer Executor** - Web scraping HTTP API (port 3003)

## Build and Run Commands

```bash
# Build and start all containers
docker compose up -d --build

# Start specific services only
docker compose up -d agent-service claude-executor puppeteer-executor

# Rebuild without cache
docker compose build --no-cache && docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       Agent Service (:8000)                      │
│              NestJS - Executor Manager + WebUI                   │
└────────────────────────────┬────────────────────────────────────┘
                             │ manages/monitors
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│    Obsidian     │  │ ClaudeCode      │  │  Puppeteer      │
│  (linuxserver)  │  │   Executor      │  │   Executor      │
│   :3000/:3001   │  │     :3002       │  │     :3003       │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │
         └────────────────────┴────────────────────┘
                              │
                        ./vaults (shared)
```

### Agent Service (`agent-service/`)

NestJS application managing executor instances with health monitoring.

**Tech Stack:** NestJS + TypeScript + js-yaml

**Endpoints:**
- `GET /health` - Health check
- `GET /api/executors` - List all executors
- `POST /api/executors` - Register new executor
- `PUT /api/executors/:name` - Update executor
- `DELETE /api/executors/:name` - Remove executor
- `POST /api/executors/:name/check` - Check single executor health
- `POST /api/executors/:name/toggle` - Enable/disable executor
- `POST /api/executors/check-all` - Check all executors health

**Configuration:** `agent-service/config/executors.yaml`

**Development:**
```bash
cd agent-service
npm install
npm run start:dev   # Watch mode
npm run build       # Build
npm run start:prod  # Production mode
npm run lint        # ESLint
npm run format      # Prettier
```

### Claude Code Executor (`claude-executor/`)

Express server wrapping Claude Code CLI. Spawns `claude` CLI process for each request.

**Endpoints:**
- `GET /health` - Health check
- `POST /v1/chat/completions` - OpenAI-compatible chat API (streaming SSE)
- `POST /api/chat` - Simplified chat endpoint

**Key implementation:** `src/routes/chat.ts` - spawns Claude CLI with `--output-format stream-json`

**Development:**
```bash
cd claude-executor
npm install
npm run dev     # ts-node development mode
npm run build   # Build TypeScript
npm start       # Production mode
```

### Puppeteer Executor (`puppeteer-executor/`)

Express server providing web scraping using Puppeteer + Readability.

**Endpoints:**
- `GET /health` - Health check
- `POST /api/fetch` - Fetch and parse web page content (uses @mozilla/readability)
- `POST /api/fetch/screenshot` - Take page screenshot (returns base64)

**Development:**
```bash
cd puppeteer-executor
npm install
npm run dev     # ts-node development mode
npm run build   # Build TypeScript
npm start       # Production mode
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_AUTH_TOKEN` | Claude API key (used by claude-executor) |
| `ANTHROPIC_BASE_URL` | Optional API base URL override |

## Port Mapping

| Port | Service |
|------|---------|
| 8000 | Agent Service (executor manager + WebUI) |
| 3000 | Obsidian noVNC web interface |
| 3001 | Obsidian reserved |
| 3002 | Claude Code Executor API |
| 3003 | Puppeteer Executor API |

## Volume Mounts

- `./vaults` - Shared vault directory (mounted to all containers as `/vaults`)
- `./config` - Obsidian configuration
- `./agent-service/config` - Executor configuration (YAML)
