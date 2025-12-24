# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Obsidian AI Workspace - A Docker-based microservices solution integrating Obsidian with AI Agent executors:
- **Agent Service** - NestJS executor manager with WebUI, Skills system (port 8000)
- **Obsidian** - Desktop app via noVNC (optional, port 3000)
- **Claude Code Executor** - Claude Code CLI HTTP API (port 3002)
- **Playwright Executor** - Web scraping with Playwright (port 53333)

## Build and Run Commands

```bash
# Build and start all containers
docker compose up -d --build

# Start specific services (without Obsidian desktop)
docker compose up -d agent-service claude-executor playwright-executor

# Rebuild without cache
docker compose build --no-cache && docker compose up -d

# View logs
docker compose logs -f [service-name]

# Stop
docker compose down
```

### Production Deployment

Two deployment options available in `deploy/`:
- `deploy/allinone/` - Full stack with Obsidian desktop
- `deploy/headless/` - Agent service and executors only

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       Agent Service (:8000)                      │
│              NestJS - Executor Manager + WebUI + Skills          │
└────────────────────────────┬────────────────────────────────────┘
                             │ manages/monitors/invokes
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│    Obsidian     │  │ Claude Code     │  │  Playwright     │
│  (linuxserver)  │  │   Executor      │  │   Executor      │
│     :3000       │  │     :3002       │  │    :53333       │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │
         └────────────────────┴────────────────────┘
                              │
                        ./vaults (shared)
```

## Service Details

### Agent Service (`agent-service/`)

NestJS application managing executors and providing a skills workflow engine.

**Tech Stack:** NestJS + TypeScript + js-yaml + playwright-core

**Key Modules:**
- `src/executors/` - Executor CRUD and health monitoring
- `src/executor-types/` - Handler implementations (claudecode, playwright, puppeteer, agent)
- `src/skills/` - Workflow engine with YAML-defined skills

**API Endpoints:**
- `GET /api/executors` - List executors
- `POST /api/executors/:name/invoke` - Invoke executor action
- `POST /api/executors/check-all` - Health check all
- `GET /api/executor-types` - List supported executor types
- `GET /api/skills` - List available skills
- `POST /api/skills/:id/execute` - Execute a skill with user inputs
- `GET /api/skills/definitions` - Get all skill definitions
- `POST /api/skills/smart-fetch` - Built-in web clip workflow

**Configuration:**
- `config/executors.yaml` - Executor instances configuration
- `config/skills.yaml` - Skills definitions and smartFetch config

**Development:**
```bash
cd agent-service
npm install
npm run start:dev   # Watch mode
npm run build       # Build
npm run lint        # ESLint
npm run format      # Prettier
```

### Claude Code Executor (`claude-executor/`)

Express server wrapping Claude Code CLI. Spawns `claude` CLI process per request.

**Endpoints:**
- `GET /health` - Health check
- `POST /v1/chat/completions` - OpenAI-compatible API (streaming SSE)
- `POST /api/chat` - Simplified chat endpoint

**Key implementation:** `src/routes/chat.ts` - spawns Claude CLI with `--output-format stream-json --dangerously-skip-permissions`

**Development:**
```bash
cd claude-executor
npm install
npm run dev     # ts-node development mode
npm run build   # TypeScript build
npm start       # Production mode
```

### Playwright Executor

Uses pre-built image `jacoblincool/playwright:chromium-light-server` exposing WebSocket endpoint at `/playwright`.

Agent Service connects via `playwright-core` library to perform:
- `fetch` - Page content extraction with @mozilla/readability
- `screenshot` - Full page or viewport screenshots

Handler implementation: `agent-service/src/executor-types/handlers/playwright.handler.ts`

## Skills System

The skills system allows defining multi-step workflows combining different executors.

**Skill Definition Structure (in `config/skills.yaml`):**
```yaml
skills:
  - id: unique-id
    name: Display Name
    description: What this skill does
    enabled: true
    builtinVariables:
      currentDate: true
      randomId: true
    userInputs:
      - name: url
        label: Input Label
        type: text|textarea|number|checkbox|select
        required: true
    steps:
      - id: step1
        executorType: playwright|claudecode|agent
        action: fetch|screenshot|chat|register-skill
        params:
          url: '{{url}}'
        outputVariable: result1
      - id: step2
        executorType: claudecode
        action: chat
        params:
          messages:
            - role: user
              content: 'Process: {{result1.data.textContent}}'
```

**Variable Reference:**
- User inputs: `{{inputName}}`
- Built-in: `{{currentDate}}`, `{{currentDatetime}}`, `{{randomId}}`
- Step outputs: `{{outputVar.data.xxx}}` (all returns wrapped in `data` field)

## Environment Variables

Copy `.env.example` to `.env`:

| Variable | Purpose | Default |
|----------|---------|---------|
| `ANTHROPIC_AUTH_TOKEN` | Claude API key | - |
| `ANTHROPIC_BASE_URL` | API base URL (optional) | - |
| `CLAUDE_DEFAULT_MODEL` | Default model | claude-sonnet-4-5-20250929 |

## Port Mapping

| Port | Service |
|------|---------|
| 8000 | Agent Service (WebUI + API) |
| 3000 | Obsidian noVNC web interface |
| 3002 | Claude Code Executor API |
| 53333 | Playwright WebSocket server |

## Volume Mounts

- `./vaults` - Shared vault directory (mounted as `/vaults` in all containers)
- `./config` - Obsidian configuration
- `./agent-service/config` - Executor and skills YAML configuration

## NestJS Development Notes

### DTO Validation (CRITICAL)

This project uses `ValidationPipe({ whitelist: true, transform: true })` globally. 

**IMPORTANT:** All DTO class properties MUST have class-validator decorators, otherwise they will be silently filtered out and never reach the service layer.

```typescript
// WRONG - properties will be stripped by whitelist
export class UpdateSkillDto {
  name?: string;
  enabled?: boolean;
}

// CORRECT - properties will pass through
export class UpdateSkillDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
```

Common decorators:
- `@IsOptional()` - for optional fields
- `@IsString()`, `@IsBoolean()`, `@IsNumber()` - type validation
- `@IsArray()`, `@IsObject()` - for complex types
