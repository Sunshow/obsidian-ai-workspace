# Puppeteer Executor
# 基于官方 Puppeteer 镜像，提供网页抓取 HTTP API

FROM ghcr.io/puppeteer/puppeteer:latest

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

ENV AGENT_PORT=3003

EXPOSE 3003

CMD ["node", "dist/index.js"]
