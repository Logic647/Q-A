# 冰冰快答小助手 —— 项目交接文档

> 本文档用于将项目从当前开发者交接给 Codex 继续维护。
> 生成时间：2026-08-25
> **注（2026-08-30）**：本文档部分内容已过时（Neo4j 知识图谱已下线，数据库以 MySQL 为准），最新状态以 `HANDOVER_ADDENDUM.md` 为准。敏感值已脱敏，原始副本见本地 `HANDOVER*-local.md`（不入库）。
> 项目路径：`F:\桌面\数据库课程设计`
> GitHub：`https://github.com/Logic647/Q-A.git`（分支 `feature/knowledge-graph`）

---

## 一、项目概述

| 项目 | 内容 |
|------|------|
| 名称 | 冰冰快答小助手（FreshmanQA） |
| 定位 | 面向高校新生的智能问答微信小程序 |
| 学校 | 无锡学院 |
| 技术栈 | 微信小程序 + Node.js/Express + MySQL + Neo4j + Redis + Embedding + LLM |
| 服务器 | 阿里云轻量应用服务器 121.199.68.192 |
| 域名 | logic-yjb.top |
| 后端端口 | 3000（Nginx 反向代理 /api 和 /public） |
| 当前状态 | 已上线运行，核心功能已完成 |

### 已完成的核心功能

1. 微信小程序前端：登录、聊天问答、历史会话、校园地图、身份认证、学生回答入口。
2. 后端 RAG 问答链路：Neo4j 图谱 → MySQL 知识库模糊匹配 → Embedding 向量检索 → LLM 生成回答。
3. 同义词扩展、问题去重、未收录问题自动记录。
4. 管理员后台：统计、回答审核、知识库 CRUD、身份认证审核、低分回答重置。
5. 学生身份认证（上传证件照 + 姓名学号，管理员审核）。
6. Redis 问答缓存 + 精准清除。
7. 生产环境部署：PM2 + Nginx + MySQL + Neo4j + Redis。

---

## 二、目录结构

```
F:\桌面\数据库课程设计\
├── miniprogram/                 # 微信小程序前端
│   ├── app.js                   # 全局入口，baseUrl 配置在这里
│   ├── app.json                 # 页面注册
│   ├── pages/
│   │   ├── login/               # 微信登录页
│   │   ├── index/               # 聊天首页（核心）
│   │   ├── verify/              # 学生身份认证
│   │   ├── answer/              # 学生回答待处理问题
│   │   ├── history/             # 历史提问
│   │   ├── map/                 # 校园地图
│   │   └── admin/               # 管理员后台（小程序端）
│   └── ...
├── server/                      # Node.js 后端（部署目录）
│   ├── app.js                   # Express 入口
│   ├── package.json             # 依赖：express, cors, mysql2, ioredis
│   ├── config/
│   │   ├── db.js                # MySQL 连接 + SQL Server 风格 request 适配层
│   │   ├── redis.js             # Redis 连接
│   │   └── neo4j.js             # Neo4j 连接
│   ├── routes/
│   │   ├── qa.js                # 问答核心 /api/qa/*
│   │   ├── user.js              # 用户登录、认证 /api/user/*
│   │   ├── info.js              # 校园信息查询 /api/info/*
│   │   └── admin.js             # 管理员接口 /api/admin/*
│   ├── services/
│   │   ├── llm.js               # MiMo LLM 调用
│   │   └── embedding.js         # SiliconFlow Embedding 向量服务
│   ├── public/                  # 静态页面和地图图片
│   ├── uploads/                 # 认证图片上传目录（未入 git）
│   ├── data/                    # 向量缓存等（未入 git）
│   └── 临时文件/                 # 测试脚本、日志等（未入 git）
├── sql/                         # 建表和初始数据脚本
│   ├── create_tables_mysql.sql  # MySQL 建表 + 初始数据
│   ├── create_tables.sql        # SQL Server 版建表（旧）
│   ├── wxu_info.sql             # 校园信息数据
│   ├── wxu_knowledge.sql        # 知识库数据
│   └── ...
├── deploy/                      # 服务器部署脚本
│   ├── deploy.sh                # 一键部署脚本
│   ├── nginx.conf               # Nginx 配置模板
│   ├── ecosystem.config.js      # PM2 配置
│   └── ...
├── hermes-migration/            # Hermes 会话迁移相关
├── 数据库课程设计.docx           # 课程设计论文
└── HANDOVER.md                  # 本文件
```

