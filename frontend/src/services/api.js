import axios from 'axios';
import { showError } from '../utils/toast';

const api = axios.create({
  baseURL: '/api/v1'
  // Removed hardcoded Content-Type: application/json so Axios can auto-detect FormData
});

// Add a request interceptor to add the auth token
api.interceptors.request.use(
  (config) => {
    const user = JSON.parse(localStorage.getItem('sh_user'));
    if (user && user.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }

    // ==========================================
    // FIX #4: Prevent API response caching
    // ==========================================
    config.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate';
    config.headers['Pragma'] = 'no-cache';
    config.params = config.params || {};
    config.params._t = Date.now(); // Cache-busting timestamp

    // Explicitly set Content-Type to application/json if it's not FormData
    if (!(config.data instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json';
    }
    // If it is FormData, we let Axios completely handle the Content-Type automatically
    // so it can dynamically inject the boundary string.
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle global errors like 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const backendMessage = error.response?.data?.message || '';
      const hasToken = !!localStorage.getItem('sh_user');
      
      // Messages that indicate true session expiration
      const sessionExpiredPatterns = [
        'session expired',
        'token expired',
        'jwt expired',
        'invalid token',
        'token invalid',
        'not authenticated',
        'authentication failed',
      ];
      
      const isSessionExpired = sessionExpiredPatterns.some(
        pattern => backendMessage.toLowerCase().includes(pattern)
      );
      
      // Only auto-logout and show "session expired" if:
      // 1. User was logged in (has token), AND
      // 2. No specific backend message OR the message indicates session expiration
      if (hasToken && (!backendMessage || isSessionExpired)) {
        showError('Your session has expired. Please login again.');
        localStorage.removeItem('sh_user');
        window.location.href = '/login';
      }
      // For all other 401 errors (like authorization failures during registration),
      // just reject the promise and let the component handle the specific error
    }
    return Promise.reject(error);
  }
);

// Upload file to Cloudinary via backend
export const uploadFile = async (file, uploadType = 'report') => {
  const formData = new FormData();
  // Profile uploads expect 'image' key, others expect 'file'
  const fieldKey = uploadType === 'profile' ? 'image' : 'file';
  formData.append(fieldKey, file);
  
  const response = await axios.post(
    `${import.meta.env.VITE_API_URL || '/api/v1'}/uploads/${uploadType}`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${JSON.parse(localStorage.getItem('sh_user') || '{}').token}`
      }
    }
  );
  
  return response.data.data;
};

export default api;
