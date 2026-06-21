# 项目交接文档

## 📌 项目概述

**项目名称**: 英语阅读学习网站 (eng-mp)  
**项目类型**: Web 应用  
**技术栈**: Express 5 + MongoDB + EJS + JWT  
**部署平台**: Railway + MongoDB Atlas  
**项目地址**: https://github.com/llc370219/eng-mp  
**在线访问**: https://backend-production-4413.up.railway.app

---

## 🔑 账号信息

### Railway
- **登录方式**: GitHub 账号
- **项目 ID**: `50c741ed-1ff2-4a48-85c2-e30b46197c07`
- **服务 ID**: `13f640c0-482b-430a-8de0-026b2c5834e5`
- **访问地址**: https://backend-production-4413.up.railway.app

### MongoDB Atlas
- **登录方式**: MongoDB Atlas 账号
- **集群**: Cluster0 (M0 Sandbox, 512MB)
- **数据库名**: eng-reader
- **用户名**: llc370219
- **网络访问**: 0.0.0.0/0（允许所有 IP）

### GitHub
- **仓库地址**: https://github.com/llc370219/eng-mp
- **默认分支**: main

### 网站管理员账号
- **邮箱**: llc370219@gmail.com
- **密码**: airmess6677
- **角色**: admin
- **登录地址**: https://backend-production-4413.up.railway.app/admin/login

---

## 👥 访问指南

### 用户访问（普通用户）

**访问地址**: https://backend-production-4413.up.railway.app

**注册流程**:
1. 打开上述地址
2. 点击「注册」按钮
3. 填写邮箱和密码
4. 如果需要邀请码，联系管理员获取
5. 注册成功后即可登录使用

**登录流程**:
1. 打开上述地址
2. 输入邮箱和密码
3. 点击登录

### 管理员访问

**访问地址**: https://backend-production-4413.up.railway.app/admin/login

**管理员账号**:
- 邮箱: `llc370219@gmail.com`
- 密码: `airmess6677`

**管理功能**:
- 用户管理：查看、编辑、删除用户
- 文章管理：添加、编辑、删除文章
- 邀请码管理：生成、管理邀请码
- 系统设置：配置 AI、网站参数等
- 数据统计：查看用户学习数据

### 分享给他人

**直接分享链接**:
```
https://backend-production-4413.up.railway.app
```

**注意事项**:
1. 网站已部署到公网，任何人都可以通过链接访问
2. 如果启用了邀请码制度，新用户需要邀请码才能注册
3. 管理员可以在后台控制注册开关
4. 建议通过微信、邮件等方式分享链接

### 邀请码管理（如需）

如果网站启用了邀请码注册制度：

1. **生成邀请码**:
   - 登录管理后台
   - 进入「邀请码管理」
   - 点击「生成邀请码」
   - 设置数量和有效期

2. **分享邀请码**:
   - 将邀请码发送给需要注册的用户
   - 用户在注册时输入邀请码即可

3. **关闭邀请码**（开放注册）:
   - 登录管理后台
   - 进入「系统设置」
   - 将「注册需要邀请码」设为关闭

---

## 🗂️ 项目结构说明

```
eng-mp/
├── src/                    # 后端源码
│   ├── app.js             # 应用入口，Express 配置
│   ├── controllers/       # 控制器（请求处理逻辑）
│   ├── middleware/         # 中间件（认证、错误处理等）
│   ├── models/            # Mongoose 数据模型
│   ├── routes/            # 路由定义
│   ├── services/          # 业务逻辑服务
│   └── utils/             # 工具函数
├── views/                 # EJS 模板文件
│   ├── admin/             # 管理后台页面
│   ├── demo/              # 用户端页面
│   └── partials/          # 公共组件
├── public/                # 静态资源（CSS、JS、图片）
├── frontend/              # 前端独立页面
├── scripts/               # 初始化和维护脚本
├── docs/                  # 项目文档
├── Dockerfile             # Docker 配置
└── package.json           # 项目依赖
```

---

## 📊 数据模型

### User（用户）
```javascript
{
  email: String,        // 邮箱（唯一）
  password: String,     // 加密密码
  nickname: String,     // 昵称
  role: String,         // 角色：user / admin
  level: String,        // 英语级别：A1-C2
  vocabulary: [{        // 生词本
    word: String,
    definition: String,
    nextReview: Date,   // SM-2 算法计算的下次复习时间
    easeFactor: Number,
    interval: Number
  }],
  streak: Number,       // 连续打卡天数
  createdAt: Date
}
```

### Article（文章）
```javascript
{
  title: String,        // 标题
  content: String,      // 内容
  level: String,        // 难度级别：A1-C2
  category: String,     // 分类
  wordCount: Number,    // 单词数
  sentences: [{         // 分句数据
    text: String,
    translation: String,
    grammar: String
  }],
  createdAt: Date
}
```

