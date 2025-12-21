# Obsidian AI Workspace
# 基于 linuxserver/obsidian 扩展，添加 AI Agent 支持

FROM linuxserver/obsidian:latest

LABEL maintainer="sunshow" \
      org.opencontainers.image.title="Obsidian AI Workspace" \
      org.opencontainers.image.description="Obsidian in Docker with AI Agent support"

# 安装 Node.js 22 LTS（用于 AI Agent）
RUN apt-get update && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/* /var/tmp/* /tmp/*

RUN node --version && npm --version

ENV ANTHROPIC_BASE_URL=""
ENV ANTHROPIC_AUTH_TOKEN=""

EXPOSE 3000 3001
