# 架构设计文档

## 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Container                      │
│  ┌─────────────────┐  ┌─────────────────────────────┐   │
│  │   Obsidian      │  │      Web Service            │   │
│  │   Desktop       │  │  (Node.js + TypeScript)     │   │
│  │   + noVNC       │◄─┤  - 认证代理                  │   │
│  │   (端口 6080)    │  │  - 分享服务                  │   │
│  └─────────────────┘  │  - Agent API                │   │
│          ▲            └──────────┬──────────────────┘   │
│          │                       │                       │
│  ┌───────┴───────┐      ┌───────▼───────┐               │
│  │  X11/Xvfb     │      │  Claude Code  │               │
│  │  虚拟显示器    │      │  (CLI Agent)  │               │
│  └───────────────┘      └───────────────┘               │
│          │                       │                       │
│  ════════╪═══════════════════════╪══════════════════    │
│          └───────────┬───────────┘                       │
│                      ▼                                   │
│              /vault (挂载点)                             │
└─────────────────────────────────────────────────────────┘
```

## 核心组件

### 1. 基础镜像层

| 组件 | 版本/选型 | 用途 |
|------|-----------|------|
| 基础系统 | Ubuntu 22.04 / Debian 12 | 稳定的 Linux 基础 |
| 虚拟显示 | Xvfb | 无头 X11 显示服务器 |
| VNC 服务 | x11vnc | 将 X11 显示暴露为 VNC |
| Web VNC | noVNC | 浏览器访问 VNC |
| Obsidian | AppImage (最新版) | 笔记客户端 |
| Node.js | 20 LTS | Web Service 运行时 |
| Python | 3.11 | Claude Code 依赖 |

### 2. Web Service

技术栈：**Node.js + Express + TypeScript**

选型理由：
- 与前端生态统一
- noVNC WebSocket 集成方便
- TypeScript 提供类型安全

#### 模块划分

| 模块 | 职责 |
|------|------|
| **Auth** | 用户认证，JWT session 管理 |
| **Proxy** | 认证后代理 noVNC WebSocket 连接 |
| **Share** | 解析 Vault md 文件，渲染为只读 HTML，支持密码保护 |
| **Agent** | REST API 调用 Claude Code 执行任务 |

### 3. Claude Code 集成

- 通过环境变量 `ANTHROPIC_API_KEY` 传入 API Key
- Agent 工作目录限定为 `/vault`
- 首个任务接口：
  - `POST /api/agent/fetch-note`
  - 输入: `{ url: "https://..." }`
  - 流程: 抓取网页 → Claude 整理摘要 → 写入 Vault

## 目录结构

```
obsidian-ai-workspace/
├── Dockerfile                  # 主镜像定义
├── docker-compose.yml          # 编排配置
├── scripts/
│   ├── entrypoint.sh          # 容器启动脚本
│   └── install-obsidian.sh    # Obsidian 安装脚本
├── web/                        # Web Service 源码
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts           # 应用入口
│   │   ├── auth/              # 认证模块
│   │   │   ├── middleware.ts
│   │   │   └── routes.ts
│   │   ├── proxy/             # noVNC 代理
│   │   │   └── vnc-proxy.ts
│   │   ├── share/             # 分享模块
│   │   │   ├── routes.ts
│   │   │   └── renderer.ts
│   │   └── agent/             # Agent API
│   │       ├── routes.ts
│   │       └── tasks/
│   │           └── fetch-note.ts
│   └── public/                # 静态资源
│       └── login.html
├── config/
│   └── supervisord.conf       # 进程管理配置
├── REQUIREMENTS.md            # 需求文档
├── ARCHITECTURE.md            # 架构文档（本文件）
├── TASKS.md                   # 任务清单
└── README.md                  # 项目说明
```

## 环境变量

| 变量 | 说明 | 必填 | 默认值 |
|------|------|------|--------|
| `AUTH_USERNAME` | 登录用户名 | 否 | admin |
| `AUTH_PASSWORD` | 登录密码 | **是** | - |
| `ANTHROPIC_API_KEY` | Claude API Key | 否 | - |
| `VAULT_PATH` | Vault 挂载路径 | 否 | /vault |
| `PORT` | Web 服务端口 | 否 | 8080 |
| `JWT_SECRET` | JWT 签名密钥 | 否 | 随机生成 |

## 端口映射

| 内部端口 | 用途 | 是否暴露 |
|----------|------|----------|
| 8080 | Web Service 主入口 | 是 |
| 6080 | noVNC 原始端口 | 否（通过代理访问） |
| 5900 | VNC 服务端口 | 否（内部使用） |

## 部署方式

### 使用 docker-compose（推荐）

```yaml
version: '3.8'
services:
  obsidian:
    image: obsidian-ai-workspace:latest
    ports:
      - "8080:8080"
    volumes:
      - ./my-vault:/vault
    environment:
      - AUTH_USERNAME=admin
      - AUTH_PASSWORD=your-secure-password
      - ANTHROPIC_API_KEY=sk-ant-xxx
    restart: unless-stopped
```

### 使用 docker run

```bash
docker run -d \
  -p 8080:8080 \
  -v ./my-vault:/vault \
  -e AUTH_PASSWORD=your-password \
  -e ANTHROPIC_API_KEY=sk-ant-xxx \
  obsidian-ai-workspace:latest
```

## 安全考虑

1. **认证保护**: 所有 Obsidian 和 Agent 操作都需要认证
2. **密码传输**: 使用 HTTPS（生产环境需配置反向代理）
3. **API Key 安全**: 仅存在于容器环境变量中，不落盘
4. **Agent 沙箱**: Claude Code 工作目录限定在 /vault
