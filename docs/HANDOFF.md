# 项目交接文档

## 📌 项目概述

| 项目 | 信息 |
|------|------|
| **项目名称** | 英语阅读学习网站 (eng-mp) |
| **一句话描述** | 分级英语阅读 Web App，Lull·听简 Neo-Brutalism 风格前端 + Express/MongoDB 后端 + AI 生文 |
| **技术栈** | Express 5 · MongoDB (Mongoose) · Design Component (.dc.html) · EJS · JWT |
| **部署平台** | Railway (Express 容器) + MongoDB Atlas (M0 免费集群) |
| **GitHub** | https://github.com/llc370219/eng-mp |
| **在线地址** | https://backend-production-4413.up.railway.app |

---

## 🔗 所有在线链接

| 用途 | 链接 | 说明 |
|------|------|------|
| **用户端首页** | https://backend-production-4413.up.railway.app | 首次访问显示登录/注册页 |
| **注册分享链接** | https://backend-production-4413.up.railway.app/demo/register?invite=AQHU2Y | 自动填充邀请码 |
| **管理后台** | https://backend-production-4413.up.railway.app/admin/login | 管理员专用 |

---

## 🔑 账号信息

### 网站管理员
| 项目 | 值 |
|------|-----|
| 邮箱 | llc370219@gmail.com |
| 密码 | airmess6677 |
| 角色 | admin |
| 登录地址 | https://backend-production-4413.up.railway.app/admin/login |

### 当前邀请码
| 项目 | 值 |
|------|-----|
| 邀请码 | **AQHU2Y** |
| 格式 | 6 位（字母+数字，去掉 0/O/1/I 等易混淆字符） |
| 可用次数 | 20 次 |
| 分享链接 | https://backend-production-4413.up.railway.app/demo/register?invite=AQHU2Y |

### Railway
| 项目 | 值 |
|------|-----|
| 登录方式 | GitHub 账号 (llc370219@gmail.com) |
| 项目 ID | `50c741ed-1ff2-4a48-85c2-e30b46197c07` |
| 服务 ID | `13f640c0-482b-430a-8de0-026b2c5834e5` |
| 环境 | production |
| 域名 | https://backend-production-4413.up.railway.app |

### MongoDB Atlas
| 项目 | 值 |
|------|-----|
| 集群 | Cluster0 (M0 Sandbox, 512MB 免费) |
| 数据库名 | eng-reader |
| 用户名 | llc370219 |
| 认证数据库 | admin |
| 网络白名单 | 0.0.0.0/0（允许所有 IP，因 Railway 出口 IP 不固定） |

### GitHub
| 项目 | 值 |
|------|-----|
| 仓库地址 | https://github.com/llc370219/eng-mp.git |
| 默认分支 | main |
| Remote URL | `https://github.com/llc370219/eng-mp.git`（已清理 Token） |

---

## 🖥️ 链接行为说明

### 用户首次访问（无 token）
1. 打开 https://backend-production-4413.up.railway.app
2. `/` → 302 重定向到 `/Lull-Reading.dc.html`
3. `componentDidMount` 检测无 token → `screen: 'login'`
4. 页面显示登录/注册 UI（Lull 设计稿的 Neo-Brutalism 风格界面）
5. 用户切换「登录」/「注册」标签

### 注册分享链接（有 invite 参数）
1. 打开 https://backend-production-4413.up.railway.app/demo/register?invite=AQHU2Y
2. `/demo/register?invite=XXX` → 302 重定向到 `/Lull-Reading.dc.html?invite=XXX`
3. `componentDidMount` 读取 URL 参数 `invite=` → 切换注册模式 + 自动填充邀请码
4. 用户只需填写邮箱 → 获取验证码 → 输入密码 → 注册并登录

### 注册流程（完整）
```
  邮箱验证码发送 → /api/auth/send-code（60 秒防重发，验证码 6 位数字，10 分钟有效）
  人机验证（"我不是机器人" 复选框）
  邀请码验证 → 后端校验：存在、未过期、未用完
  邮箱验证 → 后端校验：验证码匹配、未过期
  注册 → /api/auth/register → 创建用户 → 消耗邀请码次数 → 返回 JWT
  JWT 存储 → localStorage('token', 'refreshToken')
  自动进入文章书架
```

