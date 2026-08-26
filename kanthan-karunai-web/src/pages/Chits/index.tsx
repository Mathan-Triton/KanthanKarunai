import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { chitApi, Chit } from '../../services/chitApi';
import { customerApi, Customer } from '../../services/customerApi';
import { authApi } from '../../services/authApi';
import { Plus, Eye, Layers, Calendar, X, AlertCircle } from 'lucide-react';

export default function Chits() {
  const [chits, setChits] = useState<Chit[]>([]);
  const [activeCustomers, setActiveCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Add Chit Form fields
  const [customerId, setCustomerId] = useState<number | ''>('');
  const [monthlyPayment, setMonthlyPayment] = useState('5000');
  const [startMonth, setStartMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [duration, setDuration] = useState('20');
  const [notes, setNotes] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const currentUser = authApi.getCurrentUser();
  const role = currentUser?.role?.toLowerCase() || '';
  const canCreate = role === 'admin' || role === 'staff';

  const fetchData = async () => {
    try {
      setLoading(true);
      const [chitsData, customersData] = await Promise.all([
        chitApi.getChits(),
        customerApi.getCustomers('', 'ACTIVE')
      ]);
      setChits(chitsData);
      setActiveCustomers(customersData);
      if (customersData.length > 0 && customerId === '') {
        setCustomerId(customersData[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAdd = () => {
    if (activeCustomers.length > 0) {
      setCustomerId(activeCustomers[0].id);
    } else {
      setCustomerId('');
    }
    setMonthlyPayment('5000');
    setDuration('20');
    setNotes('');
    setError(null);
    setIsAddOpen(true);
  };

  const handleCreateChit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !monthlyPayment || !startMonth) {
      setError('Please select Customer, Monthly Payment, and Starting Month.');
      return;
    }

    const payVal = parseFloat(monthlyPayment);
    const durVal = parseInt(duration) || 20;
    if (payVal <= 0) {
      setError('Monthly payment must be greater than 0.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const selectedCustomer = activeCustomers.find(c => c.id === Number(customerId));
      const custName = selectedCustomer ? selectedCustomer.name : 'Customer';
      const formattedMonth = new Date(startMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

      await chitApi.createChit({
        customerId: Number(customerId),
        chitName: `${custName} - ₹${payVal.toLocaleString('en-IN')} Chit`,
        paymentFrequency: 'MONTHLY',
        monthlyPayment: payVal,
        paymentAmount: payVal,
        totalChitAmount: payVal * durVal,
        duration: durVal,
        startMonth: formattedMonth,
        startDate: new Date(startMonth + '-01').toISOString(),
        notes: notes.trim() || undefined
      });

      setIsAddOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to create chit.');
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

  const getCalculatedTotal = () => {
    const p = parseFloat(monthlyPayment) || 0;
    const d = parseInt(duration) || 20;
    return p * d;
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
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '0.25rem' }}>Chit Management</h1>
          <p style={{ color: 'var(--text-secondary)' }}>View, subscribe, and monitor customer monthly chits</p>
        </div>
        {canCreate && (
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            <Plus size={18} /> Add Chit
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
        ) : chits.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            No chits found. Click <strong>Add Chit</strong> above to enroll a customer.
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Monthly Payment</th>
                  <th>Start Month</th>
                  <th>Paid Amount</th>
                  <th>Pending Amount</th>
                  <th>Next Payment Month</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {chits.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>
                      <span style={{ display: 'block', fontSize: '0.95rem' }}>{c.customerName || 'Unknown'}</span>
                      <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.8rem' }}>{c.customerCode}</span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--accent-gold)' }}>
                      {formatRupee(c.monthlyPayment || c.paymentAmount)}
                    </td>
                    <td style={{ fontWeight: 500 }}>
                      {c.startMonth || (c.startDate ? new Date(c.startDate).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '-')}
                    </td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>
                      {formatRupee(c.paidAmount ?? 0)}
                    </td>
                    <td style={{ color: (c.pendingAmount ?? 0) > 0 ? 'var(--error)' : 'var(--text-muted)', fontWeight: 600 }}>
                      {formatRupee(c.pendingAmount ?? 0)}
                    </td>
                    <td>
                      {c.nextPaymentMonth ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, color: c.nextPaymentMonth === 'Completed' ? 'var(--success)' : 'var(--text-primary)' }}>
                          <Calendar size={14} style={{ color: 'var(--accent-gold)' }} />
                          {c.nextPaymentMonth}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${c.status.toLowerCase()}`}>
                        {c.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="btn btn-secondary btn-icon"
                        onClick={() => navigate(`/customers/${c.customerId}`)}
                        title="View Customer & Chit Details"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD CHIT MODAL */}
      {isAddOpen && (
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
          <div className="card fade-in" style={{ width: '100%', maxWidth: '540px', padding: '2.5rem', position: 'relative' }}>
            <button 
              style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              onClick={() => setIsAddOpen(false)}
            >
              <X size={20} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <Layers style={{ color: 'var(--accent-gold)' }} />
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Add Chit</h2>
            </div>

            {error && (
              <div style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid var(--error)', color: '#fb7185', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateChit}>
              <div className="form-group">
                <label className="form-label">Customer (Active Customers) *</label>
                {activeCustomers.length === 0 ? (
                  <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                    No active customers available. Please add an active customer first.
                  </div>
                ) : (
                  <select 
                    className="form-control" 
                    value={customerId} 
                    onChange={(e) => setCustomerId(Number(e.target.value))}
                    required
                  >
                    {activeCustomers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.customerCode}) - {c.mobileNo}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Monthly Payment (₹) *</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="e.g. 5000"
                    value={monthlyPayment} 
                    onChange={(e) => setMonthlyPayment(e.target.value)} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Starting Month *</label>
                  <input 
                    type="month" 
                    className="form-control" 
                    value={startMonth} 
                    onChange={(e) => setStartMonth(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Duration (Months)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="20"
                    value={duration} 
                    onChange={(e) => setDuration(e.target.value)} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Total Chit Amount (Calculated)</label>
                  <div style={{
                    padding: '0.625rem 0.875rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 700,
                    color: 'var(--accent-gold)',
                    fontSize: '1rem'
                  }}>
                    {formatRupee(getCalculatedTotal())}
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Notes (Optional)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Special instructions or notes"
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting || activeCustomers.length === 0}>
                  {submitting ? 'Creating...' : 'Save Chit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
