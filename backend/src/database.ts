import mongoose from 'mongoose';
import { config } from './config';

class DatabaseManager {
  private sharedataConnection: mongoose.Connection | null = null;

  /**
   * 连接 sharedata 数据库
   */
  async connectSharedata(): Promise<mongoose.Connection> {
    if (this.sharedataConnection && this.sharedataConnection.readyState === 1) {
      return this.sharedataConnection;
    }

    try {
      console.log('🔗 连接 sharedata 数据库...');
      
      this.sharedataConnection = await mongoose.createConnection(config.database.sharedataURI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      this.sharedataConnection.on('connected', () => {
        console.log('✅ sharedata 数据库连接成功');
      });

      this.sharedataConnection.on('error', (error) => {
        console.error('❌ sharedata 数据库连接错误:', error);
      });

      this.sharedataConnection.on('disconnected', () => {
        console.log('⚠️  sharedata 数据库连接断开');
      });

      return this.sharedataConnection;
    } catch (error) {
      console.error('❌ sharedata 数据库连接失败:', error);
      throw error;
    }
  }

  /**
   * 获取 sharedata 连接
   */
  getSharedataConnection(): mongoose.Connection {
    if (!this.sharedataConnection || this.sharedataConnection.readyState !== 1) {
      throw new Error('sharedata 数据库未连接');
    }
    return this.sharedataConnection;
  }

  /**
   * 关闭所有数据库连接
   */
  async closeAllConnections(): Promise<void> {
    try {
      if (this.sharedataConnection) {
        await this.sharedataConnection.close();
        console.log('✅ sharedata 数据库连接已关闭');
      }
    } catch (error) {
      console.error('❌ 关闭数据库连接失败:', error);
    }
  }

  /**
   * 检查数据库连接状态
   */
  getConnectionStatus() {
    return {
      sharedata: this.sharedataConnection ? {
        readyState: this.sharedataConnection.readyState,
        host: this.sharedataConnection.host,
        port: this.sharedataConnection.port,
        name: this.sharedataConnection.name
      } : null
    };
  }
}

export const dbManager = new DatabaseManager();
