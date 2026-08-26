import { useEffect, useState } from 'react';
import { expenseApi, Expense } from '../../services/expenseApi';
import { Plus, Trash2, Edit, X, ArrowDownToLine } from 'lucide-react';

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isOpen, setIsOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Form Fields
  const [category, setCategory] = useState<'Office' | 'Travel' | 'Salary' | 'Electricity' | 'Other'>('Office');
  const [amount, setAmount] = useState<number>(1000);
  const [method, setMethod] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER' | 'OTHER'>('CASH');
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

  const handleOpenAdd = () => {
    setCategory('Office');
    setAmount(1000);
    setMethod('CASH');
    setDescription('');
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setError(null);
    setIsEdit(false);
    setIsOpen(true);
  };

  const handleOpenEdit = (exp: Expense) => {
    setSelectedId(exp.id);
    setCategory(exp.category);
    setAmount(exp.amount);
    setMethod(exp.paymentMethod);
    setDescription(exp.description || '');
    setExpenseDate(exp.expenseDate.split('T')[0]);
    setError(null);
    setIsEdit(true);
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
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
          amount,
          paymentMethod: method,
          description: description || undefined
        });
      } else {
        await expenseApi.createExpense({
          expenseDate: new Date(expenseDate).toISOString(),
          category,
          amount,
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

  // Compute Categories Aggregate
  const totalOffice = expenses.filter(e => e.category === 'Office').reduce((acc, e) => acc + e.amount, 0);
  const totalTravel = expenses.filter(e => e.category === 'Travel').reduce((acc, e) => acc + e.amount, 0);
  const totalSalary = expenses.filter(e => e.category === 'Salary').reduce((acc, e) => acc + e.amount, 0);
  const totalElectric = expenses.filter(e => e.category === 'Electricity').reduce((acc, e) => acc + e.amount, 0);
  const totalOther = expenses.filter(e => e.category === 'Other').reduce((acc, e) => acc + e.amount, 0);
  const grandTotal = expenses.reduce((acc, e) => acc + e.amount, 0);

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
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '0.25rem' }}>Expense Management</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Log and monitor company operating expenditures</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={18} /> Log Expense
        </button>
      </div>

      {/* Aggregate Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem'
      }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem' }}>
          <div style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', borderRadius: 'var(--radius-sm)' }}>
            <ArrowDownToLine size={16} />
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Expenses</p>
            <h4 style={{ fontSize: '1.15rem', color: 'var(--error)' }}>{formatRupee(grandTotal)}</h4>
          </div>
        </div>
        <div className="card" style={{ padding: '1.25rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Office Rent & Supplies</p>
          <h4 style={{ fontSize: '1.1rem', marginTop: '0.25rem' }}>{formatRupee(totalOffice)}</h4>
        </div>
        <div className="card" style={{ padding: '1.25rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Travel & Conv.</p>
          <h4 style={{ fontSize: '1.1rem', marginTop: '0.25rem' }}>{formatRupee(totalTravel)}</h4>
        </div>
        <div className="card" style={{ padding: '1.25rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Staff Salaries</p>
          <h4 style={{ fontSize: '1.1rem', marginTop: '0.25rem' }}>{formatRupee(totalSalary)}</h4>
        </div>
        <div className="card" style={{ padding: '1.25rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Electricity & Power</p>
          <h4 style={{ fontSize: '1.1rem', marginTop: '0.25rem' }}>{formatRupee(totalElectric)}</h4>
        </div>
        <div className="card" style={{ padding: '1.25rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Miscellaneous</p>
          <h4 style={{ fontSize: '1.1rem', marginTop: '0.25rem' }}>{formatRupee(totalOther)}</h4>
        </div>
      </div>

      {/* List */}
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
        ) : expenses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            No operating expenses logged yet.
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Expense Date</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Description</th>
                  <th>Logged By</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td>{formatDate(e.expenseDate)}</td>
                    <td style={{ fontWeight: 600, color: 'var(--accent-gold)' }}>{e.category}</td>
                    <td style={{ color: 'var(--error)', fontWeight: 600 }}>{formatRupee(e.amount)}</td>
                    <td><span className="badge badge-advance">{e.paymentMethod}</span></td>
                    <td>{e.description || '-'}</td>
                    <td>{e.createdByName || 'System'}</td>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* LOG / EDIT EXPENSE MODAL */}
      {isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '500px', padding: '2rem', position: 'relative', margin: 'auto' }}>
            <button style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setIsOpen(false)}>
              <X size={20} />
            </button>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>{isEdit ? 'Edit Expense Record' : 'Log Operating Expense'}</h2>
            
            {error && <div style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid var(--error)', color: '#fb7185', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.875rem' }}>{error}</div>}

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-control" value={category} onChange={(e) => setCategory(e.target.value as any)}>
                    <option value="Office">Office Rent & Supplies</option>
                    <option value="Travel">Travel & Conveyance</option>
                    <option value="Salary">Salaries & Wages</option>
                    <option value="Electricity">Electricity & Power</option>
                    <option value="Other">Miscellaneous</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Expense Amount (₹) *</label>
                  <input type="number" className="form-control" value={amount} onChange={(e) => setAmount(parseInt(e.target.value))} required />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Expense Date *</label>
                  <input type="date" className="form-control" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Method</label>
                  <select className="form-control" value={method} onChange={(e) => setMethod(e.target.value as any)}>
                    <option value="CASH">CASH</option>
                    <option value="UPI">UPI</option>
                    <option value="BANK_TRANSFER">BANK TRANSFER</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Description / Remarks</label>
                <input type="text" className="form-control" placeholder="Office stationery bought..." value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Log Expense'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
