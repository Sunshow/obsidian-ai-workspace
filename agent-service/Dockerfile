# Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/web
COPY web/package*.json ./
RUN npm install
COPY web/ ./
RUN npm run build

# Build backend
FROM node:20-alpine AS backend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY tsconfig.json nest-cli.json ./
COPY src/ ./src/
RUN npm run build

# Production image
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=backend-builder /app/dist ./dist
COPY --from=frontend-builder /app/public ./public

RUN mkdir -p /app/config

ENV NODE_ENV=production
ENV AGENT_PORT=8000

EXPOSE 8000

CMD ["node", "dist/main.js"]
