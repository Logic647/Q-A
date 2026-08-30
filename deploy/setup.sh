#!/bin/bash
# 阿里云 ECS 环境初始化脚本
# 适用于 Ubuntu 22.04 LTS
# 使用方法: sudo bash setup.sh

set -e

echo "=========================================="
echo "  无锡学院新生助手 - 服务器环境初始化"
echo "=========================================="

# 1. 更新系统
echo "[1/6] 更新系统包..."
apt-get update -y
apt-get upgrade -y

# 2. 安装 Node.js 18
echo "[2/6] 安装 Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs
echo "Node.js 版本: $(node -v)"
echo "npm 版本: $(npm -v)"

# 3. 安装 Redis
echo "[3/6] 安装 Redis..."
apt-get install -y redis-server
systemctl enable redis-server
systemctl start redis-server
echo "Redis 状态: $(redis-cli ping)"

# 4. 安装 PM2
echo "[4/6] 安装 PM2..."
npm install -g pm2

# 5. 安装 Nginx
echo "[5/6] 安装 Nginx..."
apt-get install -y nginx
systemctl enable nginx

# 6. 安装 SQL Server (开发版)
echo "[6/6] 安装 SQL Server..."
# 添加 Microsoft 仓库
curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add -
curl https://packages.microsoft.com/config/ubuntu/22.04/mssql-server-2022.list | tee /etc/apt/sources.list.d/mssql-server.list
apt-get update -y
ACCEPT_EULA=Y apt-get install -y mssql-server
# 配置 SA 密码
MSSQL_SA_PASSWORD='<SET_YOUR_SA_PASSWORD>' MSSQL_PID='evaluation' /opt/mssql/bin/mssql-conf -n setup accept-eula

echo ""
echo "=========================================="
echo "  环境安装完成！"
echo "=========================================="
echo ""
echo "接下来请执行:"
echo "  1. 部署应用: bash deploy.sh"
echo "  2. 配置 Nginx: cp nginx.conf /etc/nginx/sites-available/qa && ln -s /etc/nginx/sites-available/qa /etc/nginx/sites-enabled/ && nginx -t && systemctl reload nginx"
echo ""
