import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, TrendingUp, TrendingDown, IndianRupee, CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react';
import { loansApi } from '../../api/loansApi';
import { CustomerLoan } from '../../types/loan';
import CreateLoan from './CreateLoan';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { authApi } from '../../services/authApi';

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  ACTIVE:    { icon: TrendingUp,    color: '#10b981', bg: 'rgba(16,185,129,0.08)',  label: 'Active'     },
  COMPLETED: { icon: CheckCircle,   color: '#6366f1', bg: 'rgba(99,102,241,0.08)',  label: 'Completed'  },
  OVERDUE:   { icon: AlertCircle,   color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   label: 'Overdue'    },
  CANCELLED: { icon: XCircle,       color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', label: 'Cancelled'  },
  PENDING:   { icon: Clock,         color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  label: 'Pending'    },
};

const FREQ_LABELS: Record<string, string> = {
  DAILY: '📅 Daily', WEEKLY: '📆 Weekly', MONTHLY: '🗓️ Monthly'
};

export default function Loans() {
  const navigate = useNavigate();
  const [loans, setLoans] = useState<CustomerLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [freqFilter, setFreqFilter] = useState('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const canCreate = authApi.isAdminOrStaff();

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const res = await loansApi.getAllLoans();
      setLoans(res.data || []);
    } catch (error) {
      console.error('Failed to fetch loans:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLoans(); }, []);

  const filteredLoans = loans.filter(loan => {
    const matchesSearch =
      loan.loanNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (loan.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (loan.customerCode || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || loan.status === statusFilter;
    const matchesFreq = freqFilter === 'ALL' || loan.repaymentFrequency === freqFilter;
    return matchesSearch && matchesStatus && matchesFreq;
  });

  // Stats summary
  const stats = {
    total: loans.length,
    active: loans.filter(l => l.status === 'ACTIVE').length,
    completed: loans.filter(l => l.status === 'COMPLETED').length,
    totalDisbursed: loans.reduce((s, l) => s + l.loanAmount, 0),
    totalPending: loans.reduce((s, l) => s + l.remainingAmount, 0),
  };

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '0.25rem' }}>Customer Loans</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage advances, track repayments, monitor completion</p>
        </div>
        {canCreate && (
          <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
            <Plus size={18} /> New Loan
          </button>
        )}
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Loans', value: stats.total, icon: IndianRupee, color: '#6366f1' },
          { label: 'Active', value: stats.active, icon: TrendingUp, color: '#10b981' },
          { label: 'Completed', value: stats.completed, icon: CheckCircle, color: '#8b5cf6' },
          { label: 'Total Disbursed', value: formatCurrency(stats.totalDisbursed), icon: TrendingUp, color: '#f59e0b' },
          { label: 'Pending Recovery', value: formatCurrency(stats.totalPending), icon: TrendingDown, color: '#ef4444' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: `3px solid ${stat.color}` }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${stat.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={20} style={{ color: stat.color }} />
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="card" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Search loan, customer name or code..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '2.25rem' }}
          />
        </div>

        {/* Status pills */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['ALL', 'ACTIVE', 'COMPLETED', 'OVERDUE', 'CANCELLED'].map(s => {
            const cfg = s === 'ALL' ? null : STATUS_CONFIG[s];
            const active = statusFilter === s;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: '0.35rem 0.85rem', borderRadius: '999px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                  background: active ? (cfg?.color || 'var(--accent-gold)') : 'var(--bg-card)',
                  color: active ? '#fff' : 'var(--text-secondary)',
                  transition: 'all 0.18s', boxShadow: active ? `0 0 0 2px ${cfg?.color || 'var(--accent-gold)'}40` : 'none'
                }}
              >
                {s === 'ALL' ? 'All' : cfg?.label}
              </button>
            );
          })}
        </div>

        {/* Frequency filter */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['ALL', 'DAILY', 'WEEKLY', 'MONTHLY'].map(f => (
            <button
              key={f}
              onClick={() => setFreqFilter(f)}
              style={{
                padding: '0.35rem 0.75rem', borderRadius: '999px', border: '1px solid', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
                background: freqFilter === f ? 'rgba(251,191,36,0.12)' : 'transparent',
                borderColor: freqFilter === f ? 'var(--accent-gold)' : 'var(--border)',
                color: freqFilter === f ? 'var(--accent-gold)' : 'var(--text-muted)',
                transition: 'all 0.18s'
              }}
            >
              {f === 'ALL' ? 'All Freq' : FREQ_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div style={{ display: 'inline-block', width: '36px', height: '36px', border: '3px solid rgba(251,191,36,0.1)', borderTopColor: 'var(--accent-gold)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : filteredLoans.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <IndianRupee size={40} style={{ marginBottom: '1rem', opacity: 0.3 }} />
            <p>No loans found for the selected filters.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Loan No</th>
                  <th>Customer</th>
                  <th>Frequency</th>
                  <th>Date</th>
                  <th>Disbursed</th>
                  <th>Total Due</th>
                  <th>Remaining</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredLoans.map(loan => {
                  const cfg = STATUS_CONFIG[loan.status] || STATUS_CONFIG['ACTIVE'];
                  const StatusIcon = cfg.icon;
                  const progress = loan.totalRecoverable > 0
                    ? Math.min(100, Math.round((loan.totalPaid / loan.totalRecoverable) * 100))
                    : 0;

                  return (
                    <tr key={loan.id}>
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--accent-gold)', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                          {loan.loanNumber}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{loan.customerName}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{loan.customerCode}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.78rem', padding: '0.2rem 0.6rem', borderRadius: '999px', background: 'rgba(251,191,36,0.08)', color: 'var(--accent-gold)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {FREQ_LABELS[loan.repaymentFrequency] || loan.repaymentFrequency}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{formatDate(loan.loanDate)}</td>
                      <td style={{ fontWeight: 500 }}>{formatCurrency(loan.loanAmount)}</td>
                      <td>{formatCurrency(loan.totalRecoverable)}</td>
                      <td>
                        <div style={{ minWidth: '100px' }}>
                          <div style={{ fontWeight: 700, color: loan.remainingAmount > 0 ? 'var(--error)' : 'var(--success)', marginBottom: '3px' }}>
                            {formatCurrency(loan.remainingAmount)}
                          </div>
                          {/* Progress bar */}
                          <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${progress}%`, height: '100%', background: progress >= 100 ? '#10b981' : 'var(--accent-gold)', transition: 'width 0.4s', borderRadius: '2px' }} />
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>{progress}% paid</div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.7rem', borderRadius: '999px', background: cfg.bg, color: cfg.color, fontWeight: 700, fontSize: '0.78rem' }}>
                          <StatusIcon size={12} />
                          {cfg.label}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-secondary btn-icon"
                          onClick={() => navigate(`/loans/${loan.id}`)}
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isCreateModalOpen && (
        <CreateLoan
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => { setIsCreateModalOpen(false); fetchLoans(); }}
        />
      )}
    </div>
  );
}
