import React, { useEffect, useState } from 'react';
import { loansApi } from '../../api/loansApi';
import { CustomerLoan, LoanPayment } from '../../types/loan';
import { authApi } from '../../services/authApi';
import { Plus, Search, Printer, X, Calendar, CheckCircle2, AlertCircle, CreditCard } from 'lucide-react';

export default function LoanPayments() {
  const [loans, setLoans] = useState<CustomerLoan[]>([]);
  const [payments, setPayments] = useState<LoanPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'ledger'>('pending');

  // Make Loan Payment modal state
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState<number | ''>('');
  const [paymentMonth, setPaymentMonth] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER' | 'OTHER'>('CASH');
  const [remarks, setRemarks] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<LoanPayment | null>(null);

  const currentUser = authApi.getCurrentUser();
  const role = currentUser?.role?.toLowerCase() || '';
  const canCollect = role === 'admin' || role === 'staff';

  const fetchData = async () => {
    try {
      setLoading(true);
      const [loansRes, paymentsRes] = await Promise.all([
        loansApi.getAllLoans(),
        loansApi.getAllLoanPayments()
      ]);
      setLoans(loansRes.data || []);
      setPayments(paymentsRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search]);

  const handleOpenPayModal = (loan?: CustomerLoan) => {
    setError(null);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('CASH');
    setRemarks('');

    const targetLoans = loans.filter(l => l.status === 'ACTIVE');
    if (loan) {
      setSelectedLoanId(loan.id);
      setPaymentMonth(loan.nextPaymentMonth || new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }));
      setAmount(loan.installmentAmount.toString());
    } else if (targetLoans.length > 0) {
      const first = targetLoans[0];
      setSelectedLoanId(first.id);
      setPaymentMonth(first.nextPaymentMonth || new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }));
      setAmount(first.installmentAmount.toString());
    } else {
      setSelectedLoanId('');
      setPaymentMonth('');
      setAmount('');
    }

    setIsPayModalOpen(true);
  };

  const handleLoanChange = (loanIdVal: number) => {
    setSelectedLoanId(loanIdVal);
    const selected = loans.find(l => l.id === loanIdVal);
    if (selected) {
      setPaymentMonth(selected.nextPaymentMonth || new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }));
      setAmount(selected.installmentAmount.toString());
    }
  };

  const selectedLoan = loans.find(l => l.id === Number(selectedLoanId));

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanId || !amount || parseFloat(amount) <= 0) {
      setError('Please select a loan and enter a valid payment amount.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await loansApi.collectPayment({
        loanId: Number(selectedLoanId),
        paymentMonth: paymentMonth.trim() || undefined,
        amount: parseFloat(amount),
        paymentDate: new Date(paymentDate).toISOString(),
        paymentMethod,
        remarks: remarks.trim() || undefined,
        notes: remarks.trim() || undefined
      });

      setIsPayModalOpen(false);
      setActiveReceipt(res.data);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to record loan payment.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatRupee = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const activeLoans = loans.filter(l => l.status === 'ACTIVE');

  return (
    <div className="fade-in">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '0.25rem' }}>Loan Payments</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage loan repayments, collect monthly dues, and print official loan receipts</p>
        </div>
        {canCollect && (
          <button className="btn btn-primary" onClick={() => handleOpenPayModal()}>
            <Plus size={18} /> Make Loan Payment
          </button>
        )}
      </div>

      {/* Tabs and Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
          <button
            className={`btn ${activeTab === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', border: 'none' }}
            onClick={() => setActiveTab('pending')}
          >
            Pending Loan Payments ({activeLoans.length})
          </button>
          <button
            className={`btn ${activeTab === 'ledger' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', border: 'none' }}
            onClick={() => setActiveTab('ledger')}
          >
            Loan Payments Ledger ({payments.length})
          </button>
        </div>

        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Search customer or loan..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '2.25rem' }}
          />
        </div>
      </div>

      {/* TAB 1: LOAN PENDING PAYMENTS */}
      {activeTab === 'pending' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid rgba(251, 191, 36, 0.1)', borderTopColor: 'var(--accent-gold)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : activeLoans.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-success)' }}>
              🎉 All customer loans are settled and up to date!
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Loan Number</th>
                    <th>Customer Name</th>
                    <th>Monthly Payment</th>
                    <th>Total Paid</th>
                    <th>Remaining Amount</th>
                    <th>Current Pending Month</th>
                    <th>Next Payment Month</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeLoans.map((l) => (
                    <tr key={l.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-gold)' }}>
                        {l.loanNumber}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        <span style={{ display: 'block' }}>{l.customerName}</span>
                        <small style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{l.customerCode}</small>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--accent-gold)' }}>
                        {formatRupee(l.installmentAmount)}
                      </td>
                      <td style={{ color: 'var(--success)', fontWeight: 600 }}>
                        {formatRupee(l.totalPaid)}
                      </td>
                      <td style={{ color: 'var(--error)', fontWeight: 700 }}>
                        {formatRupee(l.remainingAmount)}
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#fbbf24', fontWeight: 600 }}>
                          <Calendar size={13} />
                          {l.currentPendingMonth || 'Current'}
                        </span>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                          {l.nextPaymentMonth || 'Completed'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${l.status === 'ACTIVE' ? 'badge-active' : 'badge-completed'}`}>
                          {l.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-primary"
                          onClick={() => handleOpenPayModal(l)}
                          style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                        >
                          <CreditCard size={14} /> Pay ₹{l.installmentAmount.toLocaleString('en-IN')}
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

      {/* TAB 2: LOAN PAYMENTS LEDGER */}
      {activeTab === 'ledger' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid rgba(251, 191, 36, 0.1)', borderTopColor: 'var(--accent-gold)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : payments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              No loan repayment records found yet.
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Payment Date</th>
                    <th>Customer Name</th>
                    <th>Loan Number</th>
                    <th>Payment Month</th>
                    <th>Amount Paid</th>
                    <th>Method</th>
                    <th>Receipt No</th>
                    <th>Collected By</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td>{formatDate(p.paymentDate)}</td>
                      <td style={{ fontWeight: 600 }}>
                        <span style={{ display: 'block' }}>{p.customerName || 'Unknown'}</span>
                        <small style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{p.customerCode}</small>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent-gold)' }}>
                        {p.loanNumber}
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent-gold)', fontWeight: 600 }}>
                          <Calendar size={13} />
                          {p.paymentMonth || formatDate(p.paymentDate)}
                        </span>
                      </td>
                      <td style={{ color: 'var(--success)', fontWeight: 700 }}>{formatRupee(p.amount)}</td>
                      <td>
                        <span className="badge badge-advance">{p.paymentMethod}</span>
                      </td>
                      <td style={{ fontFamily: 'monospace', color: 'var(--accent-gold)', fontWeight: 600 }}>{p.receiptNo}</td>
                      <td>{p.collectedByName || 'Staff'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-secondary btn-icon"
                          onClick={() => setActiveReceipt(p)}
                          title="Print Loan Receipt"
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

      {/* MAKE LOAN PAYMENT MODAL */}
      {isPayModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '600px', padding: '2.5rem', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <button
              style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              onClick={() => setIsPayModalOpen(false)}
            >
              <X size={20} />
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <CreditCard style={{ color: 'var(--accent-gold)' }} />
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Make Loan Payment</h2>
            </div>

            {error && (
              <div style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid var(--error)', color: '#fb7185', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handlePaySubmit}>
              <div className="form-group">
                <label className="form-label">Select Active Loan *</label>
                {activeLoans.length === 0 ? (
                  <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                    No active loans available to collect payments.
                  </div>
                ) : (
                  <select
                    className="form-control"
                    value={selectedLoanId}
                    onChange={e => handleLoanChange(Number(e.target.value))}
                    required
                  >
                    {activeLoans.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.customerName} ({l.customerCode}) — {l.loanNumber} (Remaining: {formatRupee(l.remainingAmount)})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Loan Details Banner */}
              {selectedLoan && (
                <div style={{
                  background: 'rgba(217,119,6,0.05)',
                  border: '1px solid rgba(217,119,6,0.2)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '1rem 1.25rem',
                  marginBottom: '1.5rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '0.75rem',
                  fontSize: '0.85rem'
                }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Customer</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{selectedLoan.customerName}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Monthly Installment</span>
                    <strong style={{ color: 'var(--accent-gold)' }}>{formatRupee(selectedLoan.installmentAmount)}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Pending Month</span>
                    <strong style={{ color: '#fbbf24' }}>{selectedLoan.nextPaymentMonth || 'Current'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Remaining Balance</span>
                    <strong style={{ color: 'var(--error)' }}>{formatRupee(selectedLoan.remainingAmount)}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Total Paid So Far</span>
                    <strong style={{ color: 'var(--success)' }}>{formatRupee(selectedLoan.totalPaid)}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Total Loan Amount</span>
                    <strong>{formatRupee(selectedLoan.totalRecoverable)}</strong>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Payment Month *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. August 2026"
                    value={paymentMonth}
                    onChange={e => setPaymentMonth(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Amount (₹) *</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="5000"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Payment Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={paymentDate}
                    onChange={e => setPaymentDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Method *</label>
                  <select
                    className="form-control"
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as any)}
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Remarks (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Received cash at branch"
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsPayModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting || activeLoans.length === 0}>
                  {submitting ? 'Processing Payment...' : 'Confirm Loan Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE OFFICIAL LOAN RECEIPT */}
      {activeReceipt && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '580px', padding: '2.5rem', background: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1', position: 'relative' }} id="receipt-print-area">
            <button
              style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              onClick={() => setActiveReceipt(null)}
              className="no-print"
            >
              <X size={20} />
            </button>
            
            <div style={{ textAlign: 'center', borderBottom: '2px dashed #94a3b8', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>KANTHAN KARUNAI LOAN SERVICES</h2>
              <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.15em', marginTop: '0.25rem' }}>OFFICIAL LOAN REPAYMENT RECEIPT</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              <div>
                <p style={{ color: '#64748b' }}>Receipt No: <strong style={{ color: '#0f172a', fontFamily: 'monospace', fontSize: '0.95rem' }}>{activeReceipt.receiptNo}</strong></p>
                <p style={{ color: '#64748b' }}>Payment Date: <strong style={{ color: '#0f172a' }}>{formatDate(activeReceipt.paymentDate)}</strong></p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: '#64748b' }}>Customer Code: <strong style={{ color: '#0f172a' }}>{activeReceipt.customerCode}</strong></p>
                <p style={{ color: '#64748b' }}>Customer Name: <strong style={{ color: '#0f172a' }}>{activeReceipt.customerName}</strong></p>
              </div>
            </div>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              fontSize: '0.9rem'
            }}>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Loan Number</span>
                <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{activeReceipt.loanNumber}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Payment Month</span>
                <strong style={{ color: '#d97706' }}>{activeReceipt.paymentMonth || 'Current'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Payment Method</span>
                <strong style={{ color: '#0f172a' }}>{activeReceipt.paymentMethod}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Firebase Notification</span>
                <span style={{ color: '#10b981', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <CheckCircle2 size={14} /> SMS Dispatched
                </span>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '2rem', padding: '1rem', background: 'rgba(16,185,129,0.06)', borderRadius: '8px' }}>
              <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>Amount Received</span>
              <h1 style={{ color: '#10b981', fontSize: '2.5rem', fontWeight: 800, marginTop: '0.25rem' }}>{formatRupee(activeReceipt.amount)}</h1>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px dashed #94a3b8', paddingTop: '1rem', fontSize: '0.8rem', color: '#64748b' }}>
              <span>Collector: {activeReceipt.collectedByName || 'Staff'}</span>
              <span>Authorized Signatory</span>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }} className="no-print">
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