---

## 三、技术栈详解

### 3.1 前端

- 微信小程序原生框架（WXML + WXSS + JS）。
- 全局网络请求封装在 `miniprogram/app.js` 的 `request()` 方法。
- 会话历史存储在小程序本地缓存（`wx.getStorageSync`）。

### 3.2 后端

- **框架**：Express 5.x。
- **数据库**：MySQL 8.0（当前生产环境使用 MySQL）。
- **图数据库**：Neo4j 5.x，用于知识图谱存储。
- **缓存**：Redis。
- **向量服务**：SiliconFlow API，`BAAI/bge-m3` 模型，1024 维向量。
- **大语言模型**：MiMo v2.5，通过 `api.xiaomimimo.com` 调用。

### 3.3 数据库抽象层

`server/config/db.js` 原本为 SQL Server 设计，后来迁移到 MySQL。它对外暴露 `getPool()` 和 `sql` 对象，模拟 SQL Server 的 `pool.request().input().query()` 接口：

```js
const pool = await getPool();
const result = await pool.request()
  .input('q', sql.NVarChar, `%${qClean}%`)
  .query('SELECT TOP 3 ... FROM knowledge_base WHERE question_text LIKE @q');
```

底层做了两件事：
- 将 `TOP N` 转换为 MySQL `LIMIT N`。
- 将 `@param` 替换为 `?`，按顺序填充参数。

**注意**：当前代码中仍混用 `TOP`、`LIMIT` 和 SQL Server 语法，但适配层会尽量处理。新增 SQL 时建议优先写标准 MySQL 语法。

---

## 四、关键配置文件

### 4.1 环境变量（server/.env）

`.env` 文件**未入 git**。需要在 `server/` 目录下创建：

```env
# MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=<你的数据库密码>
DB_NAME=FreshmanQA

# Redis（无密码）
# REDIS_HOST=127.0.0.1
# REDIS_PORT=6379

# Embedding（SiliconFlow）
SF_EMBEDDING_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 管理员认证
ADMIN_KEY=<随机生成的管理令牌>
```

**注意**：`server/app.js` 使用自定义解析加载 `.env`，不是 `dotenv` 包。

### 4.2 前端 baseUrl

`miniprogram/app.js`：

```js
globalData: {
  baseUrl: 'https://logic-yjb.top/api'
}
```

开发时改为 `http://localhost:3000/api` 或服务器 IP。

### 4.3 Nginx 配置

参考 `deploy/nginx.conf`，生产环境位于 `/etc/nginx/sites-available/qa`：

- `/api/` → `http://127.0.0.1:3000`
- `/public/` → `/opt/qa-server/server/public/`

### 4.4 PM2 配置

参考 `deploy/ecosystem.config.js`，生产环境位于 `/opt/qa-server/server/`。启动命令：

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 五、核心业务流程

### 5.1 问答流程（`server/routes/qa.js`）

```
用户提问
  → Redis 缓存命中？直接返回
  → MySQL 知识库 LIKE 匹配（question_text / keywords / answer_text）
  → 结果不足 2 条 → Embedding 向量语义搜索
  → 结果仍不足 2 条 → 同义词扩展检索
  → 仍无结果 → 历史问答严格匹配
  → 组装上下文 → 调用 MiMo LLM 生成回答
  → 未收录 → 记录到 question 表（status=0）
  → 有知识且 LLM 生成实质回答 → 自动写入 knowledge_base
  → 写入 Redis 缓存并返回
```

**关键逻辑**：
- 始终经过 LLM，LLM 失败才用原始知识兜底。
- 未收录时 LLM 必须按 Prompt 返回固定文案（包含"还没有被收录"等关键词），系统据此判断是否记录待回答问题。
- 缓存键：`qa:${清洗后的问题}`。

