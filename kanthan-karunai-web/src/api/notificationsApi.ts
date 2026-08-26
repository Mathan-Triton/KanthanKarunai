import api from '../services/api';
import { ApiResponse } from '../types/api';

export interface NotificationLog {
  id: number;
  customerId: number;
  customerName?: string;
  customerCode?: string;
  mobileNo?: string;
  paymentId?: number;
  loanPaymentId?: number;
  notificationType: string;
  message: string;
  sentDate: string;
  status: string;
  errorMessage?: string;
  createdAt: string;
}

export const notificationsApi = {
  getNotifications: async (customerId?: number): Promise<ApiResponse<NotificationLog[]>> => {
    const params = customerId ? { customerId } : {};
    const response = await api.get('/notifications', { params });
    return response.data;
  },

  getCustomerNotifications: async (customerId: number): Promise<ApiResponse<NotificationLog[]>> => {
    const response = await api.get(`/notifications/customer/${customerId}`);
    return response.data;
  }
};
