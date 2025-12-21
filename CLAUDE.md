# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Obsidian AI Workspace - A Docker-based solution that runs Obsidian Desktop in a container with web access (via noVNC) and AI Agent integration (Claude Code CLI).

## Build and Run Commands

```bash
# Build and start the container
docker compose up -d --build

# Rebuild without cache
docker compose build --no-cache && docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

## Agent Service Development

The agent service is a Node.js/TypeScript Express server located in `agent-service/`.

```bash
cd agent-service

# Install dependencies
npm install

# Build TypeScript
npm run build

# Development mode (with ts-node)
npm run dev

# Production mode
npm start
```

## Architecture

### Container Structure

The Docker image extends `linuxserver/obsidian` and adds:
- Node.js 22 LTS
- Claude Code CLI (`@anthropic-ai/claude-code`)
- Puppeteer with Chrome for web scraping
- Agent service for API endpoints

### Agent Service (`agent-service/src/`)

Express server running on port 3002 (configurable via `AGENT_PORT`):

- `index.ts` - Application entry point, registers routes
- `routes/agent.ts` - Agent task endpoints (`POST /api/agent/fetch-note`)
- `routes/chat.ts` - OpenAI-compatible chat API (`POST /v1/chat/completions`, `POST /api/chat`)
- `tasks/fetch-note.ts` - Web scraping and Claude summarization task

### Key Integrations

**Claude Code CLI**: The chat endpoint spawns `claude` CLI with `-p` flag for prompt mode. Environment variables `ANTHROPIC_API_KEY` (from `ANTHROPIC_AUTH_TOKEN`) and `ANTHROPIC_BASE_URL` are passed to the subprocess.

**Web Scraping Pipeline** (`fetch-note.ts`):
1. Puppeteer fetches the URL
2. Readability extracts article content
3. Claude API summarizes to Markdown
4. Note saved to vault directory

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_AUTH_TOKEN` | Claude API key (used as `ANTHROPIC_API_KEY` internally) |
| `ANTHROPIC_BASE_URL` | Optional API base URL override |
| `AGENT_PORT` | Agent service port (default: 3002) |

## Port Mapping

| Port | Service |
|------|---------|
| 3000 | noVNC web interface |
| 3001 | Reserved |
| 3002 | Agent service API |

## Volume Mounts

- `/vaults` - Obsidian vault data (mounted from `./vaults`)
- `/config` - Obsidian configuration and home directory for Claude Code
