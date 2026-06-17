#!/bin/bash

# Uni Server 部署脚本
# 用法: ./deploy.sh [命令]
#
# 命令:
#   setup     首次部署: 检查环境 + 安装依赖 + 配置 + 构建 + 启动
#   build     编译 TypeScript
#   start     启动生产服务
#   stop      停止服务
#   restart   重启服务
#   status    查看服务状态
#   logs      查看实时日志
#   update    拉取最新代码 + 重新构建 + 重启
#   rollback  回滚到上一版本

set -e

# ============ 配置 ============
WORK_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$WORK_DIR/.server.pid"
LOG_FILE="$WORK_DIR/server.log"
NODE_VERSION_REQUIRED="18"
TIMESTAMP=$(date +%Y%m%d%H%M%S)

# ============ 颜色 ============
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()    { echo -e "${BLUE}→ $1${NC}"; }
success() { echo -e "${GREEN}✓ $1${NC}"; }
warn()    { echo -e "${YELLOW}⚠ $1${NC}"; }
error()   { echo -e "${RED}✗ $1${NC}"; }

# ============ 环境检查 ============
check_node() {
    if ! command -v node &> /dev/null; then
        error "未检测到 Node.js，请先安装 Node.js ${NODE_VERSION_REQUIRED}+"
        error "  下载: https://nodejs.org/"
        error "  或使用 nvm: curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash"
        exit 1
    fi

    NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
    if [ "$NODE_VERSION" -lt "$NODE_VERSION_REQUIRED" ]; then
        error "Node.js 版本过低 (当前 v$NODE_VERSION)，需要 ${NODE_VERSION_REQUIRED}+"
        exit 1
    fi
    success "Node.js $(node -v)"
}

check_npm() {
    if ! command -v npm &> /dev/null; then
        error "未检测到 npm"
        exit 1
    fi
    success "npm $(npm -v)"
}

check_postgres() {
    if ! command -v psql &> /dev/null; then
        warn "未检测到 psql 客户端（如果数据库在远程可忽略）"
        return
    fi

    if [ -z "$DATABASE_URL" ]; then
        warn "未设置 DATABASE_URL（后续会通过 .env 配置）"
        return
    fi

    info "测试数据库连接..."
    if psql "$DATABASE_URL" -c "SELECT 1" &> /dev/null; then
        success "数据库连接正常"
    else
        warn "数据库连接失败，请检查 DATABASE_URL 或确认 PostgreSQL 服务已启动"
    fi
}

