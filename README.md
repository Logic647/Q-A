# 无锡学院新生入学智能问答系统（冰冰快答小助手 / FreshmanQA）

面向高校新生的智能问答微信小程序：知识库 + RAG 双渠道自动应答，未收录问题流转给已认证学生回答，管理员审核通过后自动入库并向量化。

> 项目交接与生产部署细节见根目录 `HANDOVER.md` 与 `HANDOVER_ADDENDUM.md`（后者为准）。

## 技术栈

| 层 | 组件 |
| --- | --- |
| 前端 | 微信小程序原生框架（`miniprogram/`） |
| 后端 | Node.js >= 18 + Express 5（`server/`） |
| 数据库 | MySQL 8（业务数据 + 知识库） |
| 缓存 | Redis（问答缓存 + 分策略限流） |
| 向量检索 | SiliconFlow `BAAI/bge-m3`（内存向量索引） |
| 大模型 | MiMo `mimo-v2.5` |
| 管理后台 | `server/public/admin.html`（Express 静态服务的单页应用） |

> 历史说明：早期版本使用 SQL Server + Neo4j 知识图谱 + RabbitMQ。现已迁移为 MySQL-only，Neo4j 相关文件（`server/services/kg.js`、`deploy/migrate_neo4j.js` 等）仅作历史保留，不是运行依赖。

## 目录结构

```
├── miniprogram/          # 微信小程序前端（登录/聊天/认证/回答/历史/地图/管理）
├── server/               # Express 后端
│   ├── app.js            # 入口：CORS、限流、管理员认证、路由挂载
│   ├── config/           # db.js（MySQL + SQL 适配层）、redis.js
│   ├── middleware/       # rateLimit / ipWhitelist / timeout
│   ├── routes/           # user / qa / info / admin
│   ├── services/         # llm.js、embedding.js
│   ├── public/           # admin.html、notepad.html、地图图片
│   └── test/             # node:test 单元测试（全 mock，无需真实数据库）
├── sql/                  # 建表与初始数据脚本（MySQL 为主）
├── deploy/               # 部署脚本与 Nginx/PM2 配置
└── docs/                 # 文档
```

## 快速开始

### 1. 环境要求

- Node.js >= 18（生产为 v20，本地开发 v24 均可）
- MySQL 8
- Redis 6+

### 2. 配置环境变量

复制根目录 `.env.example` 为 `server/.env` 并填写（`.env` 已被 gitignore，切勿提交）：

```bash
cp .env.example server/.env
```

必填项：`DB_PASS`、`ADMIN_KEY`、`ADMIN_USERNAME`、`ADMIN_PASSWORD`；可选：`SF_EMBEDDING_KEY`（未配置时跳过向量检索）、`LLM_API_KEY`（未配置时走知识库兜底文案）。

### 3. 初始化数据库

```bash
mysql -u root -p --default-character-set=utf8mb4
```

```sql
CREATE DATABASE IF NOT EXISTS FreshmanQA
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE FreshmanQA;
SOURCE deploy/migrate_mysql.sql;      -- 核心业务表
SOURCE sql/create_tables_mysql.sql;   -- 校园信息表 + 初始数据
SOURCE deploy/init_knowledge.sql;     -- 基础知识库数据
```

### 4. 安装依赖并启动

```bash
cd server
npm ci
npm start          # 或 npm run dev（--watch 模式）
```

默认监听 `http://127.0.0.1:3000`，管理后台在 `/admin`。

## 测试与 CI

```bash
cd server
npm test
```

测试基于 `node:test`，全部依赖为模块级 mock（无需真实 MySQL/Redis/外部 API），且不依赖本地 `.env`——GitHub Actions 在每次 push/PR 时于 Node 20/24 矩阵上运行同一套测试（`.github/workflows/ci.yml`）。

## 问答链路概要

1. 问题清洗后先查 Redis 缓存（`qa:<问题>`）。
2. MySQL 知识库 LIKE 匹配 → 不足时 Embedding 向量检索 → 同义词扩展 → 历史已审核问答。
3. 组装上下文调用 LLM；LLM 失败时用知识库原文兜底。
4. 有实质回答：持久化 question/answer 并自动入库知识库；未收录：仅记录问题进入待回答队列，由已认证学生作答、管理员审核。

## 部署

生产环境为阿里云轻量服务器 + PM2 + Nginx，通过 Git 拉取 `/root/QA` 后同步至 `/opt/qa-server`。完整流程（含备份、回滚、冒烟验证）见 `HANDOVER_ADDENDUM.md` 第 10 节；`deploy/` 下有 Nginx 与 PM2 配置模板。
