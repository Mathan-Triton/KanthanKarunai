import api from './api';
import { PaymentSchedule } from './chitApi';

export interface Payment {
  id: number;
  customerId: number;
  customerName?: string;
  customerCode?: string;
  customerMobile?: string;
  chitId: number;
  chitName?: string;
  paymentScheduleId: number;
  installmentNo: number;
  paymentDate: string;
  amount: number;
  paymentMonth?: string;
  paymentType: string;
  paymentMethod: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'OTHER';
  receiptNo: string;
  notes?: string;
  remarks?: string;
  collectedByName?: string;
  createdAt?: string;
}

export interface CreatePaymentData {
  customerId: number;
  chitId?: number;
  paymentMonth?: string;
  amount: number;
  paymentMethod: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'OTHER';
  notes?: string;
  remarks?: string;
  paymentDate?: string;
  allowDuplicate?: boolean;
}

export interface CustomerPendingSummary {
  customerId: number;
  customerName: string;
  customerCode: string;
  mobileNo?: string;
  chitId: number;
  chitName: string;
  monthlyPayment: number;
  totalPaidAmount: number;
  totalPendingAmount: number;
  currentMonthPending: number;
  upcomingMonthPayment: number;
  currentPendingMonth?: string;
  nextPendingMonth?: string;
  paymentStatus: string;
  schedules: PaymentSchedule[];
}

export const paymentApi = {
  getPayments: async (): Promise<Payment[]> => {
    const response = await api.get('/payments');
    return response.data.data || [];
  },

  getPaymentById: async (id: number): Promise<Payment> => {
    const response = await api.get(`/payments/${id}`);
    return response.data.data;
  },

  createPayment: async (data: CreatePaymentData): Promise<Payment> => {
    const response = await api.post('/payments', data);
    return response.data.data;
  },

  getPendingPayments: async (query?: string, frequency?: string): Promise<PaymentSchedule[]> => {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (frequency) params.append('frequency', frequency);

    const response = await api.get(`/payments/pending?${params.toString()}`).catch(async () => {
      return await api.get(`/payments/pending-payments?${params.toString()}`);
    });
    return response.data.data || [];
  },

  getPendingSummary: async (query?: string): Promise<CustomerPendingSummary[]> => {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    const response = await api.get(`/payments/pending-summary?${params.toString()}`);
    return response.data.data || [];
  },

  getCustomerPayments: async (customerId: number): Promise<Payment[]> => {
    const response = await api.get(`/payments/customer/${customerId}`).catch(async () => {
      return await api.get(`/customers/${customerId}/payments`);
    });
    return response.data.data || [];
  }
};
