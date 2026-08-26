import api from './api';

export interface Customer {
  id: number;
  customerCode: string;
  name: string;
  mobileNo: string;
  alternativeMobile?: string;
  address?: string;
  city?: string;
  aadhaarNumber?: string;
  joinDate: string;
  status: string;
  isActive?: boolean;
  activeChitCount: number;
  pendingAmount: number;
  temporaryPassword?: string;
}

export interface CreateCustomerData {
  name: string;
  mobileNo: string;
  alternativeMobile?: string;
  address?: string;
  city?: string;
  aadhaarNumber?: string;
  joinDate: string;
  createUserAccount?: boolean;
  userPassword?: string;
  
  // Chit generation params
  chitName?: string;
  paymentFrequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  paymentAmount?: number;
  totalChitAmount?: number;
  duration?: number;
  startDate?: string;
  chitNotes?: string;
}

export interface UpdateCustomerData {
  name: string;
  mobileNo: string;
  alternativeMobile?: string;
  address?: string;
  city?: string;
  aadhaarNumber?: string;
  joinDate: string;
  status: string;
}

export interface CustomerSummaryPaymentItem {
  installmentNo: number;
  monthName: string;
  dueDate: string;
  expected: number;
  paid: number;
  pending: number;
  status: string;
  isAmountTakenMonth: boolean;
  amountTaken?: number;
}

export interface CustomerSummary {
  customerId: number;
  customerCode: string;
  name: string;
  mobileNo: string;
  alternativeMobile?: string;
  address?: string;
  city?: string;
  aadhaarNumber?: string;
  joinDate: string;
  status: string;

  // Chit Summary
  chitId?: number;
  chitName?: string;
  chitAmount: number;
  amountTaken?: number;
  amountTakenMonth?: number;
  amountTakenDate?: string;
  originalMonthlyPayment: number;
  currentMonthlyPayment: number;

  // Separated Payments
  paidThisMonth: number;
  pendingThisMonth: number;
  totalPaidAmount: number;
  currentPendingAmount: number;

  duration: number;
  completedMonths: number;
  remainingMonths: number;
  remainingCollection: number;

  // Payment History
  paymentHistory: CustomerSummaryPaymentItem[];
}

export const customerApi = {
  getCustomers: async (query?: string, status?: string, frequency?: string): Promise<Customer[]> => {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (status) params.append('status', status);
    if (frequency) params.append('frequency', frequency);

    const response = await api.get(`/customers?${params.toString()}`);
    return response.data.data || [];
  },

  getAllCustomers: async (): Promise<{ data: Customer[] }> => {
    const response = await api.get('/customers');
    return { data: response.data.data || [] };
  },

  getCustomerById: async (id: number): Promise<Customer> => {
    const response = await api.get(`/customers/${id}`);
    return response.data.data;
  },

  getCustomerSummary: async (id: number): Promise<CustomerSummary> => {
    const response = await api.get(`/customers/${id}/summary`);
    return response.data.data;
  },

  createCustomer: async (data: CreateCustomerData): Promise<Customer> => {
    const response = await api.post('/customers', data);
    return response.data.data;
  },

  updateCustomer: async (id: number, data: UpdateCustomerData): Promise<Customer> => {
    const response = await api.put(`/customers/${id}`, data);
    return response.data.data;
  },

  deleteCustomer: async (id: number): Promise<void> => {
    await api.delete(`/customers/${id}`);
  }
};


