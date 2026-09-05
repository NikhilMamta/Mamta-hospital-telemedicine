import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize and check credentials in local storage
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('admin_token');
      const storedUser = localStorage.getItem('admin_user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setAdmin(JSON.parse(storedUser));
        
        // Verify token with backend
        try {
          const res = await api.get('/auth/me');
          if (res.data && res.data.success) {
            setAdmin(res.data.data);
            localStorage.setItem('admin_user', JSON.stringify(res.data.data));
          }
        } catch (error) {
          console.error('Session validation failed, logging out:', error.message);
          logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      
      if (res.data && res.data.success) {
        const { token: jwtToken, admin: adminData } = res.data.data;
        
        localStorage.setItem('admin_token', jwtToken);
        localStorage.setItem('admin_user', JSON.stringify(adminData));
        
        setToken(jwtToken);
        setAdmin(adminData);
        return { success: true };
      }
      return { success: false, message: 'Invalid response from server' };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed. Please check your credentials.';
      return { success: false, message };
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setToken(null);
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{ admin, token, login, logout, isAuthenticated: !!token, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
