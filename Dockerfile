# Obsidian AI Workspace
# 基于 linuxserver/obsidian 扩展，添加 AI Agent 支持

FROM linuxserver/obsidian:latest

LABEL maintainer="sunshow" \
      org.opencontainers.image.title="Obsidian AI Workspace" \
      org.opencontainers.image.description="Obsidian in Docker with AI Agent support"

# 安装 Node.js 22 LTS 和 Puppeteer 依赖
RUN apt-get update && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs \
    # Puppeteer dependencies
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 \
    libxrandr2 libgbm1 libasound2 && \
    apt-get clean && rm -rf /var/lib/apt/lists/* /var/tmp/* /tmp/*

RUN node --version && npm --version

# 安装 Claude Code CLI
RUN npm install -g @anthropic-ai/claude-code

# === 稳定依赖层 (很少变动,利用 Docker 缓存) ===
WORKDIR /app/agent-service
COPY agent-service/package*.json ./
ENV PUPPETEER_CACHE_DIR=/opt/puppeteer-cache

# 安装依赖和 Puppeteer 浏览器 (这层很少变动,会被缓存)
RUN npm install && npx puppeteer browsers install chrome

# === 频繁变动层 (放最后) ===
# 复制源代码并构建
COPY agent-service/src ./src
COPY agent-service/tsconfig.json ./
RUN npm run build

# 复制 s6 服务配置
COPY root/ /

WORKDIR /

ENV ANTHROPIC_BASE_URL=""
ENV ANTHROPIC_AUTH_TOKEN=""
ENV AGENT_PORT=3002
ENV PUPPETEER_CACHE_DIR=/opt/puppeteer-cache

EXPOSE 3000 3001 3002
