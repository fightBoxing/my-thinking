#!/usr/bin/env bash
# -*- coding: utf-8 -*-
# 少年派的奇幻漂流 - 游戏启动脚本

set -e

PORT="${1:-8765}"
PID_FILE=".game.pid"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

cd "$PROJECT_DIR"

# 检查是否已在运行
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if kill -0 "$OLD_PID" 2>/dev/null; then
        echo "⚠️  游戏已在运行中 (PID: $OLD_PID, 端口: $PORT)"
        echo "   访问地址: http://localhost:$PORT"
        echo "   如需重启，请先执行: ./stop.sh"
        exit 0
    else
        rm -f "$PID_FILE"
    fi
fi

# 检查端口是否被占用
if lsof -ti:"$PORT" >/dev/null 2>&1; then
    echo "❌ 端口 $PORT 已被占用"
    echo "   占用进程: $(lsof -ti:$PORT)"
    echo "   请使用其他端口: ./start.sh 8888"
    exit 1
fi

# 启动 HTTP 服务器
echo "🚀 正在启动游戏服务器..."
nohup python3 -m http.server "$PORT" > /dev/null 2>&1 &
echo $! > "$PID_FILE"

sleep 0.5

# 确认启动成功
if kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "✅ 游戏启动成功!"
    echo "   PID:  $(cat "$PID_FILE")"
    echo "   端口: $PORT"
    echo "   访问: http://localhost:$PORT"
    echo ""
    echo "   停止命令: ./stop.sh"
else
    rm -f "$PID_FILE"
    echo "❌ 启动失败，请检查 python3 是否可用"
    exit 1
fi
