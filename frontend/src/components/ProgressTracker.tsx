import React from 'react';
import { CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { FileTask, BatchTask } from '../types';

interface ProgressTrackerProps {
  batchTask?: BatchTask;
  singleFile?: FileTask;
  isSingleMode?: boolean;
}

const ProgressTracker: React.FC<ProgressTrackerProps> = ({ 
  batchTask, 
  singleFile, 
  isSingleMode = false 
}) => {

  // 获取状态图标
  const getStatusIcon = (status: string, isProcessing: boolean = false) => {
    if (isProcessing) {
      return <Loader2 className="w-4 h-4 animate-spin text-primary-600" />;
    }
    
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-400" />;
      default:
        return <Loader2 className="w-4 h-4 animate-spin text-primary-600" />;
    }
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '等待中';
      case 'uploading':
        return '上传中';
      case 'mathpix-processing':
        return 'Mathpix识别中';
      case 'converting':
        return '格式转换中';
      case 'completed':
        return '已完成';
      case 'failed':
        return '处理失败';
      default:
        return '处理中';
    }
  };

  // 格式化时间
  const formatTime = (seconds: number) => {
    if (seconds < 60) {
      return `${Math.round(seconds)}秒`;
    } else if (seconds < 3600) {
      return `${Math.round(seconds / 60)}分钟`;
    } else {
      return `${Math.round(seconds / 3600)}小时`;
    }
  };

  // 计算处理速度
  const getProcessingSpeed = () => {
    if (!batchTask) return null;
    
    const completedFiles = batchTask.completedFiles;
    const now = new Date();
    const startTime = new Date(batchTask.createdAt);
    const elapsedMinutes = (now.getTime() - startTime.getTime()) / (1000 * 60);
    
    if (elapsedMinutes > 0 && completedFiles > 0) {
      return `${(completedFiles / elapsedMinutes).toFixed(1)} 文件/分钟`;
    }
    return null;
  };

  if (isSingleMode && singleFile) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">处理进度</h3>
          <div className="flex items-center space-x-2">
            {getStatusIcon(singleFile.status, ['uploading', 'mathpix-processing', 'converting'].includes(singleFile.status))}
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {getStatusText(singleFile.status)}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
              <span>文件: {singleFile.fileName}</span>
              <span>{singleFile.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${singleFile.progress}%` }}
              />
            </div>
          </div>

          {singleFile.estimatedTimeRemaining && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              预计剩余时间: {formatTime(singleFile.estimatedTimeRemaining)}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!batchTask) return null;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">批量处理进度</h3>
        <div className="flex items-center space-x-2">
          {getStatusIcon(batchTask.status, batchTask.status === 'processing')}
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {getStatusText(batchTask.status)}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {/* 整体进度 */}
        <div>
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
            <span>整体进度</span>
            <span>{batchTask.overallProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div 
              className="bg-primary-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${batchTask.overallProgress}%` }}
            />
          </div>
        </div>

        {/* 统计信息 */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {batchTask.totalFiles}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">总文件</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {batchTask.completedFiles}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">已完成</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {batchTask.failedFiles}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">失败</div>
          </div>
        </div>

        {/* 处理速度 */}
        {getProcessingSpeed() && (
          <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
            处理速度: {getProcessingSpeed()}
          </div>
        )}

        {/* 预估剩余时间 */}
        {batchTask.estimatedTimeRemaining && batchTask.status === 'processing' && (
          <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
            预计剩余时间: {formatTime(batchTask.estimatedTimeRemaining)}
          </div>
        )}

        {/* 文件列表 */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">文件状态</h4>
          {batchTask.files.map((file) => (
            <div 
              key={file.fileId} 
              className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                {getStatusIcon(file.status, ['uploading', 'mathpix-processing', 'converting'].includes(file.status))}
                <span className="text-sm text-gray-900 dark:text-white truncate">
                  {file.fileName}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <span>{file.progress}%</span>
                {file.error && (
                  <span className="text-red-500" title={file.error}>!</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProgressTracker;
