# Mathtools - 数学公式扫描工具

一个基于Mathpix API的数学公式扫描工具，支持PDF和图片文件上传，自动识别数学公式并转换为LaTeX格式。

## 功能特性

- 📄 支持PDF、PNG、JPG、JPEG文件上传
- 🔍 基于Mathpix API的数学公式识别
- 📝 自动转换为标准LaTeX格式
- 🌙 支持暗色模式/亮色模式切换
- 📋 支持粘贴上传（Ctrl+V/Cmd+V）
- 🎨 简洁美观的用户界面
- 📱 响应式设计

## 技术栈

### 后端
- Node.js + Express
- TypeScript
- MongoDB (Mongoose)
- Mathpix API
- Multer (文件上传)

### 前端
- React + Vite
- TypeScript
- Tailwind CSS
- Zustand (状态管理)
- React Markdown + KaTeX (LaTeX渲染)
- React Dropzone (文件拖拽)

## 项目结构

```
mathtools/
├── backend/                 # 后端服务
│   ├── src/
│   │   ├── controllers/     # 控制器
│   │   ├── middleware/      # 中间件
│   │   ├── models/          # 数据模型
│   │   ├── routes/          # 路由
│   │   ├── services/        # 业务逻辑
│   │   └── utils/           # 工具函数
│   ├── package.json
│   └── tsconfig.json
├── frontend/                # 前端应用
│   ├── src/
│   │   ├── components/      # React组件
│   │   ├── pages/           # 页面组件
│   │   ├── services/        # API服务
│   │   ├── stores/          # 状态管理
│   │   └── types/           # 类型定义
│   ├── package.json
│   └── vite.config.ts
├── nginx.conf               # Nginx配置
├── ecosystem.config.js      # PM2配置
├── setup.sh                 # 服务器设置脚本
├── deploy.sh                # 部署脚本
└── README.md
```

## 环境变量

### 后端 (.env)
```env
PORT=3001
SHARED_DATA_URI=mongodb://localhost:27017/sharedata
MATHPIX_APP_ID=your_app_id
MATHPIX_API_KEY=your_api_key
JWT_SECRET=your_jwt_secret
```

### 前端 (.env.production)
```env
VITE_API_BASE_URL=https://tool.mareate.com/api
```

## 安装和运行

### 开发环境

1. 克隆项目
```bash
git clone <repository-url>
cd mathtools
```

2. 安装后端依赖
```bash
cd backend
npm install
```

3. 安装前端依赖
```bash
cd ../frontend
npm install
```

4. 配置环境变量
```bash
# 后端
cp backend/env.example backend/.env
# 编辑 backend/.env 文件

# 前端
cp frontend/env.production frontend/.env.production
# 编辑 frontend/.env.production 文件
```

5. 启动开发服务器
```bash
# 后端
cd backend
npm run dev

# 前端
cd frontend
npm run dev
```

### 生产环境部署

1. 构建项目
```bash
# 后端
cd backend
npm run build

# 前端
cd frontend
npm run build
```

2. 使用部署脚本
```bash
# 在服务器上运行
chmod +x setup.sh deploy.sh
./setup.sh
./deploy.sh
```

## API 接口

### 认证
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出

### 扫描
- `POST /api/scan/upload` - 上传文件
- `GET /api/scan/status/:scanId` - 查询扫描状态
- `GET /api/scan/result/:scanId` - 获取扫描结果

## 部署说明

项目支持在Ubuntu 24.0服务器上部署，使用Nginx作为反向代理，PM2管理进程。

### 服务器要求
- Ubuntu 24.0
- Node.js 18+
- MongoDB
- Nginx
- PM2

### 自动部署
运行 `./deploy.sh` 脚本将自动完成以下操作：
1. 安装依赖
2. 构建项目
3. 配置Nginx
4. 启动服务
5. 配置SSL证书

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request来改进项目。