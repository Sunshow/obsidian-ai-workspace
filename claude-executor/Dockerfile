# Claude Code Executor
# 基于 node:22-slim，提供 Claude Code CLI 的 HTTP API 封装

FROM node:22-slim

# 安装 Claude Code CLI
RUN npm install -g @anthropic-ai/claude-code

# 设置工作目录
WORKDIR /app

# 复制依赖文件
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制源代码
COPY src ./src
COPY tsconfig.json ./

# 构建 TypeScript
RUN npm run build

# 环境变量
ENV ANTHROPIC_BASE_URL=""
ENV ANTHROPIC_AUTH_TOKEN=""
ENV AGENT_PORT=3002

EXPOSE 3002

CMD ["node", "dist/index.js"]
