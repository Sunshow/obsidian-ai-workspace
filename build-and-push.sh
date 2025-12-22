#!/bin/bash

set -e

# Docker Hub 用户名
DOCKER_USER="sunshow"

# 版本号，默认 latest
VERSION="${1:-latest}"

# 镜像名称
AGENT_SERVICE_IMAGE="${DOCKER_USER}/obsidian-agent-service"
CLAUDE_EXECUTOR_IMAGE="${DOCKER_USER}/obsidian-claude-executor"

# 平台
PLATFORMS="linux/amd64,linux/arm64"

echo "=== Building and pushing images with version: ${VERSION} ==="

# 创建/使用 buildx builder
docker buildx create --name multiarch --use 2>/dev/null || docker buildx use multiarch

# 构建并推送 agent-service
echo "=== Building ${AGENT_SERVICE_IMAGE} ==="
docker buildx build --platform ${PLATFORMS} \
  -t ${AGENT_SERVICE_IMAGE}:${VERSION} \
  -t ${AGENT_SERVICE_IMAGE}:latest \
  --push ./agent-service

# 构建并推送 claude-executor
echo "=== Building ${CLAUDE_EXECUTOR_IMAGE} ==="
docker buildx build --platform ${PLATFORMS} \
  -t ${CLAUDE_EXECUTOR_IMAGE}:${VERSION} \
  -t ${CLAUDE_EXECUTOR_IMAGE}:latest \
  --push ./claude-executor

echo "=== Done! ==="
echo "Images pushed:"
echo "  - ${AGENT_SERVICE_IMAGE}:${VERSION}"
echo "  - ${AGENT_SERVICE_IMAGE}:latest"
echo "  - ${CLAUDE_EXECUTOR_IMAGE}:${VERSION}"
echo "  - ${CLAUDE_EXECUTOR_IMAGE}:latest"
