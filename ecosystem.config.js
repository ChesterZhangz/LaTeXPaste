module.exports = {
  apps: [
    {
      name: 'mathtools-backend',
      script: './dist/index.js',
      cwd: '/var/www/mathtools/backend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        SHARED_DATA_URI: process.env.SHARED_DATA_URI,
        MATHPIX_API_KEY: process.env.MATHPIX_API_KEY,
        MATHPIX_APP_ID: process.env.MATHPIX_APP_ID,
        USER_VIQUARD_JWT_SECRET: process.env.USER_VIQUARD_JWT_SECRET,
        FRONTEND_URL: 'https://tool.mareate.com'
      },
      // 进程管理配置
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'temp'],
      max_memory_restart: '1G',
      
      // 日志配置
      log_file: '/var/log/pm2/mathtools-backend.log',
      out_file: '/var/log/pm2/mathtools-backend-out.log',
      error_file: '/var/log/pm2/mathtools-backend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // 自动重启配置
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      
      // 健康检查
      health_check_grace_period: 3000,
      
      // 环境变量
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    }
  ],
  
  // 部署配置
  deploy: {
    production: {
      user: 'root',
      host: 'tool.mareate.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/mathtools.git',
      path: '/var/www/mathtools',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production'
    }
  }
};
