import { Router, Request, Response } from 'express';
import multer from 'multer';
import { MathpixService } from '../services/mathpixService';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// 配置multer用于文件上传
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
  },
  fileFilter: (req, file, cb) => {
    // 支持的文件类型：PDF和图片
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型。仅支持PDF、PNG、JPG、JPEG格式。'));
    }
  }
});

/**
 * 上传文件并开始扫描
 */
router.post('/upload', authMiddleware, upload.single('file'), async (req: any, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: '请选择文件'
      });
      return;
    }

    console.log(`📄 收到文件: ${req.file.originalname}, 类型: ${req.file.mimetype}, 大小: ${req.file.size} bytes`);

    // 创建扫描任务
    const scanId = await MathpixService.createScanTask(req.file.buffer, req.user._id, req.file.originalname, req.file.mimetype);

    res.json({
      success: true,
      message: '文件上传成功，开始扫描',
      data: {
        scanId,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype
      }
    });

  } catch (error: any) {
    console.error('❌ 文件上传失败:', error);
    if (error.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        success: false,
        error: '文件大小超过2MB限制'
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: error.message || '文件上传失败'
    });
  }
});

/**
 * 获取扫描状态
 */
router.get('/status/:scanId', authMiddleware, async (req: any, res: Response) => {
  try {
    const { scanId } = req.params;

    const task = MathpixService.getScanTask(scanId);
    if (!task) {
      res.status(404).json({
        success: false,
        error: '扫描任务不存在'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        scanId: task.scanId,
        status: task.status,
        progress: task.progress,
        error: task.error,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      }
    });

  } catch (error: any) {
    console.error('❌ 获取扫描状态失败:', error);
    res.status(500).json({
      success: false,
      error: '获取扫描状态失败'
    });
  }
});

/**
 * 获取扫描结果
 */
router.get('/result/:scanId', authMiddleware, async (req: any, res: Response) => {
  try {
    const { scanId } = req.params;

    const task = MathpixService.getScanTask(scanId);
    if (!task) {
      res.status(404).json({
        success: false,
        error: '扫描任务不存在'
      });
      return;
    }

    if (task.status !== 'completed') {
      res.status(400).json({
        success: false,
        error: '扫描尚未完成',
        data: {
          status: task.status,
          progress: task.progress
        }
      });
      return;
    }

    if (!task.result) {
      res.status(500).json({
        success: false,
        error: '扫描结果不存在'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        scanId: task.scanId,
        status: task.status,
        result: task.result,
        createdAt: task.createdAt,
        completedAt: task.updatedAt
      }
    });

  } catch (error: any) {
    console.error('❌ 获取扫描结果失败:', error);
    res.status(500).json({
      success: false,
      error: '获取扫描结果失败'
    });
  }
});

/**
 * 获取所有扫描任务（用户自己的）
 */
router.get('/tasks', authMiddleware, async (req: any, res: Response) => {
  try {
    // 这里可以实现获取用户所有扫描任务的功能
    // 目前返回空数组，因为使用内存存储
    res.json({
      success: true,
      data: {
        tasks: []
      }
    });

  } catch (error: any) {
    console.error('❌ 获取扫描任务列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取扫描任务列表失败'
    });
  }
});

export default router;
