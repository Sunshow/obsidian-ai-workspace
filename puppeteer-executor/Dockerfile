# Puppeteer Executor
# 基于官方 Puppeteer 镜像，提供网页抓取 HTTP API

FROM ghcr.io/puppeteer/puppeteer:latest

# 切换到 root 用户进行安装
USER root

# 设置工作目录并修复权限
WORKDIR /app
RUN chown -R pptruser:pptruser /app

# 复制依赖文件并设置权限
COPY --chown=pptruser:pptruser package*.json ./

# 切换回 pptruser 安装依赖
USER pptruser

# 安装依赖
RUN npm install

# 复制源代码（需要 root 权限）
USER root
COPY --chown=pptruser:pptruser src ./src
COPY --chown=pptruser:pptruser tsconfig.json ./

# 切换回 pptruser 构建
USER pptruser

# 构建 TypeScript
RUN npm run build

ENV AGENT_PORT=3003

EXPOSE 3003

CMD ["node", "dist/index.js"]
