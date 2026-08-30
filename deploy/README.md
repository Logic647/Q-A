# 部署指南 - 阿里云 ECS 经济方案

## 资源规划

| 组件 | 部署方式 | 说明 |
|------|---------|------|
| Node.js 应用 | ECS 本机 PM2 | 端口 3000 |
| SQL Server | ECS 本机 | 端口 1433 |
| Neo4j | ECS 本机 | 端口 7687 |
| Redis | ECS 本机 | 端口 6379 |
| Nginx | ECS 本机 | 端口 80/443 |

## 部署步骤

### 第一步：购买阿里云 ECS
- 推荐配置：2核4G，Ubuntu 22.04，40G SSD
- 安全组开放：80、443、3000（测试用）

### 第二步：初始化环境
```bash
# SSH 登录服务器后执行
sudo bash setup.sh
```

### 第三步：部署应用
```bash
bash deploy.sh
```

### 第四步：配置数据库
```bash
# 导入表结构
sqlcmd -S localhost -U sa -P '<DB_PASSWORD>' -i migrate_sql.sql

# 导入 Neo4j 数据
node migrate_neo4j.js
```

### 第五步：配置 Nginx
```bash
sudo cp nginx.conf /etc/nginx/sites-available/qa
sudo ln -sf /etc/nginx/sites-available/qa /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 第六步：修改前端配置
修改 `miniprogram/app.js` 中的 `baseUrl`：
```javascript
baseUrl: 'http://你的服务器IP/api'  // 测试阶段
// baseUrl: 'https://你的域名/api'   // 域名备案后
```

### 第七步：微信小程序配置
1. 登录微信公众平台
2. 开发管理 → 开发设置 → 服务器域名
3. 添加 request 合法域名：`http://你的服务器IP`

## 常用命令

```bash
# 查看应用状态
pm2 status

# 查看日志
pm2 logs qa-server

# 重启应用
pm2 restart qa-server

# 查看 Redis
redis-cli ping

# 查看 Neo4j
cypher-shell -u neo4j -p '<DB_PASSWORD>'

# 查看 SQL Server
sqlcmd -S localhost -U sa -P '<DB_PASSWORD>'
```

## 注意事项

1. SQL Server 开发版免费但有内存限制（2GB），生产环境建议用 RDS
2. 域名备案前可用 IP 地址测试，备案后切换为域名
3. 建议定期备份数据库：`sqlcmd` 导出 + `neo4j-admin dump`
