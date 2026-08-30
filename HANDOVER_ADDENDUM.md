# 补充交接文档

> 生成时间：2026-08-29  
> 基线分支：`feature/knowledge-graph`  
> 远端最新提交：`c783404 fix: show identity verification in web admin`  
> 本文件是 `HANDOVER.md` 的补充。两者冲突时，以本文件记录的最新状态为准。  

---

## 1. 交接快照

| 项目 | 当前状态 |
| --- | --- |
| 本地仓库 | `F:\桌面\数据库课程设计` |
| 当前分支 | `feature/knowledge-graph` |
| 远端 | `origin/Logic647/QA`，分支已推送至 `c783404` |
| 后端 | Express 5 + MySQL 8 + Redis，入口 `server/app.js` |
| 小程序前端 | `miniprogram/` |
| 网站管理后台前端 | `server/public/admin.html` |
| 图数据库 | Neo4j 相关文件仍在仓库，但当前主问答链路已不作为运行依赖 |
| 本地测试 | `npm test`，Node v24.18.0 下 12/12 通过 |
| 生产服务 | 阿里云 `121.199.68.192`，PM2 `qa-server` 在线，域名 `https://logic-yjb.top` |
| 生产部署基线 | `/root/QA` 与 `/opt/qa-server` 已同步至 `c783404` |
| 生产健康检查 | `https://logic-yjb.top/api/info/enrollment` 返回 HTTP 200 |

最近的实际开发重点是三件事：后端问答/审核/反馈链路加固、微信小程序 UI 统一美化、网站管理后台补齐身份认证审核。

> **凭据提醒：本文件曾含明文凭据，2026-08-30 已全部脱敏以便入库。含原始值的本地副本为 `HANDOVER*-local.md`（已被 .gitignore 排除，禁止提交到 Git）。**

### 1.0.1 凭据清单（已脱敏）

以下凭据对应 2026-08-29 交接时的本地与生产状态。具体值见本地未入库副本 `HANDOVER*-local.md`、`server/.env` 或服务器安全存储。

| 类型 | 用途 | 值 |
| --- | --- | --- |
| 服务器 SSH | `root@121.199.68.192` | （见本地副本） |
| 服务器 SSH 地址 | 登录命令 | `ssh root@121.199.68.192` |
| GitHub token | 当前 `origin` remote 内嵌凭据 | （见本地副本；应尽快轮换并改用 credential manager） |
| GitHub remote | 当前推送/拉取地址 | `https://github.com/Logic647/QA.git`（token 内嵌版见本地副本） |
| SiliconFlow Embedding API Key | `SF_EMBEDDING_KEY` | （见 `server/.env`） |
| MiMo LLM API Key | `LLM_API_KEY` | （见 `server/.env`） |
| 管理后台账号 | `ADMIN_USERNAME` | `admin` |
| 管理后台密码 | `ADMIN_PASSWORD` | （见 `server/.env`） |
| 管理接口 Key | `ADMIN_KEY` | （见 `server/.env`） |
| MySQL 用户/密码 | 本地与生产当前连接约定 | `root /（见 server/.env 或 db.js 历史默认值）` |

说明：

- `server/.env` 当前只显式保存 Embedding Key、管理 Key、LLM Key、管理员账号和密码。
- MySQL 连接信息当前主要由 `server/config/db.js` 的默认值提供。
- GitHub token 当前内嵌在 `origin` remote URL 中。新接手者应优先改用 GitHub CLI、credential manager 或部署专用 token，并尽快轮换。
- 所有明文凭据已从入库版本移除，原始值只存在于本地 `HANDOVER*-local.md`。

---

## 2. 最重要的边界：两个前端不要混淆

### 2.1 微信小程序前端

目录：

```text
miniprogram/
```

说明：

- 这是真正发给微信开发者工具/微信端使用的原生小程序代码。
- 生产请求基地址在 `miniprogram/app.js` 的 `globalData.baseUrl`，当前为 `https://logic-yjb.top/api`。
- 最近已经完成统一 UI 美化，提交是 `da2701a style: unify miniprogram UI`。
- 聊天页头像已按要求从 `AI` 改为 `冰`。
- 聊天页顶部地图按钮已移除，只保留输入栏旁边的地图按钮。

### 2.2 网站管理后台前端

目录：

```text
server/public/admin.html
```

说明：

- 这是通过 Nginx / Express 静态服务的网页管理后台，不是微信小程序。
- 页面地址：
  - `https://logic-yjb.top/admin`
  - `https://www.logic-yjb.top/admin`
- 最新提交 `c783404` 已在该页面新增“身份审核”模块。
- 它调用的是 `/api/admin/*` 接口，和 `miniprogram/pages/admin/` 是两套前端入口。

---

## 3. Git 与代码状态

### 3.1 分支与提交

当前分支：

```text
feature/knowledge-graph
```

当前最新提交链：

```text
c783404 fix: show identity verification in web admin
be89a46 chore: sync server dependencies lockfile
da2701a style: unify miniprogram UI
73b63e3 fix: isolate rate limit policies
3559a99 fix: harden QA persistence and admin APIs
5fa32a1 fix: 移除deploy.sh中泄露的SiliconFlow API Key
c34095a feat: 服务器8月改进同步 — 错误处理/限流/缓存/反馈与报表接口
3e00a17 refactor: 移除Neo4j知识图谱依赖，数据迁移到MySQL知识库
```

