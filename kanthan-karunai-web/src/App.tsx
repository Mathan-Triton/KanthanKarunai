import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { authApi } from './services/authApi';

// Import Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerDetails from './pages/CustomerDetails';
import Chits from './pages/Chits';
import Payments from './pages/Payments';
import PendingPayments from './pages/PendingPayments';
import Loans from './pages/Loans';
import LoanDetails from './pages/Loans/LoanDetails';
import LoanPayments from './pages/LoanPayments';
import Notifications from './pages/Notifications';
import Reports from './pages/Reports';
import Expenses from './pages/Expenses';
import UsersList from './pages/Users/UsersList';
import CustomerDashboard from './pages/Dashboard/CustomerDashboard';
import DriverDashboard from './pages/Dashboard/DriverDashboard';

// Import Icons
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  IndianRupee,
  Clock,
  BarChart3,
  Coins,
  LogOut,
  Bell,
  CreditCard,
  User as UserIcon
} from 'lucide-react';

interface SidebarProps {
  user: { fullName: string; role: string } | null;
  onLogout: () => void;
}

function Sidebar({ user, onLogout }: SidebarProps) {
  const location = useLocation();
  const path = location.pathname;

  const getMenuItems = () => {
    const role = user?.role?.toLowerCase() || '';
    if (role === 'admin') {
      return [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/customers', label: 'Customers', icon: Users },
        { path: '/chits', label: 'Chit Management', icon: ShieldCheck },
        { path: '/payments', label: 'Chit Payments', icon: IndianRupee },
        { path: '/pending-payments', label: 'Pending Chit Dues', icon: Clock },
        { path: '/loans', label: 'Customer Loans', icon: Coins },
        { path: '/loan-payments', label: 'Loan Payments', icon: CreditCard },
        { path: '/expenses', label: 'Services / Expenses', icon: Coins },
        { path: '/reports', label: 'Reports Portal', icon: BarChart3 },
        { path: '/notifications', label: 'Notifications Log', icon: Bell },
        { path: '/admin/users', label: 'Users Directory', icon: ShieldCheck }
      ];
    } else if (role === 'staff') {
      return [
        { path: '/chits', label: 'Chit Management', icon: ShieldCheck },
        { path: '/payments', label: 'Chit Payment', icon: IndianRupee },
        { path: '/pending-payments', label: 'Pending Chit Dues', icon: Clock }
      ];
    } else if (role === 'customer') {
      return [
        { path: '/customer-dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/customer-dashboard?tab=overview', label: 'My Chit', icon: ShieldCheck },
        { path: '/customer-dashboard?tab=loans', label: 'My Loans', icon: IndianRupee },
        { path: '/customer-dashboard?tab=schedule', label: 'My Schedule', icon: Clock },
        { path: '/customer-dashboard?tab=statement', label: 'My Statement', icon: BarChart3 }
      ];
    } else if (role === 'driver') {
      return [
        { path: '/driver-dashboard', label: 'Dashboard', icon: LayoutDashboard }
      ];
    }
    return [];
  };

  const menuItems = getMenuItems();

  return (
    <div style={{
      width: '260px',
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: 0,
      bottom: 0,
      left: 0,
      zIndex: 10,
      transition: 'var(--transition)'
    }} className="sidebar">
      {/* Brand Logo */}
      <div style={{
        padding: '1.75rem 1.5rem',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem'
      }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', fontFamily: 'var(--font-display)' }}>
          KANTHAN KARUNAI
        </h2>
        <span style={{ fontSize: '0.675rem', fontWeight: 700, color: 'var(--accent-gold)', letterSpacing: '0.15em' }}>
          CHIT & LOAN MANAGEMENT
        </span>
      </div>

      {/* Navigation Links */}
      <nav style={{ flex: 1, padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', overflowY: 'auto' }}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = path === item.path || (item.path !== '/dashboard' && path.startsWith(item.path));
          
          return (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.875rem',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                color: isActive ? 'var(--accent-gold)' : 'var(--text-secondary)',
                background: isActive ? 'rgba(251, 191, 36, 0.06)' : 'transparent',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.925rem',
                textDecoration: 'none',
                transition: 'var(--transition)',
                borderLeft: isActive ? '3px solid var(--accent-gold)' : '3px solid transparent'
              }}
            >
              <Icon size={18} style={{ flexShrink: 0 }} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Session Footer */}
      {user && (
        <div style={{
          padding: '1.25rem',
          borderTop: '1px solid var(--border)',
          background: 'rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.05)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: 'var(--accent-gold)'
            }}>
              <UserIcon size={16} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {user.fullName}
              </h4>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                {user.role}
              </span>
            </div>
          </div>
          <button 
            className="btn btn-secondary" 
            onClick={onLogout}
            style={{ width: '100%', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
          >
            <LogOut size={14} /> Log Out
          </button>
        </div>
      )}
    </div>
  );
}

function MainLayout({ children, onLogout }: { children: React.ReactNode; onLogout: () => void }) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  useEffect(() => {
    setCurrentUser(authApi.getCurrentUser());
  }, []);

  return (
    <div className="app-container">
      <Sidebar user={currentUser} onLogout={onLogout} />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

interface RouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: RouteProps) {
  return authApi.isAuthenticated() ? <>{children}</> : <Navigate to="/login" replace />;
}

export function AdminRoute({ children }: RouteProps) {
  const role = authApi.getCurrentUser()?.role?.toLowerCase();
  if (!authApi.isAuthenticated()) return <Navigate to="/login" replace />;
  if (role === 'admin') return <>{children}</>;
  if (role === 'staff') return <Navigate to="/chits" replace />;
  if (role === 'customer') return <Navigate to="/customer-dashboard" replace />;
  if (role === 'driver') return <Navigate to="/driver-dashboard" replace />;
  return <Navigate to="/chits" replace />;
}

export function AdminOrStaffRoute({ children }: RouteProps) {
  const role = authApi.getCurrentUser()?.role?.toLowerCase();
  const allowed = role === 'admin' || role === 'staff';
  return authApi.isAuthenticated() && allowed
    ? <>{children}</> 
    : <Navigate to="/login" replace />;
}

export function CustomerRoute({ children }: RouteProps) {
  const role = authApi.getCurrentUser()?.role?.toLowerCase();
  return authApi.isAuthenticated() && role === 'customer' 
    ? <>{children}</> 
    : <Navigate to="/customer-dashboard" replace />;
}

export function DriverRoute({ children }: RouteProps) {
  const role = authApi.getCurrentUser()?.role?.toLowerCase();
  return authApi.isAuthenticated() && role === 'driver' 
    ? <>{children}</> 
    : <Navigate to="/driver-dashboard" replace />;
}

export default function App() {
  const [authenticated, setAuthenticated] = useState<boolean>(authApi.isAuthenticated());

  const handleLoginSuccess = () => {
    setAuthenticated(true);
  };

  const handleLogout = () => {
    authApi.logout();
    setAuthenticated(false);
  };

  const getDefaultRedirectPath = () => {
    const role = authApi.getCurrentUser()?.role?.toLowerCase();
    if (role === 'staff') return '/chits';
    if (role === 'customer') return '/customer-dashboard';
    if (role === 'driver') return '/driver-dashboard';
    return '/dashboard';
  };

  return (
    <Router>
      <Routes>
        {/* Public Login Route */}
        <Route 
          path="/login" 
          element={
            authenticated ? <Navigate to={getDefaultRedirectPath()} replace /> : <Login onLoginSuccess={handleLoginSuccess} />
          } 
        />

        {/* Protected Application Routes */}
        <Route
          path="/*"
          element={
            authenticated ? (
              <MainLayout onLogout={handleLogout}>
                <Routes>
                  {/* Admin Only Portals */}
                  <Route path="/dashboard" element={<AdminRoute><Dashboard /></AdminRoute>} />
                  <Route path="/customers" element={<AdminRoute><Customers /></AdminRoute>} />
                  <Route path="/customers/:id" element={<AdminRoute><CustomerDetails /></AdminRoute>} />
                  <Route path="/loans" element={<AdminRoute><Loans /></AdminRoute>} />
                  <Route path="/loans/:id" element={<AdminRoute><LoanDetails /></AdminRoute>} />
                  <Route path="/loan-payments" element={<AdminRoute><LoanPayments /></AdminRoute>} />
                  <Route path="/expenses" element={<AdminRoute><Expenses /></AdminRoute>} />
                  <Route path="/reports" element={<AdminRoute><Reports /></AdminRoute>} />
                  <Route path="/notifications" element={<AdminRoute><Notifications /></AdminRoute>} />
                  <Route path="/admin/users" element={<AdminRoute><UsersList /></AdminRoute>} />

                  {/* Admin & Staff Portals (Staff Allowed) */}
                  <Route path="/chits" element={<AdminOrStaffRoute><Chits /></AdminOrStaffRoute>} />
                  <Route path="/payments" element={<AdminOrStaffRoute><Payments /></AdminOrStaffRoute>} />
                  <Route path="/pending-payments" element={<AdminOrStaffRoute><PendingPayments /></AdminOrStaffRoute>} />

                  {/* Customer Portal */}
                  <Route path="/customer-dashboard" element={<CustomerRoute><CustomerDashboard /></CustomerRoute>} />

                  {/* Driver Portal */}
                  <Route path="/driver-dashboard" element={<DriverRoute><DriverDashboard /></DriverRoute>} />
                  
                  {/* Default Fallback */}
                  <Route path="*" element={<Navigate to={getDefaultRedirectPath()} replace />} />
                </Routes>
              </MainLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </Router>
  );
}
