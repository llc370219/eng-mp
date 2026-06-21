# 英语阅读学习网站 (eng-mp)

Node.js + Express 5 + MongoDB 构建的英语学习平台，支持 AI 辅助学习。

## 🌐 在线访问

| 界面 | 地址 |
|------|------|
| 用户端 | https://backend-production-4413.up.railway.app |
| 管理后台 | https://backend-production-4413.up.railway.app/admin/login |

### 管理员账号
- **邮箱**: llc370219@gmail.com
- **密码**: airmess6677

### 分享给他人
直接将以下链接发送给他人即可访问：
```
https://backend-production-4413.up.railway.app
```
网站已部署到公网，任何人都可以通过链接访问。如需注册，按照页面提示操作即可。

## 🚀 快速开始（本地开发）

```bash
# 1. 克隆项目
git clone https://github.com/llc370219/eng-mp.git
cd eng-mp

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置 MongoDB 连接等

# 4. 初始化数据
node scripts/seed.js          # 基础数据
node scripts/seed-articles.js  # 文章数据
node scripts/seed-grammar.js   # 语法数据

# 5. 初始化管理员账号
node scripts/setup-admin.js

# 6. 启动开发服务器
npm run dev
```

## 📁 项目结构

```
eng-mp/
├── src/
│   ├── app.js              # 应用入口
│   ├── controllers/        # 控制器
│   ├── middleware/          # 中间件
│   ├── models/             # 数据模型
│   ├── routes/             # 路由定义
│   ├── services/           # 业务逻辑
│   └── utils/              # 工具函数
├── views/                  # EJS 模板
├── public/                 # 静态资源
├── frontend/               # 前端页面
├── scripts/                # 初始化脚本
├── docs/                   # 项目文档
└── Dockerfile              # Docker 配置
```

## 🛠️ 技术栈

- **后端**: Express 5, Node.js 20
- **数据库**: MongoDB (Mongoose)
- **模板引擎**: EJS
- **认证**: JWT (Access Token + Refresh Token)
- **AI 集成**: OpenAI / DeepSeek / MiMo
- **算法**: SM-2 间隔重复算法

## ✨ 功能特性

### 用户端
- 📚 分级阅读（A1-C2）
- 🔤 单词点击翻译
- 📝 句子翻译 + 语法解读
- 🎨 生词高亮
- 📖 分句标注
- 📋 生词本（SM-2 间隔复习）
- 📊 学习统计
- 🏆 打卡系统
- 🤖 AI 辅助学习

### 管理后台
- 👥 用户管理
- 🎫 邀请码管理
- 📄 文章管理（CRUD）
- 📈 打卡统计
- 🤖 AI 监控
- ⚙️ 系统设置

## 🔧 环境变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `MONGODB_URI` | MongoDB 连接字符串 | `mongodb+srv://...` |
| `JWT_SECRET` | JWT 签名密钥 | 随机 64 位字符串 |
| `JWT_REFRESH_SECRET` | JWT 刷新密钥 | 随机 64 位字符串 |
| `NODE_ENV` | 运行环境 | `production` |
| `AI_PROVIDER` | AI 提供商 | `deepseek` / `openai` |
| `DEEPSEEK_API_KEY` | DeepSeek API Key | `sk-...` |
| `OPENAI_API_KEY` | OpenAI API Key | `sk-...` |

## 📚 API 接口

### 认证相关
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/refresh` - 刷新 Token

### 文章相关
- `GET /api/demo/articles` - 获取文章列表
- `GET /api/demo/articles/:id` - 获取文章详情

### AI 相关
- `POST /api/ai/translate` - 翻译
- `POST /api/ai/grammar` - 语法分析
- `POST /api/ai/word` - 单词解释

### 管理后台
- `GET /admin/login` - 管理员登录页
- `POST /admin/login` - 管理员登录
- `GET /admin/dashboard` - 控制面板

## 📝 开发说明

### 添加新文章
1. 登录管理后台
2. 进入文章管理
3. 填写文章信息（标题、内容、级别、分类等）
4. 保存即可

### AI 配置
在管理后台的「系统设置」中可以配置：
- AI 提供商（DeepSeek / OpenAI）
- API Key
- 模型选择

## 🐳 Docker 部署

```bash
# 构建镜像
docker build -t eng-mp .

# 运行容器
docker run -d \
  -p 3000:3000 \
  -e MONGODB_URI="your_mongodb_uri" \
  -e JWT_SECRET="your_jwt_secret" \
  -e JWT_REFRESH_SECRET="your_jwt_refresh_secret" \
  eng-mp
```

## 📄 相关文档

- [部署文档](docs/DEPLOYMENT.md)
- [交接文档](docs/HANDOFF.md)
- [文章生成提示词](docs/ARTICLE_GENERATION_PROMPT.md)

## 📧 联系方式

如有问题，请联系项目负责人。
