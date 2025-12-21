# Obsidian AI Workspace

在 Docker 中运行 Obsidian，支持 Web 访问和 AI Agent。

## 快速开始

1. 克隆项目并创建必要目录：

```bash
git clone <repo-url>
cd obsidian-ai-workspace
mkdir -p vaults config
```

2. 修改 `docker-compose.yml` 中的配置（密码、时区等）

3. 构建并启动：

```bash
docker compose up -d --build
```

4. 访问 `http://localhost:3000`

## 配置说明

| 环境变量 | 说明 | 默认值 |
|----------|------|--------|
| PUID | 用户 ID | 1000 |
| PGID | 组 ID | 1000 |
| TZ | 时区 | Asia/Shanghai |
| CUSTOM_USER | HTTP Basic Auth 用户名 | 空 |
| PASSWORD | HTTP Basic Auth 密码 | 空 |
| ANTHROPIC_API_KEY | Claude API Key | 空 |

## 目录挂载

- `/vaults` - Obsidian Vault 目录
- `/config` - Obsidian 配置（插件、主题、设置）

## 开发计划

- [x] 基础镜像（Obsidian Web 访问）
- [ ] Web Service（认证代理、分享功能）
- [ ] AI Agent 集成（Claude Code）
