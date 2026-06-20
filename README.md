# 英语阅读学习网站

Node.js + Express 5 + MongoDB 构建的英语学习平台

## 快速开始

```bash
npm install
cp .env.example .env
node scripts/seed.js      # 基础数据
node scripts/seed-articles.js
node scripts/seed-grammar.js
node scripts/make-admin.js admin@test.com
npm run dev
```

## 访问地址

| 界面 | 地址 | 账号 |
|------|------|------|
| 用户端 | http://localhost:3000/demo/login | 注册 |
| 管理端 | http://localhost:3000/admin/login | admin@test.com |

## 功能

**用户端:** 分级阅读、单词点击翻译、句子翻译+语法解读、生词高亮、分句标注、生词本(SM-2)、词典、语法练习、打卡、AI 辅助

**管理端:** 用户管理、邀请码、文章管理、打卡统计、AI 监控、系统设置

## 技术栈

Express 5 · MongoDB · EJS · JWT · Nodemailer · OpenAI/DeepSeek/MiMo · SM-2

## 文档

完整文档见 Obsidian: `个人开发/英语阅读网站/`
