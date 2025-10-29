import React, { useState } from 'react';
import { Download, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { FileTask } from '../types';

interface BatchExportProps {
  files: FileTask[];
  batchId: string;
  onExportComplete?: () => void;
}

const BatchExport: React.FC<BatchExportProps> = ({ 
  files, 
  batchId, 
  onExportComplete 
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');


  // 生成Markdown文件名
  const generateMarkdownFileName = (originalFileName: string) => {
    const nameWithoutExt = originalFileName.replace(/\.[^/.]+$/, '');
    return `${nameWithoutExt}.md`;
  };

  // 导出所有文件为ZIP
  const handleExportAll = async () => {
    if (isExporting) return;

    setIsExporting(true);
    setExportStatus('idle');

    try {
      const zip = new JSZip();
      const completedFiles = files.filter(f => f.status === 'completed' && f.result);

      if (completedFiles.length === 0) {
        throw new Error('没有可导出的文件');
      }

      // 添加每个文件的Markdown内容
      completedFiles.forEach((file) => {
        const markdownFileName = generateMarkdownFileName(file.fileName);
        zip.file(markdownFileName, file.result!);
      });

      // 创建汇总文件
      const summaryContent = generateSummaryContent(completedFiles);
      zip.file('汇总.md', summaryContent);

      // 生成ZIP文件
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // 下载ZIP文件
      const zipFileName = `mathtools-batch-${batchId}-${new Date().toISOString().split('T')[0]}.zip`;
      saveAs(zipBlob, zipFileName);

      setExportStatus('success');
      onExportComplete?.();

    } catch (error: any) {
      console.error('导出失败:', error);
      setExportStatus('error');
    } finally {
      setIsExporting(false);
    }
  };

  // 生成汇总内容
  const generateSummaryContent = (files: FileTask[]) => {
    let content = `# Mathtools 批量扫描结果汇总\n\n`;
    content += `生成时间: ${new Date().toLocaleString('zh-CN')}\n`;
    content += `文件数量: ${files.length}\n\n`;
    content += `---\n\n`;

    files.forEach((file, index) => {
      content += `## ${index + 1}. ${file.fileName}\n\n`;
      content += `**文件大小:** ${formatFileSize(file.fileSize)}\n`;
      content += `**处理状态:** ${getStatusText(file.status)}\n\n`;
      
      if (file.result) {
        content += `**扫描结果:**\n\n`;
        content += file.result;
        content += `\n\n---\n\n`;
      } else if (file.error) {
        content += `**错误信息:** ${file.error}\n\n`;
        content += `---\n\n`;
      }
    });

    return content;
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '已完成';
      case 'failed':
        return '失败';
      case 'pending':
        return '等待中';
      case 'uploading':
        return '上传中';
      case 'mathpix-processing':
        return '识别中';
      case 'converting':
        return '转换中';
      default:
        return '处理中';
    }
  };

  const completedFiles = files.filter(f => f.status === 'completed' && f.result);

  if (completedFiles.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={handleExportAll}
        disabled={isExporting}
        className="btn-primary flex items-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isExporting ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Download className="w-4 h-4 mr-2" />
        )}
        {isExporting ? '导出中...' : `导出全部 (${completedFiles.length}个文件)`}
      </button>

      {exportStatus === 'success' && (
        <div className="flex items-center text-green-600 dark:text-green-400 text-sm">
          <CheckCircle className="w-4 h-4 mr-1" />
          导出成功
        </div>
      )}

      {exportStatus === 'error' && (
        <div className="flex items-center text-red-600 dark:text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 mr-1" />
          导出失败
        </div>
      )}
    </div>
  );
};

export default BatchExport;