关键变更摘要：

1. `3559a99`
   - `/api/qa/ask` 开始持久化真实 `question_id` 和 `answer_id`。
   - 有实质回答的问题会写入 `question` 与 `answer`，反馈能关联真实 `answer_id`。
   - 未命中知识库的问题仍进入待回答队列，但不生成可评价的 `answer`。
   - 管理端统计同时兼容新版网页后台和小程序旧字段。
   - 单条/批量拒绝回答后，会把问题重新置为待回答。

2. `73b63e3`
   - 修复限流计数器共用问题。
   - 限流键现在按策略隔离，例如 `api`、`login`、`qa`、`strict`。
   - 之前普通接口访问会挤占登录接口限额，导致用户登录误报 429。

3. `da2701a`
   - 小程序全局设计变量与页面视觉统一。
   - 登录、聊天、认证、回答、历史、地图、管理页均有样式更新。
   - 主要是 UI 层修改，不应改变业务接口契约。

4. `be89a46`
   - 同步 `server/package-lock.json`。
   - 修复 Node 20 下 `node --test "test/*.test.js"` glob 不生效的问题。
   - `npm test` 现在显式列出测试文件。

5. `c783404`
   - 网页管理后台新增身份认证审核页。
   - 概览新增待认证用户数量和导航角标。
   - 修复 `https://www.logic-yjb.top` 的 CORS 拒绝问题。
   - CORS 校验从简单 `startsWith` 改为精确 origin 加本机开发域名判断。

### 3.2 本地工作区未跟踪内容

截至交接时，本地工作区有一批未跟踪文件，主要包括：

```text
HANDOVER.md
HANDOVER_ADDENDUM.md
deploy/app.js
deploy/deploy_step1.sh
deploy/deploy_step2.sh
deploy/file_data.txt
deploy/setup_mysql_tables.sh
fix_top.js
fix_top.py
hermes-migration/
server/check_data2.js
server/check_neo4j.js
server/flush_cache.js
server/list_models.js
server/restart*.js
server/run_mysql_setup.js
server/start*.js
server/stop.js
server/test_*.js
server/update_coords.js
server/update_stations.js
server/write_kg_data.js
_dream_query*.py
.mimocode/
数据库课程设计.txt
```

这些多数是历史调试脚本、临时迁移文件或交接材料，不要盲目提交。建议新接手者先分类：

- 有长期价值：移入规范目录、清理后再提交。
- 只是一次调试：删除或继续保留在本地。
- 包含敏感信息：禁止入库，先脱敏。

`HANDOVER.md` 和本文件也还未提交。新接手者确认内容后，可以把它们作为文档提交到仓库。

---

## 4. 运行架构

### 4.1 后端

入口：

```text
server/app.js
```

主要中间件和挂载顺序：

1. 自定义 `.env` 解析。
2. 必填环境变量检查：`ADMIN_KEY`、`ADMIN_USERNAME`、`ADMIN_PASSWORD`。
3. CORS。
4. JSON body 解析，上限 2MB。
5. `/public` 静态资源。
6. 请求超时和慢请求日志。
7. 根路径和管理后台页面路由。
8. 管理员登录接口。
9. `/api/user`、`/api/qa`、`/api/info`、`/api/admin` 路由。
10. 全局错误处理。
11. 启动时构建向量索引。

端口默认：

```text
3000
```

### 4.2 数据库适配层

文件：

```text
server/config/db.js
```

现状：

- 底层是 `mysql2/promise`。
- 但对外仍模拟早期 SQL Server 风格的 `pool.request().input().query()`。
- 适配层会把 `SELECT TOP N` 转成 MySQL `LIMIT N`。
- 适配层会把 `@param` 替换为 `?`，并按占位符顺序填充同名参数。
- 已补充 `sql.Decimal(precision, scale)`，否则反馈接口会抛 TypeError。

注意：

- 这层是历史包袱，新增 SQL 建议直接写标准 MySQL。
- 后续应逐步把所有 SQL 统一为标准 MySQL 语法，再删除或简化适配层。
- 数据库连接密码目前仍有代码默认值，后续应改成仅依赖 `.env`，避免凭据进入源码。

### 4.3 Redis

文件：

```text
server/config/redis.js
```

用途：

- 问答缓存：`qa:<清洗后的问题>`。
- 限流计数。

缓存清理：

- `server/utils/index.js` 提供 `clearQACache()`。
- 知识库增删改、审核通过等操作后应清理缓存。
- 当前使用 Redis `SCAN` + `MATCH qa:*`，生产数据量大时要关注阻塞风险。

### 4.4 LLM 与 Embedding

LLM：

```text
server/services/llm.js
```

- 使用环境变量 `LLM_API_KEY`。
- 模型当前为 `mimo-v2.5`。
- 无 Key 时不会调用外部接口，返回空，由知识库或未收录兜底文案处理。

Embedding：

```text
server/services/embedding.js
```

- 使用环境变量 `SF_EMBEDDING_KEY`。
- 模型当前为 `BAAI/bge-m3`。
- 向量索引存在内存中，启动时从 `knowledge_base` 构建。
- 服务重启后需要重新构建；持久化逻辑较弱，不适合视作可靠存储。

Neo4j：

