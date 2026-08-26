import axios from 'axios';

// Vite proxy is configured in vite.config.ts:
//   '/api' -> 'http://127.0.0.1:5211'
// So baseURL '/api' routes all calls through the proxy to the backend.
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically inject JWT token into all outgoing requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    // Guard: only set header if token exists and is not empty/undefined
    if (token && token !== 'undefined' && token !== 'null' && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Global response interceptor for handling token expiration and forbidden
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      if (error.response.status === 401) {
        // Session expired or invalid token
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      // 403 is handled in each page component - don't auto-redirect
    }
    return Promise.reject(error);
  }
);

export default api;
