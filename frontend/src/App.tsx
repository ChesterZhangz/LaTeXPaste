import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import ProtectedRoute from './components/ProtectedRoute';
import ThemeProvider from './components/ThemeProvider';
import Login from './pages/Login';
import Scan from './pages/Scan';

const App: React.FC = () => {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    // 应用启动时检查认证状态
    checkAuth();
  }, [checkAuth]);

  return (
    <ThemeProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/scan"
              element={
                <ProtectedRoute>
                  <Scan />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/scan" replace />} />
            <Route path="*" element={<Navigate to="/scan" replace />} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
};

export default App;
