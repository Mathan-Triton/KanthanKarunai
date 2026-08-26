import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, IndianRupee, MessageSquare, X } from 'lucide-react';
import { loansApi } from '../../api/loansApi';
import { CustomerLoan, LoanRepaymentSchedule } from '../../types/loan';
import { formatCurrency, formatDate } from '../../utils/formatters';

const STATUS_COLORS: Record<string, string> = {
  PAID: '#10b981', PARTIAL: '#f59e0b', PENDING: '#ef4444',
  OVERDUE: '#ef4444', ADVANCE: '#6366f1'
};

// Build WhatsApp message for loan completion
function buildCompletionMessage(loan: CustomerLoan): string {
  return encodeURIComponent(
    `🎉 *Loan Fully Cleared!*\n\n` +
    `Dear *${loan.customerName}*,\n\n` +
    `Congratulations! Your loan *${loan.loanNumber}* has been fully paid.\n\n` +
    `✅ Total Paid: ₹${loan.totalPaid.toLocaleString('en-IN')}\n` +
    `📅 Cleared on: ${new Date().toLocaleDateString('en-IN')}\n\n` +
    `Thank you for your prompt repayments.\n\n` +
    `— *Kanthan Karunai Chit Fund* 🙏`
  );
}

export default function LoanDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loan, setLoan] = useState<CustomerLoan | null>(null);
  const [schedule, setSchedule] = useState<LoanRepaymentSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  // Payment form
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Completion celebration state
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  const fetchLoanData = async () => {
    try {
      setLoading(true);
      if (!id) return;
      const loanRes = await loansApi.getLoanById(parseInt(id));
      setLoan(loanRes.data);
      const scheduleRes = await loansApi.getLoanSchedule(parseInt(id));
      setSchedule(scheduleRes.data);
    } catch (err) {
      console.error('Failed to fetch loan details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLoanData(); }, [id]);

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loan) return;

    setIsSubmitting(true);
    setError('');

    try {
      // Convert date string to UTC ISO without shifting
      const [yyyy, mm, dd] = paymentDate.split('-').map(Number);
      // Use UTC date to avoid DateTimeKind.Unspecified errors in Npgsql
      const paymentDateUtc = new Date(Date.UTC(yyyy, mm - 1, dd, 0, 0, 0)).toISOString();

      await loansApi.collectPayment({
        loanId: loan.id,
        paymentDate: paymentDateUtc,
        amount: parseFloat(paymentAmount),
        paymentMethod,
        notes: paymentNotes
      });

      setPaymentAmount('');
      setPaymentNotes('');
      await fetchLoanData();

      // Check if loan is now completed
      const refreshed = await loansApi.getLoanById(loan.id);
      if (refreshed.data.status === 'COMPLETED' || refreshed.data.remainingAmount <= 0) {
        setShowCompletionModal(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to process payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <div style={{ width: '36px', height: '36px', border: '3px solid rgba(251,191,36,0.1)', borderTopColor: 'var(--accent-gold)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!loan) return <div style={{ padding: '3rem', textAlign: 'center' }}>Loan not found.</div>;

  const progress = Math.min(100, loan.totalRecoverable > 0 ? (loan.totalPaid / loan.totalRecoverable) * 100 : 0);
  const isCompleted = loan.status === 'COMPLETED';

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <button className="btn btn-secondary btn-icon" onClick={() => navigate('/loans')}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{loan.loanNumber}</h1>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.3rem 0.85rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700,
              background: isCompleted ? 'rgba(99,102,241,0.1)' : 'rgba(16,185,129,0.1)',
              color: isCompleted ? '#6366f1' : '#10b981'
            }}>
              {isCompleted ? <CheckCircle2 size={13} /> : <Clock size={13} />}
              {loan.status}
            </div>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {loan.customerName} · {loan.customerCode} · {loan.repaymentFrequency}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            {[
              { label: 'Total Recoverable', value: formatCurrency(loan.totalRecoverable), color: 'var(--accent-gold)', icon: IndianRupee },
              { label: 'Total Paid', value: formatCurrency(loan.totalPaid), color: '#10b981', icon: CheckCircle2 },
              { label: 'Remaining', value: formatCurrency(loan.remainingAmount), color: loan.remainingAmount > 0 ? '#ef4444' : '#10b981', icon: Clock },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={20} style={{ color: s.color }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Progress */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontWeight: 600 }}>Repayment Progress</span>
              <span style={{ fontWeight: 700, color: progress >= 100 ? '#10b981' : 'var(--accent-gold)' }}>{progress.toFixed(1)}%</span>
            </div>
            <div style={{ width: '100%', height: '10px', background: 'var(--bg-secondary)', borderRadius: '5px', overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: progress >= 100 ? 'linear-gradient(90deg,#10b981,#34d399)' : 'linear-gradient(90deg,var(--accent-gold),#f59e0b)', transition: 'width 0.5s ease-out', borderRadius: '5px' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>Paid: {formatCurrency(loan.totalPaid)}</span>
              <span>Total: {formatCurrency(loan.totalRecoverable)}</span>
            </div>
          </div>

          {/* Schedule Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', fontWeight: 700 }}>
              Repayment Schedule — {schedule.length} installments
            </div>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Due Date</th>
                    <th>Expected</th>
                    <th>Paid</th>
                    <th>Pending</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map(s => {
                    const color = STATUS_COLORS[s.status] || 'var(--text-secondary)';
                    return (
                      <tr key={s.id}>
                        <td><span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>#{s.installmentNo}</span></td>
                        <td>{formatDate(s.dueDate)}</td>
                        <td>{formatCurrency(s.expectedAmount)}</td>
                        <td style={{ color: '#10b981', fontWeight: 600 }}>{formatCurrency(s.paidAmount)}</td>
                        <td style={{ color: s.pendingAmount > 0 ? '#ef4444' : 'var(--text-muted)', fontWeight: s.pendingAmount > 0 ? 600 : 400 }}>
                          {formatCurrency(s.pendingAmount)}
                        </td>
                        <td>
                          <span style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '999px', background: `${color}18`, color, fontWeight: 700, fontSize: '0.72rem' }}>
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Collect Payment Sidebar */}
        {!isCompleted ? (
          <div className="card" style={{ position: 'sticky', top: '1.5rem', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <IndianRupee size={18} style={{ color: 'var(--accent-gold)' }} />
              Collect Payment
            </div>
            <form onSubmit={handlePaymentSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {error && (
                <div style={{ padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.08)', color: '#ef4444', borderRadius: '8px', fontSize: '0.85rem', border: '1px solid rgba(239,68,68,0.2)' }}>
                  ⚠ {error}
                </div>
              )}

              {/* Quick fill buttons */}
              <div style={{ background: 'rgba(251,191,36,0.05)', borderRadius: '8px', padding: '0.75rem', border: '1px dashed rgba(251,191,36,0.3)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Outstanding</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ef4444' }}>{formatCurrency(loan.remainingAmount)}</div>
                <button type="button" onClick={() => setPaymentAmount(String(loan.remainingAmount))}
                  style={{ marginTop: '0.5rem', fontSize: '0.75rem', background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', color: 'var(--accent-gold)', borderRadius: '6px', padding: '0.3rem 0.75rem', cursor: 'pointer', fontWeight: 600 }}>
                  Pay Full Amount
                </button>
                {loan.installmentAmount > 0 && (
                  <button type="button" onClick={() => setPaymentAmount(String(loan.installmentAmount))}
                    style={{ marginTop: '0.5rem', marginLeft: '0.5rem', fontSize: '0.75rem', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', color: '#6366f1', borderRadius: '6px', padding: '0.3rem 0.75rem', cursor: 'pointer', fontWeight: 600 }}>
                    One Installment
                  </button>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Amount (₹) *</label>
                <input type="number" className="form-control" step="0.01" min="1" required
                  value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount..." />
              </div>

              <div className="form-group">
                <label className="form-label">Payment Date *</label>
                <input type="date" className="form-control" required
                  value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Payment Mode</label>
                <select className="form-control" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                  <option value="CASH">💵 Cash</option>
                  <option value="UPI">📱 UPI</option>
                  <option value="BANK_TRANSFER">🏦 Bank Transfer</option>
                  <option value="OTHER">📋 Other</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Notes</label>
                <input type="text" className="form-control" value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)} placeholder="Optional..." />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.85rem' }} disabled={isSubmitting}>
                {isSubmitting ? '⏳ Processing...' : '💳 Record Payment'}
              </button>
            </form>
          </div>
        ) : (
          <div className="card" style={{ padding: '2rem', textAlign: 'center', background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(16,185,129,0.05))' }}>
            <CheckCircle2 size={48} style={{ color: '#10b981', margin: '0 auto 1rem' }} />
            <h3 style={{ fontWeight: 800, marginBottom: '0.5rem', color: '#10b981' }}>Loan Completed!</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              All installments have been fully paid.
            </p>
            <button className="btn btn-primary" onClick={() => setShowCompletionModal(true)} style={{ width: '100%' }}>
              <MessageSquare size={16} /> Send Completion Message
            </button>
          </div>
        )}
      </div>

      {/* 🎉 Loan Completion WhatsApp Modal */}
      {showCompletionModal && loan && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '460px', padding: '2.5rem', textAlign: 'center', position: 'relative', background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(99,102,241,0.05) 100%)' }}>
            <button onClick={() => setShowCompletionModal(false)}
              style={{ position: 'absolute', right: '1.25rem', top: '1.25rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>

            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.5rem', color: '#10b981' }}>Loan Cleared!</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.75rem', fontSize: '0.9rem' }}>
              <strong style={{ color: 'var(--text-primary)' }}>{loan.customerName}</strong> has completed all loan repayments.
              <br />Loan <strong style={{ color: 'var(--accent-gold)' }}>{loan.loanNumber}</strong> — {formatCurrency(loan.totalPaid)} fully paid.
            </p>

            <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem', textAlign: 'left' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Message Preview
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.6, fontFamily: 'monospace', whiteSpace: 'pre-line' }}>
                {`🎉 Loan Fully Cleared!\n\nDear ${loan.customerName},\n\nYour loan ${loan.loanNumber} has been fully paid.\n\n✅ Total Paid: ${formatCurrency(loan.totalPaid)}\n📅 Cleared on: ${new Date().toLocaleDateString('en-IN')}\n\nThank you! — Kanthan Karunai 🙏`}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <a
                href={`https://wa.me/?text=${buildCompletionMessage(loan)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#25d366', color: '#fff', borderRadius: '10px', padding: '0.9rem', fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none', border: 'none', cursor: 'pointer' }}
              >
                <MessageSquare size={18} /> Send via WhatsApp
              </a>
              <button onClick={() => setShowCompletionModal(false)} className="btn btn-secondary" style={{ width: '100%' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