- `server/services/kg.js`、`server/config/neo4j.js` 等文件仍存在。
- 当前主问答路由已经不把它作为必要依赖。
- 生产环境当前没有把 Neo4j 作为本次部署的关键服务。
- 后续如果要恢复图谱能力，需要先重新梳理调用入口和数据同步。

---

## 5. 核心业务规则

### 5.1 问答链路 `/api/qa/ask`

当前实际流程：

1. 校验 `question_text`。
2. 清洗问题文本。
3. 查 Redis 缓存。
4. MySQL 知识库模糊匹配。
5. 可选 Embedding 向量检索。
6. 可选同义词扩展检索。
7. 无知识时查历史已审核问答。
8. 组装上下文并调用 LLM。
9. LLM 失败时用知识库原始数据兜底。
10. 判断是否是“未收录”兜底文案。
11. 持久化问答记录。
12. 有实质回答时自动入库知识库。
13. 写 Redis 缓存并返回。

返回契约：

```json
{
  "code": 0,
  "data": {
    "question_id": 1,
    "answer_id": 1,
    "channel": 1,
    "answer": "...",
    "category": "知识库",
    "source": "rag"
  }
}
```

规则：

- 有实质回答：`channel=1`，`source=rag`，返回真实 `answer_id`。
- 未收录：`channel=2`，`source=llm`，`answer_id=0`。
- 未收录问题会写入 `question`，状态为 `0`，等待学生或管理员回答。
- 有实质回答时会写入 `question` 和 `answer`；`answer.source=1`，`review_status=1`。
- 相同问题和相同回答会做幂等去重，避免 Redis 不可用时重复插入大量记录。

前端依赖：

- 小程序聊天页的评分按钮依赖 `data.answer_id`。
- 没有 `answer_id` 时前端不应发送 `/api/qa/feedback`。

### 5.2 反馈 `/api/qa/feedback`

规则：

- 必填：`answer_id`、`user_id`。
- 评分范围：1 到 5。
- 同一用户对同一回答重复提交时会更新反馈，而不是报错。
- 更新或插入反馈后会重新计算 `answer.avg_score` 和 `answer.score_count`。
- 数据库适配层必须支持 `sql.Decimal(5, 2)`。

### 5.3 管理审核

回答审核：

- `GET /api/admin/review/pending`
- `POST /api/admin/review`
- `POST /api/admin/review/batch`

行为：

- 审核通过：回答 `review_status=1`，问题 `status=1`，合格回答入库知识库。
- 审核拒绝：回答 `review_status=2`，问题重新置为 `status=0`。
- 批量拒绝也必须把对应问题重新置为待回答。
- 审核通过后会自动向量化并清理问答缓存。

身份认证审核：

- 用户提交：`POST /api/user/verify`
- 待审核列表：`GET /api/admin/verify/pending`
- 审核：`POST /api/admin/verify/review`
- 通过后更新：
  - `user_verify.status=1`
  - `user.auth_status=1`
  - `user.role=1`

2026-08-26 生产数据中存在一条用户提交的待审核认证：

```text
verify_id=4
user_id=33
status=0
```

这是用户反馈“提交后管理后台没有同步”的直接原因之一：数据已经入库，但旧网页后台没有加载 `/api/admin/verify/pending`。该问题已在 `c783404` 修复。

### 5.4 管理端统计 `/api/admin/stats`

当前返回同时兼容两类前端：

```json
{
  "code": 0,
  "data": {
    "questions": {
      "total": 0,
      "pending": 0
    },
    "pending_review": 0,
    "knowledge_base": {
      "total": 0,
      "from_review": 0
    },
    "low_score_count": 0
  }
}
```

用途：

- `questions.total/pending`：小程序管理页旧字段。
- `pending_review`：网页后台新字段。
- `knowledge_base`：网页后台。
- `low_score_count`：两端。

不要贸然删除旧字段，否则小程序管理概览会显示为 0。

---

## 6. 认证、CORS 与限流

### 6.1 管理员认证

登录接口：

```text
POST /api/admin/login
```

请求：

```json
{
  "username": "...",
  "password": "..."
}
```

成功返回：

```json
{
  "code": 0,
  "token": "<ADMIN_KEY>",
  "msg": "登录成功"
}
```

后续管理接口请求头：

```text
X-Admin-Key: <ADMIN_KEY>
```

环境变量：

- `ADMIN_KEY`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

生产 `.env` 已包含这些变量。交接文档不记录其值。

安全提醒：

- 当前 `/api/admin/login` 成功后直接把 `ADMIN_KEY` 返回给前端，作为长期静态令牌使用。
- 这个机制可用，但安全性弱。
- 后续应改成短期 JWT/session、刷新机制、管理员角色和登录失败锁定。

### 6.2 CORS

当前允许：

- `https://servicewechat.com`
- `https://logic-yjb.top`
- `https://www.logic-yjb.top`
- 本机开发的 `http://localhost:*` / `http://127.0.0.1:*`
- 无 Origin 请求，如小程序、curl、服务端调用

已修复：

- 旧逻辑用 `origin.startsWith('https://logic-yjb.top')`，会漏掉 `https://www.logic-yjb.top`。
- 网页后台从 www 域名访问时，接口被 CORS 拒绝。
- `c783404` 已改为精确 origin 加本机开发域名判断。

生产验证：

```text
OPTIONS https://logic-yjb.top/api/admin/verify/pending
Origin: https://www.logic-yjb.top
Access-Control-Request-Headers: x-admin-key
```

预期：

