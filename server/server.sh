#!/bin/bash

# Uni 后端服务管理脚本
# 用法: ./server.sh {start|stop|restart|status}

# 配置
PID_FILE=".server.pid"
LOG_FILE="server.log"
WORK_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ -f "$WORK_DIR/.env" ]; then
    export $(grep -v '^#' "$WORK_DIR/.env" | grep -v '^$' | xargs)
fi

PORT=${PORT:-3000}
HOST=${HOST:-0.0.0.0}

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否有进程在运行
is_running() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        else
            rm -f "$PID_FILE"
        fi
    fi
    return 1
}

# 检查端口是否被占用
check_port() {
    if lsof -Pi :$PORT -sTCP:LISTEN -t > /dev/null 2>&1; then
        return 0
    fi
    return 1
}

# 启动服务
start() {
    if is_running; then
        echo -e "${YELLOW}⚠ 服务已经在运行${NC}"
        return 0
    fi

    # 如果端口被占用但没有 PID 文件，先清理
    if check_port; then
        echo -e "${YELLOW}⚠ ${HOST}:${PORT} 被占用，正在清理...${NC}"
        local pid=$(lsof -Pi :$PORT -sTCP:LISTEN -t)
        kill -9 "$pid" 2>/dev/null
        sleep 1
    fi

    cd "$WORK_DIR"
    
    nohup npm run dev > "$LOG_FILE" 2>&1 &
    local pid=$!
    echo $pid > "$PID_FILE"

    # 等待服务启动
    sleep 2
    
    if is_running; then
        echo -e "${GREEN}✓ 服务已启动${NC}"
        echo "  PID: $pid"
        echo "  地址: ${HOST}:${PORT}"
        echo "  日志: $LOG_FILE"
        echo ""
        echo "  查看日志: tail -f $LOG_FILE"
    else
        echo -e "${RED}✗ 服务启动失败，请检查日志: $LOG_FILE${NC}"
        tail -20 "$LOG_FILE"
        return 1
    fi
}

# 停止服务
stop() {
    if ! is_running; then
        echo -e "${YELLOW}⚠ 服务没有在运行${NC}"
        return 0
    fi

    local pid=$(cat "$PID_FILE")
    echo -e "${YELLOW}→ 正在停止服务 (PID: $pid)...${NC}"
    
    # 发送 TERM 信号
    kill "$pid" 2>/dev/null
    
    # 等待进程结束（最多 5 秒）
    local count=0
    while ps -p "$pid" > /dev/null 2>&1; do
        sleep 0.5
        count=$((count + 1))
        if [ $count -ge 10 ]; then
            echo -e "${YELLOW}→ 强制停止...${NC}"
            kill -9 "$pid" 2>/dev/null
            break
        fi
    done
    
    rm -f "$PID_FILE"
    
    # 确保端口释放
    sleep 0.5
    if check_port; then
        local port_pid=$(lsof -Pi :$PORT -sTCP:LISTEN -t)
        kill -9 "$port_pid" 2>/dev/null
    fi
    
    echo -e "${GREEN}✓ 服务已停止${NC}"
}

# 重启服务
restart() {
    echo -e "${YELLOW}→ 重启服务...${NC}"
    stop
    sleep 1
    start
}

# 查看状态
status() {
    if is_running; then
        local pid=$(cat "$PID_FILE")
        echo -e "${GREEN}● 服务正在运行${NC}"
        echo "  PID: $pid"
        echo "  地址: ${HOST}:${PORT}"
        
        # 显示最近几行日志
        if [ -f "$LOG_FILE" ]; then
            echo ""
            echo "  最近日志:"
            tail -5 "$LOG_FILE" | sed 's/^/  /'
        fi
    else
        echo -e "${RED}● 服务未运行${NC}"
    fi
}

# 主逻辑
case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    status)
        status
        ;;
    *)
        echo "Uni 后端服务管理脚本"
        echo ""
        echo "用法: $0 {start|stop|restart|status}"
        echo ""
        echo "命令:"
        echo "  start   - 启动服务"
        echo "  stop    - 停止服务"
        echo "  restart - 重启服务"
        echo "  status  - 查看服务状态"
        echo ""
        echo "示例:"
        echo "  $0 start"
        echo "  $0 restart"
        exit 1
        ;;
esac