### 5.2 学生回答与审核流程

```
未收录问题进入 question 表（status=0）
  → 已认证学生在 answer 页看到待处理问题
  → 提交回答 → answer 表（review_status=0）
  → 管理员审核（通过/拒绝）
  → 通过 → 写入 knowledge_base + 更新 question.status=1 + 自动向量化 + 清缓存
```

### 5.3 身份认证流程（`server/routes/user.js`）

```
用户提交姓名 + 学号 + 证件照 base64
  → 写入 user_verify 表（status=0）
  → 管理员审核
  → 通过 → 更新 user.auth_status=1，user.role=1
```

---

## 六、重要接口清单

| 接口 | 文件 | 说明 |
|------|------|------|
| `POST /api/user/login` | user.js | 微信登录 |
| `POST /api/user/verify` | user.js | 提交身份认证 |
| `GET /api/user/verify-status/:uid` | user.js | 查询认证状态 |
| `POST /api/qa/ask` | qa.js | 核心问答 |
| `GET /api/qa/history/:user_id` | qa.js | 历史提问 |
| `GET /api/qa/pending` | qa.js | 待回答问题 |
| `POST /api/qa/answer` | qa.js | 提交回答 |
| `POST /api/qa/feedback` | qa.js | 评分反馈 |
| `GET /api/info/enrollment` | info.js | 报到流程 |
| `GET /api/info/buildings` | info.js | 校园建筑 |
| `GET /api/info/transport` | info.js | 交通路线 |
| `GET /api/info/fees` | info.js | 费用 |
| `GET /api/info/cafeterias` | info.js | 食堂 |
| `GET /api/info/dishes` | info.js | 菜品 |
| `GET /api/info/hot` | info.js | 热门问题 |
| `POST /api/admin/login` | app.js | 管理员登录 |
| `GET /api/admin/stats` | admin.js | 统计 |
| `GET /api/admin/review/pending` | admin.js | 待审核回答 |
| `POST /api/admin/review` | admin.js | 审核回答 |
| `GET /api/admin/verify/pending` | admin.js | 待审核认证 |
| `POST /api/admin/verify/review` | admin.js | 审核认证 |
| `GET /api/admin/kb/list` | admin.js | 知识库列表 |
| `POST /api/admin/kb/add` | admin.js | 新增知识 |
| `POST /api/admin/kb/update` | admin.js | 更新知识 |
| `POST /api/admin/kb/delete` | admin.js | 删除知识 |

---

## 七、已知问题与注意事项

### 7.1 代码层面的坑

1. **SQL 语法混合**：代码中同时存在 `TOP N`、`LIMIT N`、`IFNULL`、`ISNULL`、SQL Server 风格和 MySQL 风格。`db.js` 的适配层能处理部分，但不是全部。修改 SQL 后务必在 MySQL 中测试。
2. **硬编码凭据**：部分旧测试文件和脚本中可能仍残留 API Key、数据库密码。生产 Key 建议尽快轮换。
3. **LLM 偶发空响应**：MiMo v2.5 有时会返回空内容，当前通过重试和知识库兜底缓解。
4. **Embedding 外部依赖**：向量检索依赖 SiliconFlow API，有网络延迟和可用性风险。
5. **缓存清除逻辑**：`clearQACache` 使用 `SCAN` + `MATCH qa:*`，生产环境 Key 多时要小心阻塞。

### 7.2 部署与运维

- 生产目录：`/opt/qa-server/server/`
- 日志：`pm2 logs qa-server`
- 重启：`pm2 restart qa-server`
- MySQL、Redis、Neo4j 均在同一台服务器本地运行。
- 地图图片路径：`server/public/campus_map.jpg`，通过 `/public/campus_map.jpg` 访问。

### 7.3 Git 与同步

- 当前分支：`feature/knowledge-graph`
- 运行目录 `/opt/qa-server/server` 与克隆副本 `/root/QA` 需手动同步。
- `.gitignore` 已排除：`.env`、`data/`、`uploads/`、`backup/`、`.hermes.md`。

