# 冰冰快答小助手 - FreshmanQA Server

无锡学院新生智能问答系统后端服务

## 功能特性

- 🤖 RAG + LLM 双渠道智能问答
- 📚 知识库管理（CRUD + 分类）
- 🔍 向量语义检索（BAAI/bge-m3）
- 👥 用户管理（微信小程序登录）
- 📝 问答审核流程
- 📊 数据统计报表
- 🔒 安全防护（CORS、限流、IP白名单）

## 技术栈

- **运行时**: Node.js >= 18
- **框架**: Express 5.x
- **数据库**: MySQL 8.0
- **缓存**: Redis
- **向量检索**: SiliconFlow API (BAAI/bge-m3)
- **LLM**: 小米 MiMo API

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- MySQL 8.0
- Redis

### 安装

```bash
# 克隆项目
git clone <repo-url>
cd qa-server/server

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入必要的配置
```

### 配置

创建 `.env` 文件：

```env
# MySQL
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=FreshmanQA

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# Admin
ADMIN_KEY=your_admin_key

# LLM API
LLM_API_KEY=your_llm_api_key

# Embedding API (可选)
SF_EMBEDDING_KEY=your_embedding_key

# IP白名单 (可选)
ENABLE_ADMIN_IP_WHITELIST=false
```

### 启动

```bash
# 开发模式
npm run dev

# 生产模式
npm start

# PM2 管理
npm run pm2:start
npm run pm2:restart
npm run pm2:logs
```

## 项目结构

```
server/
├── app.js              # 主入口
├── config/             # 配置文件
│   ├── db.js          # MySQL 连接
│   └── redis.js       # Redis 连接
├── middleware/          # 中间件
│   ├── rateLimit.js   # 速率限制
│   ├── ipWhitelist.js # IP白名单
│   └── timeout.js     # 请求超时
├── routes/             # 路由
│   ├── qa.js          # 问答接口
│   ├── user.js        # 用户接口
│   ├── info.js        # 信息接口
│   └── admin.js       # 管理后台
├── services/           # 业务逻辑
│   ├── llm.js         # LLM 服务
│   └── embedding.js   # 向量检索
├── utils/              # 工具函数
│   ├── index.js       # 公共工具
│   └── cache.js       # 缓存工具
├── public/             # 静态文件
│   ├── admin.html     # 管理后台
│   └── notepad.html   # 记事本页面
├── test/               # 测试文件
├── scripts/            # 脚本工具
└── data/               # 数据文件
```

## API 文档

### 问答接口

```http
POST /api/qa/ask
Content-Type: application/json

{
  "question_text": "学校在哪里？",
  "user_id": 123
}
```

### 用户登录

```http
POST /api/user/login
Content-Type: application/json

{
  "code": "wx_code"
}
```

### 管理后台

```http
# 登录
POST /api/admin/login
{
  "username": "admin",
  "password": "<ADMIN_PASSWORD>"
}

# 知识库列表
GET /api/admin/kb/list
X-Admin-Key: your_admin_key

# 添加知识库
POST /api/admin/kb/add
{
  "question_text": "问题",
  "answer_text": "答案",
  "category": "分类"
}
```

## 安全特性

- ✅ CORS 白名单限制
- ✅ API 速率限制（防刷）
- ✅ IP 白名单（可选）
- ✅ 请求超时处理
- ✅ 错误统一处理
- ✅ 敏感信息隐藏

## 部署

### PM2 部署

```bash
# 启动
pm2 start ecosystem.config.js

# 保存进程列表
pm2 save

# 设置开机自启
pm2 startup
```

### Nginx 配置

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 开发

### 运行测试

```bash
npm test
```

### 代码检查

```bash
npm run lint
```

### 清理缓存

```bash
npm run cache:flush
```

## 常见问题

### Q: Redis 连接失败？

A: 确保 Redis 服务已启动：
```bash
redis-cli ping  # 应返回 PONG
```

### Q: 向量检索不工作？

A: 检查 `.env` 中的 `SF_EMBEDDING_KEY` 是否配置正确。

### Q: 如何添加新的知识库条目？

A: 通过管理后台或直接插入数据库：
```sql
INSERT INTO knowledge_base (question_text, answer_text, category, is_active)
VALUES ('问题', '答案', '分类', 1);
```

## 许可证

ISC

## 作者

杨健斌 - 无锡学院信息工程学院
