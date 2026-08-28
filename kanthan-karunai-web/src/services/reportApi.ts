import api from './api';
import { Payment } from './paymentApi';
import { PaymentSchedule, ChitPayout } from './chitApi';

export interface DashboardSummary {
  totalCustomers: number;
  activeCustomers: number;
  activeChits: number;
  activeLoans: number;
  todayCollection: number;
  todayPending: number;
  weeklyCollection: number;
  monthlyCollection: number;
  totalChitAmount: number;
  totalChitPayout: number;
  pendingAmount: number;
  pendingChitPayments: number;
  pendingLoanPayments: number;
  totalOutstandingLoanAmount: number;
  totalExpenses: number;
  netCashFlow: number;
  todayCollectionList: {
    customerName: string;
    paymentAmount: number;
    paymentMethod: string;
    paymentTime: string;
    receiptNumber: string;
  }[];
  recentPayments?: {
    id: number | string;
    customerId?: number;
    customerName: string;
    paymentType: string;
    amount: number;
    paymentDate: string;
    receiptNo: string;
    paymentMethod: string;
  }[];
  dailyCollectionChart: { label: string; value: number }[];
  monthlyCollectionChart: { label: string; value: number }[];
  paymentFrequencyDistribution: { frequency: string; count: number }[];
}

export interface CustomerStatement {
  customerCode: string;
  name: string;
  mobileNo: string;
  address?: string;
  joinDate: string;
  status: string;
  totalExpected: number;
  totalPaid: number;
  totalPending: number;
  totalAdvance: number;
  totalPayout: number;
  totalDeduction: number;
  netAmountReceived: number;
  netPayoutReceived: number;
  rows: {
    date: string;
    description: string;
    paid?: number;
    payout?: number;
  }[];
}

export const reportApi = {
  getDashboardSummary: async (): Promise<DashboardSummary> => {
    const response = await api.get('/dashboard/summary');
    return response.data.data;
  },

  getCollectionsReport: async (
    startDate?: string,
    endDate?: string,
    frequency?: string,
    customerId?: number
  ): Promise<Payment[]> => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (frequency) params.append('frequency', frequency);
    if (customerId) params.append('customerId', customerId.toString());

    const response = await api.get(`/reports/collections?${params.toString()}`);
    return response.data.data || [];
  },

  getPendingReport: async (
    asOfDate?: string,
    frequency?: string,
    customerId?: number
  ): Promise<PaymentSchedule[]> => {
    const params = new URLSearchParams();
    if (asOfDate) params.append('asOfDate', asOfDate);
    if (frequency) params.append('frequency', frequency);
    if (customerId) params.append('customerId', customerId.toString());

    const response = await api.get(`/reports/pending?${params.toString()}`);
    return response.data.data || [];
  },

  getPayoutsReport: async (
    startDate?: string,
    endDate?: string,
    customerId?: number
  ): Promise<ChitPayout[]> => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (customerId) params.append('customerId', customerId.toString());

    const response = await api.get(`/reports/payouts?${params.toString()}`);
    return response.data.data || [];
  },

  getCustomerStatement: async (customerId: number): Promise<CustomerStatement> => {
    const response = await api.get(`/reports/customer/${customerId}`);
    return response.data.data;
  }
};
