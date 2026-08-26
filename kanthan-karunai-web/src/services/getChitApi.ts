import api from './api';

export interface GetChit {
  id: number;
  customerId: number;
  customerName?: string;
  customerCode?: string;
  customerMobile?: string;
  principalAmount: number;
  interestRate: number; // e.g. 1.0 (1%)
  receivedDate: string;
  outstandingPrincipal: number;
  monthlyInterest: number;
  currentDue: number;
  nextMonthDue: number;
  totalInterestPaid: number;
  totalPrincipalPaid: number;
  totalPaid: number;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  createdByName?: string;
  createdAt: string;
  payments?: GetChitPayment[];
}

export interface CreateGetChitData {
  customerId: number;
  principalAmount: number;
  amountReceived?: number;
  interestRate?: number;
  receivedDate?: string;
  notes?: string;
}

export interface GetChitPayment {
  id: number;
  getChitId: number;
  customerId: number;
  customerName?: string;
  customerCode?: string;
  customerMobile?: string;
  paymentDate: string;
  paymentAmount: number;
  interestAmount: number;
  principalPaidAmount: number;
  remainingPrincipal: number;
  paymentMethod: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'OTHER';
  receiptNo: string;
  remarks?: string;
  collectedByName?: string;
  createdAt: string;
}

export interface RecordGetChitPaymentData {
  customerId: number;
  getChitId: number;
  paymentDate: string;
  paymentAmount: number;
  paymentMethod: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'OTHER';
  remarks?: string;
}

export interface PaymentAllocationPreview {
  getChitId: number;
  paymentAmount: number;
  currentOutstandingPrincipal: number;
  currentMonthlyInterest: number;
  allocatedInterest: number;
  allocatedPrincipal: number;
  newOutstandingPrincipal: number;
  nextMonthInterest: number;
  nextMonthDue: number;
}

export interface CustomerGetChitGroup {
  customerId: number;
  customerName?: string;
  customerCode?: string;
  customerMobile?: string;
  totalOriginalAmount: number;
  totalOutstandingPrincipal: number;
  totalMonthlyInterest: number;
  totalCurrentDue: number;
  totalPaid: number;
  transactionsCount: number;
  transactions: GetChit[];
}

export interface PendingGetChitDue {
  getChitId: number;
  customerId: number;
  customerName?: string;
  customerCode?: string;
  customerMobile?: string;
  originalAmount: number;
  outstandingPrincipal: number;
  currentMonthInterest: number;
  currentDue: number;
  totalPaid: number;
  nextMonthDue: number;
  status: string;
}

export const getChitApi = {
  getGetChits: async (query?: string, status?: string): Promise<GetChit[]> => {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (status) params.append('status', status);
    const response = await api.get(`/getchits?${params.toString()}`);
    return response.data.data || [];
  },

  getGetChitById: async (id: number): Promise<GetChit> => {
    const response = await api.get(`/getchits/${id}`);
    return response.data.data;
  },

  getGroupedByCustomer: async (query?: string): Promise<CustomerGetChitGroup[]> => {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    const response = await api.get(`/getchits/grouped?${params.toString()}`);
    return response.data.data || [];
  },

  getCustomerGetChits: async (customerId: number): Promise<CustomerGetChitGroup> => {
    const response = await api.get(`/getchits/customer/${customerId}`);
    return response.data.data;
  },

  getPendingDues: async (query?: string): Promise<PendingGetChitDue[]> => {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    const response = await api.get(`/getchits/pending-dues?${params.toString()}`);
    return response.data.data || [];
  },

  createGetChit: async (data: CreateGetChitData): Promise<GetChit> => {
    const response = await api.post('/getchits', data);
    return response.data.data;
  },

  recordPayment: async (getChitId: number, data: RecordGetChitPaymentData): Promise<GetChitPayment> => {
    const response = await api.post(`/getchits/${getChitId}/payments`, data);
    return response.data.data;
  },

  previewAllocation: async (getChitId: number, amount: number): Promise<PaymentAllocationPreview> => {
    const response = await api.post(`/getchits/${getChitId}/preview-allocation?amount=${amount}`);
    return response.data.data;
  },

  getPaymentHistory: async (getChitId: number): Promise<GetChitPayment[]> => {
    const response = await api.get(`/getchits/${getChitId}/payments`);
    return response.data.data || [];
  }
};