check_env_file() {
    if [ ! -f "$WORK_DIR/.env" ]; then
        if [ -f "$WORK_DIR/.env.example" ]; then
            warn "未找到 .env 文件，从 .env.example 创建..."
            cp "$WORK_DIR/.env.example" "$WORK_DIR/.env"
            warn "请编辑 .env 文件填入真实配置后重新运行: vim $WORK_DIR/.env"
            exit 1
        else
            error "未找到 .env 或 .env.example，无法继续"
            exit 1
        fi
    fi

    JWT_SECRET=$(grep -E "^JWT_SECRET=" "$WORK_DIR/.env" | cut -d'=' -f2-)
    if [ -z "$JWT_SECRET" ] || [ ${#JWT_SECRET} -lt 16 ]; then
        error "JWT_SECRET 未设置或长度不足 16 位"
        error "请编辑 .env 文件: vim $WORK_DIR/.env"
        exit 1
    fi

    DEEPSEEK_KEY=$(grep -E "^DEEPSEEK_API_KEY=" "$WORK_DIR/.env" | cut -d'=' -f2-)
    if [ -z "$DEEPSEEK_KEY" ]; then
        warn "DEEPSEEK_API_KEY 未设置（AI 对话功能将不可用）"
    fi

    success ".env 配置检查通过"
}

# ============ 加载环境变量 ============
load_env() {
    if [ -f "$WORK_DIR/.env" ]; then
        set -a
        source "$WORK_DIR/.env"
        set +a
    fi
}

# ============ 核心操作 ============
install_deps() {
    info "安装依赖..."
    cd "$WORK_DIR"
    npm ci --omit=dev 2> /dev/null || npm install --omit=dev
    success "依赖安装完成"
}

install_all_deps() {
    info "安装全部依赖（含开发依赖，用于构建）..."
    cd "$WORK_DIR"
    npm install
    success "依赖安装完成"
}

build() {
    info "编译 TypeScript..."
    cd "$WORK_DIR"
    npm run build
    if [ $? -eq 0 ]; then
        success "构建成功"
    else
        error "构建失败"
        exit 1
    fi
}

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

start() {
    if is_running; then
        warn "服务已在运行 (PID: $(cat $PID_FILE))"
        return 0
    fi

    if [ ! -d "$WORK_DIR/dist" ]; then
        error "dist/ 目录不存在，请先运行: ./deploy.sh build"
        exit 1
    fi

    load_env
    PORT=${PORT:-3000}
    HOST=${HOST:-0.0.0.0}

    info "启动服务..."
    cd "$WORK_DIR"
    NODE_ENV=production nohup node dist/index.js > "$LOG_FILE" 2>&1 &
    local pid=$!
    echo $pid > "$PID_FILE"

    sleep 2

    if is_running; then
        success "服务已启动"
        echo ""
        echo "  PID:    $pid"
        echo "  地址:   http://${HOST}:${PORT}"
        echo "  健康检查: curl http://${HOST}:${PORT}/api/health"
        echo "  日志:   $LOG_FILE"
        echo ""
        echo "  查看日志: ./deploy.sh logs"
        echo "  停止服务: ./deploy.sh stop"
    else
        error "服务启动失败，查看日志: $LOG_FILE"
        tail -30 "$LOG_FILE"
        exit 1
    fi
}

stop() {
    if ! is_running; then
        warn "服务未在运行"
        return 0
    fi

    local pid=$(cat "$PID_FILE")
    info "停止服务 (PID: $pid)..."

    kill "$pid" 2> /dev/null || true

    local count=0
    while ps -p "$pid" > /dev/null 2>&1; do
        sleep 0.5
        count=$((count + 1))
        if [ $count -ge 20 ]; then
            warn "强制停止..."
            kill -9 "$pid" 2> /dev/null || true
            break
        fi
    done

    rm -f "$PID_FILE"
    success "服务已停止"
}

restart() {
    info "重启服务..."
    stop
    sleep 1
    start
}

status() {
    if is_running; then
        local pid=$(cat "$PID_FILE")
        load_env
        PORT=${PORT:-3000}
        HOST=${HOST:-0.0.0.0}

        success "服务运行中"
        echo ""
        echo "  PID:    $pid"
        echo "  地址:   http://${HOST}:${PORT}"
        echo "  运行时间: $(ps -o etime= -p $pid 2>/dev/null | tr -d ' ' || echo '未知')"

        if [ -f "$LOG_FILE" ]; then
            echo ""
            echo "  最近日志:"
            tail -5 "$LOG_FILE" | sed 's/^/    /'
        fi
    else
        error "服务未运行"
    fi
}

show_logs() {
    if [ ! -f "$LOG_FILE" ]; then
        warn "日志文件不存在: $LOG_FILE"
        return
    fi
    info "实时日志 (Ctrl+C 退出):"
    tail -f "$LOG_FILE"
}

update() {
    info "拉取最新代码..."
    cd "$WORK_DIR"

    if [ -d ".git" ]; then
        git pull
        success "代码已更新"
    else
        warn "当前目录不是 git 仓库，跳过 git pull"
    fi

    install_all_deps
    build
    restart
    success "更新完成"
}

backup_dist() {
    if [ -d "$WORK_DIR/dist" ]; then
        info "备份当前 dist/ ..."
        cp -r "$WORK_DIR/dist" "$WORK_DIR/dist.backup.${TIMESTAMP}"
        success "已备份: dist.backup.${TIMESTAMP}"
    fi
}

rollback() {
    LATEST_BACKUP=$(ls -dt "$WORK_DIR"/dist.backup.* 2>/dev/null | head -1)
    if [ -z "$LATEST_BACKUP" ]; then
        error "未找到可回滚的备份"
        exit 1
    fi

    warn "将回滚到: $LATEST_BACKUP"
    read -p "确认回滚? (y/N) " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        info "已取消"
        return
    fi

    stop 2> /dev/null || true
    rm -rf "$WORK_DIR/dist"
    cp -r "$LATEST_BACKUP" "$WORK_DIR/dist"
    start
    success "已回滚到 $LATEST_BACKUP"
}

# ============ 首次部署 ============
setup() {
    echo ""
    echo "================================================"
    echo -e "${BLUE}  Uni Server 部署${NC}"
    echo "================================================"
    echo ""

    info "[1/6] 检查环境..."
    check_node
    check_npm

    echo ""
    info "[2/6] 检查配置..."
    check_env_file

    echo ""
    load_env

    info "[3/6] 检查数据库..."
    check_postgres

    echo ""
    info "[4/6] 安装依赖..."
    install_all_deps

    echo ""
    info "[5/6] 构建项目..."
    build

    echo ""
    info "[6/6] 启动服务..."
    start

    echo ""
    echo "================================================"
    success "  部署完成！"
    echo "================================================"
    echo ""
}

# ============ 帮助 ============
help() {
    echo ""
    echo "Uni Server 部署脚本"
    echo ""
    echo "用法: ./deploy.sh [命令]"
    echo ""
    echo "命令:"
    echo -e "  ${GREEN}setup${NC}     首次部署（环境检查 + 安装 + 构建 + 启动）"
    echo -e "  ${GREEN}build${NC}     编译 TypeScript"
    echo -e "  ${GREEN}start${NC}     启动服务"
    echo -e "  ${GREEN}stop${NC}      停止服务"
    echo -e "  ${GREEN}restart${NC}   重启服务"
    echo -e "  ${GREEN}status${NC}    查看状态"
    echo -e "  ${GREEN}logs${NC}      实时日志"
    echo -e "  ${GREEN}update${NC}    更新（git pull + 构建 + 重启）"
    echo -e "  ${GREEN}rollback${NC}  回滚到上一版本"
    echo ""
    echo "首次使用:"
    echo "  1. git clone <repo> && cd server"
    echo "  2. cp .env.example .env && vim .env   # 填入配置"
    echo "  3. ./deploy.sh setup"
    echo ""
    echo "日常更新:"
    echo "  ./deploy.sh update"
    echo ""
}

# ============ 主入口 ============
COMMAND=${1:-help}

case "$COMMAND" in
    setup)    setup ;;
    build)    check_node; check_npm; install_all_deps; build ;;
    start)    check_env_file; start ;;
    stop)     stop ;;
    restart)  check_env_file; restart ;;
    status)   status ;;
    logs)     show_logs ;;
    update)   update ;;
    rollback) rollback ;;
    help|--help|-h) help ;;
    *)
        error "未知命令: $COMMAND"
        help
        exit 1
        ;;
esac
