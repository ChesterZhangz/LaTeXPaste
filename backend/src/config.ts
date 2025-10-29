import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3001,
  
  // 数据库配置
  database: {
    sharedataURI: process.env.SHARED_DATA_URI || 'mongodb://localhost:27017/sharedata'
  },
  
  // JWT 配置
  jwt: {
    secret: process.env.USER_VIQUARD_JWT_SECRET || 'your-secret-key',
    expiresIn: '7d'
  },
  
  // Mathpix 配置
  mathpix: {
    apiKey: process.env.MATHPIX_API_KEY || '',
    appId: process.env.MATHPIX_APP_ID || 'mareate_internal'
  },
  
  // 文件上传配置
  upload: {
    maxSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
    uploadDir: process.env.UPLOAD_DIR || 'uploads/'
  },
  
  // 前端URL
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  
  // 环境
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // 日志配置
  logLevel: process.env.LOG_LEVEL || 'info',
  
  // 验证配置
  validateConfig() {
    console.log('🔧 Mathtools 配置验证:');
    console.log(`  - NODE_ENV: ${this.nodeEnv}`);
    console.log(`  - PORT: ${this.port}`);
    console.log(`  - FRONTEND_URL: ${this.frontendUrl}`);
    console.log(`  - SHARED_DATA_URI: ${this.database.sharedataURI ? '已设置' : '未设置'}`);
    console.log(`  - MATHPIX_API_KEY: ${this.mathpix.apiKey ? '已设置' : '未设置'}`);
    console.log(`  - MATHPIX_APP_ID: ${this.mathpix.appId}`);
    console.log(`  - USER_VIQUARD_JWT_SECRET: ${this.jwt.secret ? '已设置' : '未设置'}`);
    
    if (!this.database.sharedataURI) {
      console.warn('⚠️  SHARED_DATA_URI 环境变量未设置');
    }
    if (!this.mathpix.apiKey) {
      console.warn('⚠️  MATHPIX_API_KEY 环境变量未设置');
    }
    if (!this.jwt.secret || this.jwt.secret === 'your-secret-key') {
      console.warn('⚠️  USER_VIQUARD_JWT_SECRET 环境变量未设置');
    }
  }
};
