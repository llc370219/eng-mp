# 项目交接文档

## 📌 项目概述

| 项目 | 信息 |
|------|------|
| **项目名称** | 英语阅读学习网站 (eng-mp) |
| **项目类型** | Node.js Web 应用 |
| **技术栈** | Express 5 + MongoDB + Lull Design Component + JWT |
| **部署平台** | Railway + MongoDB Atlas |
| **项目地址** | https://github.com/llc370219/eng-mp |
| **在线访问** | https://backend-production-4413.up.railway.app |

---

## 🔗 所有在线链接

| 用途 | 链接 |
|------|------|
| **用户端首页** | https://backend-production-4413.up.railway.app |
| **注册分享链接（自动填充邀请码）** | https://backend-production-4413.up.railway.app/demo/register?invite=YAQ8EMM7 |
| **管理后台登录** | https://backend-production-4413.up.railway.app/admin/login |

---

## 🔑 账号信息

### 网站管理员
| 项目 | 值 |
|------|-----|
| 邮箱 | llc370219@gmail.com |
| 密码 | airmess6677 |
| 登录地址 | https://backend-production-4413.up.railway.app/admin/login |

### 邀请码
| 项目 | 值 |
|------|-----|
| 邀请码 | YAQ8EMM7 |
| 可用次数 | 20 次 |
| 分享链接 | https://backend-production-4413.up.railway.app/demo/register?invite=YAQ8EMM7 |

### Railway
| 项目 | 值 |
|------|-----|
| 登录方式 | GitHub 账号 |
| 项目 ID | `50c741ed-1ff2-4a48-85c2-e30b46197c07` |
| 服务 ID | `13f640c0-482b-430a-8de0-026b2c5834e5` |
| 域名 | https://backend-production-4413.up.railway.app |

### MongoDB Atlas
| 项目 | 值 |
|------|-----|
| 集群 | Cluster0 (M0 Sandbox, 512MB) |
| 数据库名 | eng-reader |
| 用户名 | llc370219 |
| 网络访问 | 0.0.0.0/0（允许所有 IP） |

### GitHub
| 项目 | 值 |
|------|-----|
| 仓库地址 | https://github.com/llc370219/eng-mp |
| 默认分支 | main |
| Remote URL | `https://github.com/llc370219/eng-mp.git` |

---

## 🖥️ 在线链接行为说明

### 用户首次访问
1. 打开 https://backend-production-4413.up.railway.app
2. 重定向到 Lull·听简前端设计稿
3. **首次访问 → 显示登录/注册页面**（Lull 设计稿登录 UI）
4. 用户输入邮箱 + 密码 + 邀请码 → 注册并登录
5. 登录后进入文章书架

### 注册分享链接
1. 打开 https://backend-production-4413.up.railway.app/demo/register?invite=YAQ8EMM7
2. 重定向到 Lull 前端，**自动填写邀请码**
3. 用户只需填写邮箱、密码，点击「获取验证码」
4. 输入验证码，完成注册并登录

### 管理员访问
1. 打开 https://backend-production-4413.up.railway.app/admin/login
2. 输入管理员邮箱和密码
3. 登录后进入管理后台

---

## 🏗️ 系统架构

### 路由架构
```
/                          → 302 重定向到 /Lull-Reading.dc.html
/Lull-Reading.dc.html      → Lull·听简前端设计稿（首页）
/demo/register?invite=XXX  → 302 重定向到 Lull 前端（带邀请码）
/admin/login               → 管理后台登录页
/admin/*                   → 管理后台（EJS 模板渲染）
/api/auth/*                → 认证 API（register、login、send-code、refresh）
/api/articles/*            → 文章 CRUD API
/api/vocab/*               → 生词本 API
/api/ai/*                  → AI 服务 API
/api/grammar/*             → 语法 API
```

### 前端加载流程
```
Lull-Reading.dc.html
  ├── 加载 ./support.js（Design Component 引擎）
  ├── 加载 ./Flower.dc.html（花朵装饰子组件）
  ├── componentDidMount()
  │   ├── 有 token → screen: 'articles'
  │   └── 无 token → screen: 'login'（显示登录/注册页）
  │       └── 有 invite 参数 → 自动注册模式 + 填充邀请码
  └── 登录/注册
      ├── 调用 /api/auth/login 或 /api/auth/register
      └── 成功 → 存储 token → 进入 articles 页
```

---

## 🤖 AI 配置