```text
HTTP 204
Access-Control-Allow-Origin: https://www.logic-yjb.top
Access-Control-Allow-Headers: x-admin-key
```

### 6.3 限流

文件：

```text
server/middleware/rateLimit.js
```

策略：

| 策略 | 用途 | 当前限制 |
| --- | --- | --- |
| `api` | 通用接口 | 60 次 / 分钟 |
| `login` | 登录 | 5 次 / 分钟 |
| `qa` | 问答 | 30 次 / 分钟 |
| `strict` | 敏感操作 | 10 次 / 小时 |

Redis 键格式：

```text
ratelimit:<policy>:<ip>
```

注意：

- 不要把不同策略的 Redis 键改回同一格式，否则会重新出现普通接口计数挤占登录限额的问题。
- 内存降级 Map 也会使用带策略前缀的 key。

---

## 7. 前端现状

### 7.1 小程序页面

主要页面：

| 页面 | 目录 | 说明 |
| --- | --- | --- |
| 登录 | `miniprogram/pages/login/` | 微信快捷登录 |
| 聊天 | `miniprogram/pages/index/` | 核心问答页 |
| 身份认证 | `miniprogram/pages/verify/` | 学生提交姓名、学号、证件图 |
| 回答问题 | `miniprogram/pages/answer/` | 已认证学生回答待回答问题 |
| 提问记录 | `miniprogram/pages/history/` | 服务端历史提问 |
| 校园地图 | `miniprogram/pages/map/` | 图片地图 |
| 管理后台 | `miniprogram/pages/admin/` | 小程序内管理入口 |

最新 UI 变化：

- 全局设计变量在 `miniprogram/app.wxss`。
- 统一颜色、卡片、圆角、状态色、阴影和字体。
- 登录页有品牌卡、功能说明、加载状态和错误状态。
- 聊天页有侧边会话栏、欢迎卡、消息气泡、快捷提问、加载动画和文字反馈按钮。
- 聊天机器人头像显示为“冰”。
- 地图入口只在聊天输入栏左侧保留。
- 身份认证、回答、历史、地图、管理页统一了表单和卡片风格。

需要特别注意：

```text
miniprogram/app.js
```

当前 `request()` 中如果请求以 `/admin` 开头，会硬编码：

```js
header['X-Admin-Key'] = '<当前 ADMIN_KEY，见 server/.env>';
```

这是一个安全风险。当前生产 `ADMIN_KEY` 恰好等于这个旧默认值，所以小程序管理页还能用。但后续修改生产 `ADMIN_KEY` 后，小程序管理页会直接 401。正确方向是：

1. 管理员在小程序内登录。
2. 后端返回短期管理 token。
3. 前端把 token 存入内存或安全 storage。
4. `request()` 读取存储的 token，而不是硬编码。
5. 生产环境立即更换默认 `ADMIN_KEY`。

### 7.2 网页管理后台

文件：

```text
server/public/admin.html
```

模块：

| 模块 | 功能 |
| --- | --- |
| 概览 | 待审回答、待回答问题、待认证用户、知识库、低分回答 |
| 知识库 | 列表、新增、编辑、删除 |
| 待审核 | 学生回答审核 |
| 身份审核 | 用户提交的身份认证审核 |
| 待回答 | 未收录问题列表、管理员代答、删除 |
| 用户管理 | 已认证用户列表、备注、权限回收 |

身份审核已接入：

```text
GET /api/admin/verify/pending
POST /api/admin/verify/review
```

页面能力：

- 显示姓名、学号、微信昵称、提交时间。
- 显示证件图缩略图，可点击打开大图。
- 支持通过。
- 支持拒绝并可填写原因。
- 拒绝原因会写入 `user_verify.remark`。

---

## 8. 本地开发环境

### 8.1 基础要求

- Node.js >= 18。
- MySQL 8。
- Redis 6+。
- 本地开发不一定需要 Neo4j。

本机实际使用版本：

| 组件 | 版本 |
| --- | --- |
| Windows | Windows / PowerShell |
| Node.js | v24.18.0 |
| MySQL | 8.0.42 |
| Redis | 5.0.14.1 |

生产服务器 Node.js 是 v20.20.2，测试脚本已兼容。

### 8.2 本地便携环境位置

为了不污染系统安装目录，本地测试环境安装在 D 盘：

```text
D:\qa-test-env\
```

MySQL：

```text
D:\qa-test-env\mysql-8.0.42-winx64\
D:\qa-test-env\mysql\data\
D:\qa-test-env\mysql\logs\
D:\qa-test-env\mysql\mysqld.pid
```

Redis：

```text
D:\qa-test-env\redis\redis-server.exe
D:\qa-test-env\redis\redis-cli.exe
D:\qa-test-env\redis\test-redis.conf
D:\qa-test-env\redis\data\
D:\qa-test-env\redis\redis.pid
```

后端测试日志：

```text
D:\qa-test-env\server-logs\
```

整合测试脚本：

```text
D:\qa-test-env\integration-test.cjs
```

截至 2026-08-29 检查，本地 3306、6379、3000 端口均已停止。需要跑真实链路时再按下面命令启动。

### 8.3 启动本地 MySQL

示例命令：

```powershell
& "D:\qa-test-env\mysql-8.0.42-winx64\bin\mysqld.exe" `
  --no-defaults `
  --basedir="D:\qa-test-env\mysql-8.0.42-winx64" `
  --datadir="D:\qa-test-env\mysql\data" `
  --port=3306 `
  --bind-address=127.0.0.1 `
  --mysqlx=OFF `
  --console
