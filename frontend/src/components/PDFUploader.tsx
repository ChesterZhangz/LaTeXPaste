import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';

interface PDFUploaderProps {
  onFileSelect: (file: File) => void;
  isUploading: boolean;
  error?: string;
}

const PDFUploader: React.FC<PDFUploaderProps> = ({ onFileSelect, isUploading, error }) => {
  const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  // 处理粘贴事件
  const handlePaste = useCallback((event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      // 检查是否是文件类型
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          // 检查文件类型是否支持
          const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
          if (allowedTypes.includes(file.type)) {
            // 检查文件大小（2MB限制）
            if (file.size <= 2 * 1024 * 1024) {
              onFileSelect(file);
              event.preventDefault();
            } else {
              console.warn('粘贴的文件超过2MB限制');
            }
          } else {
            console.warn('不支持的文件类型:', file.type);
          }
        }
      }
    }
  }, [onFileSelect]);

  // 添加粘贴事件监听器
  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

  const { getRootProps, getInputProps, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg']
    },
    maxFiles: 1,
    maxSize: 2 * 1024 * 1024, // 2MB
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
    onDropAccepted: () => setDragActive(false),
    onDropRejected: () => setDragActive(false),
  });

  return (
    <div className="w-full">
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
                上传文件
              </h3>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                拖拽文件到此处，或点击选择文件，或使用 Ctrl+V / Cmd+V 粘贴
              </p>
              
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 space-x-4">
                <div className="flex items-center">
                  <FileText className="w-4 h-4 mr-1" />
                  支持PDF、PNG、JPG、JPEG
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  最大2MB
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-sm text-red-700 dark:text-red-200">{error}</div>
        </div>
      )}
    </div>
  );
};

export default PDFUploader;
