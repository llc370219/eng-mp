FROM node:20-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci --omit=dev

# 复制所有必要文件
COPY src/ ./src/
COPY views/ ./views/
COPY public/ ./public/
COPY frontend/ ./frontend/

# 环境变量
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "src/app.js"]
