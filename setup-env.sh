#!/bin/bash

# 设置前端环境变量文件

echo "🔧 设置前端环境变量文件..."

# 开发环境
cat > frontend/.env << 'EOF'
VITE_API_BASE_URL=http://localhost:3001/api
EOF

# 生产环境
cat > frontend/.env.production << 'EOF'
VITE_API_BASE_URL=https://tool.mareate.com/api
EOF

echo "✅ 环境变量文件创建完成"
echo "📁 开发环境: frontend/.env"
echo "📁 生产环境: frontend/.env.production"
echo ""
echo "🔍 文件内容:"
echo "开发环境:"
cat frontend/.env
echo ""
echo "生产环境:"
cat frontend/.env.production
