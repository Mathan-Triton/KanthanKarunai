import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerApi, Customer } from '../../services/customerApi';
import { authApi } from '../../services/authApi';
import { Search, Plus, UserPlus, Eye, Edit, UserX, X, CreditCard } from 'lucide-react';

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [freqFilter, setFreqFilter] = useState('');
  
  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [altMobile, setAltMobile] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [joinDate, setJoinDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('ACTIVE');

  // Customer User Creation Fields
  const [createUserAccount, setCreateUserAccount] = useState(false);
  const [userPassword, setUserPassword] = useState('');
  const [createdPasswordInfo, setCreatedPasswordInfo] = useState<string | null>(null);

  // Chit Fields
  const [chitName, setChitName] = useState('');
  const [paymentFrequency, setPaymentFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('MONTHLY');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [totalChitAmount, setTotalChitAmount] = useState('');
  const [duration, setDuration] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [chitNotes, setChitNotes] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const currentUser = authApi.getCurrentUser();
  const role = currentUser?.role?.toLowerCase() || '';
  const canManageCustomers = role === 'admin' || role === 'staff';

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const data = await customerApi.getCustomers(search, statusFilter, freqFilter);
      setCustomers(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search, statusFilter, freqFilter]);

  const handleOpenAdd = () => {
    setName('');
    setMobile('');
    setAltMobile('');
    setAddress('');
    setCity('');
    setAadhaarNumber('');
    setJoinDate(new Date().toISOString().split('T')[0]);
    setCreateUserAccount(false);
    setUserPassword('');
    setCreatedPasswordInfo(null);

    // Reset Chit fields
    setChitName('');
    setPaymentFrequency('MONTHLY');
    setPaymentAmount('');
    setTotalChitAmount('');
    setDuration('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setChitNotes('');

    setError(null);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setSelectedCustomerId(customer.id);
    setName(customer.name);
    setMobile(customer.mobileNo);
    setAltMobile(customer.alternativeMobile || '');
    setAddress(customer.address || '');
    setCity(customer.city || '');
    setAadhaarNumber(customer.aadhaarNumber || '');
    setJoinDate(customer.joinDate.split('T')[0]);
    setStatus(customer.status);
    setError(null);
    setIsEditOpen(true);
  };

  const validateForm = () => {
    if (!name.trim() || !mobile.trim()) {
      setError('Please fill in Customer Name and Mobile Number.');
      return false;
    }

    const cleanMobile = mobile.replace(/\D/g, '');
    if (cleanMobile.length < 10) {
      setError('Mobile Number must be a valid 10-digit number.');
      return false;
    }

    if (aadhaarNumber.trim()) {
      const cleanAadhaar = aadhaarNumber.replace(/\D/g, '');
      if (cleanAadhaar.length !== 12) {
        setError('Aadhaar Number must be exactly 12 digits.');
        return false;
      }
    }

    return true;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Validate chit fields if Chit enrollment is checked
    if (chitName.trim()) {
      if (!paymentAmount || !totalChitAmount || !duration || !startDate) {
        setError('Please fill in all Chit details (Installment Amount, Total Amount, Duration, Start Date).');
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      const newCustomer = await customerApi.createCustomer({
        name: name.trim(),
        mobileNo: mobile.trim(),
        alternativeMobile: altMobile ? altMobile.trim() : undefined,
        address: address ? address.trim() : undefined,
        city: city ? city.trim() : undefined,
        aadhaarNumber: aadhaarNumber ? aadhaarNumber.replace(/\D/g, '') : undefined,
        joinDate: new Date(joinDate).toISOString(),
        createUserAccount,
        userPassword: createUserAccount ? (userPassword || undefined) : undefined,

        // Chit details
        chitName: chitName ? `${paymentFrequency === 'DAILY' ? 'Daily' : 'Monthly'} ${paymentAmount}` : undefined,
        paymentFrequency: chitName ? paymentFrequency : undefined,
        paymentAmount: chitName ? parseFloat(paymentAmount) : undefined,
        totalChitAmount: chitName ? parseFloat(totalChitAmount) : undefined,
        duration: chitName ? parseInt(duration) : undefined,
        startDate: chitName ? new Date(startDate).toISOString() : undefined,
        chitNotes: chitName && chitNotes.trim() ? chitNotes : undefined
      });
      
      if (createUserAccount && newCustomer.temporaryPassword) {
        setCreatedPasswordInfo(`Customer created successfully! A user login account was also provisioned:\nUsername: ${mobile}\nPassword: ${newCustomer.temporaryPassword}`);
      } else {
        setCreatedPasswordInfo(null);
        setIsAddOpen(false);
      }
      fetchCustomers();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to create customer.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) return;
    if (!validateForm()) return;

    setSubmitting(true);
    setError(null);

    try {
      await customerApi.updateCustomer(selectedCustomerId, {
        name: name.trim(),
        mobileNo: mobile.trim(),
        alternativeMobile: altMobile ? altMobile.trim() : undefined,
        address: address ? address.trim() : undefined,
        city: city ? city.trim() : undefined,
        aadhaarNumber: aadhaarNumber ? aadhaarNumber.replace(/\D/g, '') : undefined,
        joinDate: new Date(joinDate).toISOString(),
        status
      });
      setIsEditOpen(false);
      fetchCustomers();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to update customer.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (id: number) => {
    if (!confirm('Are you sure you want to deactivate this customer?')) return;
    try {
      await customerApi.deleteCustomer(id);
      fetchCustomers();
    } catch (err) {
      console.error(err);
      alert('Failed to deactivate customer.');
    }
  };


  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
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
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '0.25rem' }}>Customers</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage customers, Aadhaar records, and chit/loan profiles</p>
        </div>
        {canManageCustomers && (
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            <Plus size={18} /> Add Customer
          </button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="card" style={{
        display: 'flex',
        gap: '1.25rem',
        marginBottom: '2rem',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={18} style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)'
          }} />
          <input
            type="text"
            className="form-control"
            placeholder="Search by name, mobile, Aadhaar, or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>

        <select 
          className="form-control" 
          style={{ width: 'auto', minWidth: '150px' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>

        <select 
          className="form-control" 
          style={{ width: 'auto', minWidth: '180px' }}
          value={freqFilter}
          onChange={(e) => setFreqFilter(e.target.value)}
        >
          <option value="">All Frequencies</option>
          <option value="DAILY">Daily Chits</option>
          <option value="WEEKLY">Weekly Chits</option>
          <option value="MONTHLY">Monthly Chits</option>
        </select>
      </div>

      {/* Grid List */}
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
        ) : customers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            No customers found matching the search criteria.
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Customer Code</th>
                  <th>Customer Name</th>
                  <th>Mobile Number</th>
                  <th>Aadhaar Number</th>
                  <th>Address</th>
                  <th>Created Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent-gold)' }}>{c.customerCode}</td>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td>{c.mobileNo}</td>
                    <td style={{ fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                      {c.aadhaarNumber ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <CreditCard size={14} style={{ color: 'var(--accent-gold)' }} />
                          {c.aadhaarNumber.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3')}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>N/A</span>
                      )}
                    </td>
                    <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.address ? `${c.address}${c.city ? `, ${c.city}` : ''}` : '-'}
                    </td>
                    <td>{formatDate(c.joinDate)}</td>
                    <td>
                      <span className={`badge ${c.status === 'ACTIVE' ? 'badge-active' : 'badge-overdue'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button 
                          className="btn btn-secondary btn-icon" 
                          onClick={() => navigate(`/customers/${c.id}`)}
                          title="View Customer Profile"
                        >
                          <Eye size={16} />
                        </button>
                        {canManageCustomers && (
                          <>
                            <button 
                              className="btn btn-secondary btn-icon" 
                              onClick={() => handleOpenEdit(c)}
                              title="Edit Customer"
                            >
                              <Edit size={16} />
                            </button>
                            {c.status === 'ACTIVE' && (
                              <button 
                                className="btn btn-danger btn-icon" 
                                onClick={() => handleDeactivate(c.id)}
                                title="Deactivate Customer"
                              >
                                <UserX size={16} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD CUSTOMER MODAL */}
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
          <div className="card fade-in" style={{ width: '100%', maxWidth: '640px', padding: '2.5rem', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <button 
              style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              onClick={() => setIsAddOpen(false)}
            >
              <X size={20} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <UserPlus style={{ color: 'var(--accent-gold)' }} />
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Add New Customer</h2>
            </div>

            {error && !createdPasswordInfo && (
              <div style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid var(--error)', color: '#fb7185', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
                {error}
              </div>
            )}

            {createdPasswordInfo ? (
              <div style={{ padding: '0.5rem 0' }}>
                <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', color: '#10b981' }}>
                  <h4 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>Login Account Provisioned!</h4>
                  <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                    Username: <strong>{mobile}</strong>
                  </p>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    Temporary Password: <strong style={{ color: 'var(--accent-gold)' }}>{createdPasswordInfo.split('Password: ')[1] || 'Default'}</strong>
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
                    Please share these credentials with the customer so they can access their dashboard portal.
                  </p>
                </div>
                <button className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }} onClick={() => { setCreatedPasswordInfo(null); setIsAddOpen(false); }}>
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreate}>
                <div className="form-group">
                  <label className="form-label">Customer Name *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. Mathan Kumar"
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    required 
                  />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Mobile Number (10 digits) *</label>
                    <input 
                      type="tel" 
                      className="form-control" 
                      placeholder="e.g. 9876543210"
                      maxLength={10}
                      value={mobile} 
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Aadhaar Number (12 digits)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="12 digit Aadhaar number"
                      maxLength={12}
                      value={aadhaarNumber} 
                      onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, ''))} 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Street, locality or village"
                    value={address} 
                    onChange={(e) => setAddress(e.target.value)} 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Alternative Mobile</label>
                    <input 
                      type="tel" 
                      className="form-control" 
                      placeholder="Optional secondary mobile"
                      value={altMobile} 
                      onChange={(e) => setAltMobile(e.target.value)} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Join Date *</label>
                    <input type="date" className="form-control" value={joinDate} onChange={(e) => setJoinDate(e.target.value)} required />
                  </div>
                </div>

                {/* Optional Chit Enrollment */}
                <div style={{ padding: '1.25rem', background: 'rgba(217,119,6,0.03)', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', border: '1px solid rgba(217,119,6,0.15)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: chitName ? '1rem' : 0 }}>
                    <input
                      type="checkbox"
                      id="enableChit"
                      checked={!!chitName}
                      onChange={(e) => setChitName(e.target.checked ? 'auto' : '')}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--accent-gold)', cursor: 'pointer' }}
                    />
                    <label htmlFor="enableChit" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', cursor: 'pointer' }}>
                      Enroll in Chit Subscription (Optional)
                    </label>
                  </div>

                  {chitName && (
                    <div className="fade-in">
                      <div className="form-group">
                        <label className="form-label">Payment Frequency *</label>
                        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
                          {(['DAILY', 'WEEKLY', 'MONTHLY'] as const).map(freq => (
                            <label key={freq} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: paymentFrequency === freq ? 700 : 400, color: paymentFrequency === freq ? 'var(--accent-gold)' : 'var(--text-secondary)', fontSize: '1rem' }}>
                              <input
                                type="radio"
                                name="payFreq"
                                value={freq}
                                checked={paymentFrequency === freq}
                                onChange={() => setPaymentFrequency(freq)}
                                style={{ accentColor: 'var(--accent-gold)', width: '16px', height: '16px' }}
                              />
                              {freq === 'DAILY' ? '📅 Daily' : freq === 'WEEKLY' ? '📆 Weekly' : '🗓️ Monthly'}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                          <label className="form-label">Monthly / Installment Amount (₹) *</label>
                          <input
                            type="number"
                            className="form-control"
                            placeholder="e.g. 5000"
                            value={paymentAmount}
                            onChange={(e) => {
                              setPaymentAmount(e.target.value);
                              const p = parseFloat(e.target.value) || 0;
                              const d = parseInt(duration) || 20;
                              if (!totalChitAmount || totalChitAmount === '0') {
                                setTotalChitAmount((p * d).toString());
                              }
                            }}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Total Chit Value (₹) *</label>
                          <input
                            type="number"
                            className="form-control"
                            placeholder="e.g. 100000"
                            value={totalChitAmount}
                            onChange={(e) => setTotalChitAmount(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                          <label className="form-label">Duration (Months / Installments) *</label>
                          <input
                            type="number"
                            className="form-control"
                            placeholder="e.g. 20"
                            value={duration}
                            onChange={(e) => {
                              setDuration(e.target.value);
                              const d = parseInt(e.target.value) || 20;
                              const p = parseFloat(paymentAmount) || 0;
                              if (p > 0) setTotalChitAmount((p * d).toString());
                            }}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Starting Date / Month *</label>
                          <input
                            type="date"
                            className="form-control"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsAddOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Saving...' : 'Add Customer'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* EDIT CUSTOMER MODAL */}
      {isEditOpen && (
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
          <div className="card fade-in" style={{ width: '100%', maxWidth: '560px', padding: '2rem', position: 'relative' }}>
            <button 
              style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              onClick={() => setIsEditOpen(false)}
            >
              <X size={20} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <Edit style={{ color: 'var(--accent-gold)' }} />
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Edit Customer</h2>
            </div>

            {error && (
              <div style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid var(--error)', color: '#fb7185', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleUpdate}>
              <div className="form-group">
                <label className="form-label">Customer Name *</label>
                <input type="text" className="form-control" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Mobile Number *</label>
                  <input type="tel" className="form-control" maxLength={10} value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Aadhaar Number (12 digits)</label>
                  <input type="text" className="form-control" maxLength={12} value={aadhaarNumber} onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, ''))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <input type="text" className="form-control" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Alternative Mobile</label>
                  <input type="tel" className="form-control" value={altMobile} onChange={(e) => setAltMobile(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Join Date *</label>
                  <input type="date" className="form-control" value={joinDate} onChange={(e) => setJoinDate(e.target.value)} required />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Status</label>
                <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
