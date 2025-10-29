import React, { useState, useEffect } from 'react';
import { LogOut, User, FileText } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { apiService } from '../services/api';
import MultiFileUploader from '../components/MultiFileUploader';
import ProgressTracker from '../components/ProgressTracker';
import BatchResultDisplay from '../components/BatchResultDisplay';
import ThemeToggle from '../components/ThemeToggle';
import { useDocumentTitle, TitleState } from '../hooks/useDocumentTitle';
import { FileTask } from '../types';

interface BatchScanState {
  batchId: string | null;
  files: FileTask[];
  overallProgress: number;
  isProcessing: boolean;
  status: string;
  error: string | undefined;
}

const Scan: React.FC = () => {
  const { user, logout } = useAuthStore();

  const [batchState, setBatchState] = useState<BatchScanState>({
    batchId: null,
    files: [],
    overallProgress: 0,
    isProcessing: false,
    status: '',
    error: undefined,
  });

  // 动态标题状态
  const getTitleState = (): TitleState => {
    if (batchState.isProcessing) return 'processing';
    if (batchState.status === 'completed') return 'completed';
    if (batchState.error) return 'error';
    return 'default';
  };

  // 使用动态标题
  useDocumentTitle(getTitleState());

  // 处理批量文件选择
  const handleBatchFilesSelect = async (files: File[]) => {
    try {
      setBatchState(prev => ({
        ...prev,
        isProcessing: true,
        error: undefined,
      }));

      const response = await apiService.uploadBatchFiles(files);
      if (response.success && response.data) {
        setBatchState(prev => ({
          ...prev,
          batchId: response.data!.batchId,
          files: [], // 初始为空，通过轮询更新
          isProcessing: true,
        }));
      } else {
        setBatchState(prev => ({
          ...prev,
          isProcessing: false,
          error: '批量上传失败',
        }));
      }
    } catch (error: any) {
      console.error('批量文件上传失败:', error);
      setBatchState(prev => ({
        ...prev,
        isProcessing: false,
        error: error.message || '批量上传失败',
      }));
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  // 轮询批量任务状态
  useEffect(() => {
    if (!batchState.batchId || batchState.status === 'completed' || batchState.status === 'failed') {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const response = await apiService.getBatchStatus(batchState.batchId!);
        if (response.success && response.data) {
          const batchTask = response.data;
          setBatchState(prev => ({
            ...prev,
            files: batchTask.files,
            overallProgress: batchTask.overallProgress,
            status: batchTask.status,
            isProcessing: batchTask.status === 'processing',
          }));
        }
      } catch (error) {
        console.error('轮询批量任务状态失败:', error);
        setBatchState(prev => ({
          ...prev,
          error: '获取批量任务状态失败',
          isProcessing: false,
        }));
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [batchState.batchId, batchState.status]);

  const resetBatch = () => {
    setBatchState({
      batchId: null,
      files: [],
      overallProgress: 0,
      isProcessing: false,
      status: '',
      error: undefined,
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
        <div className="space-y-6">
          {/* 上传区域 - 只在没有文件时显示 */}
          {batchState.files.length === 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">上传文件</h2>
              
              <MultiFileUploader
                onFilesSelect={handleBatchFilesSelect}
                isUploading={batchState.isProcessing}
                error={batchState.error}
                maxFiles={10}
              />
            </div>
          )}

          {/* 进度跟踪 */}
          {batchState.isProcessing && batchState.batchId && (
            <ProgressTracker 
              batchTask={{
                batchId: batchState.batchId,
                userId: user?._id || '',
                files: batchState.files,
                overallProgress: batchState.overallProgress,
                status: batchState.status as any,
                totalFiles: batchState.files.length,
                completedFiles: batchState.files.filter(f => f.status === 'completed').length,
                failedFiles: batchState.files.filter(f => f.status === 'failed').length,
                createdAt: new Date(),
                updatedAt: new Date()
              }}
            />
          )}

          {/* 批量结果展示 - 有文件时占据全宽 */}
          {batchState.files.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">扫描结果</h2>
                <button
                  onClick={resetBatch}
                  className="btn-outline"
                >
                  重新上传
                </button>
              </div>
              
              <BatchResultDisplay
                batchTask={{
                  batchId: batchState.batchId || '',
                  userId: user?._id || '',
                  files: batchState.files,
                  overallProgress: batchState.overallProgress,
                  status: batchState.status as any,
                  totalFiles: batchState.files.length,
                  completedFiles: batchState.files.filter(f => f.status === 'completed').length,
                  failedFiles: batchState.files.filter(f => f.status === 'failed').length,
                  createdAt: new Date(),
                  updatedAt: new Date()
                }}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Scan;