---

## 八、快速启动（本地开发）

### 8.1 环境要求

- Node.js 18+
- MySQL 8.0
- Redis 6+
- Neo4j 5.x（可选，如只做基础测试可跳过）

### 8.2 启动步骤

```bash
# 1. 创建数据库并导入表结构
mysql -u root -p
CREATE DATABASE FreshmanQA CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE FreshmanQA;
SOURCE sql/create_tables_mysql.sql;
SOURCE sql/wxu_knowledge.sql;
SOURCE sql/wxu_info.sql;

# 2. 创建 .env
cd server
copy NUL .env
# 填入 DB_HOST, DB_PASS, SF_EMBEDDING_KEY 等

# 3. 安装依赖
npm install

# 4. 启动服务
node app.js

# 5. 测试
# POST http://localhost:3000/api/qa/ask
# Body: { "user_id": 1, "question_text": "学校在哪里" }
```

### 8.3 微信小程序开发

1. 打开微信开发者工具。
2. 导入 `miniprogram` 目录。
3. 修改 `app.js` 中的 `baseUrl` 为本地或测试服务器地址。
4. 在微信公众平台配置 `request` 合法域名。

---

## 九、推荐下一步工作

根据课程设计论文和当前状态，建议 Codex 接手后按优先级处理：

1. **清理测试文件**：将 `server/` 根目录下的 `test_*.js`、`debug_*.js`、`fix_*.js` 等统一移到 `server/临时文件/` 或删除。
2. **统一 SQL 语法**：将所有 SQL 改为标准 MySQL 语法，移除对 `db.js` 适配层的依赖。
3. **环境变量规范化**：使用 `dotenv` 包替换 `app.js` 中的自定义 `.env` 解析。
4. **Embedding 本地化**：评估本地部署轻量化 Embedding 模型，降低外部依赖。
5. **消息队列实现**：当前 RabbitMQ 只在论文中提到，代码中未真正接入。可接入 RabbitMQ 实现 LLM 异步调用。
6. **日志与监控**：接入统一日志和错误监控（如 Sentry 或自建日志）。
7. **知识库数据补充**：批量导入更多学校官方信息。
8. **单元测试**：为 `qa.js`、`admin.js` 等核心路由补充测试。

---

## 十、关键账号与资源

| 资源 | 说明 |
|------|------|
| 服务器 | 121.199.68.192（Ubuntu 22.04） |
| 域名 | logic-yjb.top |
| 微信小程序 | 冰冰快答小助手 |
| GitHub 仓库 | https://github.com/Logic647/Q-A.git |
| GitHub 账号 | Logic647 |
| LLM API | api.xiaomimimo.com，模型 mimo-v2.5 |
| Embedding API | SiliconFlow，模型 BAAI/bge-m3 |
| MySQL 默认库 | FreshmanQA |
| Neo4j | bolt://localhost:7687（已下线，凭据见本地副本） |

**敏感信息**（API Key、数据库密码、管理员密码）未写入本文档，请从 `.env` 文件、密码管理器或原开发者处获取。（2026-08-30 复查时已将文中残留的数据库密码、管理 Key、Neo4j 密码脱敏。）

---

## 十一、附录：常见问题排查

| 问题 | 排查方向 |
|------|---------|
| 后端启动失败 | 检查 MySQL/Redis/Neo4j 是否启动；检查 `.env` 是否存在 |
| 问答返回空 | 查看 `pm2 logs qa-server`；检查 LLM API Key 是否有效 |
| 知识库匹配不到 | 检查 knowledge_base 表是否有数据；检查 Embedding Key 是否配置 |
| 小程序请求失败 | 检查 baseUrl；检查微信域名白名单；检查 Nginx |
| 缓存不更新 | 检查 Redis 是否正常；检查 `clearQACache` 是否执行 |
| 认证图片上传失败 | 检查 `server/uploads/verify` 目录权限 |

---

*文档结束。祝开发顺利！*
