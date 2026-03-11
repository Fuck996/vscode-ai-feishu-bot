#!/bin/bash
# 飞书 AI 通知系统 - Docker 快速启动脚本
# 用法: bash start-docker.sh [start|stop|restart|logs]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="feishu-bot"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# 检查 Docker 是否安装
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose 未安装"
        exit 1
    fi
    
    print_success "Docker 和 Docker Compose 已安装"
}

# 检查 .env 文件
check_env() {
    if [ ! -f "$SCRIPT_DIR/.env" ]; then
        print_warning ".env 文件不存在，从 .env.example 创建"
        cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
        print_info "⏰ 请编辑 .env 文件配置必要参数"
        return 1
    fi
    print_success ".env 文件已存在"
    return 0
}

# 启动服务
start_services() {
    print_info "启动 $PROJECT_NAME 服务..."
    docker-compose -f "$COMPOSE_FILE" up -d
    
    print_info "等待服务启动..."
    sleep 5
    
    # 检查服务状态
    local backend_status=$(docker-compose -f "$COMPOSE_FILE" ps backend --status | grep -c "running" || true)
    local frontend_status=$(docker-compose -f "$COMPOSE_FILE" ps frontend --status | grep -c "running" || true)
    local nginx_status=$(docker-compose -f "$COMPOSE_FILE" ps nginx --status | grep -c "running" || true)
    
    if [ "$backend_status" -eq 1 ] && [ "$frontend_status" -eq 1 ] && [ "$nginx_status" -eq 1 ]; then
        print_success "所有服务已启动"
        print_info ""
        print_info "访问地址:"
        print_info "  HTTP:  http://localhost"
        print_info "  HTTPS: https://localhost (自签名证书会被浏览器警告)"
        print_info ""
        print_info "登录凭证:"
        print_info "  用户名: admin"
        print_info "  密码: admin (首次登录需修改)"
    else
        print_error "服务启动失败，请检查日志"
        docker-compose -f "$COMPOSE_FILE" logs
        exit 1
    fi
}

# 停止服务
stop_services() {
    print_info "停止 $PROJECT_NAME 服务..."
    docker-compose -f "$COMPOSE_FILE" down
    print_success "服务已停止"
}

# 重启服务
restart_services() {
    print_info "重启 $PROJECT_NAME 服务..."
    docker-compose -f "$COMPOSE_FILE" restart
    print_success "服务已重启"
    sleep 3
    print_info "查看最新日志: docker-compose logs -f"
}

# 显示日志
show_logs() {
    local service=${1:-""}
    if [ -z "$service" ]; then
        print_info "显示所有服务日志 (按 Ctrl+C 退出)..."
        docker-compose -f "$COMPOSE_FILE" logs -f
    else
        print_info "显示 $service 日志 (按 Ctrl+C 退出)..."
        docker-compose -f "$COMPOSE_FILE" logs -f "$service"
    fi
}

# 显示容器状态
show_status() {
    print_info "容器状态:"
    docker-compose -f "$COMPOSE_FILE" ps
    
    print_info ""
    print_info "资源使用:"
    docker stats --no-stream $(docker-compose -f "$COMPOSE_FILE" ps -q) || true
}

# 显示帮助
show_help() {
    cat << EOF
飞书 AI 通知系统 - Docker 快速启动脚本

用法: $0 [命令] [选项]

命令:
    start       启动所有服务
    stop        停止所有服务
    restart     重启所有服务
    logs        显示日志
    status      显示容器状态
    backup      备份数据
    restore     恢复数据
    clean       清理（删除容器但保留数据）
    reset       完全重置（删除所有数据）
    help        显示此帮助信息

示例:
    $0 start                # 启动所有服务
    $0 logs backend         # 查看后端日志
    $0 logs                 # 查看所有日志
    $0 stop                 # 停止所有服务

EOF
}

# 备份数据
backup_data() {
    local backup_dir="$SCRIPT_DIR/backups"
    local backup_file="$backup_dir/backup_$(date +%Y%m%d_%H%M%S).tar.gz"
    
    mkdir -p "$backup_dir"
    print_info "备份数据到 $backup_file..."
    
    docker-compose -f "$COMPOSE_FILE" exec -T backend tar czf - /app/data > "$backup_file"
    
    print_success "数据已备份"
    print_info "备份文件: $backup_file"
}

# 恢复数据
restore_data() {
    local backup_dir="$SCRIPT_DIR/backups"
    
    if [ -z "$(ls -A $backup_dir 2>/dev/null)" ]; then
        print_error "备份目录为空"
        exit 1
    fi
    
    print_info "可用的备份:"
    ls -lh "$backup_dir"/backup_*.tar.gz | awk '{print $NF}' | nl
    
    read -p "选择备份编号 (或按 Ctrl+C 取消): " backup_num
    local backup_file=$(ls "$backup_dir"/backup_*.tar.gz | sed -n "${backup_num}p")
    
    if [ -z "$backup_file" ]; then
        print_error "无效的备份编号"
        exit 1
    fi
    
    print_warning "这将覆盖现有数据，是否继续? (y/N)"
    read -p "> " confirm
    
    if [ "$confirm" != "y" ]; then
        print_info "已取消"
        exit 0
    fi
    
    print_info "恢复数据..."
    docker-compose -f "$COMPOSE_FILE" exec -T backend rm -rf /app/data/*
    docker-compose -f "$COMPOSE_FILE" exec -T backend tar xzf - -C /app/data < "$backup_file"
    
    print_success "数据已恢复"
}

# 清理（保留数据）
clean() {
    print_warning "将删除所有容器但保留数据，继续? (y/N)"
    read -p "> " confirm
    
    if [ "$confirm" != "y" ]; then
        print_info "已取消"
        exit 0
    fi
    
    docker-compose -f "$COMPOSE_FILE" down
    print_success "容器已删除，数据已保留"
}

# 完全重置
reset() {
    print_warning "⚠️  这将删除所有容器和数据！此操作不可逆。"
    print_warning "继续? (type 'reset' to confirm)"
    read -p "> " confirm
    
    if [ "$confirm" != "reset" ]; then
        print_info "已取消"
        exit 0
    fi
    
    docker-compose -f "$COMPOSE_FILE" down -v
    rm -rf "$SCRIPT_DIR/backend/data"/*
    print_success "系统已完全重置"
}

# 主程序
main() {
    # 检查 Docker
    check_docker
    
    # 获取命令
    local command=${1:-"help"}
    
    case "$command" in
        start)
            check_env || (
                print_error "请先配置 .env 文件并设置必要的参数"
                exit 1
            )
            start_services
            ;;
        stop)
            stop_services
            ;;
        restart)
            restart_services
            ;;
        logs)
            show_logs "$2"
            ;;
        status)
            show_status
            ;;
        backup)
            backup_data
            ;;
        restore)
            restore_data
            ;;
        clean)
            clean
            ;;
        reset)
            reset
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "未知命令: $command"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# 执行主程序
main "$@"
