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

# 复制并构建 Agent Service
COPY agent-service /app/agent-service
WORKDIR /app/agent-service
ENV PUPPETEER_CACHE_DIR=/opt/puppeteer-cache
RUN npm install && npm run build && \
    npx puppeteer browsers install chrome

# 复制 s6 服务配置
COPY root/ /

WORKDIR /

ENV ANTHROPIC_BASE_URL=""
ENV ANTHROPIC_AUTH_TOKEN=""
ENV AGENT_PORT=3002
ENV PUPPETEER_CACHE_DIR=/opt/puppeteer-cache

EXPOSE 3000 3001 3002
