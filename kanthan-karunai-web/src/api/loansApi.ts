import api from '../services/api';
import { CustomerLoan, CreateLoanRequest, LoanRepaymentSchedule, CreateLoanPaymentRequest, LoanPayment } from '../types/loan';
import { ApiResponse } from '../types/api';

export const loansApi = {
  // Loans - baseURL is already '/api', so paths must NOT start with /api
  getAllLoans: async (): Promise<ApiResponse<CustomerLoan[]>> => {
    const response = await api.get('/loans');
    return response.data;
  },

  getLoanById: async (id: number): Promise<ApiResponse<CustomerLoan>> => {
    const response = await api.get(`/loans/${id}`);
    return response.data;
  },

  createLoan: async (data: CreateLoanRequest): Promise<ApiResponse<CustomerLoan>> => {
    const response = await api.post('/loans', data);
    return response.data;
  },

  updateLoan: async (id: number, data: { status: string; notes?: string }): Promise<ApiResponse<CustomerLoan>> => {
    const response = await api.put(`/loans/${id}`, data);
    return response.data;
  },

  getCustomerLoans: async (customerId: number): Promise<ApiResponse<CustomerLoan[]>> => {
    const response = await api.get(`/customers/${customerId}/loans`).catch(async () => {
      // Fallback
      const res = await api.get('/loans');
      if (res.data?.data) {
        return {
          ...res.data,
          data: res.data.data.filter((l: CustomerLoan) => l.customerId === customerId)
        };
      }
      return res.data;
    });
    return response.data;
  },

  getPendingLoans: async (query?: string): Promise<ApiResponse<LoanRepaymentSchedule[]>> => {
    const params = query ? { query } : {};
    const response = await api.get('/loanpayments/pending', { params }).catch(async () => {
      return await api.get('/loans/pending', { params });
    });
    return response.data;
  },

  getLoanSchedule: async (id: number): Promise<ApiResponse<LoanRepaymentSchedule[]>> => {
    const response = await api.get(`/loans/${id}/schedule`);
    return response.data;
  },

  // Loan Payments
  getAllLoanPayments: async (): Promise<ApiResponse<LoanPayment[]>> => {
    const response = await api.get('/loanpayments');
    return response.data;
  },

  getLoanPaymentById: async (id: number): Promise<ApiResponse<LoanPayment>> => {
    const response = await api.get(`/loanpayments/${id}`);
    return response.data;
  },

  getCustomerLoanPayments: async (customerId: number): Promise<ApiResponse<LoanPayment[]>> => {
    const response = await api.get(`/loanpayments/customer/${customerId}`);
    return response.data;
  },

  collectPayment: async (data: CreateLoanPaymentRequest): Promise<ApiResponse<LoanPayment>> => {
    const response = await api.post('/loanpayments', data);
    return response.data;
  }
};
