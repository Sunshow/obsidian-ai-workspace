# 任务拆分与开发计划

## Phase 1 - MVP（最小可行产品）

### 1. 基础镜像构建

- [ ] **1.1 Dockerfile 编写**
  - 基于 Ubuntu 22.04
  - 安装 Xvfb、x11vnc、noVNC
  - 安装 Node.js 20 LTS
  - 安装 Python 3.11
  - 配置中文字体支持

- [ ] **1.2 Obsidian 安装脚本**
  - 下载 Obsidian AppImage
  - 配置可执行权限
  - 创建启动脚本

- [ ] **1.3 supervisord 进程管理**
  - Xvfb 虚拟显示服务
  - x11vnc VNC 服务
  - noVNC Web 服务
  - Obsidian 应用
  - Web Service

- [ ] **1.4 entrypoint 启动脚本**
  - 环境变量校验
  - Vault 目录初始化
  - 进程启动顺序控制

### 2. Web Service 开发

- [ ] **2.1 项目初始化**
  - Node.js + Express + TypeScript 项目结构
  - 依赖安装（express, jsonwebtoken, http-proxy, marked 等）
  - tsconfig 配置
  - 开发/构建脚本

- [ ] **2.2 认证模块**
  - 登录页面（静态 HTML）
  - POST /api/auth/login 接口
  - JWT token 生成与验证
  - 认证中间件

- [ ] **2.3 noVNC WebSocket 代理**
  - HTTP 代理到 noVNC 静态资源
  - WebSocket 代理到 VNC 服务
  - 认证保护

- [ ] **2.4 笔记分享模块**
  - 分享链接生成 API
  - Markdown 文件读取与解析
  - HTML 渲染（支持 Obsidian 语法）
  - 可选密码保护

### 3. Agent 集成

- [ ] **3.1 Claude Code CLI 配置**
  - 安装 Claude Code (npm install -g @anthropic-ai/claude-code)
  - 配置 API Key 环境变量
  - 工作目录配置

- [ ] **3.2 Agent API 接口**
  - POST /api/agent/fetch-note 接口定义
  - 请求参数验证
  - 响应格式定义

- [ ] **3.3 fetch-note 任务实现**
  - URL 内容抓取（使用 puppeteer 或 readability）
  - 调用 Claude Code 整理内容
  - 生成 Markdown 笔记
  - 写入 Vault 指定目录

### 4. 集成与测试

- [ ] **4.1 docker-compose.yml**
  - 服务定义
  - 卷挂载配置
  - 环境变量模板

- [ ] **4.2 端到端测试**
  - 容器启动测试
  - 认证流程测试
  - Obsidian 访问测试
  - 分享功能测试
  - Agent 任务测试

- [ ] **4.3 README 文档**
  - 快速开始指南
  - 配置说明
  - 使用示例

---

## Phase 2 - 功能扩展（后续）

### Agent 增强
- [ ] 多 Agent 后端支持（OpenAI、本地 LLM）
- [ ] 更多预设任务
  - 每日笔记总结
  - 标签自动整理
  - 死链检测与修复
  - 笔记模板生成

### 分享增强
- [ ] 分享链接时效控制
- [ ] 分享访问统计
- [ ] 多笔记批量分享

### 用户体验
- [ ] 移动端适配优化
- [ ] 快捷键支持
- [ ] 主题切换

---

## 开发优先级

```
高优先级（MVP 必须）
├── 1.1 Dockerfile
├── 1.2 Obsidian 安装
├── 1.3 supervisord 配置
├── 2.1 项目初始化
├── 2.2 认证模块
└── 2.3 noVNC 代理

中优先级（MVP 功能完整）
├── 1.4 entrypoint 脚本
├── 2.4 分享模块
├── 3.1 Claude Code 配置
├── 3.2 Agent API
└── 3.3 fetch-note 任务

低优先级（完善）
├── 4.1 docker-compose
├── 4.2 测试
└── 4.3 文档
```

---

## 预估工时

| 任务组 | 预估时间 |
|--------|----------|
| 基础镜像构建 | 4-6 小时 |
| Web Service | 6-8 小时 |
| Agent 集成 | 4-6 小时 |
| 集成测试 | 2-4 小时 |
| **总计** | **16-24 小时** |
