import { Router, Request, Response } from 'express';
import { getSharedUserModel } from '../models/SharedUser';
import { JWTUtils } from '../utils/jwt';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * 用户登录
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: '邮箱和密码是必需的'
      });
      return;
    }

    // 查找用户
    const SharedUser = getSharedUserModel();
    const user = await SharedUser.findOne({ email: email.toLowerCase() });

    if (!user) {
      res.status(401).json({
        success: false,
        error: '邮箱或密码错误'
      });
      return;
    }

    // 验证密码
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        error: '邮箱或密码错误'
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

    // 更新登录信息
    user.lastLogin = new Date();
    user.lastLoginPlatform = 'mathtools';
    user.loginCount += 1;
    await user.save();

    // 生成JWT token
    const token = JWTUtils.generateToken({
      userId: (user._id as any).toString(),
      email: user.email,
      systemRole: user.systemRole
    });

    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: {
          _id: user._id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          systemRole: user.systemRole,
          userType: user.userType
        }
      }
    });

  } catch (error: any) {
    console.error('❌ 登录失败:', error);
    res.status(500).json({
      success: false,
      error: '登录过程中发生错误'
    });
  }
});

/**
 * 获取当前用户信息
 */
router.get('/me', authMiddleware, async (req: any, res: Response) => {
  try {
    const SharedUser = getSharedUserModel();
    const user = await SharedUser.findById(req.user._id);

    if (!user) {
      res.status(404).json({
        success: false,
        error: '用户不存在'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        _id: (user._id as any).toString(),
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        phone: user.phone,
        systemRole: user.systemRole,
        userType: user.userType,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        lastLogin: user.lastLogin,
        loginCount: user.loginCount
      }
    });

  } catch (error: any) {
    console.error('❌ 获取用户信息失败:', error);
    res.status(500).json({
      success: false,
      error: '获取用户信息失败'
    });
  }
});

/**
 * 用户登出
 */
router.post('/logout', authMiddleware, async (req: any, res: Response) => {
  try {
    // 这里可以实现token黑名单机制
    // 目前只是简单返回成功
    res.json({
      success: true,
      message: '登出成功'
    });

  } catch (error: any) {
    console.error('❌ 登出失败:', error);
    res.status(500).json({
      success: false,
      error: '登出失败'
    });
  }
});

export default router;
