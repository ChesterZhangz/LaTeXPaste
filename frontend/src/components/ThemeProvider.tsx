import React, { useEffect } from 'react';
import { useThemeStore } from '../stores/themeStore';

interface ThemeProviderProps {
  children: React.ReactNode;
}

const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { isDark } = useThemeStore();

  useEffect(() => {
    // 应用暗色模式到HTML元素
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return <>{children}</>;
};

export default ThemeProvider;
