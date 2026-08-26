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
  monthlyBeforeAmountTaken?: number;
  totalChitAmount: number;
  chitAmount?: number;
  duration: number;
  totalMonths?: number;
  startDate: string;
  startMonth?: string;
  endDate: string;

  // Amount Taken / Adjusted Payment Fields
  amountTaken?: number;
  amountTakenMonth?: number;
  amountTakenDate?: string;
  interestRate?: number;
  adjustedMonthlyPayment?: number;
  monthlyAfterAmountTaken?: number;

  // Metrics
  completedMonths?: number;
  remainingMonths?: number;
  currentMonthlyDue?: number;
  remainingCollection?: number;
  totalRemainingCollection?: number;

  totalPaid?: number;
  paidAmount?: number;
  remainingChitAmount?: number;
  remainingAmount?: number;
  expectedTillCurrentMonth?: number;
  pendingChitDue?: number;
  pendingAmount?: number;
  nextPaymentAmount?: number;
  nextPayment?: number;
  nextPaymentMonth?: string;
  nextPaymentDueDate?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  createdAt?: string;
}

export interface CreateChitData {
  customerId: number;
  chitName?: string;
  paymentFrequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  chitAmount?: number;
  totalChitAmount?: number;
  monthlyPayment?: number;
  paymentAmount?: number;
  duration?: number;
  startMonth?: string;
  startDate?: string;
  notes?: string;
}

export interface RecordAmountTakenData {
  chitId?: number;
  amountTaken: number;
  amountTakenMonth: number;
  amountTakenDate?: string;
  interestRate?: number;
}

export interface AmountTakenPreview {
  chitId: number;
  chitAmount: number;
  duration: number;
  monthlyPayment: number;
  amountTaken: number;
  amountTakenMonth: number;
  interestRate: number;
  monthlyInterestAmount: number;
  adjustedMonthlyPayment: number;
  completedMonths: number;
  remainingMonths: number;
  remainingCollection: number;
}

export interface PendingChitDueItem {
  chitId: number;
  customerId: number;
  customerName: string;
  customerCode: string;
  customerMobile: string;
  chitAmount: number;
  duration: number;
  monthlyBeforeAmountTaken: number;
  amountTaken?: number;
  amountTakenMonth?: number;
  completedMonths: number;
  remainingMonths: number;
  monthlyAfterAmountTaken?: number;
  currentMonthlyDue: number;
  pendingChitDue: number;
  nextPayment: number;
  status: string;
}

export interface PaymentSchedule {
  id: number;
  chitId: number;
  chitName?: string;
  customerId: number;
  customerName?: string;
  customerCode?: string;
  customerMobile?: string;
  installmentNo: number;
  dueDate: string;
  dueMonth?: string;
  expectedAmount: number;
  normalDue: number;
  interestPortion: number;
  amountTakenInfo?: string;
  finalMonthlyDue: number;
  paidAmount: number;
  pendingAmount: number;
  advanceAmount: number;
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'ADVANCE';
  statusText?: string;
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

  recordAmountTaken: async (chitId: number, data: RecordAmountTakenData): Promise<Chit> => {
    const response = await api.post(`/chits/${chitId}/amount-taken`, data);
    return response.data.data;
  },

  previewAmountTaken: async (chitId: number, amountTaken: number, amountTakenMonth: number, interestRate: number = 1.0): Promise<AmountTakenPreview> => {
    const response = await api.post(`/chits/${chitId}/preview-amount-taken?amountTaken=${amountTaken}&amountTakenMonth=${amountTakenMonth}&interestRate=${interestRate}`);
    return response.data.data;
  },

  getPendingChitDues: async (query?: string): Promise<PendingChitDueItem[]> => {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    const response = await api.get(`/chits/pending-dues?${params.toString()}`);
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
