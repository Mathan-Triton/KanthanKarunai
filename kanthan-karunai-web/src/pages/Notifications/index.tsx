import { useEffect, useState } from 'react';
import { notificationsApi, NotificationLog } from '../../api/notificationsApi';
import { Search, CheckCircle2, XCircle, RefreshCw, Smartphone } from 'lucide-react';

export default function Notifications() {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SENT' | 'FAILED'>('ALL');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await notificationsApi.getNotifications();
      setLogs(res.data || []);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const filteredLogs = logs.filter(l => {
    const matchesSearch = !search ||
      (l.customerName || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.mobileNo || '').includes(search) ||
      (l.message || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const sentCount = logs.filter(l => l.status === 'SENT').length;
  const failedCount = logs.filter(l => l.status === 'FAILED').length;

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
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '0.25rem' }}>Notification Logs</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Audit log of Firebase customer notifications for chit and loan payments</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchLogs} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <RefreshCw size={16} /> Refresh Logs
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.25rem', borderLeft: '3px solid var(--accent-gold)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Total Dispatched</span>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.25rem' }}>{logs.length}</h3>
        </div>
        <div className="card" style={{ padding: '1.25rem', borderLeft: '3px solid #10b981' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Successfully Delivered</span>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--success)' }}>{sentCount}</h3>
        </div>
        <div className="card" style={{ padding: '1.25rem', borderLeft: '3px solid #ef4444' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Logged Failures</span>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--error)' }}>{failedCount}</h3>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="card" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Search by customer, mobile, or message contents..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '2.25rem' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {(['ALL', 'SENT', 'FAILED'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '0.4rem 1rem',
                borderRadius: '999px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
                background: statusFilter === s ? 'var(--accent-gold)' : 'rgba(255,255,255,0.05)',
                color: statusFilter === s ? '#000' : 'var(--text-secondary)',
                transition: 'all 0.15s'
              }}
            >
              {s === 'ALL' ? 'All Notifications' : (s === 'SENT' ? 'Sent (Success)' : 'Failed (Logged)')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid rgba(251, 191, 36, 0.1)', borderTopColor: 'var(--accent-gold)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            No notification logs found.
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Customer</th>
                  <th>Mobile Number</th>
                  <th>Type</th>
                  <th>Message Body</th>
                  <th>Status</th>
                  <th>Error Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {formatDate(log.sentDate || log.createdAt)}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      <span>{log.customerName || `Customer #${log.customerId}`}</span>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        <Smartphone size={13} style={{ color: 'var(--accent-gold)' }} />
                        {log.mobileNo || '-'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${log.notificationType.includes('CHIT') ? 'badge-active' : 'badge-advance'}`}>
                        {log.notificationType}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem', maxWidth: '360px', lineHeight: 1.4 }}>
                      {log.message}
                    </td>
                    <td>
                      {log.status === 'SENT' ? (
                        <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: 700, fontSize: '0.85rem' }}>
                          <CheckCircle2 size={15} /> SENT
                        </span>
                      ) : (
                        <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: 700, fontSize: '0.85rem' }}>
                          <XCircle size={15} /> FAILED
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: log.errorMessage ? '#f87171' : 'var(--text-muted)', maxWidth: '240px' }}>
                      {log.errorMessage || 'Delivered successfully'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
