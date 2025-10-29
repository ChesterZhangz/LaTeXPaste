import axios from 'axios';
import FormData from 'form-data';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { FormatConverter } from './formatConverter';

/**
 * Mathpix配置
 */
const getMathpixConfig = () => {
  const apiKey = config.mathpix.apiKey;
  const appId = config.mathpix.appId;
  
  if (!apiKey || !appId) {
    throw new Error('Mathpix API配置缺失，请在.env文件中设置MATHPIX_API_KEY和MATHPIX_APP_ID');
  }
  
  return { apiKey, appId };
};

/**
 * 扫描任务接口
 */
export interface ScanTask {
  scanId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 扫描任务存储（内存存储，生产环境建议使用Redis）
 */
const scanTasks = new Map<string, ScanTask>();

/**
 * Mathpix 扫描服务
 */
export class MathpixService {
  /**
   * 创建扫描任务
   */
  static async createScanTask(fileBuffer: Buffer, userId: string, fileName?: string, fileType?: string): Promise<string> {
    const scanId = uuidv4();
    
    // 创建任务记录
    const task: ScanTask = {
      scanId,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    scanTasks.set(scanId, task);
    
    // 异步处理扫描
    this.processScanTask(scanId, fileBuffer, userId, fileType).catch(error => {
      console.error(`❌ 扫描任务失败: ${scanId}`, error);
      const task = scanTasks.get(scanId);
      if (task) {
        task.status = 'failed';
        task.error = error.message;
        task.updatedAt = new Date();
      }
    });
    
    return scanId;
  }

  /**
   * 处理扫描任务
   */
  private static async processScanTask(scanId: string, fileBuffer: Buffer, userId: string, fileType?: string): Promise<void> {
    const task = scanTasks.get(scanId);
    if (!task) {
      throw new Error('扫描任务不存在');
    }

    try {
      console.log(`🔄 开始处理扫描任务: ${scanId}`);

      // 更新状态为处理中
      task.status = 'processing';
      task.progress = 10;
      task.updatedAt = new Date();

      // 上传文件到Mathpix并获取Markdown
      console.log('📤 上传文件到Mathpix...');
      const markdown = await this.uploadFileToMathpix(fileBuffer, fileType);
      
      task.progress = 80;
      task.updatedAt = new Date();

      console.log('📝 Mathpix返回的Markdown长度:', markdown.length);

      // 转换格式
      console.log('🔄 转换LaTeX格式...');
      const convertedMarkdown = FormatConverter.convertToLatexFormat(markdown);
      
      // 更新任务完成
      task.status = 'completed';
      task.progress = 100;
      task.result = convertedMarkdown;
      task.updatedAt = new Date();

      console.log(`✅ 扫描任务完成: ${scanId}`);

    } catch (error: any) {
      console.error(`❌ 扫描任务处理失败: ${scanId}`, error);
      
      task.status = 'failed';
      task.error = error.message || '扫描失败';
      task.updatedAt = new Date();
    }
  }

  /**
   * 上传文件到Mathpix并获取Markdown
   */
  private static async uploadFileToMathpix(fileBuffer: Buffer, fileType?: string): Promise<string> {
    try {
      // 根据文件类型选择不同的API端点
      if (fileType?.startsWith('image/')) {
        return await this.uploadImageToMathpix(fileBuffer, fileType);
      } else {
        return await this.uploadPDFToMathpix(fileBuffer);
      }

    } catch (error: any) {
      console.error('❌ Mathpix API调用失败:');
      console.error('错误消息:', error.message);
      console.error('响应状态:', error.response?.status);
      console.error('响应数据:', JSON.stringify(error.response?.data, null, 2));
      
      const errorMessage = error.response?.data?.error 
        || error.response?.data?.message 
        || error.message 
        || '未知错误';
      
      throw new Error(`Mathpix识别失败: ${errorMessage}`);
    }
  }

  /**
   * 上传PDF到Mathpix
   */
  private static async uploadPDFToMathpix(fileBuffer: Buffer): Promise<string> {
    const { apiKey, appId } = getMathpixConfig();

    // 创建FormData
    const formData = new FormData();
    
    formData.append('file', fileBuffer, {
      filename: 'document.pdf',
      contentType: 'application/pdf'
    });

    // 配置选项
    const options = {
      formats: ['mmd', 'text'],
      data_options: {
        include_asciimath: true,
        include_latex: true,
        include_mathml: true
      },
      math_inline_delimiters: ['$', '$'],
      math_display_delimiters: ['$$', '$$'],
      rm_spaces: true,
      conversion_timeout: 120
    };

    formData.append('options_json', JSON.stringify(options));
    
    console.log('🔧 PDF转换选项:', JSON.stringify(options, null, 2));
    console.log('🌐 调用Mathpix PDF API...');

    // 调用Mathpix PDF API
    const response = await axios.post('https://api.mathpix.com/v3/pdf', formData, {
      headers: {
        ...formData.getHeaders(),
        'app_id': appId,
        'app_key': apiKey
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 300000 // 5分钟超时
    });

    console.log('📥 Mathpix PDF API响应:', JSON.stringify(response.data, null, 2));

    if (!response.data) {
      throw new Error('Mathpix PDF API未返回数据');
    }

    // 检查是否有错误
    if (response.data.error) {
      throw new Error(`Mathpix PDF API错误: ${response.data.error}`);
    }

    // 获取PDF ID
    const pdfId = response.data.pdf_id || response.data.id;
    
    if (!pdfId) {
      console.error('❌ 响应数据:', response.data);
      throw new Error('Mathpix PDF API未返回pdf_id');
    }

    console.log(`📋 PDF ID: ${pdfId}`);

    // 轮询获取处理结果
    const markdown = await this.pollMathpixResult(pdfId);
    return markdown;
  }

  /**
   * 上传图片到Mathpix
   */
  private static async uploadImageToMathpix(fileBuffer: Buffer, fileType: string): Promise<string> {
    const { apiKey, appId } = getMathpixConfig();

    // 创建FormData
    const formData = new FormData();
    
    const extension = fileType.split('/')[1];
    const filename = `image.${extension}`;
    
    formData.append('file', fileBuffer, {
      filename,
      contentType: fileType
    });

    // 配置选项
    const options = {
      formats: ['mmd', 'text'],
      data_options: {
        include_asciimath: true,
        include_latex: true,
        include_mathml: true
      },
      math_inline_delimiters: ['$', '$'],
      math_display_delimiters: ['$$', '$$'],
      rm_spaces: true
    };

    formData.append('options_json', JSON.stringify(options));
    
    console.log('🔧 图片转换选项:', JSON.stringify(options, null, 2));
    console.log('🌐 调用Mathpix OCR API...');

    // 调用Mathpix OCR API (用于图片)
    const response = await axios.post('https://api.mathpix.com/v3/text', formData, {
      headers: {
        ...formData.getHeaders(),
        'app_id': appId,
        'app_key': apiKey
      },
      timeout: 30000
    });

    console.log('📥 Mathpix OCR API响应:', JSON.stringify(response.data, null, 2));

    if (!response.data) {
      throw new Error('Mathpix OCR API未返回数据');
    }

    // 检查是否有错误
    if (response.data.error) {
      throw new Error(`Mathpix OCR API错误: ${response.data.error}`);
    }

    // 返回识别的文本
    return response.data.text || response.data.mmd || '';
  }

  /**
   * 轮询Mathpix处理结果
   */
  private static async pollMathpixResult(pdfId: string): Promise<string> {
    const { apiKey, appId } = getMathpixConfig();
    const maxAttempts = 1; // 只尝试1次
    const interval = 20000; // 等待20秒

    console.log('⏳ 等待PDF处理完成...');

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        console.log(`🔄 轮询状态 - 尝试 ${attempt + 1}/${maxAttempts}...`);

        const response = await axios.get(`https://api.mathpix.com/v3/pdf/${pdfId}`, {
          headers: {
            'app_id': appId,
            'app_key': apiKey
          },
          timeout: 10000
        });

        const status = response.data.status;
        console.log(`📊 当前状态: ${status}`);

        if (status === 'completed') {
          console.log(`✅ PDF处理完成！尝试次数: ${attempt + 1}`);
          
          // 等待一段时间让结果准备好
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // 获取MMD内容
          const mmdContent = await this.getPDFMMDContent(pdfId, apiKey, appId);
          
          if (mmdContent) {
            console.log('✅ 成功获取MMD内容，长度:', mmdContent.length);
            return mmdContent;
          } else {
            throw new Error('无法获取PDF的MMD内容');
          }
        } else if (status === 'error' || status === 'failed') {
          const errorMsg = response.data.error || response.data.error_info?.message || 'Mathpix处理失败';
          console.error('❌ Mathpix处理错误:', errorMsg);
          throw new Error(errorMsg);
        }

        console.log(`⏳ PDF处理中... 状态: ${status}`);

        // 等待后继续
        await new Promise(resolve => setTimeout(resolve, interval));

      } catch (error: any) {
        if (attempt === maxAttempts - 1) {
          console.error('❌ 达到最大重试次数，PDF处理超时');
          throw error;
        }
        console.warn(`⚠️ 轮询PDF状态失败 (尝试 ${attempt + 1}):`, error.message);
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }

    throw new Error('Mathpix处理超时');
  }

  /**
   * 获取PDF的MMD内容
   */
  private static async getPDFMMDContent(pdfId: string, apiKey: string, appId: string): Promise<string | null> {
    try {
      console.log('🔍 获取PDF的MMD内容...');
      
      // 尝试获取.mmd格式的结果
      try {
        console.log('📄 尝试获取.mmd格式结果...');
        const mmdResponse = await axios.get(`https://api.mathpix.com/v3/pdf/${pdfId}.mmd`, {
          headers: {
            'app_id': appId,
            'app_key': apiKey
          },
          timeout: 10000
        });
        
        console.log('✅ MMD结果获取成功');
        console.log('📊 响应类型:', typeof mmdResponse.data);
        console.log('📊 响应长度:', mmdResponse.data?.length || 0);
        
        if (typeof mmdResponse.data === 'string' && mmdResponse.data.length > 0) {
          console.log('📄 MMD内容预览:', mmdResponse.data.substring(0, 500) + '...');
          return mmdResponse.data;
        } else if (mmdResponse.data && mmdResponse.data.mmd) {
          console.log('📄 从响应对象中提取MMD内容...');
          return mmdResponse.data.mmd;
        }
      } catch (mmdError: any) {
        console.warn('⚠️ 获取MMD结果失败:', mmdError.message);
      }
      
      // 尝试获取.txt格式的结果
      try {
        console.log('📄 尝试获取.txt格式结果...');
        const txtResponse = await axios.get(`https://api.mathpix.com/v3/pdf/${pdfId}.txt`, {
          headers: {
            'app_id': appId,
            'app_key': apiKey
          },
          timeout: 10000
        });
        
        console.log('✅ 文本结果获取成功');
        console.log('📊 响应类型:', typeof txtResponse.data);
        console.log('📊 响应长度:', txtResponse.data?.length || 0);
        
        if (typeof txtResponse.data === 'string' && txtResponse.data.length > 0) {
          console.log('📄 文本内容预览:', txtResponse.data.substring(0, 500) + '...');
          return txtResponse.data;
        } else if (txtResponse.data && txtResponse.data.text) {
          console.log('📄 从响应对象中提取文本内容...');
          return txtResponse.data.text;
        }
      } catch (txtError: any) {
        console.warn('⚠️ 获取文本结果失败:', txtError.message);
      }
      
      console.log('❌ 无法获取任何格式的MMD内容');
      return null;
      
    } catch (error: any) {
      console.error('❌ 获取PDF MMD内容失败:', error);
      return null;
    }
  }

  /**
   * 获取扫描任务状态
   */
  static getScanTask(scanId: string): ScanTask | undefined {
    return scanTasks.get(scanId);
  }

  /**
   * 获取扫描结果
   */
  static getScanResult(scanId: string): string | null {
    const task = scanTasks.get(scanId);
    return task?.result || null;
  }

  /**
   * 清理过期的扫描任务（24小时）
   */
  static cleanupExpiredTasks(): void {
    const now = new Date();
    const expiredTime = 24 * 60 * 60 * 1000; // 24小时

    for (const [scanId, task] of scanTasks.entries()) {
      if (now.getTime() - task.updatedAt.getTime() > expiredTime) {
        scanTasks.delete(scanId);
        console.log(`🗑️ 清理过期扫描任务: ${scanId}`);
      }
    }
  }

}