```

如果之前已初始化，不需要重复 `--initialize-insecure`。

### 8.4 启动本地 Redis

```powershell
& "D:\qa-test-env\redis\redis-server.exe" `
  "D:\qa-test-env\redis\test-redis.conf"
```

验证：

```powershell
& "D:\qa-test-env\redis\redis-cli.exe" -h 127.0.0.1 -p 6379 ping
```

预期：

```text
PONG
```

### 8.5 本地 `.env`

本地文件：

```text
server/.env
```

模板：

```text
.env.example
```

必须变量：

| 变量 | 用途 |
| --- | --- |
| `ADMIN_KEY` | 管理接口静态 token |
| `ADMIN_USERNAME` | 管理后台登录名 |
| `ADMIN_PASSWORD` | 管理后台登录密码 |
| `SF_EMBEDDING_KEY` | SiliconFlow Embedding |
| `LLM_API_KEY` | MiMo LLM |

数据库变量：

| 变量 | 用途 |
| --- | --- |
| `DB_HOST` | 默认 localhost |
| `DB_PORT` | 默认 3306 |
| `DB_USER` | 默认 root |
| `DB_PASS` | 生产/本地数据库密码 |
| `DB_NAME` | 默认 FreshmanQA |

Redis 当前没有完整读取 `REDIS_HOST/REDIS_PORT`，`server/config/redis.js` 仍默认 `127.0.0.1:6379`。这是待办。

不要把真实 `.env` 提交入库。

### 8.6 安装依赖与测试

```powershell
cd F:\桌面\数据库课程设计\server
npm ci
npm test
```

当前测试文件：

```text
server/test/api.test.js
server/test/db.test.js
server/test/env.test.js
server/test/rateLimit.test.js
```

覆盖点：

1. 管理员登录。
2. 管理端统计兼容新旧前端。
3. 反馈接口使用 `sql.Decimal`。
4. 单条拒绝后问题回到待回答。
5. 审核通过后问题置为已回答。
6. 批量拒绝后问题回到待回答。
7. `/api/qa/ask` 返回真实 `question_id` 和 `answer_id`。
8. 未命中问题只记录问题，不生成可评价回答。
9. `SELECT TOP` 转 MySQL `LIMIT`。
10. 同名参数重复占位符填充。
11. `.env` 支持 CRLF。
12. 不同限流策略不共享计数。

2026-08-29 本地结果：

```text
12 passed, 0 failed
```

### 8.7 启动后端

```powershell
cd F:\桌面\数据库课程设计\server
node app.js
```

默认：

```text
http://127.0.0.1:3000
```

如果配置了外部 LLM/Embedding Key，启动时会构建向量索引；数据库或外部服务不可用时不影响 HTTP 服务启动，但相关能力会降级。

### 8.8 本地整合测试

整合脚本位于：

```text
D:\qa-test-env\integration-test.cjs
```

它不是仓库内自动化测试，而是一次性真实链路验证脚本，覆盖：

1. MySQL 校园信息接口。
2. Redis 支撑的问答服务。
3. 管理员登录和统计。
4. 知识库增删改查。
5. 用户认证和管理员审核。
6. 未收录问题持久化。
7. 学生回答提交、管理员审核通过。
8. 反馈聚合更新。

运行前需要本地 MySQL/Redis/后端都已启动。

---

## 9. 数据库初始化

生产数据库名：

```text
FreshmanQA
```

主要初始化脚本：

| 脚本 | 作用 |
| --- | --- |
| `deploy/migrate_mysql.sql` | 核心业务表：用户、认证、问题、回答、审核、反馈、知识库 |
| `sql/create_tables_mysql.sql` | 校园信息表和初始数据 |
| `deploy/init_knowledge.sql` | 27 条基础知识库数据 |
| `sql/wxu_info.sql` | 旧 SQL Server 风格信息数据，不要直接用于 MySQL |
| `sql/wxu_knowledge.sql` | 旧 SQL Server 风格知识数据，不要直接用于 MySQL |
| `sql/create_tables.sql` | 旧 SQL Server 建表脚本，仅作历史参考 |

注意：

- 项目没有正式 migration 框架。
- 表结构变更需要手工执行 SQL，并同步维护 MySQL 脚本。
- 不建议再使用 SQL Server 风格脚本。
- `GO`、`DBCC CHECKIDENT`、`SET IDENTITY_INSERT` 都不能直接用于 MySQL。

本地初始化流程曾使用：

```sql
CREATE DATABASE IF NOT EXISTS FreshmanQA
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

然后依次执行：

```text
deploy/migrate_mysql.sql
sql/create_tables_mysql.sql
deploy/init_knowledge.sql
```

执行 MySQL 脚本时建议显式加：

```text
--default-character-set=utf8mb4
```

否则中文默认值可能在某些客户端环境下触发非法默认值问题。

---

## 10. 生产部署

### 10.1 服务器信息

| 项目 | 值 |
| --- | --- |
| 云服务器 | 阿里云轻量应用服务器 |
| IP | `121.199.68.192` |
| 域名 | `logic-yjb.top` |
| www 域名 | `www.logic-yjb.top` |
| 系统 | Ubuntu 22.04.5 LTS |
| Node.js | v20.20.2 |
| 应用目录 | `/opt/qa-server/server` |
| 源码克隆 | `/root/QA` |
| 小程序源码目录 | `/opt/qa-server/miniprogram` |
| PM2 进程 | `qa-server` |
| Nginx 配置 | `/etc/nginx/sites-enabled/qa` |

截至 2026-08-29 检查：

```text
PM2 qa-server: online
uptime: 约 3 天
https://logic-yjb.top/api/info/enrollment: HTTP 200
```

### 10.2 生产目录关系

推荐同步关系：

```text
GitHub origin/feature/knowledge-graph
        |
        | git pull
        v
