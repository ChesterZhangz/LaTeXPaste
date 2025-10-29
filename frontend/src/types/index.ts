export interface User {
  _id: string;
  email: string;
  name: string;
  avatar?: string;
  phone?: string;
  systemRole: string;
  userType: string;
  isActive: boolean;
  isEmailVerified: boolean;
  lastLogin?: string;
  loginCount: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: User;
  };
}

export interface ScanTask {
  scanId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScanResult {
  scanId: string;
  status: string;
  result: string;
  createdAt: string;
  completedAt: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// 批量处理相关类型
export interface FileTask {
  fileId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  status: 'pending' | 'uploading' | 'mathpix-processing' | 'converting' | 'completed' | 'failed';
  progress: number;
  result?: string;
  error?: string;
  originalFilePath?: string;
  createdAt: Date;
  updatedAt: Date;
  estimatedTimeRemaining?: number; // 预估剩余时间（秒）
}

export interface BatchTask {
  batchId: string;
  userId: string;
  files: FileTask[];
  overallProgress: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  createdAt: Date;
  updatedAt: Date;
  estimatedTimeRemaining?: number; // 预估剩余时间（秒）
}

export interface BatchUploadRequest {
  files: {
    buffer: ArrayBuffer;
    originalname: string;
    mimetype: string;
    size: number;
  }[];
}

export interface BatchUploadResponse {
  success: boolean;
  message: string;
  data: {
    batchId: string;
    totalFiles: number;
  };
}

export interface BatchStatusResponse {
  success: boolean;
  data: BatchTask;
}

export interface BatchResultsResponse {
  success: boolean;
  data: {
    batchId: string;
    files: FileTask[];
    overallProgress: number;
    status: string;
  };
}

// 视图模式类型
export type ViewMode = 'raw' | 'edit' | 'preview';