### 登录流程
```
  邮箱 + 密码 → /api/auth/login → 验证凭证 → 返回 JWT
  JWT 存储 → 自动进入文章书架
```

### 管理员登录
```
  /admin/login → 管理后台独立登录页（EJS 模板）→ 独立账号体系
```

---

## 🏗️ 系统架构

### 请求流转
```
浏览器
  ├── GET / → 302 → /Lull-Reading.dc.html（Lull 前端 SPA）
  ├── GET /demo/register?invite=XXX → 302 → Lull 前端
  ├── GET /admin/* → EJS 服务端渲染（管理后台）
  └── POST/GET /api/* → REST API（JSON）
        ├── /api/auth/*    认证（注册/登录/验证码/刷新 token）
        ├── /api/articles/*  文章
        ├── /api/vocab/*   生词本
        ├── /api/ai/*      AI 服务
        ├── /api/grammar/*  语法
        └── /api/study/*   学习统计

Express 中间件链:
  helmet → cors → compression → json → urlencoded → cookieParser
  → sanitize → morgan → rateLimiter → requestId
  → 路由 → 404 → errorHandler
```

### 前端加载流程
```
Lull-Reading.dc.html (Design Component SPA)
  ├── <script src="./support.js">           ← DC 运行时引擎
  ├── <dc-import name="Flower">             ← 加载 ./Flower.dc.html 子组件
  │     (花朵装饰，背景动画，top nav logo)
  ├── componentDidMount()
  │   ├── 有 token → screen: 'articles'
  │   └── 无 token → screen: 'login'
  │       └── 有 ?invite= 参数 → authMode: 'register' + 填充 inviteCode
  ├── submitAuth()
  │   ├── 注册 → POST /api/auth/register
  │   └── 登录 → POST /api/auth/login
  ├── doSendCode()
  │   └── POST /api/auth/send-code
  └── logout()
      └── 清除 localStorage → go('login')
```

### 目录结构
```
eng-mp/
├── src/
│   ├── app.js               # Express 入口
│   ├── config/
│   │   ├── index.js          # 全局配置（端口、JWT、AI、MongoDB）
│   │   └── db.js             # MongoDB 连接
│   ├── controllers/
│   │   └── authController.js # 注册/登录/验证码/密码重置/登录历史
│   ├── middlewares/
│   │   ├── auth.js           # JWT 验证中间件
│   │   ├── errorHandler.js   # 统一错误处理
│   │   ├── rateLimiter.js    # 频率限制
│   │   └── sanitize.js       # XSS 防护
│   ├── models/
│   │   ├── User.js           # 用户（邮箱/密码/角色/偏好/学习数据）
│   │   ├── Article.js        # 文章
│   │   ├── InviteCode.js     # 邀请码（6位，最大使用次数/过期）
│   │   ├── VerificationCode.js # 验证码记录
│   │   ├── Vocabulary.js     # 生词本
│   │   ├── Grammar.js        # 语法库
│   │   ├── Exercise.js       # 练习题
│   │   ├── Dictionary.js     # 词典
│   │   ├── Checkin.js        # 打卡记录
│   │   └── SystemSetting.js  # 系统设置（KV 存储）
│   ├── routes/
│   │   ├── auth.js           # /api/auth/*
│   │   ├── articles.js       # /api/articles/*
│   │   ├── admin.js          # /admin/*（管理后台）
│   │   ├── demo.js           # /demo/*（注册/登录页路由）
│   │   └── ai.js             # /api/ai/*
│   ├── services/
│   │   ├── ai.js             # AI 统一调用（多 Provider）
│   │   ├── email.js          # SMTP 邮件（验证码发送+生成）
│   │   ├── spaced-repetition.js # SM-2 算法
│   │   ├── difficulty-analyzer.js # 文章难度分析
│   │   └── checkin.js        # 打卡逻辑
│   └── utils/
│       ├── captcha.js        # SVG 验证码生成
│       └── logger.js         # 日志
├── frontend/                 # Lull 前端 SPA
│   ├── Lull-Reading.dc.html  # 主文件（含登录、书架、阅读、AI 等）
│   ├── support.js            # Design Component 运行时
│   ├── Flower.dc.html        # 花朵装饰子组件
│   └── articles-data.js     # 文章数据
├── views/                    # EJS 模板（管理后台）
├── public/                   # 静态资源
├── scripts/
│   ├── setup-admin.js        # 创建管理员+清理测试用户
│   ├── create-invite.js      # 生成邀请码
│   ├── seed.js               # 基础种子数据
│   ├── seed-articles.js      # 文章种子数据
│   ├── seed-grammar.js       # 语法种子数据
│   ├── import-dict.js        # 导入词典
│   └── generate-frontend-articles.js # 前端文章数据生成
├── docs/
│   ├── HANDOFF.md            # 本文件
│   ├── DEPLOYMENT.md         # 部署文档
│   └── ARTICLE_GENERATION_PROMPT.md # AI 文章生成提示词
├── Lull-听简-交付包/         # 前端设计稿原始交付文件
├── Dockerfile                # Docker 构建配置
└── package.json
```