/root/QA
        |
        | rsync / copy
        v
/opt/qa-server
```

`/root/QA` 是 Git 克隆，`/opt/qa-server` 是 PM2 实际运行目录。不要只在 `/opt/qa-server` 里改代码，否则下次同步会丢失。

生产 `.env` 位于：

```text
/opt/qa-server/server/.env
```

当前包含以下类型的变量：

```text
SF_EMBEDDING_KEY
ADMIN_KEY
LLM_API_KEY
ADMIN_USERNAME
ADMIN_PASSWORD
```

交接文档不记录这些值。

### 10.3 最近一次部署

部署时间：

```text
2026-08-26
```

部署提交：

```text
c783404 fix: show identity verification in web admin
```

同步内容：

- `/root/QA/server/app.js` -> `/opt/qa-server/server/app.js`
- `/root/QA/server/public/admin.html` -> `/opt/qa-server/server/public/admin.html`
- `/root/QA/miniprogram/` -> `/opt/qa-server/miniprogram/`

备份：

```text
/opt/qa-server/backup/pre-deploy-20260826-141924.tar.gz
```

部署后已验证：

1. PM2 `qa-server` online。
2. 健康接口 HTTP 200。
3. 管理员登录成功。
4. `/api/admin/verify/pending` 返回 `verify_id=4`。
5. `www.logic-yjb.top` 的 CORS 预检返回 204。
6. 网页后台 HTML 包含身份审核模块。
7. 小程序源码包含“冰”头像，且只保留输入栏地图按钮。
8. `/api/qa/ask` 可返回真实 `answer_id`。
9. 相同问题第二次请求命中 Redis 缓存。

### 10.4 常规部署流程

1. 本地提交并推送：

   ```powershell
   git add .
   git commit -m "..."
   git push origin feature/knowledge-graph
   ```

2. 服务器拉取最新代码：

   ```bash
   ssh root@121.199.68.192
   cd /root/QA
   git pull --ff-only origin feature/knowledge-graph
   ```

3. 按需安装依赖：

   ```bash
   cd /root/QA/server
   npm ci
   npm test
   ```

4. 备份当前生产文件：

   ```bash
   stamp=$(date +%Y%m%d-%H%M%S)
   mkdir -p /opt/qa-server/backup
   tar -C /opt/qa-server -czf \
     /opt/qa-server/backup/pre-deploy-$stamp.tar.gz \
     --exclude='server/node_modules' \
     --exclude='server/uploads' \
     --exclude='server/data' \
     --exclude='server/backup' \
     server
   ```

5. 同步代码到运行目录：

   ```bash
   rsync -a --delete \
     --exclude '/.env' \
     --exclude '/node_modules/' \
     --exclude '/uploads/' \
     --exclude '/data/' \
     --exclude '/backup/' \
     /root/QA/server/ /opt/qa-server/server/

   rsync -a --delete \
     /root/QA/miniprogram/ /opt/qa-server/miniprogram/
   ```

   注意：不要删除或覆盖生产 `.env`、`node_modules/`、`uploads/`、`data/`、`backup/`。

6. 安装生产依赖：

   ```bash
   cd /opt/qa-server/server
   npm install --omit=dev
   ```

7. 重启：

   ```bash
   pm2 restart qa-server --update-env
   pm2 status
   pm2 logs qa-server --lines 50 --nostream
   ```

8. 线上冒烟：

   ```bash
   curl -sS -o /dev/null -w '%{http_code}\n' \
     https://logic-yjb.top/api/info/enrollment
   ```

### 10.5 常用生产命令

```bash
pm2 status
pm2 logs qa-server --lines 100 --nostream
pm2 restart qa-server --update-env
pm2 monit
```

数据库：

```bash
mysql -uroot -p FreshmanQA
```

Redis：

```bash
redis-cli ping
redis-cli --scan --pattern 'qa:*'
redis-cli --scan --pattern 'ratelimit:*'
```

Nginx：

```bash
nginx -t
systemctl reload nginx
```

### 10.6 小程序发布与服务器同步的关系

服务器同步 `/opt/qa-server/miniprogram/` 只能保证源码在服务器上有一份，不能让微信用户直接更新小程序。

微信端实际生效还需要：

1. 使用微信开发者工具打开 `miniprogram/`。
2. 本地预览确认 UI。
3. 上传体验版或提交审核发布正式版。
4. 确认 `miniprogram/app.js` 的 `baseUrl` 指向 `https://logic-yjb.top/api`。
5. 确认微信公众平台配置的 request 合法域名包含后端域名。

---

## 11. 生产验证记录

2026-08-26 完成的线上测试：

