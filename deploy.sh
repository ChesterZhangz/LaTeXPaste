#!/bin/bash

# Mathtools 自动化部署脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then
    log_error "请使用root用户运行此脚本"
    exit 1
fi

# 项目目录
PROJECT_DIR="/var/www/mathtools"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

log_info "🚀 开始部署 Mathtools..."

# 检查项目目录是否存在
if [ ! -d "$PROJECT_DIR" ]; then
    log_error "项目目录不存在: $PROJECT_DIR"
    log_info "请先运行 setup.sh 初始化服务器"
    exit 1
fi

# 进入项目目录
cd "$PROJECT_DIR"

# 检查环境变量文件
if [ ! -f ".env" ]; then
    log_error "环境变量文件不存在: .env"
    log_info "请先创建并配置 .env 文件"
    exit 1
fi

# 加载环境变量
source .env

log_step "📥 拉取最新代码..."
if [ -d ".git" ]; then
    git pull origin main
else
    log_warn "不是Git仓库，跳过代码拉取"
fi

# 备份当前版本
log_step "💾 备份当前版本..."
BACKUP_DIR="/var/backups/mathtools/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

if [ -d "$BACKEND_DIR/dist" ]; then
    cp -r "$BACKEND_DIR/dist" "$BACKUP_DIR/backend-dist"
fi

if [ -d "$FRONTEND_DIR/dist" ]; then
    cp -r "$FRONTEND_DIR/dist" "$BACKUP_DIR/frontend-dist"
fi

log_info "备份已保存到: $BACKUP_DIR"

# 部署后端
log_step "🔨 部署后端..."
cd "$BACKEND_DIR"

# 安装依赖
log_info "安装后端依赖..."
npm install --production

# 构建后端
log_info "构建后端..."
npm run build

# 检查构建结果
if [ ! -d "dist" ]; then
    log_error "后端构建失败，dist目录不存在"
    exit 1
fi

log_info "后端构建完成"

# 部署前端
log_step "🔨 部署前端..."
cd "$FRONTEND_DIR"

# 安装依赖
log_info "安装前端依赖..."
npm install

# 构建前端
log_info "构建前端..."
npm run build

# 检查构建结果
if [ ! -d "dist" ]; then
    log_error "前端构建失败，dist目录不存在"
    exit 1
fi

log_info "前端构建完成"

# 重启服务
log_step "🔄 重启服务..."
cd "$PROJECT_DIR"

# 停止现有服务
log_info "停止现有服务..."
pm2 stop mathtools-backend 2>/dev/null || true

# 启动服务
log_info "启动服务..."
pm2 start ecosystem.config.js

# 等待服务启动
sleep 5

# 检查服务状态
log_info "检查服务状态..."
if pm2 list | grep -q "mathtools-backend.*online"; then
    log_info "✅ 后端服务启动成功"
else
    log_error "❌ 后端服务启动失败"
    pm2 logs mathtools-backend --lines 20
    exit 1
fi

# 重载Nginx
log_step "🔄 重载Nginx..."
nginx -t
if [ $? -eq 0 ]; then
    nginx -s reload
    log_info "✅ Nginx重载成功"
else
    log_error "❌ Nginx配置有误"
    exit 1
fi

# 健康检查
log_step "🏥 健康检查..."
sleep 10

# 检查后端健康状态
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    log_info "✅ 后端健康检查通过"
else
    log_error "❌ 后端健康检查失败"
    pm2 logs mathtools-backend --lines 20
    exit 1
fi

# 检查前端文件
if [ -f "$FRONTEND_DIR/dist/index.html" ]; then
    log_info "✅ 前端文件检查通过"
else
    log_error "❌ 前端文件检查失败"
    exit 1
fi

# 清理旧备份（保留最近5个）
log_step "🧹 清理旧备份..."
cd /var/backups/mathtools
ls -t | tail -n +6 | xargs -r rm -rf

# 显示部署信息
log_step "📊 部署信息"
echo "项目目录: $PROJECT_DIR"
echo "后端端口: 3001"
echo "前端目录: $FRONTEND_DIR/dist"
echo "Nginx配置: /etc/nginx/sites-available/tool.mareate.com"
echo "PM2配置: $PROJECT_DIR/ecosystem.config.js"
echo "日志目录: /var/log/pm2"

# 显示服务状态
log_info "📋 服务状态:"
pm2 list

log_info "🎉 部署完成！"
log_info "🌐 访问地址: https://tool.mareate.com"

# 显示有用的命令
log_info "📝 常用命令:"
echo "查看日志: pm2 logs mathtools-backend"
echo "重启服务: pm2 restart mathtools-backend"
echo "停止服务: pm2 stop mathtools-backend"
echo "查看状态: pm2 status"
echo "重载Nginx: nginx -s reload"
