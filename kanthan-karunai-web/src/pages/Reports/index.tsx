import { useState, useEffect } from 'react';
import { reportApi } from '../../services/reportApi';
import { customerApi, Customer } from '../../services/customerApi';
import { Payment } from '../../services/paymentApi';
import { PaymentSchedule, ChitPayout } from '../../services/chitApi';
import { expenseApi, Expense } from '../../services/expenseApi';
import { Printer, Download, Search, Filter } from 'lucide-react';

export default function Reports() {
  const [reportType, setReportType] = useState<'collections' | 'pending' | 'payouts' | 'expenses'>('collections');
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [asOfDate, setAsOfDate] = useState('');
  const [frequency, setFrequency] = useState('');
  const [customerId, setCustomerId] = useState<number | ''>('');

  // Report Data
  const [collectionsData, setCollectionsData] = useState<Payment[]>([]);
  const [pendingData, setPendingData] = useState<PaymentSchedule[]>([]);
  const [payoutsData, setPayoutsData] = useState<ChitPayout[]>([]);
  const [expensesData, setExpensesData] = useState<Expense[]>([]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadCustomers() {
      try {
        const data = await customerApi.getCustomers();
        setCustomers(data);
      } catch (err) {
        console.error(err);
      }
    }
    loadCustomers();
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      if (reportType === 'collections') {
        const data = await reportApi.getCollectionsReport(
          startDate || undefined,
          endDate || undefined,
          frequency || undefined,
          customerId ? customerId : undefined
        );
        setCollectionsData(data);
      } else if (reportType === 'pending') {
        const data = await reportApi.getPendingReport(
          asOfDate || undefined,
          frequency || undefined,
          customerId ? customerId : undefined
        );
        setPendingData(data);
      } else if (reportType === 'payouts') {
        const data = await reportApi.getPayoutsReport(
          startDate || undefined,
          endDate || undefined,
          customerId ? customerId : undefined
        );
        setPayoutsData(data);
      } else if (reportType === 'expenses') {
        const data = await expenseApi.getExpenses();
        // filter in-memory since expenses API returns all
        let filtered = [...data];
        if (startDate) {
          filtered = filtered.filter(e => new Date(e.expenseDate) >= new Date(startDate));
        }
        if (endDate) {
          filtered = filtered.filter(e => new Date(e.expenseDate) <= new Date(endDate));
        }
        setExpensesData(filtered);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleGenerate();
  }, [reportType]);

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

  // Export as CSV
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = `${reportType}_report.csv`;

    if (reportType === 'collections') {
      headers = ['Date', 'Customer Code', 'Customer Name', 'Chit Group', 'Amount Paid', 'Type', 'Method', 'Receipt No'];
      rows = collectionsData.map(p => [
        formatDate(p.paymentDate),
        p.customerCode || '',
        p.customerName || '',
        p.chitName || '',
        p.amount.toString(),
        p.paymentType,
        p.paymentMethod,
        p.receiptNo
      ]);
    } else if (reportType === 'pending') {
      headers = ['Due Date', 'Customer Code', 'Customer Name', 'Chit Group', 'Inst No', 'Expected', 'Paid', 'Pending', 'Overdue Days'];
      rows = pendingData.map(s => [
        formatDate(s.dueDate),
        s.customerCode || '',
        s.customerName || '',
        s.chitName || '',
        s.installmentNo.toString(),
        s.expectedAmount.toString(),
        s.paidAmount.toString(),
        s.pendingAmount.toString(),
        s.overdueDays.toString()
      ]);
    } else if (reportType === 'payouts') {
      headers = ['Payout Date', 'Customer Code', 'Customer Name', 'Chit Group', 'Gross', 'Deduction', 'Net Paid', 'Method', 'Ref No'];
      rows = payoutsData.map(po => [
        formatDate(po.payoutDate),
        po.customerCode || '',
        po.customerName || '',
        po.chitName || '',
        po.grossAmount.toString(),
        po.deductionAmount.toString(),
        po.netAmount.toString(),
        po.paymentMethod,
        po.referenceNo || ''
      ]);
    } else if (reportType === 'expenses') {
      headers = ['Expense Date', 'Category', 'Amount', 'Method', 'Description', 'Logged By'];
      rows = expensesData.map(e => [
        formatDate(e.expenseDate),
        e.category,
        e.amount.toString(),
        e.paymentMethod,
        e.description || '',
        e.createdByName || ''
      ]);
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '0.25rem' }}>Reports Portal</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Compile and download financial auditing reports</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }} className="no-print">
          <button className="btn btn-secondary" onClick={handleExportCSV}>
            <Download size={16} /> Export CSV
          </button>
          <button className="btn btn-secondary" onClick={() => window.print()}>
            <Printer size={16} /> Print Report
          </button>
        </div>
      </div>

      {/* Report Type selector */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border)',
        marginBottom: '1.5rem',
        gap: '2.5rem',
        overflowX: 'auto'
      }} className="no-print">
        {[
          { id: 'collections', label: 'Collections ledger' },
          { id: 'pending', label: 'Overdue Installments' },
          { id: 'payouts', label: 'Chit Payouts ledger' },
          { id: 'expenses', label: 'Expenses log' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setReportType(tab.id as any)}
            style={{
              paddingBottom: '1rem',
              border: 'none',
              background: 'none',
              color: reportType === tab.id ? 'var(--accent-gold)' : 'var(--text-secondary)',
              fontWeight: reportType === tab.id ? 600 : 500,
              fontSize: '0.95rem',
              borderBottom: reportType === tab.id ? '2px solid var(--accent-gold)' : '2px solid transparent',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* FILTER BUILDER */}
      <div className="card no-print" style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={16} /> Query Filters
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1.25rem',
          alignItems: 'flex-end'
        }}>
          {reportType !== 'pending' ? (
            <>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Start Date</label>
                <input type="date" className="form-control" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">End Date</label>
                <input type="date" className="form-control" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </>
          ) : (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">As Of Date</label>
              <input type="date" className="form-control" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} />
            </div>
          )}

          {reportType !== 'expenses' && (
            <>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Chit Frequency</label>
                <select className="form-control" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
                  <option value="">All</option>
                  <option value="DAILY">DAILY</option>
                  <option value="WEEKLY">WEEKLY</option>
                  <option value="MONTHLY">MONTHLY</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Filter Customer</label>
                <select className="form-control" value={customerId} onChange={(e) => setCustomerId(e.target.value ? parseInt(e.target.value) : '')}>
                  <option value="">All Customers</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.customerCode})</option>)}
                </select>
              </div>
            </>
          )}

          <button className="btn btn-primary" onClick={handleGenerate} disabled={loading} style={{ height: '42px' }}>
            <Search size={16} /> Filter
          </button>
        </div>
      </div>

      {/* REPORT PRINT AREA / TABLES */}
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
        ) : (
          <div className="table-container">
            {/* COLLECTIONS REPORT */}
            {reportType === 'collections' && (
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Customer Name</th>
                    <th>Chit Group</th>
                    <th>Amount Paid</th>
                    <th>Type</th>
                    <th>Method</th>
                    <th>Receipt No</th>
                    <th>Collected By</th>
                  </tr>
                </thead>
                <tbody>
                  {collectionsData.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No collections data matches this filter query.</td></tr>
                  ) : (
                    collectionsData.map(p => (
                      <tr key={p.id}>
                        <td>{formatDate(p.paymentDate)}</td>
                        <td style={{ fontWeight: 600 }}>{p.customerName}</td>
                        <td style={{ fontWeight: 600, color: 'var(--accent-gold)' }}>{p.chitName}</td>
                        <td style={{ color: 'var(--success)', fontWeight: 600 }}>{formatRupee(p.amount)}</td>
                        <td>{p.paymentType}</td>
                        <td><span className="badge badge-advance">{p.paymentMethod}</span></td>
                        <td style={{ fontFamily: 'monospace' }}>{p.receiptNo}</td>
                        <td>{p.collectedByName}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* PENDING REPORT */}
            {reportType === 'pending' && (
              <table className="table">
                <thead>
                  <tr>
                    <th>Due Date</th>
                    <th>Customer</th>
                    <th>Chit Group</th>
                    <th>Inst No</th>
                    <th>Expected</th>
                    <th>Paid</th>
                    <th>Pending</th>
                    <th>Overdue Days</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingData.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No outstanding payments found.</td></tr>
                  ) : (
                    pendingData.map((s, idx) => (
                      <tr key={idx}>
                        <td>{formatDate(s.dueDate)}</td>
                        <td style={{ fontWeight: 600 }}>{s.customerName}</td>
                        <td style={{ fontWeight: 600, color: 'var(--accent-gold)' }}>{s.chitName}</td>
                        <td>{s.installmentNo}</td>
                        <td>{formatRupee(s.expectedAmount)}</td>
                        <td style={{ color: 'var(--success)' }}>{formatRupee(s.paidAmount)}</td>
                        <td style={{ color: 'var(--error)', fontWeight: 600 }}>{formatRupee(s.pendingAmount)}</td>
                        <td style={{ color: 'var(--error)' }}>{s.overdueDays} days</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* PAYOUTS REPORT */}
            {reportType === 'payouts' && (
              <table className="table">
                <thead>
                  <tr>
                    <th>Payout Date</th>
                    <th>Customer</th>
                    <th>Chit Group</th>
                    <th>Gross Amount</th>
                    <th>Deductions</th>
                    <th>Net Amount Disbursed</th>
                    <th>Method</th>
                    <th>Reference No</th>
                  </tr>
                </thead>
                <tbody>
                  {payoutsData.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No payouts matches this filter query.</td></tr>
                  ) : (
                    payoutsData.map(po => (
                      <tr key={po.id}>
                        <td>{formatDate(po.payoutDate)}</td>
                        <td style={{ fontWeight: 600 }}>{po.customerName}</td>
                        <td style={{ fontWeight: 600, color: 'var(--accent-gold)' }}>{po.chitName}</td>
                        <td>{formatRupee(po.grossAmount)}</td>
                        <td style={{ color: 'var(--error)' }}>{formatRupee(po.deductionAmount)}</td>
                        <td style={{ color: 'var(--text-gold)', fontWeight: 600 }}>{formatRupee(po.netAmount)}</td>
                        <td><span className="badge badge-advance">{po.paymentMethod}</span></td>
                        <td style={{ fontFamily: 'monospace' }}>{po.referenceNo || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* EXPENSES REPORT */}
            {reportType === 'expenses' && (
              <table className="table">
                <thead>
                  <tr>
                    <th>Expense Date</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Description</th>
                    <th>Logged By</th>
                  </tr>
                </thead>
                <tbody>
                  {expensesData.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No expenses recorded in this period.</td></tr>
                  ) : (
                    expensesData.map(e => (
                      <tr key={e.id}>
                        <td>{formatDate(e.expenseDate)}</td>
                        <td style={{ fontWeight: 600, color: 'var(--accent-gold)' }}>{e.category}</td>
                        <td style={{ color: 'var(--error)', fontWeight: 600 }}>{formatRupee(e.amount)}</td>
                        <td><span className="badge badge-advance">{e.paymentMethod}</span></td>
                        <td>{e.description || '-'}</td>
                        <td>{e.createdByName}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
