import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { dbManager } from './database';
import authRoutes from './routes/auth';
import scanRoutes from './routes/scan';
import { MathpixService } from './services/mathpixService';

const app = express();

// 配置验证
config.validateConfig();

// 安全中间件
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS配置
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 压缩中间件
app.use(compression());

// 请求限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP 15分钟内最多100个请求
  message: {
    success: false,
    error: '请求过于频繁，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);

// 解析JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 健康检查
app.get('/health', (req, res) => {
  const dbStatus = dbManager.getConnectionStatus();
  res.json({
    success: true,
    message: 'Mathtools API 运行正常',
    timestamp: new Date().toISOString(),
    database: dbStatus
  });
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/scan', scanRoutes);

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: '接口不存在'
  });
});

// 错误处理中间件
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ 服务器错误:', error);
  
  // Multer错误处理
  if (error.code === 'LIMIT_FILE_SIZE') {
    res.status(400).json({
      success: false,
      error: '文件大小超过限制（最大10MB）'
    });
    return;
  }
  
  if (error.message === '只支持PDF文件') {
    res.status(400).json({
      success: false,
      error: '只支持PDF文件格式'
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: '服务器内部错误'
  });
});

// 启动服务器
async function startServer() {
  try {
    // 连接数据库
    await dbManager.connectSharedata();
    
    // 启动服务器
    const server = app.listen(config.port, () => {
      console.log(`🚀 Mathtools API 服务器启动成功`);
      console.log(`📡 端口: ${config.port}`);
      console.log(`🌍 环境: ${config.nodeEnv}`);
      console.log(`🔗 前端URL: ${config.frontendUrl}`);
      console.log(`📊 数据库: ${config.database.sharedataURI ? '已连接' : '未连接'}`);
    });

    // 优雅关闭
    process.on('SIGTERM', async () => {
      console.log('🛑 收到SIGTERM信号，开始优雅关闭...');
      server.close(async () => {
        await dbManager.closeAllConnections();
        console.log('✅ 服务器已关闭');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      console.log('🛑 收到SIGINT信号，开始优雅关闭...');
      server.close(async () => {
        await dbManager.closeAllConnections();
        console.log('✅ 服务器已关闭');
        process.exit(0);
      });
    });

    // 定期清理过期的扫描任务
    setInterval(() => {
      MathpixService.cleanupExpiredTasks();
    }, 60 * 60 * 1000); // 每小时清理一次

  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

// 启动服务器
startServer();
