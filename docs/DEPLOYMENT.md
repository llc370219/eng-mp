# 部署文档

本文档说明如何将英语阅读学习网站部署到 Railway 平台。

## 📋 前置条件

- GitHub 账号
- Railway 账号（可用 GitHub 登录）
- MongoDB Atlas 账号（免费 512MB）

## 🚀 部署步骤

### 1. 创建 MongoDB Atlas 数据库

1. 访问 https://www.mongodb.com/atlas 注册账号
2. 创建免费集群（M0 Sandbox，512MB）
3. 创建数据库用户：
   - 进入 **Security** → **Database Access**
   - 点击 **Add New Database User**
   - 设置用户名和密码（记住密码）
   - 权限选择 **Read and write to any database**
4. 配置网络访问：
   - 进入 **Security** → **Network Access**
   - 点击 **Add IP Address**
   - 选择 **Allow Access from Anywhere**（添加 `0.0.0.0/0`）
5. 获取连接字符串：
   - 点击 **Database** → **Connect**
   - 选择 **Drivers**
   - 复制连接字符串，格式类似：
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   - 将 `<username>` 和 `<password>` 替换为实际值
   - 在数据库名位置添加 `eng-reader`：
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/eng-reader?retryWrites=true&w=majority
   ```

### 2. 准备代码仓库

```bash
# 克隆项目
git clone https://github.com/llc370219/eng-mp.git
cd eng-mp

# 确保代码是最新的
git pull origin main
```

### 3. 部署到 Railway

#### 方式一：使用 Railway CLI（推荐）

```bash
# 安装 Railway CLI
brew install railway  # macOS
# 或
npm install -g @railway/cli  # 其他系统

# 登录
railway login

# 创建项目
railway init --name eng-mp

# 创建服务并设置环境变量
railway add --service backend \
  --variables "MONGODB_URI=your_mongodb_uri" \
  --variables "JWT_SECRET=your_jwt_secret" \
  --variables "JWT_REFRESH_SECRET=your_jwt_refresh_secret" \
  --variables "NODE_ENV=production"

# 部署
railway up --service backend

# 生成域名
railway domain --service backend
```

#### 方式二：通过 Railway 网页

1. 访问 https://railway.app 并登录
2. 点击 **New Project** → **Deploy from GitHub Repo**
3. 选择 `eng-mp` 仓库
4. 在 **Variables** 标签添加环境变量：
   - `MONGODB_URI`: MongoDB Atlas 连接字符串
   - `JWT_SECRET`: 随机生成的 64 位字符串
   - `JWT_REFRESH_SECRET`: 随机生成的 64 位字符串
   - `NODE_ENV`: `production`
5. 等待部署完成
6. 在 **Settings** → **Networking** → **Generate Domain** 生成域名

### 4. 生成随机密钥

```bash
# 生成 JWT_SECRET
openssl rand -hex 32

# 生成 JWT_REFRESH_SECRET
openssl rand -hex 32
```

### 5. 验证部署

```bash
# 检查服务状态
railway status

# 查看日志
railway logs --service backend

# 测试访问
curl https://your-domain.up.railway.app/admin/login
```

## 🔧 环境变量说明

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `MONGODB_URI` | ✅ | MongoDB Atlas 连接字符串 |
| `JWT_SECRET` | ✅ | JWT 签名密钥（64 位随机字符串） |
| `JWT_REFRESH_SECRET` | ✅ | JWT 刷新密钥（64 位随机字符串） |
| `NODE_ENV` | ✅ | 运行环境，设为 `production` |
| `AI_PROVIDER` | ❌ | AI 提供商（`deepseek` 或 `openai`） |
| `DEEPSEEK_API_KEY` | ❌ | DeepSeek API Key |
| `OPENAI_API_KEY` | ❌ | OpenAI API Key |

## 🔄 更新部署

```bash
# 拉取最新代码
git pull origin main

# 重新部署
railway up --service backend

# 或者推送代码后 Railway 会自动部署（如果配置了 GitHub 集成）
git push origin main
```

## 🐛 常见问题

### MongoDB 连接失败

**错误**: `Could not connect to any servers in your MongoDB Atlas cluster`

**解决**: 
1. 检查 MongoDB Atlas 的 IP 白名单是否包含 `0.0.0.0/0`
2. 确认连接字符串中的用户名和密码正确
3. 确认数据库名是 `eng-reader`

### 认证失败

**错误**: `bad auth : authentication failed`

**解决**:
1. 在 MongoDB Atlas 中重置数据库用户密码
2. 更新 Railway 环境变量中的 `MONGODB_URI`
3. 重新部署

### 端口问题

**错误**: `EADDRINUSE`

**解决**: Railway 会自动分配端口，不需要在代码中指定端口。确保 `src/app.js` 中使用：
```javascript
const PORT = process.env.PORT || 3000;
```

## 📊 监控与日志

```bash
# 查看实时日志
railway logs --service backend --follow

# 查看部署历史
railway deployments --service backend

# 查看资源使用
railway metrics --service backend
```

## 🔒 安全建议

1. **定期轮换密钥**: 每 3-6 个月更换 JWT_SECRET 和 JWT_REFRESH_SECRET
2. **限制 MongoDB 访问**: 生产环境建议限制 IP 白名单而非使用 `0.0.0.0/0`
3. **启用 HTTPS**: Railway 默认提供 HTTPS，确保不使用 HTTP
4. **监控异常**: 定期检查 Railway 日志和 MongoDB Atlas 监控

## 💰 费用说明

| 服务 | 免费额度 | 预计用量 |
|------|----------|----------|
| Railway | $5/月 | 小流量足够 |
| MongoDB Atlas | 512MB 存储 | 足够 |
| **总计** | **$0** | - |

## 📞 获取帮助

- Railway 文档: https://docs.railway.app
- MongoDB Atlas 文档: https://www.mongodb.com/docs/atlas/
- 项目 Issues: https://github.com/llc370219/eng-mp/issues
