# 英语阅读学习网站 — 后端 API

Node.js + Express + MongoDB 构建的英语学习平台后端服务。

## 功能特性

- 📖 **分级阅读** — CEFR A1-C2 难度分级文章
- 📝 **阅读理解** — 选择题/判断题/填空题，自动判分
- 📚 **词汇学习** — 生词本 + SM-2 间隔重复算法
- 🎯 **智能推荐** — 根据水平和正确率动态推荐
- ❌ **错题本** — 自动记录错题，支持复习追踪
- 📊 **学习统计** — 连续天数、词汇增长、正确率趋势
- 📖 **词典查询** — 内置 ECDICT + 在线词典 API
- 📐 **语法学习** — 语法讲解 + 配套练习
- 🤖 **AI 辅助** — 摘要、翻译、智能出题、单词解析
- 🔒 **安全** — JWT 认证、速率限制、输入净化、Helmet

## 快速开始

### 方式一：本地运行

```bash
# 1. 安装 MongoDB
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 设置 MongoDB 连接等

# 4. 导入种子数据
node scripts/seed.js

# 5. 启动服务
npm run dev
# 访问 http://localhost:3000/api/health
```

### 方式二：Docker

```bash
docker compose up -d
```

## 项目结构

```
src/
├── app.js                    # Express 入口
├── config/                   # 配置（数据库、JWT、环境变量）
├── models/                   # Mongoose 数据模型 (8个)
├── routes/                   # API 路由 (9组)
├── controllers/              # 业务逻辑 (4个)
├── middlewares/              # 中间件（认证、校验、限流、安全）
├── services/                 # 服务层（SM-2、难度分析、词典、AI、推荐）
└── utils/                    # 工具函数
scripts/                      # 数据导入脚本
tests/                        # 单元测试
```

## API 文档

启动服务后访问 `GET /api/docs` 查看完整 API 列表。

### 主要接口

| 模块 | 接口 | 说明 |
|------|------|------|
| 认证 | POST /api/auth/register | 注册 |
| 认证 | POST /api/auth/login | 登录 |
| 文章 | GET /api/articles | 文章列表 |
| 文章 | GET /api/articles/daily | 每日推荐 |
| 练习 | POST /api/exercises/:id/submit | 提交答案 |
| 词汇 | POST /api/vocab | 添加生词 |
| 词汇 | GET /api/vocab/review | 今日复习 |
| 词典 | GET /api/dict/:word | 查词 |
| 语法 | GET /api/grammar | 语法列表 |
| AI | POST /api/ai/summarize | 文章摘要 |
| 用户 | GET /api/user/stats | 学习统计 |

## 数据导入

```bash
# 种子数据（开发测试）
node scripts/seed.js

# ECDICT 全量词典（77万词条）
# 下载: https://github.com/skywind3000/ECDICT/releases
node scripts/import-dict.js ~/Downloads/ecdict.csv

# 批量导入文章
node scripts/import-articles.js articles.json

# 批量导入语法
node scripts/import-grammar.js grammar.json
```

## 测试

```bash
npm test
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| PORT | 服务端口 | 3000 |
| NODE_ENV | 运行环境 | development |
| MONGODB_URI | MongoDB 连接 | mongodb://localhost:27017/eng-reader |
| JWT_SECRET | JWT 密钥 | - |
| JWT_EXPIRES_IN | Token 有效期 | 15m |
| JWT_REFRESH_SECRET | Refresh 密钥 | - |
| JWT_REFRESH_EXPIRES_IN | Refresh 有效期 | 7d |
| AI_PROVIDER | AI 提供商 | openai |
| OPENAI_API_KEY | OpenAI Key | - |
| CLAUDE_API_KEY | Claude Key | - |

## 技术栈

- **运行时** — Node.js
- **框架** — Express 5
- **数据库** — MongoDB + Mongoose
- **认证** — JWT (双 token)
- **AI** — OpenAI / Claude API
- **测试** — Jest + Supertest
- **安全** — Helmet + CORS + 速率限制 + 输入净化
