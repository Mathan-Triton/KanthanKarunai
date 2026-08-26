import api from './api';

export interface UserSession {
  token: string;
  username: string;
  fullName: string;
  role: string;
  userId: number;
  customerId?: number | null;
  expiresAt: string;
}

export const authApi = {
  login: async (username: string, password: string): Promise<UserSession> => {
    const response = await api.post('/auth/login', { username, password });
    const { success, data, message } = response.data;
    
    if (success && data) {
      // Clear any old token first
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({
        username: data.username,
        fullName: data.fullName,
        role: data.role,          // e.g. "Admin", "Staff", "Customer", "Driver"
        userId: data.userId,
        customerId: data.customerId ?? null,
        expiresAt: data.expiresAt
      }));
      return data;
    }
    
    throw new Error(message || 'Login failed');
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  isAuthenticated: (): boolean => {
    const token = localStorage.getItem('token');
    if (!token) return false;
    // Check expiry from stored session
    try {
      const user = authApi.getCurrentUser();
      if (user?.expiresAt) {
        const expiry = new Date(user.expiresAt);
        if (expiry < new Date()) {
          // Token expired - clear storage
          authApi.logout();
          return false;
        }
      }
    } catch {
      // Ignore parse errors
    }
    return true;
  },

  getCurrentUser: (): UserSession | null => {
    const userJson = localStorage.getItem('user');
    return userJson ? JSON.parse(userJson) : null;
  },

  // Case-insensitive role comparison
  hasRole: (role: string): boolean => {
    const user = authApi.getCurrentUser();
    return user ? user.role.toLowerCase() === role.toLowerCase() : false;
  },

  hasAnyRole: (roles: string[]): boolean => {
    const user = authApi.getCurrentUser();
    if (!user) return false;
    return roles.some(r => r.toLowerCase() === user.role.toLowerCase());
  },

  isAdmin: (): boolean => authApi.hasRole('Admin'),
  isStaff: (): boolean => authApi.hasRole('Staff'),
  isCustomer: (): boolean => authApi.hasRole('Customer'),
  isDriver: (): boolean => authApi.hasRole('Driver'),
  isAdminOrStaff: (): boolean => authApi.hasAnyRole(['Admin', 'Staff']),
};
