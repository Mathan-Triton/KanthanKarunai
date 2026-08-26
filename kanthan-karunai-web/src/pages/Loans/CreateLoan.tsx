import React, { useState, useEffect } from 'react';
import { X, IndianRupee, Calculator, AlertCircle } from 'lucide-react';
import { loansApi } from '../../api/loansApi';
import { customerApi, Customer } from '../../services/customerApi';

interface CreateLoanProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateLoan({ onClose, onSuccess }: CreateLoanProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [customerId, setCustomerId] = useState('');
  const [principalAmount, setPrincipalAmount] = useState('50000');
  const [interestAmount, setInterestAmount] = useState('10000');
  const [monthlyPaymentAmount, setMonthlyPaymentAmount] = useState('5000');
  const [loanStartMonth, setLoanStartMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await customerApi.getCustomers();
      const activeCusts = res.filter((c: Customer) => c.status === 'ACTIVE');
      setCustomers(activeCusts);
      if (activeCusts.length > 0 && !customerId) {
        setCustomerId(String(activeCusts[0].id));
      }
    } catch (err) {
      console.error('Failed to fetch customers', err);
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.customerCode.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.mobileNo.includes(customerSearch)
  );

  const principal = parseFloat(principalAmount) || 0;
  const interest = parseFloat(interestAmount) || 0;
  const totalLoanAmount = principal + interest;
  const monthlyPayment = parseFloat(monthlyPaymentAmount) || 0;
  const numberOfMonths = (totalLoanAmount > 0 && monthlyPayment > 0) ? Math.ceil(totalLoanAmount / monthlyPayment) : 0;

  const selectedCustomer = customers.find(c => c.id === parseInt(customerId));

  const formatRupee = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || principal <= 0 || monthlyPayment <= 0 || !loanStartMonth) {
      setError('Please fill in Customer, Principal Amount, Monthly Payment, and Start Month.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const formattedMonth = new Date(loanStartMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      const startDateIso = new Date(loanStartMonth + '-01').toISOString();

      await loansApi.createLoan({
        customerId: parseInt(customerId),
        principalAmount: principal,
        loanAmount: principal,
        interestAmount: interest,
        serviceCharge: 0,
        otherCharges: 0,
        repaymentFrequency: 'MONTHLY',
        monthlyPaymentAmount: monthlyPayment,
        installmentAmount: monthlyPayment,
        loanStartMonth: formattedMonth,
        loanDate: startDateIso,
        firstDueDate: startDateIso,
        notes: notes.trim() || undefined
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to create loan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
    }}>
      <div className="card fade-in" style={{
        width: '100%', maxWidth: '640px', padding: '2.5rem',
        position: 'relative', maxHeight: '92vh', overflowY: 'auto'
      }}>
        <button
          style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          onClick={onClose}
        ><X size={20} /></button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <IndianRupee style={{ color: 'var(--accent-gold)' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Add Customer Loan</h2>
        </div>

        {error && (
          <div style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid var(--error)', color: '#fb7185', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Customer Selection */}
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Customer (Active Customers) *</label>
            <div style={{ marginBottom: '0.5rem' }}>
              <input
                type="text"
                className="form-control"
                placeholder="🔍 Search customer name or code..."
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
                style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
              />
            </div>
            <select
              className="form-control"
              required
              value={customerId}
              onChange={e => setCustomerId(e.target.value)}
            >
              <option value="">-- Select Customer --</option>
              {filteredCustomers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.customerCode}) - {c.mobileNo}
                </option>
              ))}
            </select>
          </div>

          {/* Principal & Interest */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Principal Amount (₹) *</label>
              <input 
                type="number" 
                className="form-control" 
                placeholder="e.g. 50000"
                min="1" 
                required
                value={principalAmount} 
                onChange={e => setPrincipalAmount(e.target.value)} 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Interest Amount (₹) *</label>
              <input 
                type="number" 
                className="form-control" 
                placeholder="e.g. 10000"
                min="0" 
                required
                value={interestAmount} 
                onChange={e => setInterestAmount(e.target.value)} 
              />
            </div>
          </div>

          {/* Monthly Payment & Start Month */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Monthly Payment Amount (₹) *</label>
              <input 
                type="number" 
                className="form-control" 
                placeholder="e.g. 5000"
                min="1" 
                required
                value={monthlyPaymentAmount} 
                onChange={e => setMonthlyPaymentAmount(e.target.value)} 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Loan Start Month *</label>
              <input 
                type="month" 
                className="form-control" 
                required 
                value={loanStartMonth}
                onChange={e => setLoanStartMonth(e.target.value)} 
              />
            </div>
          </div>

          {/* Formula Calculations Card */}
          <div style={{
            padding: '1.25rem',
            background: 'rgba(217,119,6,0.06)',
            borderRadius: 'var(--radius-sm)',
            border: '1px dashed var(--accent-gold)',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Calculator size={16} style={{ color: 'var(--accent-gold)' }} />
              <h4 style={{ color: 'var(--accent-gold)', fontSize: '0.95rem', fontWeight: 700 }}>Loan Calculation & Schedule Summary</h4>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', fontSize: '0.9rem' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', display: 'block' }}>Principal Amount</span>
                <strong>{formatRupee(principal)}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', display: 'block' }}>Interest Amount</span>
                <strong>{formatRupee(interest)}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', display: 'block' }}>Total Loan Amount (= Principal + Interest)</span>
                <strong style={{ color: 'var(--accent-gold)', fontSize: '1.1rem' }}>{formatRupee(totalLoanAmount)}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', display: 'block' }}>Number of Months (= Total / Monthly)</span>
                <strong style={{ color: '#10b981', fontSize: '1.1rem' }}>{numberOfMonths} Months</strong>
              </div>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Notes (Optional)</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Any special terms, collateral, or remarks..."
              value={notes} 
              onChange={e => setNotes(e.target.value)} 
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !selectedCustomer}>
              {loading ? 'Creating Loan...' : 'Confirm & Create Loan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
