# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Obsidian AI Workspace - A Docker-based microservices solution with three independent containers:
- **Obsidian** - Desktop app via noVNC (optional)
- **Claude Code Executor** - Claude Code CLI HTTP API
- **Puppeteer Executor** - Web scraping HTTP API

## Build and Run Commands

```bash
# Build and start all containers
docker compose up -d --build

# Start specific services only
docker compose up -d claude-executor puppeteer-executor

# Rebuild without cache
docker compose build --no-cache && docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

## Architecture

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│    Obsidian     │  │ ClaudeCode      │  │  Puppeteer      │
│  (linuxserver)  │  │   Executor      │  │   Executor      │
│   :3000/:3001   │  │     :3002       │  │     :3003       │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │
         └────────────────────┴────────────────────┘
                              │
                        ./vaults (共享)
```

### Claude Code Executor (`claude-executor/`)

Express server wrapping Claude Code CLI on port 3002.

**Endpoints:**
- `GET /health` - Health check
- `POST /v1/chat/completions` - OpenAI-compatible chat API
- `POST /api/chat` - Simplified chat endpoint

**Development:**
```bash
cd claude-executor
npm install
npm run dev     # Development mode
npm run build   # Build TypeScript
npm start       # Production mode
```

### Puppeteer Executor (`puppeteer-executor/`)

Express server providing web scraping API on port 3003.

**Endpoints:**
- `GET /health` - Health check
- `POST /api/fetch` - Fetch and parse web page content
- `POST /api/fetch/screenshot` - Take page screenshot

**Development:**
```bash
cd puppeteer-executor
npm install
npm run dev     # Development mode
npm run build   # Build TypeScript
npm start       # Production mode
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_AUTH_TOKEN` | Claude API key |
| `ANTHROPIC_BASE_URL` | Optional API base URL override |

## Port Mapping

| Port | Service |
|------|---------|
| 3000 | Obsidian noVNC web interface |
| 3001 | Obsidian reserved |
| 3002 | Claude Code Executor API |
| 3003 | Puppeteer Executor API |

## Volume Mounts

- `./vaults` - Shared vault directory (mounted to all containers as `/vaults`)
- `./config` - Obsidian configuration
