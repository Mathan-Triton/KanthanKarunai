import api from './api';

export interface Chit {
  id: number;
  customerId: number;
  customerName?: string;
  customerCode?: string;
  customerMobile?: string;
  chitName: string;
  paymentFrequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  paymentAmount: number;
  monthlyPayment?: number;
  totalChitAmount: number;
  duration: number;
  startDate: string;
  startMonth?: string;
  endDate: string;
  paidAmount?: number;
  pendingAmount?: number;
  nextPaymentMonth?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
}

export interface CreateChitData {
  customerId: number;
  chitName?: string;
  paymentFrequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  paymentAmount?: number;
  monthlyPayment?: number;
  totalChitAmount?: number;
  duration?: number;
  startMonth?: string;
  startDate?: string;
  notes?: string;
}

export interface PaymentSchedule {
  id: number;
  chitId: number;
  chitName?: string;
  customerId: number;
  customerName?: string;
  customerCode?: string;
  installmentNo: number;
  dueDate: string;
  expectedAmount: number;
  paidAmount: number;
  pendingAmount: number;
  advanceAmount: number;
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'ADVANCE';
  paidDate?: string;
  overdueDays: number;
}

export interface ChitPayout {
  id: number;
  customerId: number;
  customerName?: string;
  customerCode?: string;
  chitId: number;
  chitName?: string;
  payoutDate: string;
  grossAmount: number;
  deductionAmount: number;
  otherCharges: number;
  netAmount: number;
  paymentMethod: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'OTHER';
  referenceNo?: string;
  notes?: string;
  createdByName?: string;
}

export interface CreatePayoutData {
  customerId: number;
  chitId: number;
  payoutDate: string;
  grossAmount: number;
  deductionAmount: number;
  otherCharges: number;
  paymentMethod: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'OTHER';
  referenceNo?: string;
  notes?: string;
}

export const chitApi = {
  getChits: async (): Promise<Chit[]> => {
    const response = await api.get('/chits');
    return response.data.data || [];
  },

  getChitById: async (id: number): Promise<Chit> => {
    const response = await api.get(`/chits/${id}`);
    return response.data.data;
  },

  createChit: async (data: CreateChitData): Promise<Chit> => {
    const response = await api.post('/chits', data);
    return response.data.data;
  },

  getChitSchedule: async (id: number): Promise<PaymentSchedule[]> => {
    const response = await api.get(`/chits/${id}/schedule`);
    return response.data.data || [];
  },

  getPayouts: async (chitId: number): Promise<ChitPayout[]> => {
    const response = await api.get(`/chits/${chitId}/payouts`);
    return response.data.data || [];
  },

  createPayout: async (chitId: number, data: CreatePayoutData): Promise<ChitPayout> => {
    const response = await api.post(`/chits/${chitId}/payout`, data);
    return response.data.data;
  }
};