| 配置项 | 值 |
|--------|-----|
| **默认提供商** | DeepSeek V4 Flash |
| **模型** | deepseek-v4-flash |
| **API Key** | sk-fe58367779654d0084f7e5b59403a2b4 |
| **配置位置** | Railway 环境变量 + src/config/index.js |

### 修改 AI 配置
```bash
# 方式1: 在 Railway 环境变量中修改
railway variable set AI_PROVIDER=deepseek --service backend
railway variable set DEEPSEEK_V4_FLASH_API_KEY=新key --service backend

# 方式2: 在管理后台「系统设置」中修改（优先于环境变量）
```

---

## 📁 核心文件说明

### 前端文件
| 文件 | 说明 |
|------|------|
| `frontend/Lull-Reading.dc.html` | Lull 前端主文件，含登录、阅读、AI 等功能 |
| `frontend/support.js` | Design Component 运行时引擎 |
| `frontend/Flower.dc.html` | 花朵装饰子组件 |
| `frontend/articles-data.js` | 前端文章数据 |

### 后端核心文件
| 文件 | 说明 |
|------|------|
| `src/app.js` | Express 应用入口，路由和中间件注册 |
| `src/config/index.js` | 配置文件 |
| `src/services/ai.js` | AI 服务（所有 AI 调用统一接口） |
| `src/controllers/authController.js` | 认证控制器 |
| `src/routes/demo.js` | 前端路由（/demo 开头） |
| `src/routes/admin.js` | 管理后台路由 |
| `src/models/` | 数据模型（User, Article, InviteCode 等） |

### 工具脚本
| 脚本 | 用途 |
|------|------|
| `scripts/setup-admin.js` | 初始化管理员账号 + 清理测试用户 |
| `scripts/create-invite.js` | 生成邀请码 |
| `scripts/seed.js` | 初始化基础数据 |
| `scripts/seed-articles.js` | 初始化文章数据 |
| `scripts/seed-grammar.js` | 初始化语法数据 |

---

## 🚀 部署与运维

### 常用 Railway CLI 命令
```bash
# 查看日志
railway logs --service backend

# 重新部署
railway up --service backend
railway redeploy --service backend --yes

# 查看/设置环境变量
railway variables --service backend
railway variable set KEY=VALUE --service backend --skip-deploys

# 连接数据库
railway connect mongo

# 查看服务状态
railway status
```

### 数据库维护
```bash
# 初始化管理员
MONGODB_URI="mongodb+srv://..." node scripts/setup-admin.js

# 生成邀请码
MONGODB_URI="mongodb+srv://..." node scripts/create-invite.js 20 "备注"

# 备份
mongodump --uri="mongodb+srv://..." --out=backup/

# 恢复
mongorestore --uri="mongodb+srv://..." backup/
```

---

## ❓ 常见问题与故障排查

### 访问网页看不到登录页
- **症状**: 打开首页直接看到文章列表
- **原因**: 可能已登录（浏览器中有 token），或前端缓存
- **解决**: 清除浏览器缓存和 localStorage，或使用无痕模式

### AI 生文不工作
- **检查**: `railway variables --service backend | grep AI`
- **确保**: `DEEPSEEK_V4_FLASH_API_KEY` 已配置且有效
- **确保**: `AI_PROVIDER` 为 `deepseekv4flash`

### 邀请码无法注册
- **检查**: 邀请码是否还有剩余次数
- **方法**: 在管理后台「邀请码管理」中查看
- **新建**: `node scripts/create-invite.js 20 "新邀请码"`

### 部署更新不生效
- **检查**: GitHub 是否已推送最新代码
- **重试**: `railway up --service backend` 或 `railway redeploy --service backend --yes`
- **强制**: 在 Railway 网页上手动触发重新部署

---

## 📅 更新日志

### 2026-06-21
- ✅ 完成 Railway 部署
- ✅ 配置 MongoDB Atlas
- ✅ 部署 Lull·听简前端设计稿
- ✅ 前端集成后端 API（登录/注册/发送验证码）
- ✅ 分享链接自动填充邀请码
- ✅ 默认 AI 提供商配置为 DeepSeek V4 Flash
- ✅ 管理员账号配置（llc370219@gmail.com）
- ✅ 清理测试用户
- ✅ 修复首次访问不显示登录页 bug
- ✅ 编写完整项目文档和交接文档

---

*本文档最后更新时间: 2026-06-21*
