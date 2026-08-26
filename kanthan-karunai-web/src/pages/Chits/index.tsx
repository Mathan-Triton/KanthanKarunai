import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { chitApi, Chit, PaymentSchedule, PendingChitDueItem } from '../../services/chitApi';
import { customerApi, Customer } from '../../services/customerApi';
import { paymentApi } from '../../services/paymentApi';
import { authApi } from '../../services/authApi';
import { 
  Plus, Eye, Layers, Calendar, X, AlertCircle, CheckCircle, 
  CreditCard, Search, Printer, DollarSign, TrendingUp, HandCoins
} from 'lucide-react';

export default function Chits() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTabParam = searchParams.get('tab') || 'packages';
  const [activeTab, setActiveTab] = useState<string>(activeTabParam);

  const [chits, setChits] = useState<Chit[]>([]);
  const [pendingDues, setPendingDues] = useState<PendingChitDueItem[]>([]);
  const [activeCustomers, setActiveCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // --- Add Chit Form State ---
  const [customerId, setCustomerId] = useState<number | ''>('');
  const [chitAmount, setChitAmount] = useState('100000');
  const [durationMonths, setDurationMonths] = useState('20');
  const [monthlyPayment, setMonthlyPayment] = useState('5000');
  const [startMonth, setStartMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [notes, setNotes] = useState('');
  const [addSuccessMsg, setAddSuccessMsg] = useState<string | null>(null);

  // --- Amount Taken Modal State ---
  const [amountTakenModalChit, setAmountTakenModalChit] = useState<Chit | null>(null);
  const [atAmount, setAtAmount] = useState('100000');
  const [atMonth, setAtMonth] = useState('4');
  const [atDate, setAtDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [atInterestRate, setAtInterestRate] = useState('1.0');
  const [atSuccessMsg, setAtSuccessMsg] = useState<string | null>(null);

  // --- Monthly Schedule Modal State ---
  const [scheduleModalChit, setScheduleModalChit] = useState<Chit | null>(null);
  const [schedules, setSchedules] = useState<PaymentSchedule[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  // --- Record Payment Modal State ---
  const [payModalChit, setPayModalChit] = useState<Chit | null>(null);
  const [payAmount, setPayAmount] = useState('5000');
  const [payMonth, setPayMonth] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payMethod, setPayMethod] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER' | 'OTHER'>('CASH');
  const [payRemarks, setPayRemarks] = useState('');
  const [receipt, setReceipt] = useState<any | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentUser = authApi.getCurrentUser();
  const role = currentUser?.role?.toLowerCase() || '';
  const canManage = role === 'admin' || role === 'staff';

  const fetchData = async () => {
    try {
      setLoading(true);
      const [chitsData, customersData, duesData] = await Promise.all([
        chitApi.getChits(),
        customerApi.getCustomers('', 'ACTIVE'),
        chitApi.getPendingChitDues()
      ]);
      setChits(chitsData);
      setActiveCustomers(customersData);
      setPendingDues(duesData);

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

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
    setError(null);
    setAddSuccessMsg(null);
    setAtSuccessMsg(null);
  };

  const formatRupee = (amount?: number) => {
    if (amount === undefined || amount === null) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // --- Form Auto-Calculation Helper ---
  const handleAmountChange = (val: string) => {
    setChitAmount(val);
    const amt = parseFloat(val) || 0;
    const dur = parseInt(durationMonths) || 20;
    if (dur > 0 && amt > 0) {
      setMonthlyPayment(Math.round(amt / dur).toString());
    }
  };

  const handleDurationChange = (val: string) => {
    setDurationMonths(val);
    const amt = parseFloat(chitAmount) || 0;
    const dur = parseInt(val) || 20;
    if (dur > 0 && amt > 0) {
      setMonthlyPayment(Math.round(amt / dur).toString());
    }
  };

  const handleMonthlyChange = (val: string) => {
    setMonthlyPayment(val);
    const m = parseFloat(val) || 0;
    const dur = parseInt(durationMonths) || 20;
    if (m > 0 && dur > 0) {
      setChitAmount(Math.round(m * dur).toString());
    }
  };

  // --- Create Chit Package ---
  const handleCreateChit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      setError('Please select a customer.');
      return;
    }

    const amt = parseFloat(chitAmount);
    const dur = parseInt(durationMonths);
    const monthly = parseFloat(monthlyPayment);

    if (amt <= 0 || dur <= 0 || monthly <= 0) {
      setError('Please provide valid Chit Amount, Duration, and Monthly Payment.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setAddSuccessMsg(null);

    try {
      const selectedCustomer = activeCustomers.find(c => c.id === Number(customerId));
      const custName = selectedCustomer ? selectedCustomer.name : 'Customer';

      await chitApi.createChit({
        customerId: Number(customerId),
        totalChitAmount: amt,
        paymentAmount: monthly,
        duration: dur,
        startMonth: startMonth,
        notes: notes.trim() || undefined
      });

      setAddSuccessMsg(`Chit Package of ₹${amt.toLocaleString('en-IN')} (${dur} Months @ ₹${monthly.toLocaleString('en-IN')}/mo) created for ${custName} successfully!`);
      await fetchData();
      setTimeout(() => {
        handleTabChange('packages');
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to create chit package.');
    } finally {
      setSubmitting(false);
    }
  };

  // --- View Monthly Schedule Breakdown ---
  const handleOpenSchedule = async (chit: Chit) => {
    setScheduleModalChit(chit);
    setScheduleLoading(true);
    try {
      const data = await chitApi.getChitSchedule(chit.id);
      setSchedules(data);
    } catch (err) {
      console.error(err);
    } finally {
      setScheduleLoading(false);
    }
  };

  // --- Open Record Amount Taken Modal ---
  const handleOpenAmountTakenModal = (chit: Chit) => {
    setAmountTakenModalChit(chit);
    setAtAmount(chit.totalChitAmount.toString());
    const compMonths = chit.completedMonths || 4;
    setAtMonth(compMonths > 0 ? compMonths.toString() : '4');
    setAtDate(new Date().toISOString().split('T')[0]);
    setAtInterestRate('1.0');
    setAtSuccessMsg(null);
    setError(null);
  };

  // --- Record Amount Taken Submission ---
  const handleRecordAmountTaken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountTakenModalChit) return;

    const amt = parseFloat(atAmount);
    const month = parseInt(atMonth);
    const rate = parseFloat(atInterestRate) || 1.0;

    if (amt <= 0) {
      setError('Amount taken must be greater than zero.');
      return;
    }

    if (month < 1 || month > amountTakenModalChit.duration) {
      setError(`Amount taken month must be between 1 and ${amountTakenModalChit.duration}.`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const updated = await chitApi.recordAmountTaken(amountTakenModalChit.id, {
        amountTaken: amt,
        amountTakenMonth: month,
        amountTakenDate: atDate,
        interestRate: rate
      });

      const adj = updated.adjustedMonthlyPayment || (amountTakenModalChit.paymentAmount + Math.round(amt * (rate / 100)));
      const remainingMonths = Math.max(0, amountTakenModalChit.duration - month);
      const remainingCollection = remainingMonths * adj;

      setAtSuccessMsg(`Amount Taken of ₹${amt.toLocaleString('en-IN')} in Month ${month} recorded! Monthly dues for remaining ${remainingMonths} months updated to ₹${adj.toLocaleString('en-IN')} (Total: ₹${remainingCollection.toLocaleString('en-IN')}).`);
      
      await fetchData();

      // If schedule modal was open, refresh schedule
      if (scheduleModalChit && scheduleModalChit.id === amountTakenModalChit.id) {
        const sched = await chitApi.getChitSchedule(amountTakenModalChit.id);
        setSchedules(sched);
        setScheduleModalChit(updated);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to record amount taken.');
    } finally {
      setSubmitting(false);
    }
  };

  // --- Open Record Payment Modal ---
  const handleOpenPayModal = (chit: Chit) => {
    setPayModalChit(chit);
    const expected = chit.currentMonthlyDue || chit.adjustedMonthlyPayment || chit.paymentAmount;
    setPayAmount(expected.toString());
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayMonth(chit.nextPaymentMonth || new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }));
    setPayMethod('CASH');
    setPayRemarks('');
    setReceipt(null);
    setError(null);
  };

  // --- Submit Monthly Chit Payment ---
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalChit) return;

    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) {
      setError('Payment amount must be greater than zero.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await paymentApi.createPayment({
        customerId: payModalChit.customerId,
        chitId: payModalChit.id,
        amount: amt,
        paymentDate: payDate,
        paymentMonth: payMonth,
        paymentMethod: payMethod,
        notes: payRemarks.trim() || undefined,
        allowDuplicate: true
      });

      setReceipt(res);
      await fetchData();

      // If schedule modal open, refresh it
      if (scheduleModalChit && scheduleModalChit.id === payModalChit.id) {
        const sched = await chitApi.getChitSchedule(payModalChit.id);
        setSchedules(sched);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to record payment.');
    } finally {
      setSubmitting(false);
    }
  };

  // --- Filtered Chits ---
  const filteredChits = chits.filter(c => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      (c.customerName && c.customerName.toLowerCase().includes(s)) ||
      (c.customerCode && c.customerCode.toLowerCase().includes(s)) ||
      (c.chitName && c.chitName.toLowerCase().includes(s)) ||
      (c.customerMobile && c.customerMobile.includes(s))
    );
  });

  // Top Metrics
  const totalChitPackagesSum = chits.reduce((acc, c) => acc + c.totalChitAmount, 0);
  const totalAmountTakenSum = chits.reduce((acc, c) => acc + (c.amountTaken || 0), 0);
  const totalPaidSum = chits.reduce((acc, c) => acc + (c.totalPaid || c.paidAmount || 0), 0);
  const totalRemainingSum = chits.reduce((acc, c) => acc + (c.remainingCollection || c.remainingChitAmount || 0), 0);

  return (
    <div className="fade-in">
      {/* Header & Tabs */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '0.25rem' }}>Chit Management</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Chit Packages • Monthly Payment Tracking • Chit Amount Taken • 1% Dynamic Due Adjustment
          </p>
        </div>

        {/* Navigation Tabs */}
        <div style={{
          display: 'inline-flex',
          background: 'rgba(255, 255, 255, 0.05)',
          padding: '0.35rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          gap: '0.4rem',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => handleTabChange('packages')}
            style={{
              padding: '0.55rem 1.25rem',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 700,
              fontSize: '0.9rem',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: activeTab === 'packages' ? 'var(--accent-gold)' : 'transparent',
              color: activeTab === 'packages' ? '#000' : 'var(--text-secondary)'
            }}
          >
            <Layers size={16} /> Chit Packages
          </button>

          <button
            onClick={() => handleTabChange('pending-dues')}
            style={{
              padding: '0.55rem 1.25rem',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 700,
              fontSize: '0.9rem',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: activeTab === 'pending-dues' ? 'var(--accent-gold)' : 'transparent',
              color: activeTab === 'pending-dues' ? '#000' : 'var(--text-secondary)'
            }}
          >
            <Calendar size={16} /> Pending Chit Dues
          </button>

          {canManage && (
            <button
              onClick={() => handleTabChange('add-chit')}
              style={{
                padding: '0.55rem 1.25rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 700,
                fontSize: '0.9rem',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                background: activeTab === 'add-chit' ? 'var(--accent-gold)' : 'transparent',
                color: activeTab === 'add-chit' ? '#000' : 'var(--text-secondary)'
              }}
            >
              <Plus size={16} /> Add Chit Package
            </button>
          )}
        </div>
      </div>

      {/* TOP DASHBOARD METRICS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(217, 119, 6, 0.15)', color: 'var(--accent-gold)' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Chit Packages</span>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.15rem', color: 'var(--accent-gold)' }}>
              {formatRupee(totalChitPackagesSum)}
            </h3>
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(147, 51, 234, 0.15)', color: '#c084fc' }}>
            <HandCoins size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Amount Taken</span>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.15rem', color: '#c084fc' }}>
              {formatRupee(totalAmountTakenSum)}
            </h3>
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)' }}>
            <CheckCircle size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Collections Paid</span>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.15rem', color: 'var(--success)' }}>
              {formatRupee(totalPaidSum)}
            </h3>
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--error)' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Remaining Collection</span>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.15rem', color: 'var(--error)' }}>
              {formatRupee(totalRemainingSum)}
            </h3>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CHIT PACKAGES LIST                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'packages' && (
        <div className="fade-in">
          {/* Filters Bar */}
          <div style={{ marginBottom: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '280px', maxWidth: '420px' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-control"
                placeholder="Search customer name, code or chit..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '2.75rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button 
                className={`btn ${statusFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                onClick={() => setStatusFilter('ALL')}
              >
                All ({chits.length})
              </button>
              <button 
                className={`btn ${statusFilter === 'ACTIVE' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                onClick={() => setStatusFilter('ACTIVE')}
              >
                Active ({chits.filter(x => x.status === 'ACTIVE').length})
              </button>
              <button 
                className={`btn ${statusFilter === 'COMPLETED' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                onClick={() => setStatusFilter('COMPLETED')}
              >
                Completed ({chits.filter(x => x.status === 'COMPLETED').length})
              </button>
            </div>
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
            ) : filteredChits.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                {search ? 'No chits match your search.' : 'No chit packages found. Click "Add Chit Package" to enroll a customer.'}
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th style={{ textAlign: 'right' }}>Chit Package</th>
                      <th>Duration</th>
                      <th style={{ textAlign: 'right' }}>Normal Monthly</th>
                      <th style={{ textAlign: 'center' }}>Amount Taken</th>
                      <th style={{ textAlign: 'right' }}>Adjusted Monthly</th>
                      <th style={{ textAlign: 'center' }}>Progress</th>
                      <th style={{ textAlign: 'right' }}>Next Due</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredChits.map((c) => {
                      const hasTaken = (c.amountTaken || 0) > 0;
                      const completed = c.completedMonths || 0;
                      const remaining = c.remainingMonths !== undefined ? c.remainingMonths : Math.max(0, c.duration - completed);

                      return (
                        <tr key={c.id}>
                          <td style={{ fontWeight: 600 }}>
                            <span style={{ display: 'block', fontSize: '0.95rem' }}>{c.customerName || 'Customer'}</span>
                            <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                              {c.customerCode} • {c.customerMobile || '-'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--accent-gold)' }}>
                            {formatRupee(c.totalChitAmount)}
                          </td>
                          <td style={{ fontWeight: 600 }}>
                            {c.duration} Mos
                            <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                              {c.startMonth || formatDate(c.startDate)}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            {formatRupee(c.paymentAmount)}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {hasTaken ? (
                              <div>
                                <span className="badge badge-advance" style={{ fontWeight: 700 }}>
                                  {formatRupee(c.amountTaken)}
                                </span>
                                <span style={{ display: 'block', fontSize: '0.75rem', color: '#c084fc', marginTop: '0.15rem' }}>
                                  Month {c.amountTakenMonth}
                                </span>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>-</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: hasTaken ? 'var(--error)' : 'var(--text-primary)' }}>
                            {hasTaken ? formatRupee(c.adjustedMonthlyPayment) : formatRupee(c.paymentAmount)}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ fontWeight: 700 }}>{completed} / {c.duration}</span>
                            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {remaining} Mos Left
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: c.status === 'COMPLETED' ? 'var(--success)' : 'var(--accent-gold)' }}>
                            {c.status === 'COMPLETED' ? 'Settled' : formatRupee(c.currentMonthlyDue || c.adjustedMonthlyPayment || c.paymentAmount)}
                          </td>
                          <td>
                            <span className={`badge badge-${c.status === 'COMPLETED' ? 'paid' : 'advance'}`}>
                              {c.status === 'COMPLETED' ? 'Completed' : 'Active'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                              {/* View Monthly Schedule */}
                              <button 
                                className="btn btn-secondary btn-icon"
                                onClick={() => handleOpenSchedule(c)}
                                title="View Monthly Payment Schedule"
                              >
                                <Eye size={15} />
                              </button>

                              {/* Record Amount Taken */}
                              {canManage && c.status === 'ACTIVE' && (
                                <button
                                  className="btn btn-secondary btn-icon"
                                  style={{ color: '#c084fc', borderColor: 'rgba(192, 132, 252, 0.3)' }}
                                  onClick={() => handleOpenAmountTakenModal(c)}
                                  title={hasTaken ? "Update Amount Taken" : "Record Chit Amount Taken"}
                                >
                                  <HandCoins size={15} />
                                </button>
                              )}

                              {/* Pay Monthly Installment */}
                              {canManage && c.status === 'ACTIVE' && (
                                <button
                                  className="btn btn-primary btn-icon"
                                  onClick={() => handleOpenPayModal(c)}
                                  title="Record Monthly Payment"
                                >
                                  <CreditCard size={15} />
                                </button>
                              )}
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PENDING CHIT DUES SCREEN                                           */}
      {/* ========================================================================= */}
      {activeTab === 'pending-dues' && (
        <div className="fade-in">
          <div style={{ marginBottom: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '420px' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-control"
                placeholder="Search customer name or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '2.75rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gap: '1.25rem' }}>
            {pendingDues
              .filter(d => !search.trim() || d.customerName.toLowerCase().includes(search.toLowerCase()) || d.customerCode.toLowerCase().includes(search.toLowerCase()))
              .map(item => {
                const isTaken = (item.amountTaken || 0) > 0;
                const chit = chits.find(c => c.id === item.chitId);

                return (
                  <div key={item.chitId} className="card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                      {/* Customer & Chit info */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>{item.customerName}</h2>
                          <span className="badge badge-advance">{item.customerCode}</span>
                          {isTaken && (
                            <span className="badge" style={{ background: 'rgba(147, 51, 234, 0.15)', color: '#c084fc', border: '1px solid rgba(147, 51, 234, 0.3)' }}>
                              Amount Taken: {formatRupee(item.amountTaken)} (Month {item.amountTakenMonth})
                            </span>
                          )}
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                          Mobile: {item.customerMobile} • Chit Package: <strong>{formatRupee(item.chitAmount)}</strong> ({item.duration} Months)
                        </p>
                      </div>

                      {/* Action Button */}
                      {canManage && chit && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn btn-secondary" onClick={() => handleOpenSchedule(chit)}>
                            <Eye size={15} /> View Schedule
                          </button>
                          <button className="btn btn-primary" onClick={() => handleOpenPayModal(chit)}>
                            <CreditCard size={15} /> Record Payment ({formatRupee(item.currentMonthlyDue)})
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Progress & Dues Grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                      gap: '1rem',
                      marginTop: '1.25rem',
                      background: 'rgba(255,255,255,0.02)',
                      padding: '1rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)'
                    }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Monthly Before Taken</span>
                        <div style={{ fontWeight: 700, marginTop: '0.2rem' }}>{formatRupee(item.monthlyBeforeAmountTaken)}</div>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Completed Months</span>
                        <div style={{ fontWeight: 700, marginTop: '0.2rem', color: 'var(--success)' }}>{item.completedMonths} Months</div>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Remaining Months</span>
                        <div style={{ fontWeight: 700, marginTop: '0.2rem', color: 'var(--error)' }}>{item.remainingMonths} Months</div>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Monthly After Taken</span>
                        <div style={{ fontWeight: 800, marginTop: '0.2rem', color: isTaken ? 'var(--error)' : 'var(--text-muted)' }}>
                          {isTaken ? formatRupee(item.monthlyAfterAmountTaken) : '-'}
                        </div>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--accent-gold)' }}>Current Monthly Due</span>
                        <div style={{ fontWeight: 800, marginTop: '0.2rem', color: 'var(--accent-gold)', fontSize: '1.1rem' }}>
                          {formatRupee(item.currentMonthlyDue)}
                        </div>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Next Payment</span>
                        <div style={{ fontWeight: 800, marginTop: '0.2rem', fontSize: '1.1rem' }}>
                          {formatRupee(item.nextPayment)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ADD CHIT PACKAGE FORM                                              */}
      {/* ========================================================================= */}
      {activeTab === 'add-chit' && (
        <div className="fade-in" style={{ maxWidth: '640px', margin: '0 auto' }}>
          <div className="card" style={{ padding: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ padding: '0.5rem', background: 'rgba(217, 119, 6, 0.1)', color: 'var(--accent-gold)', borderRadius: 'var(--radius-sm)' }}>
                <Plus size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Add Chit Package</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Enroll customer in a Chit Package • Automatically computes duration and payment schedule
                </p>
              </div>
            </div>

            {error && (
              <div style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid var(--error)', color: '#fb7185', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {addSuccessMsg && (
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', color: 'var(--success)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={16} />
                <span>{addSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateChit}>
              {/* Customer Dropdown */}
              <div className="form-group">
                <label className="form-label">Customer *</label>
                {activeCustomers.length === 0 ? (
                  <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                    No active customers found. Please create a customer first.
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

              {/* Chit Amount & Duration */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Chit Package Amount (₹) *</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="e.g. 100000"
                    value={chitAmount} 
                    onChange={(e) => handleAmountChange(e.target.value)} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Duration (Months) *</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="e.g. 20"
                    value={durationMonths} 
                    onChange={(e) => handleDurationChange(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              {/* Monthly Payment & Start Month */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Monthly Payment (₹) *</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="e.g. 5000"
                    value={monthlyPayment} 
                    onChange={(e) => handleMonthlyChange(e.target.value)} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Start Month *</label>
                  <input 
                    type="month" 
                    className="form-control" 
                    value={startMonth} 
                    onChange={(e) => setStartMonth(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              {/* Live Calculation Preview */}
              {(() => {
                const amt = parseFloat(chitAmount) || 0;
                const dur = parseInt(durationMonths) || 20;
                const m = parseFloat(monthlyPayment) || 0;

                return (
                  <div style={{
                    background: 'rgba(217, 119, 6, 0.06)',
                    border: '1px dashed var(--accent-gold)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '1.25rem',
                    marginBottom: '1.5rem'
                  }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-gold)', marginBottom: '0.5rem' }}>
                      Package Calculation Preview
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        {formatRupee(m)} × {dur} Months
                      </span>
                      <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-gold)' }}>
                        = {formatRupee(amt)}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div className="form-group" style={{ marginBottom: '1.75rem' }}>
                <label className="form-label">Notes (Optional)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Group A batch..."
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => handleTabChange('packages')}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting || activeCustomers.length === 0}>
                  {submitting ? 'Creating...' : 'Save Chit Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RECORD CHIT AMOUNT TAKEN                                           */}
      {/* ========================================================================= */}
      {amountTakenModalChit && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 110,
          padding: '1rem'
        }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '580px', padding: '2.5rem', position: 'relative' }}>
            <button 
              style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              onClick={() => setAmountTakenModalChit(null)}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ padding: '0.5rem', background: 'rgba(147, 51, 234, 0.15)', color: '#c084fc', borderRadius: 'var(--radius-sm)' }}>
                <HandCoins size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Record Chit Amount Taken</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  {amountTakenModalChit.customerName} • {formatRupee(amountTakenModalChit.totalChitAmount)} Package
                </p>
              </div>
            </div>

            {error && (
              <div style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid var(--error)', color: '#fb7185', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
                {error}
              </div>
            )}

            {atSuccessMsg ? (
              <div className="fade-in" style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                  <CheckCircle size={32} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>Amount Taken Saved!</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  {atSuccessMsg}
                </p>
                <button className="btn btn-primary" onClick={() => setAmountTakenModalChit(null)}>
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleRecordAmountTaken}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Amount Taken (₹) *</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={atAmount} 
                      onChange={(e) => setAtAmount(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Taken Month (1..{amountTakenModalChit.duration}) *</label>
                    <input 
                      type="number" 
                      min="1" 
                      max={amountTakenModalChit.duration}
                      className="form-control" 
                      value={atMonth} 
                      onChange={(e) => setAtMonth(e.target.value)} 
                      required 
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Taken Date *</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={atDate} 
                      onChange={(e) => setAtDate(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Interest Rate (%)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      className="form-control" 
                      value={atInterestRate} 
                      onChange={(e) => setAtInterestRate(e.target.value)} 
                      required 
                    />
                  </div>
                </div>

                {/* LIVE DYNAMIC INTEREST FORMULA BOX */}
                {(() => {
                  const amt = parseFloat(atAmount) || 0;
                  const month = parseInt(atMonth) || 4;
                  const rate = parseFloat(atInterestRate) || 1.0;
                  const normal = amountTakenModalChit.paymentAmount;
                  const monthlyInterest = Math.round(amt * (rate / 100));
                  const newMonthly = normal + monthlyInterest;
                  const remainingMonths = Math.max(0, amountTakenModalChit.duration - month);
                  const remainingCollection = remainingMonths * newMonthly;

                  return (
                    <div style={{
                      background: 'rgba(147, 51, 234, 0.06)',
                      border: '1px solid rgba(147, 51, 234, 0.3)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '1.25rem',
                      marginBottom: '1.5rem',
                      fontSize: '0.85rem'
                    }}>
                      <div style={{ fontWeight: 700, color: '#c084fc', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span>New Collection Calculation Rule</span>
                        <span>{rate}% Interest / Month</span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Normal Monthly Payment:</span>
                          <div style={{ fontWeight: 700 }}>{formatRupee(normal)}</div>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>1% Monthly Interest:</span>
                          <div style={{ fontWeight: 700, color: '#c084fc' }}>+ {formatRupee(monthlyInterest)}</div>
                        </div>
                      </div>

                      <div style={{
                        marginTop: '0.75rem',
                        paddingTop: '0.75rem',
                        borderTop: '1px solid rgba(147, 51, 234, 0.2)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>
                            New Monthly Due (Months {month + 1}–{amountTakenModalChit.duration}):
                          </span>
                          <strong style={{ fontSize: '1.2rem', color: 'var(--error)' }}>{formatRupee(newMonthly)}</strong>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>
                            Remaining {remainingMonths} Mos Collection:
                          </span>
                          <strong style={{ fontSize: '1.1rem', color: 'var(--accent-gold)' }}>{formatRupee(remainingCollection)}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setAmountTakenModalChit(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Saving...' : 'Confirm Amount Taken'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: MONTHLY PAYMENT SCHEDULE                                           */}
      {/* ========================================================================= */}
      {scheduleModalChit && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem'
        }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', padding: '2.5rem', position: 'relative' }}>
            <button 
              style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              onClick={() => setScheduleModalChit(null)}
            >
              <X size={22} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <span className="badge badge-advance" style={{ marginBottom: '0.25rem' }}>Monthly Schedule Breakdown</span>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>{scheduleModalChit.customerName}</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Chit: {formatRupee(scheduleModalChit.totalChitAmount)} • Duration: {scheduleModalChit.duration} Months • Normal: {formatRupee(scheduleModalChit.paymentAmount)}/mo
                  {scheduleModalChit.amountTaken && (
                    <span> • Amount Taken: <strong style={{ color: '#c084fc' }}>{formatRupee(scheduleModalChit.amountTaken)} (Month {scheduleModalChit.amountTakenMonth})</strong></span>
                  )}
                </p>
              </div>

              {canManage && scheduleModalChit.status === 'ACTIVE' && (
                <button className="btn btn-primary" onClick={() => handleOpenPayModal(scheduleModalChit)}>
                  <CreditCard size={16} /> Record Payment
                </button>
              )}
            </div>

            {/* SUMMARY TILES */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Normal Monthly</span>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', marginTop: '0.2rem' }}>{formatRupee(scheduleModalChit.paymentAmount)}</div>
              </div>

              <div style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Amount Taken</span>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', marginTop: '0.2rem', color: scheduleModalChit.amountTaken ? '#c084fc' : 'var(--text-muted)' }}>
                  {scheduleModalChit.amountTaken ? formatRupee(scheduleModalChit.amountTaken) : 'Not Taken'}
                </div>
              </div>

              <div style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Monthly After Taken</span>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', marginTop: '0.2rem', color: scheduleModalChit.adjustedMonthlyPayment ? 'var(--error)' : 'var(--text-muted)' }}>
                  {scheduleModalChit.adjustedMonthlyPayment ? formatRupee(scheduleModalChit.adjustedMonthlyPayment) : '-'}
                </div>
              </div>

              <div style={{ padding: '0.85rem', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--success)' }}>Total Paid</span>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', marginTop: '0.2rem', color: 'var(--success)' }}>
                  {formatRupee(scheduleModalChit.totalPaid || scheduleModalChit.paidAmount)}
                </div>
              </div>
            </div>

            {/* SCHEDULE TABLE */}
            {scheduleLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid rgba(251, 191, 36, 0.1)', borderTopColor: 'var(--accent-gold)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              </div>
            ) : (
              <div className="table-container" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                <table className="table" style={{ fontSize: '0.9rem' }}>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th style={{ textAlign: 'right' }}>Normal Due</th>
                      <th style={{ textAlign: 'center' }}>Amount Taken</th>
                      <th style={{ textAlign: 'right' }}>Interest</th>
                      <th style={{ textAlign: 'right' }}>Final Monthly Due</th>
                      <th style={{ textAlign: 'right' }}>Paid</th>
                      <th style={{ textAlign: 'right' }}>Pending</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.map(ps => {
                      const isTakenMonth = scheduleModalChit.amountTakenMonth === ps.installmentNo;
                      const isAfterTaken = (scheduleModalChit.amountTakenMonth || 999) < ps.installmentNo;

                      return (
                        <tr key={ps.id} style={{ background: isTakenMonth ? 'rgba(147, 51, 234, 0.05)' : undefined }}>
                          <td style={{ fontWeight: 700 }}>
                            Month {ps.installmentNo}
                            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {ps.dueMonth || formatDate(ps.dueDate)}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>{formatRupee(ps.normalDue || scheduleModalChit.paymentAmount)}</td>
                          <td style={{ textAlign: 'center' }}>
                            {isTakenMonth ? (
                              <span className="badge" style={{ background: 'rgba(147, 51, 234, 0.2)', color: '#c084fc', fontWeight: 700 }}>
                                {formatRupee(scheduleModalChit.amountTaken)}
                              </span>
                            ) : isAfterTaken ? (
                              <span style={{ color: '#c084fc', fontWeight: 600 }}>Yes</span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>No</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right', color: isAfterTaken ? '#60a5fa' : 'var(--text-muted)', fontWeight: 600 }}>
                            {isAfterTaken ? formatRupee(ps.interestPortion || 1000) : '₹0'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: isAfterTaken ? 'var(--error)' : 'var(--text-primary)' }}>
                            {formatRupee(ps.expectedAmount)}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>
                            {formatRupee(ps.paidAmount)}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: ps.pendingAmount > 0 ? 'var(--error)' : 'var(--text-muted)' }}>
                            {formatRupee(ps.pendingAmount)}
                          </td>
                          <td>
                            <span className={`badge badge-${ps.status.toLowerCase()}`}>{ps.statusText || ps.status}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RECORD MONTHLY PAYMENT                                             */}
      {/* ========================================================================= */}
      {payModalChit && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 110,
          padding: '1rem'
        }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '560px', padding: '2.5rem', position: 'relative' }}>
            <button 
              style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              onClick={() => setPayModalChit(null)}
            >
              <X size={20} />
            </button>

            {receipt ? (
              <div className="fade-in" style={{ textAlign: 'center' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                  <CheckCircle size={32} />
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>Chit Payment Recorded!</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                  Receipt #{receipt.receiptNo} generated successfully
                </p>

                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.5rem', textAlign: 'left', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Receipt No:</span>
                    <strong style={{ fontFamily: 'monospace', color: 'var(--accent-gold)' }}>{receipt.receiptNo}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Customer:</span>
                    <strong>{payModalChit.customerName}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Amount Paid:</span>
                    <strong style={{ color: 'var(--success)', fontSize: '1.1rem' }}>{formatRupee(receipt.amount)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Payment Method:</span>
                    <strong>{receipt.paymentMethod}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button className="btn btn-secondary" onClick={() => window.print()}>
                    <Printer size={16} /> Print Receipt
                  </button>
                  <button className="btn btn-primary" onClick={() => setPayModalChit(null)}>
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <CreditCard style={{ color: 'var(--accent-gold)' }} />
                  <div>
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Record Monthly Payment</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {payModalChit.customerName} • {payModalChit.chitName}
                    </p>
                  </div>
                </div>

                {error && (
                  <div style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid var(--error)', color: '#fb7185', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
                    {error}
                  </div>
                )}

                <form onSubmit={handleRecordPayment}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Payment Amount (₹) *</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        value={payAmount} 
                        onChange={(e) => setPayAmount(e.target.value)} 
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Payment Date *</label>
                      <input 
                        type="date" 
                        className="form-control" 
                        value={payDate} 
                        onChange={(e) => setPayDate(e.target.value)} 
                        required 
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Payment Method *</label>
                      <select 
                        className="form-control" 
                        value={payMethod} 
                        onChange={(e) => setPayMethod(e.target.value as any)}
                      >
                        <option value="CASH">CASH</option>
                        <option value="UPI">UPI</option>
                        <option value="BANK_TRANSFER">BANK TRANSFER</option>
                        <option value="OTHER">OTHER</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Payment Month (Optional)</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="e.g. Month 5"
                        value={payMonth} 
                        onChange={(e) => setPayMonth(e.target.value)} 
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '1.75rem' }}>
                    <label className="form-label">Remarks (Optional)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. Cash collected by staff..."
                      value={payRemarks} 
                      onChange={(e) => setPayRemarks(e.target.value)} 
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setPayModalChit(null)}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                      {submitting ? 'Recording...' : 'Submit Payment'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
