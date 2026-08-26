export interface CustomerLoan {
  id: number;
  customerId: number;
  customerName?: string;
  customerCode?: string;
  customerMobile?: string;
  loanNumber: string;
  loanDate: string;
  startMonth?: string;
  principalAmount?: number;
  loanAmount: number;
  interestAmount: number;
  serviceCharge: number;
  otherCharges: number;
  totalLoanAmount?: number;
  totalRecoverable: number;
  repaymentFrequency: string;
  monthlyPayment?: number;
  installmentAmount: number;
  numberOfInstallments: number;
  numberOfMonths?: number;
  firstDueDate: string;
  totalPaid: number;
  totalPending: number;
  remainingAmount: number;
  pendingAmount?: number;
  currentPendingMonth?: string;
  nextPaymentMonth?: string;
  nextPaymentDueDate?: string;
  status: string;
  loanStatusText?: string;
  notes?: string;
  createdAt: string;
}

export interface CreateLoanRequest {
  customerId: number;
  principalAmount?: number;
  loanAmount?: number;
  interestAmount?: number;
  serviceCharge?: number;
  otherCharges?: number;
  repaymentFrequency?: string;
  monthlyPaymentAmount?: number;
  installmentAmount?: number;
  loanStartMonth?: string;
  loanDate?: string;
  firstDueDate?: string;
  notes?: string;
}

export interface LoanRepaymentSchedule {
  id: number;
  loanId: number;
  loanNumber?: string;
  customerId: number;
  customerName?: string;
  customerCode?: string;
  customerMobile?: string;
  installmentNo: number;
  dueDate: string;
  dueMonth?: string;
  expectedAmount: number;
  paidAmount: number;
  pendingAmount: number;
  advanceAmount: number;
  status: string;
  statusText?: string;
  paidDate?: string;
  overdueDays: number;
}

export interface CreateLoanPaymentRequest {
  loanId: number;
  customerId?: number;
  paymentMonth?: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  notes?: string;
  remarks?: string;
}

export interface LoanPayment {
  id: number;
  loanId: number;
  loanNumber?: string;
  customerId: number;
  customerName?: string;
  customerCode?: string;
  customerMobile?: string;
  scheduleId: number;
  installmentNo: number;
  paymentDate: string;
  paymentMonth?: string;
  amount: number;
  paymentMethod: string;
  receiptNo: string;
  notes?: string;
  remarks?: string;
  collectedBy: number;
  collectedByName?: string;
  createdAt: string;
}

