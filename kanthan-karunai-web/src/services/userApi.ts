import api from './api';

export interface UserDto {
  id: number;
  username: string;
  fullName: string;
  role: string;
  customerId?: number;
  customerName?: string;
  customerCode?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateUserDto {
  username: string;
  fullName: string;
  password?: string;
  confirmPassword?: string;
  customerId?: number;
}

export const userApi = {
  getUsers: async (role?: string, isActive?: boolean): Promise<UserDto[]> => {
    const params: any = {};
    if (role) params.role = role;
    if (isActive !== undefined) params.isActive = isActive;
    
    const response = await api.get('/users', { params });
    return response.data.data;
  },

  createStaff: async (dto: CreateUserDto): Promise<UserDto> => {
    const response = await api.post('/users/staff', dto);
    return response.data.data;
  },

  createDriver: async (dto: CreateUserDto): Promise<UserDto> => {
    const response = await api.post('/users/driver', dto);
    return response.data.data;
  },

  createCustomerUser: async (dto: CreateUserDto): Promise<UserDto> => {
    const response = await api.post('/users/customer', dto);
    return response.data.data;
  },

  toggleStatus: async (id: number): Promise<UserDto> => {
    const response = await api.post(`/users/${id}/toggle-status`);
    return response.data.data;
  },

  resetPassword: async (id: number, password: string): Promise<any> => {
    const response = await api.post(`/users/${id}/reset-password`, { newPassword: password });
    return response.data;
  },

  changeRole: async (id: number, role: string): Promise<UserDto> => {
    const response = await api.post(`/users/${id}/change-role`, { role });
    return response.data.data;
  },

  deleteUser: async (id: number): Promise<any> => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  }
};
