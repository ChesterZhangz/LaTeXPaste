import React, { useState } from 'react';
import { CheckCircle, AlertCircle, Download, FileText, Eye, Loader2 } from 'lucide-react';
import { BatchTask, FileTask } from '../types';
import SimpleMarkdownDisplay from './SimpleMarkdownDisplay';
import OriginalFileViewer from './OriginalFileViewer';
import { apiService } from '../services/api';

interface BatchResultDisplayProps {
  batchTask: BatchTask;
  onContentChange?: (fileId: string, newContent: string) => void;
}

const BatchResultDisplay: React.FC<BatchResultDisplayProps> = ({ 
  batchTask, 
  onContentChange
}) => {
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [showOriginalFile, setShowOriginalFile] = useState(false);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'uploading':
      case 'mathpix-processing':
      case 'converting':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-400" />;
    }
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

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };


  // 处理文件选择
  const handleFileSelect = (fileId: string) => {
    setSelectedFileId(fileId);
    const file = batchTask.files.find(f => f.fileId === fileId);
    if (file && file.result && !fileContents[fileId]) {
      setFileContents(prev => ({
        ...prev,
        [fileId]: file.result || ''
      }));
    }
  };

  // 处理内容变化
  const handleContentChange = (fileId: string, newContent: string) => {
    setFileContents(prev => ({
      ...prev,
      [fileId]: newContent
    }));
    onContentChange?.(fileId, newContent);
  };

  // 处理查看原文件
  const handleViewOriginal = (file: FileTask) => {
    if (file.originalFilePath) {
      setShowOriginalFile(true);
    }
  };

  // 处理下载单个文件
  const handleDownloadFile = (file: FileTask) => {
    if (file.result) {
      const blob = new Blob([file.result], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${file.fileName.replace(/\.[^/.]+$/, '')}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  // 获取当前选中的文件
  const selectedFile = selectedFileId ? batchTask.files.find(f => f.fileId === selectedFileId) : null;
  const currentContent = selectedFileId ? fileContents[selectedFileId] || selectedFile?.result || '' : '';

  return (
    <div className="space-y-6">
      {/* 文件标签页 */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {batchTask.files.map((file) => (
            <button
              key={file.fileId}
              onClick={() => handleFileSelect(file.fileId)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors duration-200 ${
                selectedFileId === file.fileId
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {getStatusIcon(file.status)}
              <span className="truncate max-w-32">{file.fileName}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {formatFileSize(file.fileSize)}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* 内容区域 */}
      {selectedFile ? (
        <div className="space-y-4">
          {/* 工具栏 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedFile.fileName}
              </h3>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                selectedFile.status === 'completed' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : selectedFile.status === 'failed'
                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
              }`}>
                {getStatusText(selectedFile.status)}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {/* 查看原文件按钮 */}
              {selectedFile.originalFilePath && (
                <button
                  onClick={() => handleViewOriginal(selectedFile)}
                  className="flex items-center space-x-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  title="查看原文件"
                >
                  <Eye className="w-4 h-4" />
                  <span>原文件</span>
                </button>
              )}

              {/* 下载按钮 */}
              {selectedFile.status === 'completed' && selectedFile.result && (
                <button
                  onClick={() => handleDownloadFile(selectedFile)}
                  className="flex items-center space-x-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  title="下载文件"
                >
                  <Download className="w-4 h-4" />
                  <span>下载</span>
                </button>
              )}
            </div>
          </div>

          {/* 内容显示 */}
          {selectedFile.status === 'completed' && currentContent ? (
            <SimpleMarkdownDisplay
              content={currentContent}
              fileName={selectedFile.fileName}
              onContentChange={(newContent) => handleContentChange(selectedFile.fileId, newContent)}
            />
          ) : selectedFile.status === 'failed' ? (
            <div className="text-center py-12">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-red-600 dark:text-red-400 mb-2">文件处理失败</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {selectedFile.error || '未知错误'}
              </p>
            </div>
          ) : (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
              <p className="text-gray-600 dark:text-gray-400">
                {getStatusText(selectedFile.status)}...
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500 dark:text-gray-400">请选择一个文件查看结果</p>
        </div>
      )}

      {/* 原始文件查看器 */}
      {selectedFile && showOriginalFile && (
        <OriginalFileViewer
          isOpen={showOriginalFile}
          onClose={() => setShowOriginalFile(false)}
          fileUrl={apiService.getOriginalFileUrl(batchTask.batchId, selectedFile.fileId)}
          fileName={selectedFile.fileName}
          fileType={selectedFile.fileType}
        />
      )}
    </div>
  );
};

export default BatchResultDisplay;