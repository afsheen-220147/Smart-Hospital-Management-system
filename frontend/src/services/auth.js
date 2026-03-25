import api from './api';

// Register User
export const register = async (userData) => {
  const response = await api.post('/auth/register', userData);
  if (response.data && response.data.token) {
    localStorage.setItem('sh_user', JSON.stringify(response.data));
  }
  return response;
};

// Login User
export const login = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  if (response.data && response.data.token) {
    localStorage.setItem('sh_user', JSON.stringify(response.data));
    
    // If admin, set default adminId for approval system
    if (response.data.role === 'admin') {
      // Use a default admin ID - in production this should map from user ID
      const adminId = localStorage.getItem('adminId') || 'admin_001';
      localStorage.setItem('adminId', adminId);
    }
  }
  return response;
};

// Logout User
export const logout = async () => {
  try {
    await api.get('/auth/logout');
  } catch (err) {
    // Ignore error, clear local storage anyway
  } finally {
    localStorage.removeItem('sh_user');
    localStorage.removeItem('adminId');
  }
};

// Google OAuth Login/Register (for registration flow)
export const googleLogin = async ({ idToken, role }) => {
  const response = await api.post('/auth/google', { idToken, role });
  if (response.data && response.data.token) {
    localStorage.setItem('sh_user', JSON.stringify(response.data));
    
    // If admin, set default adminId for approval system
    if (response.data.role === 'admin' || role === 'admin') {
      const adminId = localStorage.getItem('adminId') || 'admin_001';
      localStorage.setItem('adminId', adminId);
    }
  }
  return response;
};

// Google OAuth Login (auto-creates patient if not exists)
export const googleLoginAuto = async (idToken) => {
  const response = await api.post('/auth/google-login', { idToken });
  if (response.data && response.data.token) {
    localStorage.setItem('sh_user', JSON.stringify(response.data));
  }
  return response;
};

// Get Current User (Local cache)
export const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem('sh_user'));
  } catch (e) {
    return null;
  }
};

// Fetch fresh User Profile from Server
export const getMe = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};
