#!/bin/bash

# AIGC 安全平台 - 快速部署脚本
# 使用方法: chmod +x 快速部署.sh && ./快速部署.sh

echo "🚀 开始部署 AIGC 安全平台..."

# 配置信息
REMOTE_HOST="10.102.32.144"
REMOTE_USER="lab426"
REMOTE_PASS="426"
REMOTE_DIR="aigc-security-platform"
REMOTE_PORT="5670"

# 1. 检查 dist 目录是否存在
if [ ! -d "dist" ]; then
    echo "❌ dist 目录不存在，请先运行 npm run build"
    exit 1
fi

echo "✅ 找到 dist 目录"

# 2. 测试服务器连接
echo "📡 测试服务器连接..."
ping -c 1 -W 2 $REMOTE_HOST > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "⚠️  无法 ping 通服务器，但仍然尝试连接..."
fi

# 3. 使用 expect 部署
echo "📦 开始部署到 $REMOTE_HOST:$REMOTE_PORT..."

# 检查是否安装了 expect
if ! command -v expect &> /dev/null; then
    echo "❌ expect 未安装，请先安装: brew install expect"
    exit 1
fi

# 运行部署脚本
./deploy-final.exp

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 部署成功！"
    echo "🌐 访问地址: http://$REMOTE_HOST:$REMOTE_PORT"
    echo "📋 查看服务: ssh $REMOTE_USER@$REMOTE_HOST 'tmux attach -t aigc-security'"
else
    echo ""
    echo "❌ 部署失败，请检查网络连接和服务器状态"
    echo ""
    echo "手动部署步骤："
    echo "1. 将 dist 目录上传到服务器: scp -r dist $REMOTE_USER@$REMOTE_HOST:~/$REMOTE_DIR"
    echo "2. SSH 连接到服务器: ssh $REMOTE_USER@$REMOTE_HOST"
    echo "3. 进入目录: cd ~/$REMOTE_DIR"
    echo "4. 停止旧服务: tmux kill-session -t aigc-security 2>/dev/null || true"
    echo "5. 启动新服务: tmux new-session -d -s aigc-security 'http-server . -p $REMOTE_PORT -a 0.0.0.0'"
    echo "6. 访问: http://$REMOTE_HOST:$REMOTE_PORT"
fi


