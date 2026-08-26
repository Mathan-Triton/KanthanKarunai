import { authApi } from '../../services/authApi';
import { User, Truck, Calendar, AlertCircle } from 'lucide-react';

export default function DriverDashboard() {
  const currentUser = authApi.getCurrentUser();

  if (!currentUser) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <p>Session expired. Please log in again.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Banner */}
      <div className="card" style={{ padding: '2rem', marginBottom: '2rem', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(0,0,0,0) 100%)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#3b82f6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Driver Portal
            </span>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', margin: '0.25rem 0' }}>
              {currentUser.fullName}
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Username / Phone: <strong style={{ color: 'var(--text-primary)' }}>{currentUser.username}</strong>
            </p>
          </div>
          <span className="badge badge-info" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            Active Driver
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Profile Card */}
        <div className="card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={20} style={{ color: '#3b82f6' }} /> Driver Profile
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Account Name</span>
              <strong style={{ color: 'var(--text-primary)' }}>{currentUser.fullName}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Contact Login</span>
              <strong style={{ color: 'var(--text-primary)' }}>{currentUser.username}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>System Role</span>
              <strong style={{ color: '#3b82f6', textTransform: 'uppercase' }}>{currentUser.role}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Assigned Vehicle</span>
              <strong style={{ color: 'var(--text-primary)' }}>Standard Carrier (Default)</strong>
            </div>
          </div>
        </div>

        {/* Assigned information */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Truck size={20} style={{ color: '#3b82f6' }} /> Assigned Route Information
            </h3>
            
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
              <Calendar size={18} style={{ color: 'var(--accent-gold)', marginTop: '0.25rem' }} />
              <div>
                <strong style={{ color: 'var(--text-primary)', display: 'block', fontSize: '0.95rem' }}>Daily Collection Run</strong>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No routes are currently assigned to your roster for today.</span>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '1.5rem', background: 'rgba(245, 158, 11, 0.04)', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <AlertCircle size={18} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '0.15rem' }} />
              <div>
                <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>Security Policy</strong>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  Driver accounts are restricted from accessing financial details, reports, ledger balances, and chit auctions. Please contact the administrator for permission updates.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
