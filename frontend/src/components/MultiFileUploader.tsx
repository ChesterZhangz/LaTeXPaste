import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, CheckCircle, X, FolderOpen, Image, File } from 'lucide-react';

interface MultiFileUploaderProps {
  onFilesSelect: (files: File[]) => void;
  isUploading: boolean;
  error?: string;
  maxFiles?: number;
}

const MultiFileUploader: React.FC<MultiFileUploaderProps> = ({ 
  onFilesSelect, 
  isUploading, 
  error,
  maxFiles = 10 
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const newFiles = [...selectedFiles, ...acceptedFiles].slice(0, maxFiles);
      setSelectedFiles(newFiles);
      onFilesSelect(newFiles);
    }
  }, [selectedFiles, onFilesSelect, maxFiles]);

  // 处理粘贴事件
  const handlePaste = useCallback((event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
          if (allowedTypes.includes(file.type) && file.size <= 2 * 1024 * 1024) {
            const newFiles = [...selectedFiles, file].slice(0, maxFiles);
            setSelectedFiles(newFiles);
            onFilesSelect(newFiles);
            event.preventDefault();
          }
        }
      }
    }
  }, [selectedFiles, onFilesSelect, maxFiles]);

  // 添加粘贴事件监听器
  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

  // 移除文件
  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    onFilesSelect(newFiles);
  };

  // 清空所有文件
  const clearAllFiles = () => {
    setSelectedFiles([]);
    onFilesSelect([]);
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // 获取文件类型图标
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="w-4 h-4 text-blue-500" />;
    } else if (file.type === 'application/pdf') {
      return <File className="w-4 h-4 text-red-500" />;
    }
    return <FileText className="w-4 h-4 text-gray-500" />;
  };

  const { getRootProps, getInputProps, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg']
    },
    maxFiles: maxFiles,
    maxSize: 2 * 1024 * 1024, // 2MB per file
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
    onDropAccepted: () => setDragActive(false),
    onDropRejected: () => setDragActive(false),
  });

  return (
    <div className="w-full space-y-4">
      {/* 上传区域 */}
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors duration-200
          ${isDragReject 
            ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20' 
            : dragActive 
              ? 'border-primary-500 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/20' 
              : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600'
          }
          ${isUploading ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center">
          {isUploading ? (
            <>
              <div className="loading-spinner mb-4" />
              <p className="text-lg font-medium text-gray-700 dark:text-gray-300">正在上传...</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">请稍候，文件正在上传到服务器</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-primary-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <Upload className="w-8 h-8 text-primary-600 dark:text-gray-400" />
              </div>
              
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                批量上传文件
              </h3>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                拖拽文件或文件夹到此处，或点击选择文件，或使用 Ctrl+V / Cmd+V 粘贴
              </p>
              
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 space-x-4">
                <div className="flex items-center">
                  <FileText className="w-4 h-4 mr-1" />
                  支持PDF、PNG、JPG、JPEG
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  最大2MB/文件
                </div>
                <div className="flex items-center">
                  <FolderOpen className="w-4 h-4 mr-1" />
                  最多{maxFiles}个文件
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 已选择的文件列表 */}
      {selectedFiles.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              已选择文件 ({selectedFiles.length}/{maxFiles})
            </h4>
            <button
              onClick={clearAllFiles}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"
            >
              清空全部
            </button>
          </div>
          
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {selectedFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  {getFileIcon(file)}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {file.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(file.size)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-sm text-red-700 dark:text-red-200">{error}</div>
        </div>
      )}
    </div>
  );
};

export default MultiFileUploader;
