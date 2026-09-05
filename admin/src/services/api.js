import axios from 'axios';

const DEFAULT_API_URL = 'https://mamta-hospital-telemedicine.onrender.com/api';
const rawApiUrl = import.meta.env.VITE_API_URL || DEFAULT_API_URL;
const cleanBaseUrl = rawApiUrl.replace(/\/+$/, '');
const API_URL = cleanBaseUrl.endsWith('/api') ? cleanBaseUrl : `${cleanBaseUrl}/api`;

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30s timeout for Render free-tier cold starts
});



// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 Unauthorized
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and user info
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      
      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
