#!/usr/bin/env bash
# -*- coding: utf-8 -*-
# 少年派的奇幻漂流 - 游戏停止脚本

PID_FILE=".game.pid"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

cd "$PROJECT_DIR"

if [ ! -f "$PID_FILE" ]; then
    echo "⚠️  未找到运行中的游戏进程"
    echo "   (PID 文件不存在)"
    exit 0
fi

PID=$(cat "$PID_FILE")

if kill -0 "$PID" 2>/dev/null; then
    kill "$PID"
    rm -f "$PID_FILE"
    echo "✅ 游戏已停止 (PID: $PID)"
else
    rm -f "$PID_FILE"
    echo "⚠️  进程 $PID 已不存在，已清理 PID 文件"
fi
