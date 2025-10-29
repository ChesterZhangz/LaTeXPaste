import fs from 'fs';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'temp', 'uploads');

// 确保上传目录存在
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export interface FileInfo {
  batchId: string;
  fileId: string;
  fileName: string;
  filePath: string;
  createdAt: Date;
}

/**
 * 保存原始文件到临时目录
 */
export function saveOriginalFile(
  batchId: string,
  fileId: string,
  fileName: string,
  buffer: Buffer
): string {
  const batchDir = path.join(UPLOAD_DIR, batchId);
  
  // 确保批次目录存在
  if (!fs.existsSync(batchDir)) {
    fs.mkdirSync(batchDir, { recursive: true });
  }
  
  const filePath = path.join(batchDir, `${fileId}_${fileName}`);
  fs.writeFileSync(filePath, buffer);
  
  return filePath;
}

/**
 * 获取原始文件路径
 */
export function getOriginalFilePath(batchId: string, fileId: string): string | null {
  const batchDir = path.join(UPLOAD_DIR, batchId);
  
  if (!fs.existsSync(batchDir)) {
    return null;
  }
  
  // 查找匹配的文件（fileId_*）
  const files = fs.readdirSync(batchDir);
  const matchingFile = files.find(file => file.startsWith(`${fileId}_`));
  
  if (!matchingFile) {
    return null;
  }
  
  return path.join(batchDir, matchingFile);
}

/**
 * 获取原始文件信息
 */
export function getOriginalFileInfo(batchId: string, fileId: string): FileInfo | null {
  const filePath = getOriginalFilePath(batchId, fileId);
  
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }
  
  const stats = fs.statSync(filePath);
  const fileName = path.basename(filePath).replace(`${fileId}_`, '');
  
  return {
    batchId,
    fileId,
    fileName,
    filePath,
    createdAt: stats.birthtime
  };
}

/**
 * 清理过期的文件（24小时前）
 */
export function cleanupOldFiles(): void {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  try {
    if (!fs.existsSync(UPLOAD_DIR)) {
      return;
    }
    
    const batchDirs = fs.readdirSync(UPLOAD_DIR);
    
    for (const batchDir of batchDirs) {
      const batchPath = path.join(UPLOAD_DIR, batchDir);
      const stats = fs.statSync(batchPath);
      
      // 如果批次目录超过24小时，删除整个目录
      if (stats.birthtime < oneDayAgo) {
        fs.rmSync(batchPath, { recursive: true, force: true });
        console.log(`已清理过期批次目录: ${batchDir}`);
      }
    }
  } catch (error) {
    console.error('清理过期文件时出错:', error);
  }
}

/**
 * 删除特定批次的所有文件
 */
export function cleanupBatchFiles(batchId: string): void {
  const batchDir = path.join(UPLOAD_DIR, batchId);
  
  try {
    if (fs.existsSync(batchDir)) {
      fs.rmSync(batchDir, { recursive: true, force: true });
      console.log(`已清理批次文件: ${batchId}`);
    }
  } catch (error) {
    console.error(`清理批次文件 ${batchId} 时出错:`, error);
  }
}

/**
 * 获取文件大小（字节）
 */
export function getFileSize(filePath: string): number {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

/**
 * 检查文件是否存在
 */
export function fileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}
