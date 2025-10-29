import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface JWTPayload {
  userId: string;
  email: string;
  systemRole: string;
  iat?: number;
  exp?: number;
}

export class JWTUtils {
  /**
   * 生成JWT token
   */
  static generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn
    } as jwt.SignOptions);
  }

  /**
   * 验证JWT token
   */
  static verify(token: string): JWTPayload {
    try {
      return jwt.verify(token, config.jwt.secret) as JWTPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('令牌已过期');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('令牌无效');
      } else {
        throw new Error('令牌验证失败');
      }
    }
  }

  /**
   * 解码JWT token（不验证）
   */
  static decode(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch (error) {
      return null;
    }
  }

  /**
   * 检查token是否即将过期（1小时内）
   */
  static isTokenExpiringSoon(token: string): boolean {
    try {
      const decoded = this.decode(token);
      if (!decoded || !decoded.exp) return true;
      
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = decoded.exp - now;
      
      // 如果1小时内过期，返回true
      return timeUntilExpiry < 3600;
    } catch (error) {
      return true;
    }
  }
}
