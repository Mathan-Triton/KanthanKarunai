import React, { useState, useEffect } from 'react';
import { userApi, UserDto, CreateUserDto } from '../../services/userApi';
import { customerApi, Customer } from '../../services/customerApi';
import { Shield, UserPlus, ToggleLeft, ToggleRight, Key, ShieldAlert, Trash2, Search, Filter } from 'lucide-react';

export default function UsersList() {
  const [users, setUsers] = useState<UserDto[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [createRole, setCreateRole] = useState<'Staff' | 'Driver' | 'Customer'>('Staff');
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    password: '',
    confirmPassword: '',
    customerId: ''
  });

  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<UserDto | null>(null);
  const [newPassword, setNewPassword] = useState<string>('');

  const [showRoleModal, setShowRoleModal] = useState<boolean>(false);
  const [newRoleVal, setNewRoleVal] = useState<string>('Staff');

  useEffect(() => {
    fetchUsers();
    fetchCustomers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await userApi.getUsers();
      setUsers(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const data = await customerApi.getCustomers();
      setCustomers(data);
    } catch (err) {
      console.error('Failed to load customers for dropdown', err);
    }
  };

  const handleToggleStatus = async (user: UserDto) => {
    if (user.username.toLowerCase() === 'mathan') {
      setError('Cannot deactivate primary Admin account Mathan');
      return;
    }

    try {
      await userApi.toggleStatus(user.id);
      setSuccessMsg(`Status of user ${user.username} toggled successfully.`);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to update user status');
    }
  };

  const handleDeleteUser = async (user: UserDto) => {
    if (user.username.toLowerCase() === 'mathan') {
      setError('Cannot delete primary Admin account Mathan');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete user account "${user.username}"?`)) {
      return;
    }

    try {
      await userApi.deleteUser(user.id);
      setSuccessMsg(`User ${user.username} deleted successfully.`);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
    }
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      const dto: CreateUserDto = {
        username: formData.username,
        fullName: formData.fullName,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        customerId: createRole === 'Customer' && formData.customerId ? parseInt(formData.customerId) : undefined
      };

      if (createRole === 'Staff') {
        await userApi.createStaff(dto);
      } else if (createRole === 'Driver') {
        await userApi.createDriver(dto);
      } else {
        await userApi.createCustomerUser(dto);
      }

      setSuccessMsg(`User ${formData.username} created successfully as ${createRole}.`);
      setShowCreateModal(false);
      setFormData({ username: '', fullName: '', password: '', confirmPassword: '', customerId: '' });
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      await userApi.resetPassword(selectedUser.id, newPassword);
      setSuccessMsg(`Password for ${selectedUser.username} reset successfully.`);
      setShowResetModal(false);
      setNewPassword('');
      setSelectedUser(null);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    }
  };

  const handleChangeRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      await userApi.changeRole(selectedUser.id, newRoleVal);
      setSuccessMsg(`Role for ${selectedUser.username} updated to ${newRoleVal}.`);
      setShowRoleModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to change role');
    }
  };

  // Filter Logic
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.customerCode && user.customerCode.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = roleFilter ? user.role.toLowerCase() === roleFilter.toLowerCase() : true;
    const matchesStatus = statusFilter ? 
      (statusFilter === 'active' ? user.isActive : !user.isActive) : true;

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield style={{ color: 'var(--accent-gold)' }} /> System Users
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage administrative, collector staff, drivers, and customer portal accounts.</p>
        </div>
        <button 
          onClick={() => { setCreateRole('Staff'); setShowCreateModal(true); }}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <UserPlus size={16} /> Create User
        </button>
      </div>

      {/* Alert Banners */}
      {error && (
        <div className="card" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#ef4444', fontWeight: 500, fontSize: '0.9rem' }}>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {successMsg && (
        <div className="card" style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#10b981', fontWeight: 500, fontSize: '0.9rem' }}>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search by username, full name, or code..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '0.625rem 1rem 0.625rem 2.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)', color: 'var(--text-primary)' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Filter size={14} style={{ color: 'var(--text-muted)' }} />
          
          <select 
            value={roleFilter} 
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ padding: '0.625rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          >
            <option value="">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="Staff">Staff</option>
            <option value="Customer">Customer</option>
            <option value="Driver">Driver</option>
          </select>

          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '0.625rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Users Grid Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Loading user accounts...</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Username</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Full Name</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Role</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Linked Customer</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Created Date</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No users found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--border)', transition: 'var(--transition)' }} className="table-row">
                    <td style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {user.username}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>
                      {user.fullName}
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{
                        padding: '0.25rem 0.625rem',
                        borderRadius: '10px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        background: user.role === 'Admin' ? 'rgba(251, 191, 36, 0.1)' : 
                                    user.role === 'Staff' ? 'rgba(59, 130, 246, 0.1)' : 
                                    user.role === 'Customer' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                        color: user.role === 'Admin' ? 'var(--accent-gold)' : 
                               user.role === 'Staff' ? '#3b82f6' : 
                               user.role === 'Customer' ? '#10b981' : '#9ca3af'
                      }}>
                        {user.role}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>
                      {user.customerId ? (
                        <div>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.customerName}</span>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.customerCode}</div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>None</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span className={`badge ${user.isActive ? 'badge-success' : 'badge-danger'}`} style={{ textTransform: 'capitalize' }}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {new Date(user.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => handleToggleStatus(user)}
                          title={user.isActive ? 'Deactivate Account' : 'Activate Account'}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.5rem', background: 'transparent' }}
                          disabled={user.username.toLowerCase() === 'mathan'}
                        >
                          {user.isActive ? (
                            <ToggleRight size={18} style={{ color: '#10b981' }} />
                          ) : (
                            <ToggleLeft size={18} style={{ color: 'var(--text-muted)' }} />
                          )}
                        </button>

                        <button 
                          onClick={() => { setSelectedUser(user); setNewPassword(''); setShowResetModal(true); }}
                          title="Reset Password"
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.5rem', background: 'transparent' }}
                        >
                          <Key size={16} style={{ color: 'var(--accent-gold)' }} />
                        </button>

                        <button 
                          onClick={() => { setSelectedUser(user); setNewRoleVal(user.role); setShowRoleModal(true); }}
                          title="Change Role"
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.5rem', background: 'transparent' }}
                          disabled={user.username.toLowerCase() === 'mathan'}
                        >
                          <ShieldAlert size={16} style={{ color: '#3b82f6' }} />
                        </button>

                        <button 
                          onClick={() => handleDeleteUser(user)}
                          title="Delete User"
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.5rem', background: 'transparent' }}
                          disabled={user.username.toLowerCase() === 'mathan'}
                        >
                          <Trash2 size={16} style={{ color: '#ef4444' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Create User */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', top: 0, bottom: 0, left: 0, right: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div className="card" style={{ width: '450px', padding: '2rem', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
              Create New System User
            </h3>
            
            {/* Role Tabs */}
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.15)', padding: '0.25rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem' }}>
              {(['Staff', 'Driver', 'Customer'] as const).map(role => (
                <button
                  key={role}
                  onClick={() => setCreateRole(role)}
                  type="button"
                  style={{
                    flex: 1, padding: '0.5rem', border: 'none', borderRadius: '4px',
                    fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                    background: createRole === role ? 'var(--accent-gold)' : 'transparent',
                    color: createRole === role ? '#000' : 'var(--text-secondary)',
                    transition: 'var(--transition)'
                  }}
                >
                  {role}
                </button>
              ))}
            </div>

            <form onSubmit={handleCreateUserSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                    Username {createRole === 'Customer' ? '(Use Mobile Number)' : ''} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                  />
                </div>

                {createRole === 'Customer' && (
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                      Link to Customer Profile *
                    </label>
                    <select
                      required
                      value={formData.customerId}
                      onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    >
                      <option value="">-- Select Customer Profile --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.customerCode} - {c.mobileNo})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset Password */}
      {showResetModal && selectedUser && (
        <div style={{
          position: 'fixed', top: 0, bottom: 0, left: 0, right: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div className="card" style={{ width: '400px', padding: '2rem', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
              Reset Password for {selectedUser.username}
            </h3>
            
            <form onSubmit={handleResetPasswordSubmit}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  New Password (at least 6 characters) *
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => { setShowResetModal(false); setSelectedUser(null); }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Change Role */}
      {showRoleModal && selectedUser && (
        <div style={{
          position: 'fixed', top: 0, bottom: 0, left: 0, right: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div className="card" style={{ width: '400px', padding: '2rem', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
              Change Role for {selectedUser.username}
            </h3>
            
            <form onSubmit={handleChangeRoleSubmit}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  Select New Role *
                </label>
                <select
                  required
                  value={newRoleVal}
                  onChange={(e) => setNewRoleVal(e.target.value)}
                  style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                >
                  <option value="Admin">Admin</option>
                  <option value="Staff">Staff</option>
                  <option value="Customer">Customer</option>
                  <option value="Driver">Driver</option>
                </select>
                {newRoleVal !== 'Customer' && selectedUser.role === 'Customer' && (
                  <p style={{ fontSize: '0.75rem', color: '#fbbf24', marginTop: '0.5rem' }}>
                    Note: Changing from Customer role will sever the link to customer profile statistics.
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => { setShowRoleModal(false); setSelectedUser(null); }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
