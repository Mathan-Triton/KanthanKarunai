import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { authApi } from '../../services/authApi';
import { customerApi, Customer } from '../../services/customerApi';
import { chitApi, Chit, PaymentSchedule } from '../../services/chitApi';
import { reportApi, CustomerStatement } from '../../services/reportApi';
import { User, CreditCard, Calendar, BarChart3, AlertCircle, ShieldCheck, FileText } from 'lucide-react';

export default function CustomerDashboard() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [chits, setChits] = useState<Chit[]>([]);
  const [statement, setStatement] = useState<CustomerStatement | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'statement'>('overview');
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  useEffect(() => {
    if (tabParam === 'overview' || tabParam === 'schedule' || tabParam === 'statement') {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const currentUser = authApi.getCurrentUser();
  const customerId = currentUser?.customerId;

  useEffect(() => {
    if (customerId) {
      loadDashboardData(customerId);
    } else {
      setError('Your user account is not linked to any customer profile. Please contact Admin.');
      setLoading(false);
    }
  }, [customerId]);

  const loadDashboardData = async (id: number) => {
    try {
      setLoading(true);
      
      // Load profile
      const custData = await customerApi.getCustomerById(id);
      setCustomer(custData);

      // Load statement
      const statementData = await reportApi.getCustomerStatement(id);
      setStatement(statementData);

      // Load chits
      const chitsData = await chitApi.getChits();
      const myChits = chitsData.filter(c => c.customerId === id);
      setChits(myChits);

      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <p>Loading your dashboard details...</p>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div style={{ padding: '3rem', maxWidth: '800px', margin: '0 auto' }}>
        <div className="card" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', textAlign: 'center' }}>
          <AlertCircle size={40} style={{ color: '#ef4444' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Account Setup Incomplete</h3>
          <p style={{ color: 'var(--text-secondary)' }}>{error || 'No customer profile linked to this account.'}</p>
        </div>
      </div>
    );
  }

  const activeChit = chits.find(c => c.status === 'ACTIVE');

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Welcome Banner */}
      <div className="card" style={{ padding: '2rem', marginBottom: '2rem', background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(0,0,0,0) 100%)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Welcome back
            </span>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', margin: '0.25rem 0' }}>
              {customer.name}
            </h1>
            <p style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Customer Code: <strong style={{ color: 'var(--text-primary)' }}>{customer.customerCode}</strong> • Join Date: {new Date(customer.joinDate).toLocaleDateString('en-IN')}
            </p>
          </div>
          <span className="badge badge-success" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
            Portal Connected
          </span>
        </div>
      </div>

      {/* Main Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Paid</span>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.5rem 0' }}>
            ₹{statement?.totalPaid.toLocaleString('en-IN') || 0}
          </h2>
          <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>Received safely</div>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Pending Amount</span>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: statement && statement.totalPending > 0 ? '#fbbf24' : 'var(--text-primary)', margin: '0.5rem 0' }}>
            ₹{statement?.totalPending.toLocaleString('en-IN') || 0}
          </h2>
          <div style={{ fontSize: '0.75rem', color: statement && statement.totalPending > 0 ? '#fbbf24' : 'var(--text-muted)' }}>
            {statement && statement.totalPending > 0 ? 'Outstanding due' : 'Fully up to date'}
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Advance Balance</span>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981', margin: '0.5rem 0' }}>
            ₹{statement?.totalAdvance.toLocaleString('en-IN') || 0}
          </h2>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Available credits</div>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Chit Payout</span>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.5rem 0' }}>
            ₹{statement?.totalPayout.toLocaleString('en-IN') || 0}
          </h2>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Net payout received: ₹{statement?.netPayoutReceived.toLocaleString('en-IN') || 0}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '1rem 0.5rem', background: 'transparent', border: 'none',
            borderBottom: activeTab === 'overview' ? '2px solid var(--accent-gold)' : '2px solid transparent',
            color: activeTab === 'overview' ? 'var(--accent-gold)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'overview' ? 600 : 500,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}
        >
          <CreditCard size={16} /> Chit Overview
        </button>

        <button
          onClick={() => setActiveTab('schedule')}
          style={{
            padding: '1rem 0.5rem', background: 'transparent', border: 'none',
            borderBottom: activeTab === 'schedule' ? '2px solid var(--accent-gold)' : '2px solid transparent',
            color: activeTab === 'schedule' ? 'var(--accent-gold)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'schedule' ? 600 : 500,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}
        >
          <Calendar size={16} /> My Payment Schedule
        </button>

        <button
          onClick={() => setActiveTab('statement')}
          style={{
            padding: '1rem 0.5rem', background: 'transparent', border: 'none',
            borderBottom: activeTab === 'statement' ? '2px solid var(--accent-gold)' : '2px solid transparent',
            color: activeTab === 'statement' ? 'var(--accent-gold)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'statement' ? 600 : 500,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}
        >
          <BarChart3 size={16} /> My Statement Ledger
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Active Chit Profile */}
          <div className="card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={20} style={{ color: 'var(--accent-gold)' }} /> Active Chit Information
            </h3>
            
            {activeChit ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Chit Group Name</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{activeChit.chitName}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Payment Frequency</span>
                  <strong style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                    {activeChit.paymentFrequency}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Installment Amount</span>
                  <strong style={{ color: 'var(--text-primary)' }}>₹{activeChit.paymentAmount.toLocaleString('en-IN')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Total Value</span>
                  <strong style={{ color: 'var(--accent-gold)' }}>₹{activeChit.totalChitAmount.toLocaleString('en-IN')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Duration / Term</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{activeChit.duration} installments</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Active Date Range</span>
                  <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                    {new Date(activeChit.startDate).toLocaleDateString('en-IN')} to {new Date(activeChit.endDate).toLocaleDateString('en-IN')}
                  </strong>
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>You do not have any active chits currently.</p>
            )}
          </div>

          {/* Contact & Support */}
          <div className="card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={20} style={{ color: 'var(--accent-gold)' }} /> Profile Information
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Mobile Number</span>
                <strong style={{ color: 'var(--text-primary)' }}>{customer.mobileNo}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Alternative Mobile</span>
                <strong style={{ color: 'var(--text-primary)' }}>{customer.alternativeMobile || 'Not Provided'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Address</span>
                <strong style={{ color: 'var(--text-primary)', maxWidth: '200px', textAlign: 'right', whiteSpace: 'normal' }}>
                  {customer.address || 'Not Provided'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>City</span>
                <strong style={{ color: 'var(--text-primary)' }}>{customer.city || 'Not Provided'}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'schedule' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Chit Installment Schedules</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Track dates, expected payments, received amounts, and outstanding balances.</p>
          </div>
          {/* We load schedules from first active chit or provide message */}
          {activeChit ? (
            <ChitSchedulesLoader chitId={activeChit.id} />
          ) : (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No active chit schedule to display.
            </div>
          )}
        </div>
      )}

      {activeTab === 'statement' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Customer Statement Ledger</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Full history of your chit installment payments and payout auctions.</p>
            </div>
            <button
              onClick={() => window.print()}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', padding: '0.5rem 1rem' }}
            >
              <FileText size={14} /> Print Statement
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Date</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Description</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Amount Paid (In)</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Amount Payout (Out)</th>
              </tr>
            </thead>
            <tbody>
              {statement?.rows.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No transactions recorded yet in your ledger statement.
                  </td>
                </tr>
              ) : (
                statement?.rows.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }} className="table-row">
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {new Date(row.date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                      {row.description}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right', color: '#10b981', fontWeight: 600 }}>
                      {row.paid ? `₹${row.paid.toLocaleString('en-IN')}` : '-'}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right', color: 'var(--accent-gold)', fontWeight: 600 }}>
                      {row.payout ? `₹${row.payout.toLocaleString('en-IN')}` : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Child Helper Component to load schedules asynchronously
function ChitSchedulesLoader({ chitId }: { chitId: number }) {
  const [schedules, setSchedules] = useState<PaymentSchedule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadSchedules();
  }, [chitId]);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const data = await chitApi.getChitSchedule(chitId);
      setSchedules(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading schedule...</div>;
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
      <thead>
        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
          <th style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>No.</th>
          <th style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Due Date</th>
          <th style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Expected</th>
          <th style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Paid</th>
          <th style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Pending</th>
          <th style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Status</th>
          <th style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Paid Date</th>
        </tr>
      </thead>
      <tbody>
        {schedules.map((sch) => (
          <tr key={sch.id} style={{ borderBottom: '1px solid var(--border)' }} className="table-row">
            <td style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>{sch.installmentNo}</td>
            <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>
              {new Date(sch.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </td>
            <td style={{ padding: '1rem 1.5rem', textAlign: 'right', color: 'var(--text-primary)' }}>₹{sch.expectedAmount.toLocaleString('en-IN')}</td>
            <td style={{ padding: '1rem 1.5rem', textAlign: 'right', color: '#10b981', fontWeight: 500 }}>₹{sch.paidAmount.toLocaleString('en-IN')}</td>
            <td style={{ padding: '1rem 1.5rem', textAlign: 'right', color: sch.pendingAmount > 0 ? '#fbbf24' : 'var(--text-muted)' }}>₹{sch.pendingAmount.toLocaleString('en-IN')}</td>
            <td style={{ padding: '1rem 1.5rem' }}>
              <span className={`badge ${
                sch.status === 'PAID' ? 'badge-success' : 
                sch.status === 'PARTIAL' ? 'badge-warning' : 
                sch.status === 'ADVANCE' ? 'badge-success' : 'badge-danger'
              }`}>
                {sch.status}
              </span>
            </td>
            <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {sch.paidDate ? new Date(sch.paidDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
