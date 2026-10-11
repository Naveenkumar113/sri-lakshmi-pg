import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor to automatically inject JWT Bearer token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('pg_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token expiry / 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If unauthorized and we had a token, remove it
      if (localStorage.getItem('pg_auth_token')) {
        localStorage.removeItem('pg_auth_token');
        localStorage.removeItem('pg_auth_user');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
