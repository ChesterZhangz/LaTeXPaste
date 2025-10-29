import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { LoginRequest, LoginResponse, User, ScanTask, ScanResult, ApiResponse } from '../types';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: (import.meta as any).env?.VITE_API_BASE_URL || 'https://tool.mareate.com/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 请求拦截器
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error) => {
        if (error.response?.status === 401) {
          // Token过期或无效，清除本地存储
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // 认证相关
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await this.api.post<LoginResponse>('/auth/login', credentials);
    return response.data;
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    const response = await this.api.get<ApiResponse<User>>('/auth/me');
    return response.data;
  }

  async logout(): Promise<ApiResponse> {
    const response = await this.api.post<ApiResponse>('/auth/logout');
    return response.data;
  }

  // 扫描相关
  async uploadFile(file: File): Promise<ApiResponse<{ scanId: string; fileName: string; fileSize: number; fileType: string }>> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.api.post<ApiResponse<{ scanId: string; fileName: string; fileSize: number; fileType: string }>>(
      '/scan/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  }

  async getScanStatus(scanId: string): Promise<ApiResponse<ScanTask>> {
    const response = await this.api.get<ApiResponse<ScanTask>>(`/scan/status/${scanId}`);
    return response.data;
  }

  async getScanResult(scanId: string): Promise<ApiResponse<ScanResult>> {
    const response = await this.api.get<ApiResponse<ScanResult>>(`/scan/result/${scanId}`);
    return response.data;
  }

  async getScanTasks(): Promise<ApiResponse<{ tasks: ScanTask[] }>> {
    const response = await this.api.get<ApiResponse<{ tasks: ScanTask[] }>>('/scan/tasks');
    return response.data;
  }
}

export const apiService = new ApiService();
