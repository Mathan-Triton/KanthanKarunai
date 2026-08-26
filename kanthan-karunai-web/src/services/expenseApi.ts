import api from './api';

export interface Expense {
  id: number;
  expenseDate: string;
  category: 'Office' | 'Travel' | 'Salary' | 'Electricity' | 'Other';
  amount: number;
  paymentMethod: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'OTHER';
  description?: string;
  createdByName?: string;
}

export interface CreateExpenseData {
  expenseDate: string;
  category: 'Office' | 'Travel' | 'Salary' | 'Electricity' | 'Other';
  amount: number;
  paymentMethod: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'OTHER';
  description?: string;
}

export const expenseApi = {
  getExpenses: async (): Promise<Expense[]> => {
    const response = await api.get('/expenses');
    return response.data.data || [];
  },

  createExpense: async (data: CreateExpenseData): Promise<Expense> => {
    const response = await api.post('/expenses', data);
    return response.data.data;
  },

  updateExpense: async (id: number, data: CreateExpenseData): Promise<Expense> => {
    const response = await api.put(`/expenses/${id}`, data);
    return response.data.data;
  },

  deleteExpense: async (id: number): Promise<void> => {
    await api.delete(`/expenses/${id}`);
  }
};
