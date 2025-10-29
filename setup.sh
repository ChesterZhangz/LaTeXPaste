#!/bin/bash

# Mathtools 服务器初始化脚本
# 适用于 Ubuntu 24.04

set -e

echo "🚀 开始初始化 Mathtools 服务器..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then
    log_error "请使用root用户运行此脚本"
    exit 1
fi

# 更新系统包
log_info "更新系统包..."
apt update && apt upgrade -y

# 安装基础依赖
log_info "安装基础依赖..."
apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# 安装Node.js 20.x
log_info "安装Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 验证Node.js安装
node_version=$(node --version)
npm_version=$(npm --version)
log_info "Node.js版本: $node_version"
log_info "NPM版本: $npm_version"

# 安装PM2
log_info "安装PM2..."
npm install -g pm2

# 安装Nginx
log_info "安装Nginx..."
apt install -y nginx

# 启动并启用Nginx
systemctl start nginx
systemctl enable nginx

# 安装Certbot
log_info "安装Certbot..."
apt install -y certbot python3-certbot-nginx

# 配置防火墙
log_info "配置防火墙..."
ufw --force enable
ufw allow ssh
ufw allow 'Nginx Full'
ufw allow 3001

# 创建部署目录
log_info "创建部署目录..."
mkdir -p /var/www/mathtools
mkdir -p /var/log/pm2
mkdir -p /var/log/nginx

# 设置目录权限
chown -R www-data:www-data /var/www/mathtools
chmod -R 755 /var/www/mathtools

# 创建环境变量文件
log_info "创建环境变量文件..."
cat > /var/www/mathtools/.env << 'EOF'
# 数据库配置
SHARED_DATA_URI=mongodb://localhost:27017/sharedata

# Mathpix API 配置
MATHPIX_APP_ID=your_app_id
MATHPIX_API_KEY=your_api_key

# JWT 配置
USER_VIQUARD_JWT_SECRET=your_jwt_secret

# 服务器配置
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://tool.mareate.com

# 文件上传配置
MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads/

# 日志配置
LOG_LEVEL=info
EOF

log_warn "请编辑 /var/www/mathtools/.env 文件，填入正确的配置信息"

# 配置Nginx
log_info "配置Nginx..."
cp nginx.conf /etc/nginx/sites-available/tool.mareate.com
ln -sf /etc/nginx/sites-available/tool.mareate.com /etc/nginx/sites-enabled/

# 删除默认站点
rm -f /etc/nginx/sites-enabled/default

# 测试Nginx配置
nginx -t

# 配置PM2
log_info "配置PM2..."
cp ecosystem.config.js /var/www/mathtools/

# 设置PM2开机自启
pm2 startup
pm2 save

# 创建系统服务
log_info "创建PM2系统服务..."
env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u root --hp /root

# 配置日志轮转
log_info "配置日志轮转..."
cat > /etc/logrotate.d/mathtools << 'EOF'
/var/log/pm2/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# 创建健康检查脚本
log_info "创建健康检查脚本..."
cat > /var/www/mathtools/health-check.sh << 'EOF'
#!/bin/bash

# 检查后端服务
if ! curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "$(date): Backend service is down, restarting..." >> /var/log/mathtools-health.log
    pm2 restart mathtools-backend
fi

# 检查Nginx
if ! systemctl is-active --quiet nginx; then
    echo "$(date): Nginx is down, restarting..." >> /var/log/mathtools-health.log
    systemctl restart nginx
fi
EOF

chmod +x /var/www/mathtools/health-check.sh

# 添加定时任务
log_info "添加定时任务..."
(crontab -l 2>/dev/null; echo "*/5 * * * * /var/www/mathtools/health-check.sh") | crontab -

# 配置SSL证书（需要手动执行）
log_info "配置SSL证书..."
log_warn "请手动执行以下命令配置SSL证书："
echo "certbot --nginx -d tool.mareate.com"
echo "certbot renew --dry-run"

# 创建部署脚本
log_info "创建部署脚本..."
cat > /var/www/mathtools/deploy.sh << 'EOF'
#!/bin/bash

set -e

echo "🚀 开始部署 Mathtools..."

# 进入项目目录
cd /var/www/mathtools

# 拉取最新代码
echo "📥 拉取最新代码..."
git pull origin main

# 安装后端依赖
echo "📦 安装后端依赖..."
cd backend
npm install --production

# 构建后端
echo "🔨 构建后端..."
npm run build

# 安装前端依赖
echo "📦 安装前端依赖..."
cd ../frontend
npm install

# 构建前端
echo "🔨 构建前端..."
npm run build

# 重启PM2服务
echo "🔄 重启服务..."
cd ..
pm2 reload ecosystem.config.js

# 重载Nginx
echo "🔄 重载Nginx..."
nginx -s reload

echo "✅ 部署完成！"
EOF

chmod +x /var/www/mathtools/deploy.sh

# 设置目录权限
chown -R www-data:www-data /var/www/mathtools
chmod -R 755 /var/www/mathtools

log_info "✅ 服务器初始化完成！"
log_info "📝 下一步："
echo "1. 编辑 /var/www/mathtools/.env 文件，填入正确的配置信息"
echo "2. 执行: certbot --nginx -d tool.mareate.com"
echo "3. 将代码上传到 /var/www/mathtools 目录"
echo "4. 执行: /var/www/mathtools/deploy.sh"

log_info "🎉 Mathtools 服务器初始化完成！"
