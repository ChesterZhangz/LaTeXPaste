import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';
import { apiService } from '../services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      // 初始状态
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // 登录
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await apiService.login({ email, password });
          
          if (response.success) {
            set({
              user: response.data.user,
              token: response.data.token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
            
            // 保存到localStorage
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
          } else {
            set({
              error: response.message || '登录失败',
              isLoading: false,
            });
          }
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || error.message || '登录失败';
          set({
            error: errorMessage,
            isLoading: false,
          });
        }
      },

      // 登出
      logout: async () => {
        set({ isLoading: true });
        
        try {
          await apiService.logout();
        } catch (error) {
          console.error('登出API调用失败:', error);
        } finally {
          // 清除状态和本地存储
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
          
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      },

      // 检查认证状态
      checkAuth: async () => {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        
        if (!token || !userStr) {
          set({
            isAuthenticated: false,
            user: null,
            token: null,
          });
          return;
        }

        set({ isLoading: true });
        
        try {
          const response = await apiService.getCurrentUser();
          
          if (response.success && response.data) {
            set({
              user: response.data,
              token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } else {
            // Token无效，清除状态
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
            });
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        } catch (error) {
          // 认证失败，清除状态
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      },

      // 清除错误
      clearError: () => {
        set({ error: null });
      },

      // 设置加载状态
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
