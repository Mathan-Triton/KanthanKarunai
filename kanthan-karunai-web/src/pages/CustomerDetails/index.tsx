import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { customerApi, Customer, CustomerSummary } from '../../services/customerApi';
import { chitApi, Chit, PaymentSchedule, ChitPayout } from '../../services/chitApi';
import { paymentApi, Payment } from '../../services/paymentApi';
import { loansApi } from '../../api/loansApi';
import { CustomerLoan, LoanPayment } from '../../types/loan';
import { reportApi, CustomerStatement } from '../../services/reportApi';
import { 
  User, 
  CalendarRange, 
  Receipt, 
  Award, 
  FileSpreadsheet, 
  Plus, 
  Printer, 
  X,
  IndianRupee,
  CreditCard,
  Coins
} from 'lucide-react';

export default function CustomerDetails() {
  const { id } = useParams<{ id: string }>();
  const customerId = parseInt(id || '0');

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [summary, setSummary] = useState<CustomerSummary | null>(null);
  const [chits, setChits] = useState<Chit[]>([]);
  const [loans, setLoans] = useState<CustomerLoan[]>([]);
  const [schedules, setSchedules] = useState<PaymentSchedule[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loanPayments, setLoanPayments] = useState<LoanPayment[]>([]);
  const [payouts, setPayouts] = useState<ChitPayout[]>([]);
  const [statement, setStatement] = useState<CustomerStatement | null>(null);
  
  const [activeTab, setActiveTab] = useState<'overview' | 'chits' | 'loans' | 'payments' | 'schedule' | 'payouts' | 'statement'>('overview');
  const [loading, setLoading] = useState(true);

  // Modal Control
  const [isAddChitOpen, setIsAddChitOpen] = useState(false);
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields: Create Chit
  const [chitPaymentAmount, setChitPaymentAmount] = useState<number>(5000);
  const [duration, setDuration] = useState<number>(20);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  // Form Fields: Add Payment
  const [paymentChitId, setPaymentChitId] = useState<number>(0);
  const [paymentMonthVal, setPaymentMonthVal] = useState<string>('');
  const [paymentAmountVal, setPaymentAmountVal] = useState<number>(5000);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER' | 'OTHER'>('CASH');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  // Loaded Receipt details for print
  const [activeReceipt, setActiveReceipt] = useState<any>(null);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const cust = await customerApi.getCustomerById(customerId);
      setCustomer(cust);

      const [allChits, payHistory, custLoans, custLoanPays, stmt, custSummary] = await Promise.all([
        chitApi.getChits(),
        paymentApi.getCustomerPayments(customerId),
        loansApi.getCustomerLoans(customerId),
        loansApi.getCustomerLoanPayments(customerId),
        reportApi.getCustomerStatement(customerId).catch(() => null),
        customerApi.getCustomerSummary(customerId).catch(() => null)
      ]);

      const customerChits = allChits.filter(c => c.customerId === customerId);
      setChits(customerChits);
      setLoans(custLoans.data || []);
      setPayments(payHistory);
      setLoanPayments(custLoanPays.data || []);
      setStatement(stmt);
      setSummary(custSummary);

      if (customerChits.length > 0) {
        const activeChit = customerChits[0];
        setPaymentChitId(activeChit.id);
        setPaymentAmountVal(activeChit.paymentAmount);
        setPaymentMonthVal(activeChit.nextPaymentMonth || new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }));

        const scheds = await chitApi.getChitSchedule(activeChit.id);
        setSchedules(scheds);

        const winPayouts = await chitApi.getPayouts(activeChit.id);
        setPayouts(winPayouts);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [customerId]);

  const handleChitChangeForSchedule = async (chitId: number) => {
    try {
      const scheds = await chitApi.getChitSchedule(chitId);
      setSchedules(scheds);
      const winPayouts = await chitApi.getPayouts(chitId);
      setPayouts(winPayouts);
      
      const targetChit = chits.find(c => c.id === chitId);
      if (targetChit) {
        setPaymentChitId(chitId);
        setPaymentAmountVal(targetChit.paymentAmount);
        setPaymentMonthVal(targetChit.nextPaymentMonth || new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateChit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const totalAmount = chitPaymentAmount * duration;
      await chitApi.createChit({
        customerId,
        chitName: `${customer?.name} - ₹${chitPaymentAmount.toLocaleString('en-IN')} Chit`,
        paymentFrequency: 'MONTHLY',
        paymentAmount: chitPaymentAmount,
        monthlyPayment: chitPaymentAmount,
        totalChitAmount: totalAmount,
        duration,
        startDate: new Date(startDate).toISOString(),
        startMonth: new Date(startDate).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
      });
      setIsAddChitOpen(false);
      loadAllData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Failed to create chit.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const recordedPayment = await paymentApi.createPayment({
        customerId,
        chitId: paymentChitId,
        paymentMonth: paymentMonthVal,
        amount: paymentAmountVal,
        paymentMethod,
        notes: paymentNotes || undefined,
        remarks: paymentNotes || undefined,
        paymentDate: new Date(paymentDate).toISOString()
      });
      setIsAddPaymentOpen(false);
      loadAllData();
      setActiveReceipt(recordedPayment);
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Failed to record payment.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatRupee = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  if (loading || !customer) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid rgba(251, 191, 36, 0.1)',
          borderTopColor: 'var(--accent-gold)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      </div>
    );
  }

  // Unified Payment history (Chits + Loans)
  const unifiedHistory = [
    ...payments.map(p => ({
      id: `CHIT-${p.id}`,
      type: 'CHIT',
      date: p.paymentDate,
      reference: p.chitName || 'Monthly Chit',
      month: p.paymentMonth || formatDate(p.paymentDate),
      amount: p.amount,
      method: p.paymentMethod,
      receiptNo: p.receiptNo,
      collectedBy: p.collectedByName || 'Staff',
      raw: p
    })),
    ...loanPayments.map(lp => ({
      id: `LOAN-${lp.id}`,
      type: 'LOAN',
      date: lp.paymentDate,
      reference: lp.loanNumber || 'Customer Loan',
      month: lp.paymentMonth || formatDate(lp.paymentDate),
      amount: lp.amount,
      method: lp.paymentMethod,
      receiptNo: lp.receiptNo,
      collectedBy: lp.collectedByName || 'Staff',
      raw: lp
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const activeChit = chits.find(c => c.status === 'ACTIVE');
  const activeLoanCount = loans.filter(l => l.status === 'ACTIVE').length;
  const totalLoanOutstanding = loans.filter(l => l.status === 'ACTIVE').reduce((sum, l) => sum + l.remainingAmount, 0);

  return (
    <div className="fade-in">
      {/* Header Profile Info */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--accent-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#000',
            fontWeight: 800,
            fontSize: '1.75rem'
          }}>
            {customer.name.charAt(0)}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>{customer.name}</h1>
              <span className={`badge ${customer.status === 'ACTIVE' ? 'badge-active' : 'badge-overdue'}`}>
                {customer.status}
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)' }}>
              Code: <strong style={{ color: 'var(--accent-gold)' }}>{customer.customerCode}</strong> | Mobile: {customer.mobileNo}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => setIsAddChitOpen(true)}>
            <Plus size={16} /> Add Chit
          </button>
          {activeChit && (
            <button className="btn btn-primary" onClick={() => setIsAddPaymentOpen(true)}>
              <IndianRupee size={16} /> Collect Chit Payment
            </button>
          )}
        </div>
      </div>

      {/* Financial Metrics Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '3px solid var(--accent-gold)' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Active Chits</p>
          <h4 style={{ fontSize: '1.25rem', marginTop: '0.25rem', color: 'var(--accent-gold)' }}>{chits.filter(c => c.status === 'ACTIVE').length} Active</h4>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '3px solid #10b981' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Total Chit Paid</p>
          <h4 style={{ fontSize: '1.25rem', marginTop: '0.25rem', color: 'var(--success)' }}>{formatRupee(payments.reduce((s, p) => s + p.amount, 0))}</h4>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '3px solid #ef4444' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Chit Pending Amount</p>
          <h4 style={{ fontSize: '1.25rem', marginTop: '0.25rem', color: 'var(--error)' }}>{formatRupee(chits.reduce((s, c) => s + (c.pendingAmount || 0), 0))}</h4>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '3px solid #6366f1' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Active Loans</p>
          <h4 style={{ fontSize: '1.25rem', marginTop: '0.25rem', color: '#818cf8' }}>{activeLoanCount} Loans</h4>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '3px solid #f59e0b' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Loan Outstanding</p>
          <h4 style={{ fontSize: '1.25rem', marginTop: '0.25rem', color: '#f59e0b' }}>{formatRupee(totalLoanOutstanding)}</h4>
        </div>
      </div>

      {/* Tabs Menu */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border)',
        marginBottom: '2rem',
        gap: '2rem',
        overflowX: 'auto'
      }}>
        {[
          { id: 'overview', label: 'Customer Overview', icon: User },
          { id: 'chits', label: `Chit Subscriptions (${chits.length})`, icon: CalendarRange },
          { id: 'loans', label: `Loans (${loans.length})`, icon: Coins },
          { id: 'payments', label: `Unified Payments (${unifiedHistory.length})`, icon: Receipt },
          { id: 'schedule', label: 'Chit Schedule', icon: CalendarRange },
          { id: 'payouts', label: 'Payouts', icon: Award },
          { id: 'statement', label: 'Ledger Statement', icon: FileSpreadsheet }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                paddingBottom: '1rem',
                border: 'none',
                background: 'none',
                color: isActive ? 'var(--accent-gold)' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.95rem',
                borderBottom: isActive ? '2px solid var(--accent-gold)' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENTS */}
      <div className="fade-in">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
            {/* Customer Profile Card */}
            <div className="card">
              <h3 style={{ fontSize: '1.15rem', marginBottom: '1.25rem', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={18} style={{ color: 'var(--accent-gold)' }} />
                Customer Information
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
                <div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Customer Name</span>
                  <strong>{customer.name}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Customer Code</span>
                  <strong style={{ fontFamily: 'monospace', color: 'var(--accent-gold)' }}>{customer.customerCode}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Mobile Number</span>
                  <strong>{customer.mobileNo}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Aadhaar Number</span>
                  {customer.aadhaarNumber ? (
                    <strong style={{ fontFamily: 'monospace', color: 'var(--accent-gold)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <CreditCard size={14} />
                      {customer.aadhaarNumber.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3')}
                    </strong>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>Not Provided</span>
                  )}
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Address</span>
                  <strong style={{ lineHeight: 1.4 }}>{customer.address ? `${customer.address}${customer.city ? `, ${customer.city}` : ''}` : 'N/A'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Joined Date</span>
                  <strong>{formatDate(customer.joinDate)}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Status</span>
                  <span className={`badge ${customer.status === 'ACTIVE' ? 'badge-active' : 'badge-overdue'}`}>{customer.status}</span>
                </div>
              </div>
            </div>

            {/* Customer Summary & Chit Information */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Chit Summary Card */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CalendarRange size={18} style={{ color: 'var(--accent-gold)' }} />
                    Chit Information & Summary
                  </h3>
                  {activeChit && (
                    <span className="badge badge-active" style={{ fontSize: '0.8rem' }}>
                      {activeChit.chitName}
                    </span>
                  )}
                </div>

                {!activeChit && !summary?.chitAmount ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No active chit package found for this customer.</p>
                ) : (
                  <div>
                    {/* Metrics Grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '1rem',
                      marginBottom: '1.5rem'
                    }}>
                      {/* Chit Package Amount */}
                      <div style={{ padding: '0.875rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Chit Package Amount</span>
                        <strong style={{ fontSize: '1.15rem', color: 'var(--accent-gold)' }}>
                          {formatRupee(summary?.chitAmount || activeChit?.totalChitAmount || 0)}
                        </strong>
                      </div>

                      {/* Amount Taken (Completely Separate from Paid Amount) */}
                      <div style={{ padding: '0.875rem', background: 'rgba(147, 51, 234, 0.06)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(147, 51, 234, 0.25)' }}>
                        <span style={{ fontSize: '0.75rem', color: '#c084fc', display: 'block', fontWeight: 600 }}>Amount Taken</span>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                          <strong style={{ fontSize: '1.15rem', color: '#c084fc' }}>
                            {summary?.amountTaken ? formatRupee(summary.amountTaken) : (activeChit?.amountTaken ? formatRupee(activeChit.amountTaken) : '₹0')}
                          </strong>
                          {(summary?.amountTakenMonth || activeChit?.amountTakenMonth) && (
                            <span style={{ fontSize: '0.75rem', color: '#e9d5ff' }}>
                              (Month {summary?.amountTakenMonth || activeChit?.amountTakenMonth})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Original Monthly Payment */}
                      <div style={{ padding: '0.875rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Original Monthly Payment</span>
                        <strong style={{ fontSize: '1.15rem', color: 'var(--text-primary)' }}>
                          {formatRupee(summary?.originalMonthlyPayment || activeChit?.paymentAmount || 5000)}
                        </strong>
                      </div>

                      {/* Current Monthly Payment */}
                      <div style={{ padding: '0.875rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Current Monthly Payment</span>
                        <strong style={{ fontSize: '1.15rem', color: (summary?.amountTaken || activeChit?.amountTaken) ? 'var(--error)' : 'var(--text-primary)' }}>
                          {formatRupee(summary?.currentMonthlyPayment || activeChit?.adjustedMonthlyPayment || activeChit?.paymentAmount || 6000)}
                        </strong>
                      </div>

                      {/* Paid This Month */}
                      <div style={{ padding: '0.875rem', background: 'rgba(16,185,129,0.06)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16,185,129,0.2)' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--success)', display: 'block' }}>Paid This Month</span>
                        <strong style={{ fontSize: '1.15rem', color: 'var(--success)' }}>
                          {formatRupee(summary?.paidThisMonth || 0)}
                        </strong>
                      </div>

                      {/* Current Month Pending */}
                      <div style={{ padding: '0.875rem', background: 'rgba(239,68,68,0.06)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239,68,68,0.2)' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--error)', display: 'block' }}>Pending This Month</span>
                        <strong style={{ fontSize: '1.15rem', color: 'var(--error)' }}>
                          {formatRupee(summary?.pendingThisMonth || 0)}
                        </strong>
                      </div>

                      {/* Total Paid Amount (SUM of actual successful payments) */}
                      <div style={{ padding: '0.875rem', background: 'rgba(16,185,129,0.06)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16,185,129,0.2)' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--success)', display: 'block' }}>Total Paid (All Months)</span>
                        <strong style={{ fontSize: '1.15rem', color: 'var(--success)' }}>
                          {formatRupee(summary?.totalPaidAmount ?? payments.filter(p => p.chitId === activeChit?.id).reduce((s, p) => s + p.amount, 0))}
                        </strong>
                      </div>

                      {/* Total Pending / Remaining Collection */}
                      <div style={{ padding: '0.875rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>
                          Remaining ({summary?.remainingMonths ?? 16} Months Left)
                        </span>
                        <strong style={{ fontSize: '1.15rem', color: 'var(--accent-gold)' }}>
                          {formatRupee(summary?.remainingCollection || (summary?.remainingMonths ? summary.remainingMonths * (summary?.currentMonthlyPayment || 6000) : 0))}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Customer Summary Payment History Table */}
              {summary && summary.paymentHistory && summary.paymentHistory.length > 0 && (
                <div className="card">
                  <h3 style={{ fontSize: '1.15rem', marginBottom: '1.25rem', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Receipt size={18} style={{ color: 'var(--accent-gold)' }} />
                    Payment History Breakdown
                  </h3>
                  <div className="table-container" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                    <table className="table" style={{ fontSize: '0.9rem' }}>
                      <thead>
                        <tr>
                          <th>Month</th>
                          <th style={{ textAlign: 'right' }}>Expected</th>
                          <th style={{ textAlign: 'right' }}>Paid</th>
                          <th style={{ textAlign: 'right' }}>Pending</th>
                          <th style={{ textAlign: 'center' }}>Amount Taken</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.paymentHistory.map((ph) => {
                          const isPaid = ph.status === 'PAID';
                          const isPartial = ph.status === 'PARTIAL';
                          return (
                            <tr key={ph.installmentNo} style={{ background: ph.isAmountTakenMonth ? 'rgba(147, 51, 234, 0.05)' : undefined }}>
                              <td style={{ fontWeight: 700 }}>
                                {ph.monthName}
                                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  {formatDate(ph.dueDate)}
                                </span>
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {formatRupee(ph.expected)}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 600, color: ph.paid > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                                {formatRupee(ph.paid)}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 700, color: ph.pending > 0 ? 'var(--error)' : 'var(--text-muted)' }}>
                                {formatRupee(ph.pending)}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                {ph.isAmountTakenMonth ? (
                                  <span className="badge" style={{ background: 'rgba(147, 51, 234, 0.2)', color: '#c084fc', fontWeight: 700 }}>
                                    {formatRupee(ph.amountTaken || summary.amountTaken || 0)} Taken
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>-</span>
                                )}
                              </td>
                              <td>
                                <span className={`badge ${isPaid ? 'badge-active' : (isPartial ? 'badge-pending' : 'badge-overdue')}`}>
                                  {ph.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Active Loans Card */}
              {loans.length > 0 && (
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Coins size={18} style={{ color: '#818cf8' }} />
                      Active Loans
                    </h3>
                    <button className="btn btn-secondary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }} onClick={() => setActiveTab('loans')}>
                      View All
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {loans.map(l => (
                      <div key={l.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: 'monospace', color: '#818cf8' }}>{l.loanNumber}</h4>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Principal: {formatRupee(l.loanAmount)} | Monthly: {formatRupee(l.installmentAmount)}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--error)', fontWeight: 700 }}>Remaining: {formatRupee(l.remainingAmount)}</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--success)' }}>Paid: {formatRupee(l.totalPaid)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CHITS TAB */}
        {activeTab === 'chits' && (
          <div className="card">
            <h3 style={{ fontSize: '1.15rem', marginBottom: '1.25rem', fontFamily: 'var(--font-display)' }}>Chit Subscriptions</h3>
            {chits.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No chits registered.</p>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Chit Name</th>
                      <th>Monthly Payment</th>
                      <th>Start Month</th>
                      <th>Paid Amount</th>
                      <th>Pending Amount</th>
                      <th>Next Payment Month</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chits.map(c => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 700, color: 'var(--accent-gold)' }}>{c.chitName}</td>
                        <td style={{ fontWeight: 600 }}>{formatRupee(c.monthlyPayment || c.paymentAmount)}</td>
                        <td>{c.startMonth || formatDate(c.startDate)}</td>
                        <td style={{ color: 'var(--success)', fontWeight: 600 }}>{formatRupee(c.paidAmount || 0)}</td>
                        <td style={{ color: (c.pendingAmount || 0) > 0 ? 'var(--error)' : 'var(--text-muted)', fontWeight: 600 }}>{formatRupee(c.pendingAmount || 0)}</td>
                        <td style={{ color: '#fbbf24', fontWeight: 600 }}>{c.nextPaymentMonth || 'Completed'}</td>
                        <td>
                          <span className={`badge badge-${c.status.toLowerCase()}`}>{c.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* LOANS TAB */}
        {activeTab === 'loans' && (
          <div className="card">
            <h3 style={{ fontSize: '1.15rem', marginBottom: '1.25rem', fontFamily: 'var(--font-display)' }}>Customer Loans</h3>
            {loans.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No loans registered for this customer.</p>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Loan Number</th>
                      <th>Principal Amount</th>
                      <th>Interest Amount</th>
                      <th>Total Loan Amount</th>
                      <th>Monthly Payment</th>
                      <th>Total Paid</th>
                      <th>Remaining Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loans.map(l => (
                      <tr key={l.id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#818cf8' }}>{l.loanNumber}</td>
                        <td>{formatRupee(l.loanAmount)}</td>
                        <td>{formatRupee(l.interestAmount)}</td>
                        <td style={{ fontWeight: 700, color: 'var(--accent-gold)' }}>{formatRupee(l.totalRecoverable)}</td>
                        <td>{formatRupee(l.installmentAmount)}</td>
                        <td style={{ color: 'var(--success)', fontWeight: 600 }}>{formatRupee(l.totalPaid)}</td>
                        <td style={{ color: 'var(--error)', fontWeight: 700 }}>{formatRupee(l.remainingAmount)}</td>
                        <td>
                          <span className={`badge ${l.status === 'ACTIVE' ? 'badge-active' : 'badge-completed'}`}>{l.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* UNIFIED PAYMENTS TAB */}
        {activeTab === 'payments' && (
          <div className="card">
            <h3 style={{ fontSize: '1.15rem', marginBottom: '1.25rem', fontFamily: 'var(--font-display)' }}>Complete Payment History (Chits & Loans)</h3>
            {unifiedHistory.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No transaction history recorded.</p>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Category</th>
                      <th>Reference / Group</th>
                      <th>Payment Month</th>
                      <th>Amount Paid</th>
                      <th>Method</th>
                      <th>Receipt Number</th>
                      <th>Collected By</th>
                      <th style={{ textAlign: 'right' }}>Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unifiedHistory.map((item) => (
                      <tr key={item.id}>
                        <td>{formatDate(item.date)}</td>
                        <td>
                          <span className={`badge ${item.type === 'CHIT' ? 'badge-active' : 'badge-advance'}`}>
                            {item.type === 'CHIT' ? 'CHIT' : 'LOAN'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{item.reference}</td>
                        <td style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>{item.month}</td>
                        <td style={{ color: 'var(--success)', fontWeight: 700 }}>{formatRupee(item.amount)}</td>
                        <td>{item.method}</td>
                        <td style={{ fontFamily: 'monospace', color: 'var(--accent-gold)' }}>{item.receiptNo}</td>
                        <td>{item.collectedBy}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-secondary btn-icon"
                            onClick={() => setActiveReceipt(item.raw)}
                            title="Print Official Receipt"
                          >
                            <Printer size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* SCHEDULE TAB */}
        {activeTab === 'schedule' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-display)' }}>Installment Breakdown</h3>
              {chits.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Select Chit:</span>
                  <select 
                    className="form-control" 
                    style={{ width: 'auto', padding: '0.4rem 1rem' }}
                    onChange={(e) => handleChitChangeForSchedule(parseInt(e.target.value))}
                  >
                    {chits.map(c => <option key={c.id} value={c.id}>{c.chitName}</option>)}
                  </select>
                </div>
              )}
            </div>

            {schedules.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No active schedules generated.</p>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Inst No</th>
                      <th>Due Date</th>
                      <th>Expected Amount</th>
                      <th>Paid Amount</th>
                      <th>Pending Amount</th>
                      <th>Advance Amount</th>
                      <th>Status</th>
                      <th>Paid Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.map(s => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 600 }}>{s.installmentNo}</td>
                        <td>{formatDate(s.dueDate)}</td>
                        <td>{formatRupee(s.expectedAmount)}</td>
                        <td style={{ color: 'var(--success)' }}>{formatRupee(s.paidAmount)}</td>
                        <td style={{ color: s.pendingAmount > 0 ? 'var(--error)' : 'var(--text-primary)' }}>{formatRupee(s.pendingAmount)}</td>
                        <td style={{ color: 'var(--info)' }}>{formatRupee(s.advanceAmount)}</td>
                        <td>
                          <span className={`badge badge-${s.status.toLowerCase()}`}>{s.status}</span>
                        </td>
                        <td>{s.paidDate ? formatDate(s.paidDate) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* PAYOUTS TAB */}
        {activeTab === 'payouts' && (
          <div className="card">
            <h3 style={{ fontSize: '1.15rem', marginBottom: '1.25rem', fontFamily: 'var(--font-display)' }}>Chit Winner Payouts</h3>
            {payouts.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No payouts recorded for this customer.</p>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Payout Date</th>
                      <th>Gross Amount</th>
                      <th>Deduction</th>
                      <th>Other Charges</th>
                      <th>Net Payout</th>
                      <th>Method</th>
                      <th>Reference No</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map(po => (
                      <tr key={po.id}>
                        <td>{formatDate(po.payoutDate)}</td>
                        <td>{formatRupee(po.grossAmount)}</td>
                        <td style={{ color: 'var(--error)' }}>{formatRupee(po.deductionAmount)}</td>
                        <td style={{ color: 'var(--error)' }}>{formatRupee(po.otherCharges)}</td>
                        <td style={{ color: 'var(--text-gold)', fontWeight: 700 }}>{formatRupee(po.netAmount)}</td>
                        <td>{po.paymentMethod}</td>
                        <td style={{ fontFamily: 'monospace' }}>{po.referenceNo || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* STATEMENT TAB */}
        {activeTab === 'statement' && statement && (
          <div className="card" style={{ background: '#fff', color: '#1e293b', border: '1px solid #e2e8f0' }} id="printable-statement">
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #334155', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>KANTHAN KARUNAI CHIT FUND</h2>
                <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, letterSpacing: '0.05em' }}>LEDGER ACCOUNT STATEMENT</p>
              </div>
              <div>
                <button className="btn btn-secondary" onClick={() => window.print()} style={{ color: '#1e293b', borderColor: '#cbd5e1', padding: '0.4rem 1rem' }}>
                  <Printer size={14} /> Print Statement
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', fontSize: '0.875rem', marginBottom: '2rem' }}>
              <div>
                <p style={{ color: '#64748b' }}>Customer Code: <strong style={{ color: '#0f172a' }}>{statement.customerCode}</strong></p>
                <p style={{ color: '#64748b' }}>Customer Name: <strong style={{ color: '#0f172a' }}>{statement.name}</strong></p>
                <p style={{ color: '#64748b' }}>Mobile: <strong style={{ color: '#0f172a' }}>{statement.mobileNo}</strong></p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: '#64748b' }}>Join Date: <strong style={{ color: '#0f172a' }}>{formatDate(statement.joinDate)}</strong></p>
                <p style={{ color: '#64748b' }}>Status: <strong style={{ color: '#0f172a' }}>{statement.status}</strong></p>
                <p style={{ color: '#64748b' }}>Address: <strong style={{ color: '#0f172a' }}>{statement.address || 'N/A'}</strong></p>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '2rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #475569', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem 0.5rem', color: '#334155' }}>Date</th>
                  <th style={{ padding: '0.75rem 0.5rem', color: '#334155' }}>Description</th>
                  <th style={{ padding: '0.75rem 0.5rem', color: '#10b981', textAlign: 'right' }}>Paid (Receipts)</th>
                  <th style={{ padding: '0.75rem 0.5rem', color: '#ea580c', textAlign: 'right' }}>Payouts (Net)</th>
                </tr>
              </thead>
              <tbody>
                {statement.rows.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.75rem 0.5rem' }}>{formatDate(row.date)}</td>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 500 }}>{row.description}</td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', color: '#10b981', fontWeight: 600 }}>
                      {row.paid ? formatRupee(row.paid) : '-'}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', color: '#ea580c', fontWeight: 600 }}>
                      {row.payout ? formatRupee(row.payout) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SUBSCRIBE TO CHIT MODAL */}
      {isAddChitOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '540px', padding: '2rem', position: 'relative', margin: 'auto' }}>
            <button style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setIsAddChitOpen(false)}>
              <X size={20} />
            </button>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Subscribe to Chit</h2>
            
            {formError && <div style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid var(--error)', color: '#fb7185', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.875rem' }}>{formError}</div>}

            <form onSubmit={handleCreateChit}>
              <div className="form-group">
                <label className="form-label">Monthly Payment Amount (₹) *</label>
                <input type="number" className="form-control" value={chitPaymentAmount} onChange={(e) => setChitPaymentAmount(parseInt(e.target.value))} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label">Duration (Months) *</label>
                  <input type="number" className="form-control" value={duration} onChange={(e) => setDuration(parseInt(e.target.value))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Start Date *</label>
                  <input type="date" className="form-control" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddChitOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Creating...' : 'Enroll in Chit'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COLLECT PAYMENT MODAL */}
      {isAddPaymentOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '540px', padding: '2rem', position: 'relative', margin: 'auto' }}>
            <button style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setIsAddPaymentOpen(false)}>
              <X size={20} />
            </button>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Collect Chit Payment</h2>
            
            {formError && <div style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid var(--error)', color: '#fb7185', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.875rem' }}>{formError}</div>}

            <form onSubmit={handleCreatePayment}>
              <div className="form-group">
                <label className="form-label">Chit Group</label>
                <select className="form-control" value={paymentChitId} onChange={(e) => handleChitChangeForSchedule(parseInt(e.target.value))}>
                  {chits.map(c => <option key={c.id} value={c.id}>{c.chitName} (Monthly: {formatRupee(c.paymentAmount)})</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Payment Month *</label>
                  <input type="text" className="form-control" value={paymentMonthVal} onChange={(e) => setPaymentMonthVal(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Amount (₹) *</label>
                  <input type="number" className="form-control" value={paymentAmountVal} onChange={(e) => setPaymentAmountVal(parseInt(e.target.value))} required />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Payment Date</label>
                  <input type="date" className="form-control" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Method</label>
                  <select className="form-control" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)}>
                    <option value="CASH">CASH</option>
                    <option value="UPI">UPI</option>
                    <option value="BANK_TRANSFER">BANK TRANSFER</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Notes (Optional)</label>
                <input type="text" className="form-control" value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddPaymentOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Recording...' : 'Record Payment'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE RECEIPT */}
      {activeReceipt && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '580px', padding: '2rem', background: '#fff', color: '#1e293b', border: '1px solid #cbd5e1', position: 'relative' }} id="receipt-print-area">
            <button style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }} onClick={() => setActiveReceipt(null)} className="no-print">
              <X size={20} />
            </button>
            <div style={{ textAlign: 'center', borderBottom: '2px dashed #94a3b8', paddingBottom: '1rem', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>KANTHAN KARUNAI</h2>
              <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, letterSpacing: '0.1em' }}>PAYMENT RECEIPT</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '1rem' }}>
              <div>
                <p>Receipt No: <strong>{activeReceipt.receiptNo}</strong></p>
                <p>Date: <strong>{formatDate(activeReceipt.paymentDate)}</strong></p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p>Customer: <strong>{activeReceipt.customerName || customer.name}</strong></p>
                <p>Month: <strong>{activeReceipt.paymentMonth || 'Monthly'}</strong></p>
              </div>
            </div>
            <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(16,185,129,0.08)', borderRadius: '6px', marginBottom: '1.5rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Amount Received</span>
              <h1 style={{ color: '#10b981', fontSize: '2.25rem', fontWeight: 800 }}>{formatRupee(activeReceipt.amount)}</h1>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }} className="no-print">
              <button className="btn btn-secondary" onClick={() => setActiveReceipt(null)} style={{ color: '#1e293b', borderColor: '#cbd5e1' }}>Close</button>
              <button className="btn btn-primary" onClick={() => window.print()}>
                <Printer size={16} /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
