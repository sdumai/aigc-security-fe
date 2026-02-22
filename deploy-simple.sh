#!/bin/bash

# AIGC 安全平台 - 简化部署脚本
# 使用方法: chmod +x deploy-simple.sh && ./deploy-simple.sh

echo "🚀 AIGC 安全平台 - 部署脚本"
echo "================================"

REMOTE_HOST="10.102.32.144"
REMOTE_USER="lab426"
REMOTE_DIR="aigc-security-platform"
REMOTE_PORT="5670"

# 检查 dist 目录
if [ ! -d "dist" ]; then
    echo "❌ dist 目录不存在，请先运行 npm run build"
    exit 1
fi

echo "✅ 找到 dist 目录"
echo ""

# 测试服务器连接
echo "📡 测试服务器连接..."
ping -c 1 -W 2 $REMOTE_HOST > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ 服务器连接正常"
else
    echo "⚠️  无法 ping 通服务器，但继续尝试..."
fi

echo ""
echo "📦 开始上传文件到 $REMOTE_HOST..."
echo "⚠️  您需要输入密码: 426"
echo ""

# 创建远程目录
echo "步骤 1/3: 创建远程目录..."
ssh -o StrictHostKeyChecking=no ${REMOTE_USER}@${REMOTE_HOST} "mkdir -p ~/${REMOTE_DIR}"

if [ $? -ne 0 ]; then
    echo "❌ 创建远程目录失败，请检查 SSH 连接"
    exit 1
fi

# 上传文件
echo ""
echo "步骤 2/3: 上传文件（这可能需要几分钟）..."
scp -o StrictHostKeyChecking=no -r dist/* ${REMOTE_USER}@${REMOTE_HOST}:~/${REMOTE_DIR}/

if [ $? -ne 0 ]; then
    echo "❌ 文件上传失败"
    exit 1
fi

# 启动服务
echo ""
echo "步骤 3/3: 启动服务..."
ssh -o StrictHostKeyChecking=no ${REMOTE_USER}@${REMOTE_HOST} << 'ENDSSH'
cd ~/aigc-security-platform

# 检查 http-server 是否安装
if ! command -v http-server &> /dev/null; then
    echo "安装 http-server..."
    npm install -g http-server
fi

# 停止旧服务
tmux kill-session -t aigc-security 2>/dev/null || true

# 启动新服务
tmux new-session -d -s aigc-security 'http-server . -p 5670 -a 0.0.0.0'

echo "✅ 服务已在后台启动（tmux 会话: aigc-security）"

# 检查服务状态
sleep 2
if tmux has-session -t aigc-security 2>/dev/null; then
    echo "✅ 服务运行正常"
else
    echo "⚠️  服务启动可能有问题，请手动检查"
fi
ENDSSH

if [ $? -eq 0 ]; then
    echo ""
    echo "================================"
    echo "✅ 部署成功！"
    echo ""
    echo "🌐 访问地址: http://$REMOTE_HOST:$REMOTE_PORT"
    echo ""
    echo "📋 管理命令："
    echo "   查看服务日志: ssh $REMOTE_USER@$REMOTE_HOST 'tmux attach -t aigc-security'"
    echo "   停止服务:     ssh $REMOTE_USER@$REMOTE_HOST 'tmux kill-session -t aigc-security'"
    echo "   重启服务:     ssh $REMOTE_USER@$REMOTE_HOST 'tmux kill-session -t aigc-security && cd ~/$REMOTE_DIR && tmux new-session -d -s aigc-security \"http-server . -p $REMOTE_PORT -a 0.0.0.0\"'"
    echo ""
else
    echo ""
    echo "❌ 部署失败，请检查错误信息"
    exit 1
fi


