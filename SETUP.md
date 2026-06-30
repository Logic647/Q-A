# 知识图谱服务安装指南

## 需要安装的服务

### 1. Neo4j (图数据库)
**下载地址**: https://neo4j.com/download/
- 选择 Neo4j Community Edition (免费)
- 安装后启动服务
- 默认端口: 7687 (Bolt), 7474 (HTTP)
- 默认用户名: neo4j, 密码: neo4j (首次登录需修改)

**验证安装**:
```powershell
# 启动 Neo4j Desktop 或服务
# 浏览器访问 http://localhost:7474
```

### 2. Redis (缓存)
**下载地址**: https://github.com/tporadowski/redis/releases
- 下载 Windows 版本
- 解压后运行 `redis-server.exe`
- 默认端口: 6379

**验证安装**:
```powershell
# 启动 Redis
redis-server
# 另开终端测试
redis-cli ping
# 应返回 PONG
```

### 3. RabbitMQ (消息队列)
**下载地址**: https://www.rabbitmq.com/install-windows.html
- 需要先安装 Erlang: https://www.erlang.org/downloads
- 安装 RabbitMQ
- 默认端口: 5672 (AMQP), 15672 (管理界面)

**验证安装**:
```powershell
# 启动 RabbitMQ 服务
rabbitmq-service start
# 管理界面: http://localhost:15672
# 默认用户名/密码: guest/guest
```

## 快速安装脚本

如果安装了 Chocolatey (Windows 包管理器)，可以使用:
```powershell
choco install neo4j
choco install redis-64
choco install rabbitmq
```

## 启动顺序

1. 先启动 Neo4j
2. 再启动 Redis
3. 最后启动 RabbitMQ
4. 运行 `node init_kg.js` 初始化知识图谱
5. 启动服务器 `node app.js`
