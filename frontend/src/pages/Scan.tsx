import React, { useState, useEffect } from 'react';
import { LogOut, User, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { apiService } from '../services/api';
import PDFUploader from '../components/PDFUploader';
import MarkdownDisplay from '../components/MarkdownDisplay';
import ThemeToggle from '../components/ThemeToggle';
import { useDocumentTitle, TitleState } from '../hooks/useDocumentTitle';

interface ScanState {
  isUploading: boolean;
  isScanning: boolean;
  scanId: string | null;
  progress: number;
  status: string;
  result: string;
  error: string | undefined;
  fileName: string | null;
}

const Scan: React.FC = () => {
  const { user, logout } = useAuthStore();
  const [scanState, setScanState] = useState<ScanState>({
    isUploading: false,
    isScanning: false,
    scanId: null,
    progress: 0,
    status: '',
    result: '',
    error: undefined,
    fileName: null,
  });

  // 动态标题状态
  const getTitleState = (): TitleState => {
    if (scanState.isUploading) return 'loading';
    if (scanState.isScanning) return 'scanning';
    if (scanState.status === 'processing') return 'processing';
    if (scanState.status === 'completed') return 'completed';
    if (scanState.error) return 'error';
    return 'default';
  };

  // 使用动态标题
  useDocumentTitle(getTitleState(), scanState.fileName || undefined);

  // 轮询扫描状态
  useEffect(() => {
    if (!scanState.scanId || scanState.status === 'completed' || scanState.status === 'failed') {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const response = await apiService.getScanStatus(scanState.scanId!);
        if (response.success && response.data) {
          const { status, progress, error } = response.data;
          
          setScanState(prev => ({
            ...prev,
            status,
            progress,
            error: error || undefined,
            isScanning: status === 'processing' || status === 'pending',
          }));

          // 如果扫描完成，获取结果
          if (status === 'completed') {
            const resultResponse = await apiService.getScanResult(scanState.scanId!);
            if (resultResponse.success && resultResponse.data) {
              setScanState(prev => ({
                ...prev,
                result: resultResponse.data!.result,
                isScanning: false,
              }));
            }
          } else if (status === 'failed') {
            setScanState(prev => ({
              ...prev,
              isScanning: false,
            }));
          }
        }
      } catch (error) {
        console.error('轮询扫描状态失败:', error);
        setScanState(prev => ({
          ...prev,
          error: '获取扫描状态失败',
          isScanning: false,
        }));
      }
    }, 2000); // 每2秒轮询一次

    return () => clearInterval(pollInterval);
  }, [scanState.scanId, scanState.status]);

  const handleFileSelect = async (file: File) => {
    setScanState({
      isUploading: true,
      isScanning: false,
      scanId: null,
      progress: 0,
      status: '',
      result: '',
      error: undefined,
      fileName: file.name,
    });

    try {
      const response = await apiService.uploadFile(file);
      if (response.success && response.data) {
        setScanState(prev => ({
          ...prev,
          isUploading: false,
          isScanning: true,
          scanId: response.data!.scanId,
          status: 'pending',
          progress: 0,
          error: undefined,
        }));
      } else {
        setScanState(prev => ({
          ...prev,
          isUploading: false,
          error: response.error || '上传失败',
        }));
      }
    } catch (error: any) {
      setScanState(prev => ({
        ...prev,
        isUploading: false,
        error: error.response?.data?.error || error.message || '上传失败',
      }));
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const resetScan = () => {
    setScanState({
      isUploading: false,
      isScanning: false,
      scanId: null,
      progress: 0,
      status: '',
      result: '',
      error: undefined,
      fileName: null,
    });
  };

  return (
    <div className="min-h-screen gradient-bg">
      {/* 头部 */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary-600 dark:bg-gray-600 rounded-lg flex items-center justify-center mr-3">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Mathtools</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                <User className="w-4 h-4 mr-2" />
                {user?.name}
              </div>
              <button
                onClick={handleLogout}
                className="btn-outline flex items-center text-sm"
              >
                <LogOut className="w-4 h-4 mr-2" />
                退出
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧：上传区域 */}
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">上传文件</h2>
              
              <PDFUploader
                onFileSelect={handleFileSelect}
                isUploading={scanState.isUploading}
                error={scanState.error}
              />
            </div>

            {/* 扫描进度 */}
            {scanState.isScanning && (
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">扫描进度</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">处理中...</span>
                    <span className="text-gray-900 dark:text-white font-medium">{scanState.progress}%</span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 dark:bg-gray-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${scanState.progress}%` }}
                    />
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <div className="loading-spinner mr-2" />
                    {scanState.status === 'pending' && '正在上传到Mathpix...'}
                    {scanState.status === 'processing' && '正在识别数学公式...'}
                  </div>
                </div>
              </div>
            )}

            {/* 扫描结果状态 */}
            {scanState.status === 'completed' && (
              <div className="card">
                <div className="flex items-center text-green-600 mb-2">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <span className="font-medium">扫描完成</span>
                </div>
                <p className="text-sm text-gray-600 mb-4 dark:text-gray-400">
                  文件 {scanState.fileName} 已成功转换为LaTeX格式
                </p>
                <button
                  onClick={resetScan}
                  className="btn-outline text-sm dark:text-white dark:bg-gray-700"
                >
                  扫描新文件
                </button>
              </div>
            )}

            {scanState.status === 'failed' && (
              <div className="card">
                <div className="flex items-center text-red-600 mb-2">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  <span className="font-medium">扫描失败</span>
                </div>
                <p className="text-sm text-gray-600 mb-4 dark:text-gray-400">
                  {scanState.error || '扫描过程中发生错误'}
                </p>
                <button
                  onClick={resetScan}
                  className="btn-primary text-sm dark:text-white dark:bg-gray-700"
                >
                  重新扫描
                </button>
              </div>
            )}
          </div>

          {/* 右侧：结果显示 */}
          <div>
            <MarkdownDisplay
              content={scanState.result}
              fileName={scanState.fileName || undefined}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Scan;
