import React, { useEffect, useState } from 'react';
import { paymentApi, CustomerPendingSummary } from '../../services/paymentApi';
import { PaymentSchedule } from '../../services/chitApi';
import { Search, Clock, Calendar, CheckCircle2, AlertTriangle, CreditCard, ChevronDown, ChevronRight, X, Printer } from 'lucide-react';

export default function PendingPayments() {
  const [viewMode, setViewMode] = useState<'customers' | 'installments'>('customers');
  const [summaries, setSummaries] = useState<CustomerPendingSummary[]>([]);
  const [installments, setInstallments] = useState<PaymentSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedCustomerId, setExpandedCustomerId] = useState<number | null>(null);

  // Quick Pay Modal State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payCustomer, setPayCustomer] = useState<CustomerPendingSummary | null>(null);
  const [payMonth, setPayMonth] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payMethod, setPayMethod] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER' | 'OTHER'>('CASH');
  const [payRemarks, setPayRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<any>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sumData, instData] = await Promise.all([
        paymentApi.getPendingSummary(search),
        paymentApi.getPendingPayments(search)
      ]);
      setSummaries(sumData);
      setInstallments(instData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search]);

  const handleOpenPay = (customerSummary: CustomerPendingSummary) => {
    setPayCustomer(customerSummary);
    setPayMonth(customerSummary.currentPendingMonth || new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }));
    setPayAmount(customerSummary.monthlyPayment.toString());
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayMethod('CASH');
    setPayRemarks('');
    setError(null);
    setIsPayModalOpen(true);
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payCustomer || !payAmount || parseFloat(payAmount) <= 0) {
      setError('Please enter a valid payment amount.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const rec = await paymentApi.createPayment({
        customerId: payCustomer.customerId,
        chitId: payCustomer.chitId,
        paymentMonth: payMonth,
        amount: parseFloat(payAmount),
        paymentDate: new Date(payDate).toISOString(),
        paymentMethod: payMethod,
        remarks: payRemarks.trim() || undefined
      });

      setIsPayModalOpen(false);
      fetchData();
      setActiveReceipt(rec);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to record payment.');
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

  const toggleExpand = (customerId: number) => {
    setExpandedCustomerId(prev => prev === customerId ? null : customerId);
  };

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
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '0.25rem' }}>Monthly & Pending Payments</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Track customer monthly payments, upcoming milestones, and overdue balances</p>
        </div>

        {/* View Switcher */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
          <button
            className={`btn ${viewMode === 'customers' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', border: 'none' }}
            onClick={() => setViewMode('customers')}
          >
            Customer Summary
          </button>
          <button
            className={`btn ${viewMode === 'installments' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', border: 'none' }}
            onClick={() => setViewMode('installments')}
          >
            All Pending Due List
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Search by customer name, mobile, or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>
      </div>

      {/* MAIN VIEW */}
      {viewMode === 'customers' ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid rgba(251, 191, 36, 0.1)', borderTopColor: 'var(--accent-gold)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : summaries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              No active customer chit subscriptions found.
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}></th>
                    <th>Customer Name</th>
                    <th>Monthly Payment</th>
                    <th>Paid Amount</th>
                    <th>Pending Balance</th>
                    <th>Current Month Pending</th>
                    <th>Upcoming Month Payment</th>
                    <th>Next Pending Month</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {summaries.map((s) => (
                    <React.Fragment key={s.customerId}>
                      <tr>
                        <td>
                          <button
                            onClick={() => toggleExpand(s.customerId)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            title="Toggle Schedule Timeline"
                          >
                            {expandedCustomerId === s.customerId ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          </button>
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          <span style={{ display: 'block', fontSize: '0.95rem' }}>{s.customerName}</span>
                          <small style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{s.customerCode}</small>
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--accent-gold)' }}>
                          {formatRupee(s.monthlyPayment)}
                        </td>
                        <td style={{ color: 'var(--success)', fontWeight: 600 }}>
                          {formatRupee(s.totalPaidAmount)}
                        </td>
                        <td style={{ color: s.totalPendingAmount > 0 ? 'var(--error)' : 'var(--text-muted)', fontWeight: 600 }}>
                          {formatRupee(s.totalPendingAmount)}
                        </td>
                        <td style={{ color: s.currentMonthPending > 0 ? 'var(--error)' : 'var(--success)', fontWeight: 600 }}>
                          {formatRupee(s.currentMonthPending)}
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>
                          {formatRupee(s.upcomingMonthPayment)}
                        </td>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#fbbf24', fontWeight: 600 }}>
                            <Calendar size={13} />
                            {s.nextPendingMonth || 'All Clear'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${s.paymentStatus === 'Paid' ? 'badge-active' : (s.currentMonthPending > 0 ? 'badge-overdue' : 'badge-pending')}`}>
                            {s.paymentStatus}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-primary"
                            onClick={() => handleOpenPay(s)}
                            style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                          >
                            <CreditCard size={14} /> Pay ₹{s.monthlyPayment.toLocaleString('en-IN')}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Monthly Timeline */}
                      {expandedCustomerId === s.customerId && (
                        <tr>
                          <td colSpan={10} style={{ background: 'rgba(0,0,0,0.2)', padding: '1.25rem 2rem' }}>
                            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Monthly Installment Breakdown for {s.customerName}
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                              {s.schedules.map((sch) => {
                                const isPaid = sch.status === 'PAID';
                                const isPending = sch.status === 'PENDING' || sch.status === 'PARTIAL';
                                const isUpcoming = isPending && new Date(sch.dueDate) > new Date();

                                return (
                                  <div
                                    key={sch.id}
                                    style={{
                                      padding: '0.75rem',
                                      background: isPaid ? 'rgba(16,185,129,0.08)' : (isUpcoming ? 'rgba(255,255,255,0.03)' : 'rgba(239,68,68,0.08)'),
                                      border: `1px solid ${isPaid ? 'rgba(16,185,129,0.2)' : (isUpcoming ? 'var(--border-color)' : 'rgba(239,68,68,0.25)')}`,
                                      borderRadius: '6px'
                                    }}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                                      <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                                        {new Date(sch.dueDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                                      </strong>
                                      {isPaid ? (
                                        <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem', fontWeight: 700 }}>
                                          <CheckCircle2 size={12} /> Paid
                                        </span>
                                      ) : isUpcoming ? (
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                          Upcoming
                                        </span>
                                      ) : (
                                        <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem', fontWeight: 700 }}>
                                          <AlertTriangle size={12} /> Pending
                                        </span>
                                      )}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                                      <span>Inst #{sch.installmentNo}</span>
                                      <strong style={{ color: isPaid ? '#10b981' : 'var(--text-primary)' }}>{formatRupee(sch.expectedAmount)}</strong>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* ALL DUE INSTALLMENTS VIEW */
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid rgba(251, 191, 36, 0.1)', borderTopColor: 'var(--accent-gold)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : installments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-success)' }}>
              No overdue or pending installments. All chit payments are up to date!
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Chit Group</th>
                    <th>Installment No</th>
                    <th>Due Month / Date</th>
                    <th>Expected Amount</th>
                    <th>Paid Amount</th>
                    <th>Pending Amount</th>
                    <th>Overdue Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {installments.map((p, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>
                        <span style={{ display: 'block' }}>{p.customerName}</span>
                        <small style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{p.customerCode}</small>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--accent-gold)' }}>{p.chitName}</td>
                      <td>Inst #{p.installmentNo}</td>
                      <td>{formatDate(p.dueDate)}</td>
                      <td>{formatRupee(p.expectedAmount)}</td>
                      <td style={{ color: 'var(--success)' }}>{formatRupee(p.paidAmount)}</td>
                      <td style={{ color: 'var(--error)', fontWeight: 600 }}>{formatRupee(p.pendingAmount)}</td>
                      <td>
                        {p.overdueDays > 0 ? (
                          <span style={{ color: 'var(--error)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600, fontSize: '0.85rem' }}>
                            <Clock size={12} /> {p.overdueDays} days overdue
                          </span>
                        ) : (
                          <span style={{ color: '#fbbf24', fontSize: '0.85rem' }}>Due this month</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-primary"
                          onClick={() => {
                            const foundSummary = summaries.find(s => s.customerId === p.customerId);
                            if (foundSummary) {
                              handleOpenPay(foundSummary);
                            }
                          }}
                          style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem' }}
                        >
                          Collect Payment
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

      {/* QUICK PAYMENT MODAL */}
      {isPayModalOpen && payCustomer && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '540px', padding: '2.25rem', position: 'relative' }}>
            <button
              style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              onClick={() => setIsPayModalOpen(false)}
            >
              <X size={20} />
            </button>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>Collect Monthly Payment</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Customer: <strong>{payCustomer.customerName}</strong> ({payCustomer.customerCode})
            </p>

            {error && (
              <div style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid var(--error)', color: '#fb7185', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handlePaySubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Payment Month *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. August 2026"
                    value={payMonth}
                    onChange={(e) => setPayMonth(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Amount (₹) *</label>
                  <input
                    type="number"
                    className="form-control"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Payment Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Method</label>
                  <select className="form-control" value={payMethod} onChange={(e) => setPayMethod(e.target.value as any)}>
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Remarks</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Optional remarks"
                  value={payRemarks}
                  onChange={(e) => setPayRemarks(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsPayModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Processing...' : 'Confirm & Collect'}
                </button>
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
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>KANTHAN KARUNAI CHIT FUND</h2>
              <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, letterSpacing: '0.1em' }}>PAYMENT RECEIPT</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '1rem' }}>
              <div>
                <p>Receipt No: <strong>{activeReceipt.receiptNo}</strong></p>
                <p>Date: <strong>{formatDate(activeReceipt.paymentDate)}</strong></p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p>Customer: <strong>{activeReceipt.customerName}</strong></p>
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