| 测试 | 结果 |
| --- | --- |
| 本地单元/隔离测试 | 12/12 通过 |
| 生产健康检查 | HTTP 200 |
| 管理员登录 | `code=0` |
| 管理统计 | `code=0`，知识库 123 条 |
| 用户登录 | `code=0` |
| 普通接口连续访问后登录 | 不再误报 429，限流策略隔离生效 |
| 提问接口 | `code=0`，返回真实 `answer_id` |
| 相同问题第二次请求 | `cached=true` |
| 身份认证待审核列表 | 返回 `verify_id=4` |
| www 域名 CORS 预检 | 204，允许 `x-admin-key` |
| 网页后台身份审核页面 | 已部署 |
| 小程序源码头像/地图按钮 | 已确认 |

生产数据参考：

| 数据 | 说明 |
| --- | --- |
| 知识库 | 123 条 |
| 测试用户 | `user_id=35`，来自限流冒烟测试 |
| 测试问题 | `question_id=11` |
| 测试回答 | `answer_id=7` |
| 待审核认证 | `verify_id=4` |

这些是测试或真实待处理数据，不要随便删除，除非先确认可以清理。

---

## 12. 已知风险和待办

### 12.1 安全类，优先级最高

1. **轮换可能泄露过的凭据**
   - LLM API Key 曾在历史源码中硬编码。
   - GitHub remote 曾配置过内嵌 token。
   - 服务器 root 密码曾在聊天中传递。
   - 生产 `ADMIN_KEY` 仍是历史硬编码默认值的风险很高。

   建议：
   - 立即更换 LLM API Key。
   - 轮换 GitHub token。
   - 更换服务器 root 密码并禁用密码登录。
   - 生成强随机 `ADMIN_KEY`、`ADMIN_PASSWORD`。
   - 修改所有相关 `.env` 后重启。

2. **小程序管理员 Key 硬编码**

   位置：

   ```text
   miniprogram/app.js
   ```

   当前代码：

   ```js
   header['X-Admin-Key'] = '<当前 ADMIN_KEY，见 server/.env>';
   ```

   后果：
   - 一旦生产更换 `ADMIN_KEY`，小程序管理页 401。
   - 静态硬编码容易被反编译读取。

   方向：
   - 管理员登录。
   - 后端签发短期 token。
   - 小程序只保存短期 token。

3. **数据库密码默认值仍在源码**

   位置：

   ```text
   server/config/db.js
   ```

   当前类似：

   ```js
   password: process.env.DB_PASS || '...'
   ```

   建议：
   - 必填 `DB_PASS`。
   - 缺失时启动失败。
   - 不保留真实默认密码。

4. **管理 token 长期有效**

   当前 `/api/admin/login` 直接返回 `ADMIN_KEY`。

   建议方向：
   - JWT 或服务端 session。
   - 短有效期。
   - refresh token。
   - 登录失败锁定。
   - 操作审计日志。

### 12.2 后端架构类

1. **SQL 适配层需要退役**
   - `server/config/db.js` 仍在转换 SQL Server 语法。
   - 长期会掩盖 SQL 方言问题。
   - 应逐步改成直接使用 mysql2 参数化查询和标准 MySQL SQL。

2. **没有数据库 migration 机制**
   - 目前靠零散 SQL 文件手工执行。
   - 建议引入迁移目录、迁移记录表和幂等 SQL。

3. **审核流程缺少事务**
   - 审核通过会更新回答、问题、知识库、向量索引和缓存。
   - 中途失败可能出现不一致。
   - 建议数据库写入使用事务，外部副作用放到事务提交后。

4. **知识库自动入库可能产生重复**
   - 审核通过时按问题文本插入知识库，缺少唯一约束或更严格的查重。
   - 建议增加文本规范化后的唯一索引。

5. **Redis 配置未完全环境化**
   - `server/config/redis.js` 仍硬编码 `127.0.0.1:6379`。
   - 应读取 `REDIS_HOST`、`REDIS_PORT`、`REDIS_PASSWORD`。

6. **向量索引可靠性不足**
   - 当前主要在内存中。
   - 重启重建，服务规模变大后启动慢。
   - 建议入库或使用专用向量索引。

7. **未收录问题去重逻辑仍偏文本匹配**
   - 目前依赖 `LIKE` 和清洗文本。
   - 用户稍作改写可能重复入队。
   - 可考虑规范化文本唯一索引或语义查重。

### 12.3 前端与产品类

1. **小程序管理员入口需要重新设计**
   - 目前管理页暴露在小程序菜单逻辑中。
   - 应与普通用户界面隔离，并且只能由管理员账号进入。

2. **网页后台缺少自动刷新**
   - 切换 tab 会加载数据，但列表长期打开不会自动更新。
   - 可以加轮询或手动刷新按钮。

3. **小程序旧本地会话数据兼容**
   - 聊天页曾从会话内嵌消息改成独立 `conv_msgs_*` 存储。
   - 老用户本地缓存里可能仍有旧格式数据。
   - 后续如做迁移，需要处理或忽略旧 key。

4. **LLM 延迟约 6-12 秒**
   - 生产日志里多次出现慢请求。
   - 可优化缓存命中率、流式输出、异步消息队列或超时策略。

5. **数据初始化脚本混杂**
   - `sql/` 中同时存在 SQL Server 和 MySQL 脚本。
   - 应建立清晰的 MySQL-only 初始化路径，旧脚本归档。

### 12.4 工程流程类

1. **没有 CI**
   - 建议至少在 GitHub Actions 中跑 `npm ci` 和 `npm test`。

