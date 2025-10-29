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
