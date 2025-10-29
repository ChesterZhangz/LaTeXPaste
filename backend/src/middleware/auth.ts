import { Request, Response, NextFunction } from 'express';
import { JWTUtils } from '../utils/jwt';
import { getSharedUserModel } from '../models/SharedUser';

export interface AuthRequest extends Request {
  user?: {
    _id: string;
    email: string;
    name: string;
    systemRole: string;
    isActive: boolean;
    isEmailVerified: boolean;
  };
}

/**
 * 认证中间件 - 基于 Sharedata 用户系统
 */
export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    // 开发环境下输出详细日志
    if (process.env.NODE_ENV === 'development') {
      console.log('🔐 认证中间件被调用');
      console.log('🔐 请求路径:', req.path);
      console.log('🔐 Authorization header:', req.header('Authorization'));
      console.log('🔐 提取的token:', token ? `${token.substring(0, 10)}...` : 'undefined');
      
      if (!token) {
        console.log('ℹ️  用户未提供认证token，这是正常的未登录状态');
      }
    }

    if (!token) {
      res.status(401).json({ 
        success: false,
        error: '访问被拒绝，没有提供令牌' 
      });
      return;
    }

    // 验证JWT token
    let decoded;
    try {
      decoded = JWTUtils.verify(token);
    } catch (error) {
      console.error('JWT 验证失败:', error);
      res.status(401).json({ 
        success: false,
        error: '令牌无效' 
      });
      return;
    }

    // 获取用户信息
    const SharedUser = getSharedUserModel();
    const user = await SharedUser.findById(decoded.userId);
    if (!user) {
      res.status(401).json({ 
        success: false,
        error: '用户不存在' 
      });
      return;
    }

    // 检查用户状态
    if (!user.isActive) {
      res.status(401).json({ 
        success: false,
        error: '账户未激活，请先验证邮箱' 
      });
      return;
    }

    if (!user.isEmailVerified) {
      res.status(401).json({ 
        success: false,
        error: '邮箱未验证，请先验证邮箱' 
      });
      return;
    }

    if (user.isSuspended) {
      res.status(401).json({ 
        success: false,
        error: `账户已被暂停: ${user.suspendedReason || '未知原因'}` 
      });
      return;
    }

    // 设置请求用户信息
    req.user = {
      _id: (user._id as any).toString(),
      email: user.email,
      name: user.name,
      systemRole: user.systemRole,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified
    };
    
    // 开发环境下输出用户信息
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ 认证成功:', {
        userId: req.user._id,
        email: req.user.email,
        systemRole: req.user.systemRole
      });
    }

    next();
  } catch (error) {
    console.error('❌ 认证中间件错误:', error);
    res.status(500).json({ 
      success: false,
      error: '认证过程中发生错误' 
    });
  }
};

/**
 * 角色验证中间件
 */
export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ 
        success: false,
        error: '未认证用户' 
      });
      return;
    }

    const userRole = req.user.systemRole;
    if (!roles.includes(userRole)) {
      res.status(403).json({ 
        success: false,
        error: `需要以下角色之一: ${roles.join(', ')}` 
      });
      return;
    }

    next();
  };
};