---

## 🤖 AI 配置

### 当前配置
| 配置项 | 值 |
|--------|-----|
| **默认提供商** | DeepSeek V4 Flash |
| **提供商 key** | deepseekv4flash |
| **模型** | deepseek-v4-flash |
| **API Key** | sk-fe58367779654d0084f7e5b59403a2b4 |
| **Base URL** | https://api.deepseek.com/v1 |
| **SDK** | OpenAI 兼容 |
| **配置位置** | Railway 环境变量 `DEEPSEEK_V4_FLASH_API_KEY` + `AI_PROVIDER` |

### 支持的 AI 提供商
| Key | 名称 | 模型 |
|-----|------|------|
| deepseekv4flash | DeepSeek V4 Flash | deepseek-v4-flash |
| deepseek | DeepSeek | deepseek-chat |
| openai | OpenAI | gpt-4o-mini |
| claude | Claude | claude-sonnet-4-20250514 |
| mimo | MiMo | mimo-v2-pro |
| moonshot | Moonshot (Kimi) | moonshot-v1-8k |
| zhipu | 智谱 (GLM) | glm-4-flash |
| qwen | 通义千问 | qwen-turbo |

### 修改 AI 配置
```bash
# Railway CLI
railway variable set AI_PROVIDER=deepseek --service backend
railway variable set DEEPSEEK_V4_FLASH_API_KEY=sk-xxx --service backend

# 或在管理后台 → 系统设置中修改（数据库优先）
```

---

## 📧 邮件服务配置

### 当前配置（Resend）
| 配置项 | 值 |
|--------|-----|
| **服务** | Resend.com |
| **API Key** | re_GC8vJoG4_NjsP2HtnFF9TqLM7d844p5uL |
| **发件人** | Lull 听简 <onboarding@resend.dev> |
| **免费额度** | 3000 封/月 |
| **配置位置** | Railway 环境变量 `RESEND_API_KEY` |

### 邮件发送优先级
1. Resend（首选）
2. SMTP（备用）
3. 控制台输出（降级）

### 修改邮件配置
```bash
# Railway CLI
railway variable set RESEND_API_KEY=re_xxx --service backend

# SMTP 备用（可选）
railway variable set SMTP_HOST=smtp.qq.com --service backend
railway variable set SMTP_PORT=587 --service backend
railway variable set SMTP_USER=your@qq.com --service backend
railway variable set SMTP_PASS=your授权码 --service backend
railway variable set SMTP_FROM=your@qq.com --service backend
```

---

## 🔑 关键配置值

