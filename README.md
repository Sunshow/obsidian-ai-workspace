# Obsidian AI Workspace

一个基于 Docker 的微服务解决方案，将 Obsidian 桌面应用与 AI Agent 执行器集成。

## 功能特性

- **Agent Service** - NestJS 执行器管理器 + WebUI（端口 8000）
- **Obsidian 桌面应用** - 通过 noVNC 提供 Web 访问（端口 3000）
- **Claude Code Executor** - Claude Code CLI HTTP API 封装（端口 3002）
- **Playwright Executor** - 网页抓取服务（端口 53333）

## 快速开始

### 使用 Docker Compose（开发模式）

从源码构建运行：

```bash
git clone <repo-url>
cd obsidian-ai-workspace
mkdir -p vaults config

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入 ANTHROPIC_AUTH_TOKEN 等配置

# 构建并启动
docker compose up -d --build
```

### 使用预构建镜像（生产部署）

提供两种部署方案：

#### 完整版 (allinone)

包含 Obsidian 桌面应用 + 所有执行器：

```bash
cd deploy/allinone
cp .env.example .env
# 编辑 .env 文件

docker compose up -d
```

#### 无界面版 (headless)

仅 Agent 服务和执行器，不含 Obsidian：

```bash
cd deploy/headless
cp .env.example .env
# 编辑 .env 文件

docker compose up -d
```

## 架构

```
┌─────────────────────────────────────────────────────────────────┐
│                       Agent Service (:8000)                      │
│              NestJS - Executor Manager + WebUI                   │
└────────────────────────────┬────────────────────────────────────┘
                             │ manages/monitors
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│    Obsidian     │  │ Claude Code     │  │   Playwright    │
│  (linuxserver)  │  │   Executor      │  │   Executor      │
│     :3000       │  │     :3002       │  │    :53333       │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │
         └────────────────────┴────────────────────┘
                              │
                        ./vaults (shared)
```

## 配置说明

复制 `.env.example` 到 `.env` 并配置：

| 环境变量 | 说明 | 默认值 |
|----------|------|--------|
| ANTHROPIC_AUTH_TOKEN | Claude API Key | 空 |
| ANTHROPIC_BASE_URL | API Base URL（可选） | 空 |
| CLAUDE_DEFAULT_MODEL | 默认模型 | claude-sonnet-4-5-20250929 |
| PUID | 用户 ID | 1000 |
| PGID | 组 ID | 1000 |
| TZ | 时区 | Asia/Shanghai |

## 端口映射

| 端口 | 服务 |
|------|------|
| 8000 | Agent Service (执行器管理 + WebUI) |
| 3000 | Obsidian noVNC Web 界面 |
| 3002 | Claude Code Executor API |
| 53333 | Playwright Executor |

## 目录挂载

- `./vaults` - 共享 Vault 目录（挂载到所有容器的 `/vaults`）
- `./config` - Obsidian 配置（插件、主题、设置）
- `./agent-service/config` - 执行器配置（YAML）

## 开发计划

- [x] 基础镜像（Obsidian Web 访问）
- [x] Agent Service（执行器管理 + WebUI）
- [x] Claude Code Executor
- [x] Playwright Executor
- [ ] 更多 AI Agent 集成

## 许可证

MIT License
