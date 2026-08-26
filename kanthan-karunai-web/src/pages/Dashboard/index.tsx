import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportApi, DashboardSummary } from '../../services/reportApi';
import { 
  Users, 
  IndianRupee, 
  Clock, 
  TrendingUp, 
  Wallet, 
  Layers, 
  Coins, 
  AlertCircle, 
  Receipt, 
  ArrowRight 
} from 'lucide-react';

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const data = await reportApi.getDashboardSummary();
        setSummary(data);
      } catch (err: any) {
        setError('Failed to load dashboard metrics.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  const formatRupee = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(251, 191, 36, 0.1)',
          borderTopColor: 'var(--accent-gold)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--error)' }}>
        <p>{error || 'Unable to load dashboard.'}</p>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '0.25rem' }}>Dashboard Overview</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Welcome to Kanthan Karunai Customer, Chit & Loan Management System</p>
      </div>

      {/* 9 Core Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2.5rem'
      }}>
        {/* 1: Total Customers */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', cursor: 'pointer' }} onClick={() => navigate('/customers')}>
          <div style={{ padding: '0.875rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: 'var(--radius-md)', color: 'var(--info)' }}>
            <Users size={24} />
          </div>
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Total Customers</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.15rem' }}>
              {summary.totalCustomers} <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 500 }}>({summary.activeCustomers} active)</span>
            </h3>
          </div>
        </div>

        {/* 2: Active Chits */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', cursor: 'pointer' }} onClick={() => navigate('/chits')}>
          <div style={{ padding: '0.875rem', background: 'rgba(251, 191, 36, 0.1)', borderRadius: 'var(--radius-md)', color: 'var(--accent-gold)' }}>
            <Layers size={24} />
          </div>
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Active Chits</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.15rem', color: 'var(--accent-gold)' }}>
              {summary.activeChits} <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Subscriptions</span>
            </h3>
          </div>
        </div>

        {/* 3: Active Loans */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', cursor: 'pointer' }} onClick={() => navigate('/loans')}>
          <div style={{ padding: '0.875rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: 'var(--radius-md)', color: '#818cf8' }}>
            <Coins size={24} />
          </div>
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Active Loans</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.15rem', color: '#818cf8' }}>
              {summary.activeLoans} <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Accounts</span>
            </h3>
          </div>
        </div>

        {/* 4: Today's Collections */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', cursor: 'pointer' }} onClick={() => navigate('/payments')}>
          <div style={{ padding: '0.875rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-md)', color: 'var(--success)' }}>
            <IndianRupee size={24} />
          </div>
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Today's Collections</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.15rem', color: 'var(--success)' }}>
              {formatRupee(summary.todayCollection)}
            </h3>
          </div>
        </div>

        {/* 5: This Month Collections */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', cursor: 'pointer' }} onClick={() => navigate('/payments')}>
          <div style={{ padding: '0.875rem', background: 'rgba(16, 185, 129, 0.15)', borderRadius: 'var(--radius-md)', color: '#34d399' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>This Month Collections</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.15rem', color: '#34d399' }}>
              {formatRupee(summary.monthlyCollection)}
            </h3>
          </div>
        </div>

        {/* 6: Pending Chit Payments */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', cursor: 'pointer' }} onClick={() => navigate('/pending-payments')}>
          <div style={{ padding: '0.875rem', background: 'rgba(244, 63, 94, 0.1)', borderRadius: 'var(--radius-md)', color: 'var(--error)' }}>
            <Clock size={24} />
          </div>
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Pending Chit Payments</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.15rem', color: 'var(--error)' }}>
              {formatRupee(summary.pendingChitPayments ?? summary.pendingAmount)}
            </h3>
          </div>
        </div>

        {/* 7: Pending Loan Payments */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', cursor: 'pointer' }} onClick={() => navigate('/loan-payments')}>
          <div style={{ padding: '0.875rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)', color: '#f87171' }}>
            <AlertCircle size={24} />
          </div>
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Pending Loan Payments</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.15rem', color: '#f87171' }}>
              {formatRupee(summary.pendingLoanPayments ?? 0)}
            </h3>
          </div>
        </div>

        {/* 8: Total Outstanding Loan Amount */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', cursor: 'pointer' }} onClick={() => navigate('/loans')}>
          <div style={{ padding: '0.875rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: 'var(--radius-md)', color: 'var(--warning)' }}>
            <Wallet size={24} />
          </div>
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Outstanding Loan Balance</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.15rem', color: 'var(--warning)' }}>
              {formatRupee(summary.totalOutstandingLoanAmount ?? 0)}
            </h3>
          </div>
        </div>
      </div>

      {/* 9: Recent Payments (Chit & Loan combined) */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '2.5rem' }}>
        <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Receipt style={{ color: 'var(--accent-gold)' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Recent Payments (Chits & Loans)</h3>
          </div>
          <button className="btn btn-secondary" onClick={() => navigate('/payments')} style={{ fontSize: '0.85rem', padding: '0.35rem 0.85rem' }}>
            View All Ledger <ArrowRight size={14} />
          </button>
        </div>

        {(!summary.recentPayments || summary.recentPayments.length === 0) ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No recent payments recorded.
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Receipt Number</th>
                </tr>
              </thead>
              <tbody>
                {summary.recentPayments.map((p) => (
                  <tr key={p.id}>
                    <td>{formatDate(p.paymentDate)}</td>
                    <td style={{ fontWeight: 600 }}>{p.customerName}</td>
                    <td>
                      <span className={`badge ${p.paymentType === 'CHIT' ? 'badge-active' : 'badge-advance'}`}>
                        {p.paymentType}
                      </span>
                    </td>
                    <td style={{ color: 'var(--success)', fontWeight: 700 }}>{formatRupee(p.amount)}</td>
                    <td>{p.paymentMethod}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--accent-gold)', fontWeight: 600 }}>{p.receiptNo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