### InviteCode（邀请码）
```javascript
{
  code: String,         // 邀请码
  usedBy: ObjectId,     // 使用者
  isUsed: Boolean,      // 是否已使用
  expiresAt: Date       // 过期时间
}
```

### SystemSetting（系统设置）
```javascript
{
  key: String,          // 设置键
  value: Mixed,         // 设置值
  description: String   // 描述
}
```

---

## 🔧 核心功能实现

### 1. 认证系统
- **文件**: `src/controllers/authController.js`, `src/middleware/auth.js`
- **机制**: JWT (Access Token + Refresh Token)
- **流程**: 
  - 登录/注册 → 生成 Token
  - 请求携带 Token → 中间件验证
  - Token 过期 → 使用 Refresh Token 刷新

### 2. AI 集成
- **文件**: `src/services/ai.js`
- **支持**: OpenAI, DeepSeek, MiMo
- **功能**: 翻译、语法分析、单词解释
- **配置**: 管理后台 → 系统设置

### 3. SM-2 间隔重复算法
- **用途**: 生词本复习调度
- **原理**: 根据用户记忆反馈动态调整复习间隔
- **参数**: easeFactor, interval, repetitions

### 4. 文章管理
- **文件**: `src/controllers/articleController.js`
- **功能**: CRUD 操作、分句处理、AI 辅助标注

---

## 🚀 部署与运维

### 环境变量

| 变量名 | 说明 | 位置 |
|--------|------|------|
| `MONGODB_URI` | MongoDB 连接字符串 | Railway Variables |
| `JWT_SECRET` | JWT 签名密钥 | Railway Variables |
| `JWT_REFRESH_SECRET` | JWT 刷新密钥 | Railway Variables |
| `NODE_ENV` | 运行环境 | Railway Variables |

### 常用命令

```bash
# 本地开发
npm run dev

# 查看日志
railway logs --service backend --follow

# 重新部署
railway redeploy --service backend --yes

# 连接数据库
railway connect mongo

# 查看环境变量
railway variables --service backend

# 设置环境变量
railway variable set KEY=VALUE --service backend
```

### 数据库维护

```bash
# 备份数据库
mongodump --uri="mongodb+srv://..." --out=backup/

# 恢复数据库
mongorestore --uri="mongodb+srv://..." backup/

# 初始化数据
node scripts/seed.js
node scripts/seed-articles.js
node scripts/seed-grammar.js

# 创建管理员
node scripts/make-admin.js admin@example.com
```

---

## 📝 开发指南

### 添加新功能

1. **创建路由**: `src/routes/xxx.js`
2. **创建控制器**: `src/controllers/xxxController.js`
3. **创建模型**: `src/models/Xxx.js`
4. **注册路由**: `src/app.js` 中引入并使用

### 添加新页面

1. **创建模板**: `views/xxx.ejs`
2. **添加路由**: 在对应路由文件中添加 GET 路由
3. **静态资源**: 放在 `public/` 目录

### 修改 AI 配置

1. 登录管理后台
2. 进入「系统设置」
3. 修改 AI 提供商和 API Key

---

## ⚠️ 注意事项

### 安全相关
1. **JWT 密钥**: 已配置在 Railway 环境变量中，不要泄露
2. **MongoDB 密码**: 已配置在 Railway 环境变量中，不要泄露
3. **Git Remote**: 已清理嵌入的 Token，使用标准 HTTPS URL

### 已知问题
1. **前端页面**: `frontend/` 目录下的独立页面可能需要调整路由
2. **文章初始化**: 首次部署需要运行 `scripts/seed-articles.js` 初始化文章数据

### 待优化项
1. **IP 白名单**: 生产环境建议限制 MongoDB Atlas 的 IP 白名单
2. **日志系统**: 可接入第三方日志服务（如 Logtail）
3. **监控告警**: 可配置 Railway 的健康检查和告警
4. **CDN 加速**: 可接入 Cloudflare 做 CDN 和安全防护

---

## 📞 联系与支持

- **GitHub Issues**: https://github.com/llc370219/eng-mp/issues
- **Railway 文档**: https://docs.railway.app
- **MongoDB Atlas 文档**: https://www.mongodb.com/docs/atlas/

---

## 📅 更新日志

### 2026-06-21
- ✅ 完成 Railway 部署
- ✅ 配置 MongoDB Atlas
- ✅ 修复 Dockerfile（添加 views/、public/、frontend/）
- ✅ 清理 Git Remote 安全问题
- ✅ 编写完整文档
- ✅ 配置管理员账号（llc370219@gmail.com）
- ✅ 清理测试用户（admin@test.com 等）
- ✅ 添加用户访问指南

---

*本文档最后更新时间: 2024-06-21*
