#!/bin/bash

# AIGC Security 项目部署脚本
# 目标服务器: 10.102.33.11 (访问地址: 10.102.32.144:5670)

SERVER_USER="shixu"
SERVER_HOST="10.102.33.11"
SERVER_PATH="~/aigc-security"
LOCAL_PATH="/Users/shixu.mai/Desktop/aigc-security"

echo "====================================="
echo "开始部署 AIGC Security 项目"
echo "目标服务器: ${SERVER_HOST}"
echo "访问地址: http://10.102.32.144:5670"
echo "====================================="

# 1. 传输文件
echo ""
echo "步骤 1: 传输项目文件到服务器..."
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'dist' \
  --exclude '.cursor' \
  "${LOCAL_PATH}/" "${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/"

if [ $? -ne 0 ]; then
    echo "❌ 文件传输失败！"
    exit 1
fi

echo "✅ 文件传输完成"

# 2. 在服务器上执行部署命令
echo ""
echo "步骤 2: 在服务器上安装依赖并启动服务..."

ssh ${SERVER_USER}@${SERVER_HOST} << 'ENDSSH'
    cd ~/aigc-security
    
    # 检查 Node.js 环境
    echo "检查环境..."
    node --version
    npm --version
    
    # 安装依赖
    echo "安装依赖..."
    npm install
    
    # 检查端口占用
    echo "检查端口 5670..."
    PID=$(lsof -ti:5670)
    if [ ! -z "$PID" ]; then
        echo "端口 5670 被占用，停止进程 $PID..."
        kill -9 $PID
        sleep 2
    fi
    
    # 启动服务（后台运行）
    echo "启动服务..."
    nohup npm run dev > app.log 2>&1 &
    
    echo "等待服务启动..."
    sleep 5
    
    # 检查服务是否启动
    if lsof -ti:5670 > /dev/null; then
        echo "✅ 服务已成功启动在端口 5670"
        echo "查看日志: tail -f ~/aigc-security/app.log"
    else
        echo "❌ 服务启动失败，请查看日志: cat ~/aigc-security/app.log"
        exit 1
    fi
ENDSSH

if [ $? -ne 0 ]; then
    echo "❌ 服务器部署失败！"
    exit 1
fi

echo ""
echo "====================================="
echo "✅ 部署完成！"
echo "访问地址: http://10.102.32.144:5670"
echo "====================================="
echo ""
echo "其他命令:"
echo "  查看日志: ssh ${SERVER_USER}@${SERVER_HOST} 'tail -f ~/aigc-security/app.log'"
echo "  停止服务: ssh ${SERVER_USER}@${SERVER_HOST} 'pkill -f vite'"
echo "  重启服务: ssh ${SERVER_USER}@${SERVER_HOST} 'cd ~/aigc-security && nohup npm run dev > app.log 2>&1 &'"


