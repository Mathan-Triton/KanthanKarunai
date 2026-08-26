import React, { useEffect, useState, useMemo } from 'react';
import { expenseApi, Expense } from '../../services/expenseApi';
import { 
  Plus, 
  Trash2, 
  Edit, 
  X, 
  Building2, 
  Car, 
  Receipt, 
  IndianRupee, 
  Calendar, 
  Search,
  Filter
} from 'lucide-react';

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [monthFilter, setMonthFilter] = useState<string>('');

  // Modals state
  const [isOpen, setIsOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Form Fields
  const [category, setCategory] = useState<'Office' | 'Travel' | 'Salary' | 'Electricity' | 'Other'>('Office');
  const [amount, setAmount] = useState<string>('15000');
  const [method, setMethod] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER' | 'OTHER'>('BANK_TRANSFER');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const data = await expenseApi.getExpenses();
      setExpenses(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleOpenAdd = (defaultType?: 'Office' | 'Travel' | 'Other') => {
    setCategory(defaultType || 'Office');
    setAmount(defaultType === 'Office' ? '15000' : (defaultType === 'Travel' ? '2500' : '1000'));
    setMethod(defaultType === 'Office' ? 'BANK_TRANSFER' : 'CASH');
    setDescription(defaultType === 'Office' ? 'Office rent for August 2026' : (defaultType === 'Travel' ? 'Travel expense' : ''));
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setError(null);
    setIsEdit(false);
    setIsOpen(true);
  };

  const handleOpenEdit = (exp: Expense) => {
    setSelectedId(exp.id);
    setCategory(exp.category);
    setAmount(exp.amount.toString());
    setMethod(exp.paymentMethod);
    setDescription(exp.description || '');
    setExpenseDate(exp.expenseDate.split('T')[0]);
    setError(null);
    setIsEdit(true);
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Amount must be greater than zero.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (isEdit && selectedId) {
        await expenseApi.updateExpense(selectedId, {
          expenseDate: new Date(expenseDate).toISOString(),
          category,
          amount: numAmount,
          paymentMethod: method,
          description: description || undefined
        });
      } else {
        await expenseApi.createExpense({
          expenseDate: new Date(expenseDate).toISOString(),
          category,
          amount: numAmount,
          paymentMethod: method,
          description: description || undefined
        });
      }
      setIsOpen(false);
      fetchExpenses();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save expense.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this expense record?')) return;
    try {
      await expenseApi.deleteExpense(id);
      fetchExpenses();
    } catch (err) {
      console.error(err);
      alert('Failed to delete expense record.');
    }
  };

  const formatRupee = (num: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(num);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getCategoryDisplay = (cat: string) => {
    switch (cat) {
      case 'Office':
        return { label: 'Office Rent', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.1)' };
      case 'Travel':
        return { label: 'Travel Expense', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
      case 'Salary':
        return { label: 'Salary', color: '#34d399', bg: 'rgba(52, 211, 153, 0.1)' };
      case 'Electricity':
        return { label: 'Electricity / Utilities', color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.1)' };
      default:
        return { label: 'Other Expense', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.1)' };
    }
  };

  // Today & This Month calculations
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const todayTotal = useMemo(() => {
    return expenses
      .filter(e => e.expenseDate.startsWith(todayStr))
      .reduce((acc, e) => acc + e.amount, 0);
  }, [expenses, todayStr]);

  const thisMonthTotal = useMemo(() => {
    return expenses
      .filter(e => e.expenseDate.startsWith(currentYearMonth))
      .reduce((acc, e) => acc + e.amount, 0);
  }, [expenses, currentYearMonth]);

  const totalOfficeRent = useMemo(() => {
    return expenses
      .filter(e => e.category === 'Office')
      .reduce((acc, e) => acc + e.amount, 0);
  }, [expenses]);

  const totalTravel = useMemo(() => {
    return expenses
      .filter(e => e.category === 'Travel')
      .reduce((acc, e) => acc + e.amount, 0);
  }, [expenses]);

  const totalOther = useMemo(() => {
    return expenses
      .filter(e => e.category !== 'Office' && e.category !== 'Travel')
      .reduce((acc, e) => acc + e.amount, 0);
  }, [expenses]);

  // Filtered List
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const matchesSearch = !searchTerm || 
        (e.description?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.createdByName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory = categoryFilter === 'ALL' || 
        (categoryFilter === 'Office' && e.category === 'Office') ||
        (categoryFilter === 'Travel' && e.category === 'Travel') ||
        (categoryFilter === 'Other' && e.category !== 'Office' && e.category !== 'Travel');

      const matchesMonth = !monthFilter || e.expenseDate.startsWith(monthFilter);

      return matchesSearch && matchesCategory && matchesMonth;
    });
  }, [expenses, searchTerm, categoryFilter, monthFilter]);

  return (
    <div className="fade-in">
      {/* Top Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '0.25rem', fontFamily: 'var(--font-display)' }}>
            Services / Office Expenses
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Track and manage office rent, travel allowances, and company operating costs
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => handleOpenAdd('Office')}>
            <Building2 size={16} /> + Office Rent
          </button>
          <button className="btn btn-secondary" onClick={() => handleOpenAdd('Travel')}>
            <Car size={16} /> + Travel
          </button>
          <button className="btn btn-primary" onClick={() => handleOpenAdd('Other')}>
            <Plus size={18} /> Add Expense
          </button>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem'
      }}>
        {/* Today's Expenses */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Today's Expenses</span>
            <div style={{ padding: '0.4rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', borderRadius: 'var(--radius-sm)' }}>
              <Receipt size={16} />
            </div>
          </div>
          <h3 style={{ fontSize: '1.4rem', color: 'var(--error)', fontWeight: 800 }}>
            {formatRupee(todayTotal)}
          </h3>
        </div>

        {/* This Month Expenses */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>This Month Expenses</span>
            <div style={{ padding: '0.4rem', background: 'rgba(251, 191, 36, 0.1)', color: 'var(--accent-gold)', borderRadius: 'var(--radius-sm)' }}>
              <Calendar size={16} />
            </div>
          </div>
          <h3 style={{ fontSize: '1.4rem', color: 'var(--accent-gold)', fontWeight: 800 }}>
            {formatRupee(thisMonthTotal)}
          </h3>
        </div>

        {/* Office Rent Total */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Office Rent</span>
            <div style={{ padding: '0.4rem', background: 'rgba(96, 165, 250, 0.1)', color: '#60a5fa', borderRadius: 'var(--radius-sm)' }}>
              <Building2 size={16} />
            </div>
          </div>
          <h3 style={{ fontSize: '1.4rem', color: '#60a5fa', fontWeight: 800 }}>
            {formatRupee(totalOfficeRent)}
          </h3>
        </div>

        {/* Travel Expenses Total */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Travel Expenses</span>
            <div style={{ padding: '0.4rem', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', borderRadius: 'var(--radius-sm)' }}>
              <Car size={16} />
            </div>
          </div>
          <h3 style={{ fontSize: '1.4rem', color: '#f59e0b', fontWeight: 800 }}>
            {formatRupee(totalTravel)}
          </h3>
        </div>

        {/* Other Expenses Total */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Other Expenses</span>
            <div style={{ padding: '0.4rem', background: 'rgba(167, 139, 250, 0.1)', color: '#a78bfa', borderRadius: 'var(--radius-sm)' }}>
              <IndianRupee size={16} />
            </div>
          </div>
          <h3 style={{ fontSize: '1.4rem', color: '#a78bfa', fontWeight: 800 }}>
            {formatRupee(totalOther)}
          </h3>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 250px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Search by description or remarks..."
              style={{ paddingLeft: '2.5rem' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} style={{ color: 'var(--text-muted)' }} />
            <select
              className="form-control"
              style={{ width: 'auto', minWidth: '160px' }}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="ALL">All Expense Types</option>
              <option value="Office">Office Rent</option>
              <option value="Travel">Travel Expense</option>
              <option value="Other">Other Expenses</option>
            </select>
          </div>

          <div>
            <input
              type="month"
              className="form-control"
              style={{ width: 'auto' }}
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              title="Filter by month"
            />
          </div>

          {(searchTerm || categoryFilter !== 'ALL' || monthFilter) && (
            <button
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
              onClick={() => {
                setSearchTerm('');
                setCategoryFilter('ALL');
                setMonthFilter('');
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Expenses Table */}
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
        ) : filteredExpenses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            No expense records found matching criteria.
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Expense Type</th>
                  <th>Description</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th>Payment Method</th>
                  <th>Logged By</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((e) => {
                  const catStyle = getCategoryDisplay(e.category);
                  return (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 600 }}>{formatDate(e.expenseDate)}</td>
                      <td>
                        <span className="badge" style={{ background: catStyle.bg, color: catStyle.color, fontWeight: 700 }}>
                          {catStyle.label}
                        </span>
                      </td>
                      <td>{e.description || '-'}</td>
                      <td style={{ textAlign: 'right', color: 'var(--error)', fontWeight: 700 }}>
                        {formatRupee(e.amount)}
                      </td>
                      <td>
                        <span className="badge badge-advance">{e.paymentMethod}</span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {e.createdByName || 'Admin'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                          <button className="btn btn-secondary btn-icon" onClick={() => handleOpenEdit(e)} title="Edit">
                            <Edit size={14} />
                          </button>
                          <button className="btn btn-danger btn-icon" onClick={() => handleDelete(e.id)} title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD / EDIT EXPENSE MODAL */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '520px', padding: '2rem', position: 'relative', margin: 'auto' }}>
            <button
              style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              onClick={() => setIsOpen(false)}
            >
              <X size={20} />
            </button>
            
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1.5rem', fontFamily: 'var(--font-display)' }}>
              {isEdit ? 'Edit Expense Record' : 'Add Expense'}
            </h2>
            
            {error && (
              <div style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid var(--error)', color: '#fb7185', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Expense Type *</label>
                <select className="form-control" value={category} onChange={(e) => setCategory(e.target.value as any)}>
                  <option value="Office">Office Rent</option>
                  <option value="Travel">Travel Expense</option>
                  <option value="Electricity">Electricity / Utilities</option>
                  <option value="Salary">Staff Salaries</option>
                  <option value="Other">Other Expense (Stationery, Maintenance, Tea, etc.)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Amount (₹) *</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="e.g. 15000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Expense Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Payment Method *</label>
                <select className="form-control" value={method} onChange={(e) => setMethod(e.target.value as any)}>
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '1.75rem' }}>
                <label className="form-label">Description / Remarks (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Office rent for August 2026 / Travel expense / Stationery"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : (isEdit ? 'Update Expense' : 'Save Expense')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
