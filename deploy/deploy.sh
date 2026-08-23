#!/bin/bash
# 应用部署脚本
# 使用方法: bash deploy.sh

set -e

APP_DIR="/opt/qa-server"
REPO_URL="https://github.com/Logic647/QA.git"

echo "=========================================="
echo "  部署无锡学院新生助手"
echo "=========================================="

# 1. 克隆代码
echo "[1/4] 克隆代码..."
if [ -d "$APP_DIR" ]; then
    cd $APP_DIR && git pull
else
    git clone -b feature/knowledge-graph $REPO_URL $APP_DIR
    cd $APP_DIR
fi

# 2. 安装依赖
echo "[2/4] 安装依赖..."
cd server
npm install --production

# 3. 配置环境变量
echo "[3/4] 配置环境变量..."
if [ ! -f .env ]; then
    cat > .env << 'EOF'
SF_EMBEDDING_KEY=sk-your_siliconflow_key_here
EOF
    echo "已创建 .env 文件"
fi

# 4. 启动应用
echo "[4/4] 启动应用..."
pm2 delete qa-server 2>/dev/null || true
pm2 start app.js --name qa-server --max-memory-restart 512M
pm2 save
pm2 startup

echo ""
echo "=========================================="
echo "  部署完成！"
echo "=========================================="
echo ""
echo "应用状态: pm2 status"
echo "查看日志: pm2 logs qa-server"
echo "重启应用: pm2 restart qa-server"
echo ""