### Railway 环境变量
| 变量名 | 值 |
|--------|-----|
| MONGODB_URI | mongodb+srv://llc370219:***@cluster0.cs8zgzm.mongodb.net/eng-reader |
| JWT_SECRET | 3f39e6d4cf1a5705147cafadf57208f4d91c0be1af466545587b989dd15941f2 |
| JWT_REFRESH_SECRET | 3518c3a31079f4fba9fbb0576090b30248112aa2736cfd9c955cb8bb3e29ca30 |
| NODE_ENV | production |
| AI_PROVIDER | deepseekv4flash |
| DEEPSEEK_V4_FLASH_API_KEY | sk-fe58367779654d0084f7e5b59403a2b4 |
| RESEND_API_KEY | re_GC8vJoG4_NjsP2HtnFF9TqLM7d844p5uL |

### 邀请码规则
| 规则 | 说明 |
|------|------|
| 长度 | 6 位 |
| 字符集 | A-Z（排除 O、0、I、1 等易混淆字符）+ 2-9 |
| 校验 | 后端验证：是否存在、是否激活、是否过期、是否用完 |
| 消耗 | 注册成功时递增 usedCount，绑定使用用户 |

### 验证码规则
| 规则 | 说明 |
|------|------|
| 长度 | 6 位数字 |
| 有效期 | 10 分钟 |
| 发送频率 | 60 秒一次 |
| 用途 | 注册、密码重置 |

---

## 🛠️ 运维命令

### Railway CLI
```bash
# 登录
railway login

# 查看项目状态
railway status

# 部署
railway up --service backend

# 重新部署（不重新构建）
railway redeploy --service backend --yes

# 查看日志
railway logs --service backend

# 环境变量
railway variables --service backend
railway variable set KEY=VALUE --service backend --skip-deploys

# 域名管理
railway domain --service backend
```

### 数据库管理
```bash
# 生成邀请码
MONGODB_URI="mongodb+srv://..." node scripts/create-invite.js <次数> <备注>
# 示例: node scripts/create-invite.js 20 "新用户邀请"

# 初始化管理员
MONGODB_URI="mongodb+srv://..." node scripts/setup-admin.js

# 连接 MongoDB Shell
railway connect mongo

# 备份/恢复
mongodump --uri="mongodb+srv://..." --out=backup/
mongorestore --uri="mongodb+srv://..." backup/
```

### Git
```bash
cd ~/Documents/eng-mp
git pull origin main     # 拉取最新代码
git push origin main     # 推送（部署前先推送）
```

---

## ❓ 故障排查

| 现象 | 可能原因 | 解决 |
|------|----------|------|
| 首次访问不显示登录页 | 浏览器有旧 token | 清除 localStorage 或无痕模式 |
| 注册提示"邀请码无效" | 邀请码用完/过期 | 管理后台查看或重新生成 |
| AI 生文失败 | API Key 无效或提供商配置错误 | 检查 Railway 环境变量 |
| MongoDB 连接失败 | IP 白名单或密码错误 | 检查 Atlas Network Access 设为 0.0.0.0/0 |
| 部署不生效 | 部署未触发或有缓存 | `railway redeploy --service backend --yes` 强制重部署 |
| Railway CLI 报 TLS 错误 | Railway API 临时网络问题 | 等待几分钟重试 |

---

## 📅 完整更新日志

### 2026-06-21
- ✅ 创建 Railway 项目并完成首次部署
- ✅ MongoDB Atlas 集群创建 + IP 白名单配置
- ✅ Dockerfile 修复（添加 views/、public/、frontend/ 目录）
- ✅ Git Remote 安全清理（移除嵌入 Token）
- ✅ 管理员账号配置（llc370219@gmail.com / airmess6677）
- ✅ 清理测试用户（admin@test.com 等）
- ✅ Lull·听简前端设计稿部署为首页
- ✅ 前端登录/注册接入后端 API（/api/auth/*）
- ✅ 首次访问显示登录页（修复 screen 初始态 bug）
- ✅ 分享链接自动填充邀请码（URL ?invite= 参数）
- ✅ /demo/register 和 /demo/login 重定向到 Lull 前端
- ✅ 邀请码从 8 位改为 6 位
- ✅ AI 默认提供商配置为 DeepSeek V4 Flash
- ✅ 邀请码 AQHU2Y（20 次）生成并配置
- ✅ 编写完整 README、部署文档、交接文档

---

*本文档最后更新时间: 2026-06-21*