2. **没有自动部署**
   - 当前部署是手工 SSH + rsync。
   - 可先写幂等 deploy 脚本，再考虑 GitHub Actions。

3. **日志仍是 PM2 stdout**
   - 建议统一结构化日志、请求 ID、错误级别和轮转。

4. **测试覆盖仍有限**
   - 当前主要是核心路由的 mock 测试。
   - 缺少真实 MySQL 集成测试、前端测试和压测。

5. **根目录和 server 根目录有大量未跟踪调试脚本**
   - 建议统一清理。

---

## 13. 新接手者建议的第一周任务

按优先级建议如下：

1. **确认能跑起来**
   - clone 仓库。
   - 复制 `.env.example` 到 `server/.env`。
   - 配置 MySQL/Redis/LLM/Embedding。
   - `npm ci && npm test && npm start`。

2. **确认生产状态**
   - `pm2 status`。
   - `pm2 logs qa-server --lines 100 --nostream`。
   - 检查 `https://logic-yjb.top/api/info/enrollment`。
   - 登录网页管理后台。
   - 检查身份审核是否可见。

3. **处理安全问题**
   - 轮换所有可能泄露的 Key 和密码。
   - 移除小程序硬编码管理 Key。
   - 移除数据库密码默认值。
   - 检查服务器 authorized_keys。

4. **提交交接文档**
   - 检查 `HANDOVER.md` 和 `HANDOVER_ADDENDUM.md`。
   - 删除敏感信息后提交。

5. **建立 CI**
   - GitHub Actions 跑 `npm ci` 和 `npm test`。

6. **清理仓库**
   - 分离调试脚本、历史 SQL、临时文档。
   - 保留有用脚本到规范目录。

7. **统一 SQL**
   - 从新接口开始直接写标准 MySQL。
   - 逐步替换旧 SQL Server 风格。

---

## 14. 快速排障

### 14.1 后端启动失败提示缺少环境变量

检查：

```text
server/.env
```

必须存在：

```text
ADMIN_KEY
ADMIN_USERNAME
ADMIN_PASSWORD
```

同时注意 `.env` 是否为 CRLF。当前解析已支持 CRLF。

### 14.2 管理接口 401

检查：

1. 请求头是否为 `X-Admin-Key`。
2. token 是否来自 `/api/admin/login`。
3. 生产 `ADMIN_KEY` 是否已更换。
4. 小程序是否仍硬编码旧 Key。

### 14.3 网页后台请求失败或无数据

检查：

1. 浏览器控制台 CORS。
2. 当前域名是否为 apex 或 www。
3. Network 中请求是否带 `X-Admin-Key`。
4. PM2 日志。
5. Nginx 是否把 `/api/` 代理到 `127.0.0.1:3000`。

### 14.4 身份认证提交后后台看不到

先查数据库：

```sql
SELECT verify_id, user_id, real_name, student_id, status, created_at
FROM user_verify
ORDER BY verify_id DESC
LIMIT 20;
```

再查接口：

```text
GET /api/admin/verify/pending
```

判断：

- 数据库无记录：问题在提交端或 `POST /api/user/verify`。
- 数据库有记录但接口无记录：检查 `status` 和 SQL。
- 接口有记录但页面无记录：刷新网页后台，检查 `loadVerify()` 和前端请求。

### 14.5 登录误报 429

不要直接关闭限流。先看 Redis：

```bash
redis-cli --scan --pattern 'ratelimit:*'
```

确认 key 是否带策略前缀：

```text
ratelimit:api:<ip>
ratelimit:login:<ip>
ratelimit:qa:<ip>
```

如果所有策略共用一个 key，说明限流修复被回退了。

### 14.6 提问慢

查看：

```bash
pm2 logs qa-server --lines 200 --nostream
```

关注：

```text
[SlowRequest] POST /api/qa/ask
```

可能原因：

1. LLM 外部服务耗时。
2. Embedding 外部服务耗时。
3. Redis 不可用。
4. MySQL 查询慢。
5. 知识库或上下文过大。

### 14.7 缓存不更新

检查：

```bash
redis-cli --scan --pattern 'qa:*'
```

知识库变更、审核通过、回答更新后应调用 `clearQACache()`。

---

## 15. 回滚参考

最近一次部署备份：

```text
/opt/qa-server/backup/pre-deploy-20260826-141924.tar.gz
```

该备份包含当时的 `server` 源码目录，但排除了：

```text
server/node_modules
server/uploads
server/data
server/backup
```

回滚前先备份当前状态，再解包到临时目录比对，不要直接覆盖生产 `.env`、上传目录和数据目录。

回滚后：

```bash
cd /opt/qa-server/server
npm install --omit=dev
pm2 restart qa-server --update-env
```

---

## 16. 交接联系方式和备注

本补充文档由上一轮 Codex 代理基于 2026-08-26 的开发、测试和部署记录整理。

重要原则：

1. `miniprogram/` 是微信小程序。
2. `server/public/` 是网页管理后台，不是小程序。
3. `/root/QA` 是服务器源码克隆。
4. `/opt/qa-server` 是生产运行目录。
5. 任何凭据只放在 `.env` 或服务器安全存储中。
6. 修改生产前先备份。
7. 小程序 UI 变更不会因为同步服务器目录而对微信用户立即生效，必须走微信开发者工具上传/发布流程。
