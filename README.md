# 英语阅读学习网站 (eng-mp)

Node.js + Express 5 + MongoDB 构建的英语学习平台，Lull·听简前端设计稿 + AI 辅助学习。

## 🌐 在线访问（生产环境）

| 说明 | 地址 |
|------|------|
| **用户端（Lull 前端）** | https://backend-production-4413.up.railway.app |
| **注册分享链接** | https://backend-production-4413.up.railway.app/demo/register?invite=AQHU2Y |
| **管理后台** | https://backend-production-4413.up.railway.app/admin/login |

### 管理员账号
| 项目 | 值 |
|------|-----|
| 邮箱 | llc370219@gmail.com |
| 密码 | airmess6677 |
| 角色 | admin |

### 当前邀请码
| 项目 | 值 |
|------|-----|
| 邀请码 | AQHU2Y |
| 可用次数 | 20 次 |

### 分享给他人
直接发送以下链接，对方打开后自动跳转到登录/注册页，邀请码自动填充：
```
https://backend-production-4413.up.railway.app/demo/register?invite=AQHU2Y
```

---

## 🚀 快速开始（本地开发）

```bash
# 1. 克隆项目
git clone https://github.com/llc370219/eng-mp.git
cd eng-mp

# 2. 安装依赖
npm install

# 3. 配置环境变量（配置 MongoDB 连接、AI Key 等）
cp .env.example .env
# 编辑 .env

# 4. 初始化基础数据（可选）和邀请码
node scripts/seed.js
node scripts/seed-articles.js
node scripts/seed-grammar.js

# 5. 创建管理员账号并清理测试用户
node scripts/setup-admin.js

# 6. 生成分享邀请码
node scripts/create-invite.js 20 "分享链接"

# 7. 启动开发服务器
npm run dev
```

访问 `http://localhost:3000` 进入 Lull 前端。

---

## 📁 项目结构

```
eng-mp/
├── src/
│   ├── app.js              # 应用入口（Express + 中间件 + 路由注册）
│   ├── config/
│   │   └── index.js        # 配置文件（DB、JWT、AI、邮件）
│   ├── controllers/        # 控制器（auth、文章、用户、AI）
│   ├── middlewares/         # 中间件（认证、限流、错误处理）
│   ├── models/             # Mongoose 数据模型
│   ├── routes/             # 路由定义
│   ├── services/           # 业务逻辑（AI、验证码、难度分析）
│   └── utils/              # 工具函数
├── frontend/               # Lull·听简前端设计稿
│   ├── Lull-Reading.dc.html  # 主文件（Design Component）
│   ├── support.js          # Design Component 运行时
│   └── Flower.dc.html      # 花朵装饰子组件
├── views/                  # EJS 模板（管理后台用）
├── public/                 # 静态资源
├── Lull-听简-交付包/       # 前端设计稿原始交付文件
├── scripts/                # 初始化脚本
├── docs/                   # 项目文档
└── Dockerfile              # Docker 配置
```

---

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Express 5, Node.js 20 |
| 数据库 | MongoDB 7+ (Mongoose) |
| 前端 | Design Component (.dc.html) |
| 模板引擎 | EJS（管理后台） |
| 认证 | JWT（Access Token + Refresh Token） |
| AI | DeepSeek V4 Flash（默认）、OpenAI、Claude、MiMo 等 |
| 算法 | SM-2 间隔重复 |
| 部署 | Railway + MongoDB Atlas |

---

## ✨ 功能特性

### 用户端（Lull·听简前端）
- 📚 分级阅读（初中 / 高中 / CET4 / CET6 / 雅思）
- 🔤 单词点击翻译（右侧卡片显示释义）
- 📝 段落双击翻译 + 语法解析
- 🎨 生词高亮（常亮，跨文章）
- 📖 分句标注（下划线提示）
- 📋 生词本 + SM-2 间隔复习
- 🤖 鲜榨工坊（AI 生成文章，融入生词本单词）
- 📊 学习统计（柱状图 + 雷达图）
- 🏆 连续打卡
- 📖 语法库 + 随堂练习

### 管理后台
- 👥 用户管理
- 🎫 邀请码管理（生成、使用次数、过期）
- 📄 文章管理
- 📈 打卡统计
- 🤖 AI 监控
- ⚙️ 系统设置（AI 提供商、API Key、模型）

---

## 🔧 环境变量

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `MONGODB_URI` | ✅ | MongoDB Atlas 连接字符串 |
| `JWT_SECRET` | ✅ | JWT 签名密钥（64 位随机字符串） |
| `JWT_REFRESH_SECRET` | ✅ | JWT 刷新密钥（64 位随机字符串） |
| `NODE_ENV` | ✅ | `production` |
| `AI_PROVIDER` | — | AI 提供商，默认 `deepseekv4flash` |
| `DEEPSEEK_V4_FLASH_API_KEY` | — | DeepSeek V4 Flash API Key |

---

## 🤖 AI 配置

| 配置项 | 默认值 |
|--------|--------|
| 提供商 | DeepSeek V4 Flash |
| 模型 | deepseek-v4-flash |
| API Key | 已在 Railway 环境变量中配置 |

支持的 AI 提供商：`deepseekv4flash`、`deepseek`、`openai`、`claude`、`mimo`、`moonshot`、`zhipu`、`qwen`

---

## 📝 添加新文章

1. 登录管理后台
2. 进入「文章管理」
3. 填写标题、内容、等级、分类
4. 保存

---

## 🐳 Docker 部署

```bash
docker build -t eng-mp .
docker run -d \
  -p 3000:3000 \
  -e MONGODB_URI="your_mongodb_uri" \
  -e JWT_SECRET="your_jwt_secret" \
  -e JWT_REFRESH_SECRET="your_jwt_refresh_secret" \
  eng-mp
```

---

## 📄 相关文档

| 文档 | 说明 |
|------|------|
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Railway 部署完整指南 |
| [docs/HANDOFF.md](docs/HANDOFF.md) | 项目交接文档 |
| [docs/ARTICLE_GENERATION_PROMPT.md](docs/ARTICLE_GENERATION_PROMPT.md) | AI 文章生成提示词 |

---

## 📞 联系方式

如有问题，请联系项目负责人。
