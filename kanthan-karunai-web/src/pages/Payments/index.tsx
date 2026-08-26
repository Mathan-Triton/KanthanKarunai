import React, { useEffect, useState } from 'react';
import { paymentApi, Payment, CustomerPendingSummary } from '../../services/paymentApi';
import { authApi } from '../../services/authApi';
import { Printer, Plus, X, CreditCard, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pendingSummaries, setPendingSummaries] = useState<CustomerPendingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeReceipt, setActiveReceipt] = useState<Payment | null>(null);

  // Make Payment Modal State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [selectedChitId, setSelectedChitId] = useState<number | undefined>(undefined);
  const [paymentMonth, setPaymentMonth] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER' | 'OTHER'>('CASH');
  const [remarks, setRemarks] = useState('');
  const [allowDuplicate, setAllowDuplicate] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentUser = authApi.getCurrentUser();
  const role = currentUser?.role?.toLowerCase() || '';
  const canCollect = role === 'admin' || role === 'staff';

  const fetchData = async () => {
    try {
      setLoading(true);
      const [paymentsData, summariesData] = await Promise.all([
        paymentApi.getPayments(),
        paymentApi.getPendingSummary()
      ]);
      setPayments(paymentsData);
      setPendingSummaries(summariesData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenPayModal = (presetSummary?: CustomerPendingSummary) => {
    setError(null);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('CASH');
    setRemarks('');
    setAllowDuplicate(false);

    if (presetSummary) {
      setSelectedCustomerId(presetSummary.customerId);
      setSelectedChitId(presetSummary.chitId);
      setPaymentMonth(presetSummary.currentPendingMonth || new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }));
      setAmount(presetSummary.monthlyPayment.toString());
    } else if (pendingSummaries.length > 0) {
      const first = pendingSummaries[0];
      setSelectedCustomerId(first.customerId);
      setSelectedChitId(first.chitId);
      setPaymentMonth(first.currentPendingMonth || new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }));
      setAmount(first.monthlyPayment.toString());
    } else {
      setSelectedCustomerId('');
      setSelectedChitId(undefined);
      setPaymentMonth('');
      setAmount('');
    }

    setIsPayModalOpen(true);
  };

  const handleCustomerChange = (custVal: number) => {
    setSelectedCustomerId(custVal);
    const summary = pendingSummaries.find(s => s.customerId === custVal);
    if (summary) {
      setSelectedChitId(summary.chitId);
      setPaymentMonth(summary.currentPendingMonth || new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }));
      setAmount(summary.monthlyPayment.toString());
    }
  };

  const selectedSummary = pendingSummaries.find(s => s.customerId === Number(selectedCustomerId));

  const handleMakePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !amount || parseFloat(amount) <= 0) {
      setError('Please select a customer and enter a valid payment amount.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const recordedPayment = await paymentApi.createPayment({
        customerId: Number(selectedCustomerId),
        chitId: selectedChitId,
        paymentMonth: paymentMonth.trim() || undefined,
        amount: parseFloat(amount),
        paymentDate: new Date(paymentDate).toISOString(),
        paymentMethod,
        remarks: remarks.trim() || undefined,
        notes: remarks.trim() || undefined,
        allowDuplicate
      });

      setIsPayModalOpen(false);
      setActiveReceipt(recordedPayment);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to record payment.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatRupee = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amt);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
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
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '0.25rem' }}>Payments Ledger</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Record monthly chit payments, generate official receipts, and send SMS notifications</p>
        </div>
        {canCollect && (
          <button className="btn btn-primary" onClick={() => handleOpenPayModal()}>
            <Plus size={18} /> Make Payment
          </button>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{
              display: 'inline-block',
              width: '32px',
              height: '32px',
              border: '3px solid rgba(251, 191, 36, 0.1)',
              borderTopColor: 'var(--accent-gold)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          </div>
        ) : payments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            No payment receipts found. Click <strong>Make Payment</strong> to record a payment.
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Payment Date</th>
                  <th>Customer Name</th>
                  <th>Chit Group</th>
                  <th>Payment Month</th>
                  <th>Amount Paid</th>
                  <th>Method</th>
                  <th>Receipt Number</th>
                  <th>Collected By</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
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
                    <td style={{ fontWeight: 600 }}>{p.chitName || 'General'}</td>
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
                    <td>{p.collectedByName || 'System'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="btn btn-secondary btn-icon"
                        onClick={() => setActiveReceipt(p)}
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

      {/* MAKE PAYMENT MODAL */}
      {isPayModalOpen && (
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
          <div className="card fade-in" style={{ width: '100%', maxWidth: '600px', padding: '2.5rem', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <button 
              style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              onClick={() => setIsPayModalOpen(false)}
            >
              <X size={20} />
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <CreditCard style={{ color: 'var(--accent-gold)' }} />
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Make Monthly Chit Payment</h2>
            </div>

            {error && (
              <div style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid var(--error)', color: '#fb7185', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleMakePayment}>
              <div className="form-group">
                <label className="form-label">Select Customer *</label>
                {pendingSummaries.length === 0 ? (
                  <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                    No active customers with chits available.
                  </div>
                ) : (
                  <select 
                    className="form-control" 
                    value={selectedCustomerId} 
                    onChange={(e) => handleCustomerChange(Number(e.target.value))}
                    required
                  >
                    {pendingSummaries.map(s => (
                      <option key={s.customerId} value={s.customerId}>
                        {s.customerName} ({s.customerCode}) - Monthly ₹{s.monthlyPayment.toLocaleString('en-IN')}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Customer Pending Overview Card */}
              {selectedSummary && (
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
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Customer Name</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{selectedSummary.customerName}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Monthly Payment</span>
                    <strong style={{ color: 'var(--accent-gold)' }}>{formatRupee(selectedSummary.monthlyPayment)}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Pending Month</span>
                    <strong style={{ color: '#fbbf24' }}>{selectedSummary.currentPendingMonth || 'All Clear'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Pending Balance</span>
                    <strong style={{ color: 'var(--error)' }}>{formatRupee(selectedSummary.totalPendingAmount)}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Total Paid</span>
                    <strong style={{ color: 'var(--success)' }}>{formatRupee(selectedSummary.totalPaidAmount)}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Status</span>
                    <span className="badge badge-advance">{selectedSummary.paymentStatus}</span>
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
                    onChange={(e) => setPaymentMonth(e.target.value)} 
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
                    onChange={(e) => setAmount(e.target.value)} 
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
                    onChange={(e) => setPaymentDate(e.target.value)} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Method *</label>
                  <select 
                    className="form-control" 
                    value={paymentMethod} 
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Remarks (Optional)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Paid via PhonePe reference ID 992211"
                  value={remarks} 
                  onChange={(e) => setRemarks(e.target.value)} 
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <input 
                  type="checkbox" 
                  id="dupAllow"
                  checked={allowDuplicate} 
                  onChange={(e) => setAllowDuplicate(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--accent-gold)' }}
                />
                <label htmlFor="dupAllow" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  Allow duplicate payment for this month if already paid
                </label>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsPayModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting || pendingSummaries.length === 0}>
                  {submitting ? 'Recording Payment...' : 'Confirm & Collect Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE OFFICIAL RECEIPT OVERLAY */}
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
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>KANTHAN KARUNAI CHIT FUND</h2>
              <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.15em', marginTop: '0.25rem' }}>OFFICIAL MONTHLY PAYMENT RECEIPT</p>
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
                <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Chit Subscription</span>
                <strong style={{ color: '#0f172a' }}>{activeReceipt.chitName || 'Monthly Chit'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Payment Month</span>
                <strong style={{ color: '#d97706' }}>{activeReceipt.paymentMonth || 'Current Month'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Payment Method</span>
                <strong style={{ color: '#0f172a' }}>{activeReceipt.paymentMethod}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>SMS Notification</span>
                <span style={{ color: '#10b981', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <CheckCircle2 size={14} /> Sent via Firebase
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
