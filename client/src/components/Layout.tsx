import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Home,
  Users,
  FileText,
  DollarSign,
  BarChart3,
  Calendar,
  Folder,
  Settings,
  LogOut,
  ShieldCheck,
  MessageSquare,
  Menu,
} from 'lucide-react';
import { AppBar } from './primitives/AppBar';
import { Sidebar, type SidebarItem } from './primitives/Sidebar';
import { Button } from './primitives/Button';
import { useAuth } from '../contexts/AuthContext';
import { pendingTransactionsService } from '../services/api/pendingTransactions.service';
import styles from './Layout.module.scss';

interface NavItemDef {
  label: string;
  icon: React.ReactNode;
  path: string;
  adminOnly?: boolean;
  showBadge?: boolean;
}

const navigationItems: NavItemDef[] = [
  { label: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
  { label: 'Properties', icon: <Home size={20} />, path: '/properties' },
  { label: 'Tenants', icon: <Users size={20} />, path: '/tenants' },
  { label: 'Leases', icon: <FileText size={20} />, path: '/leases' },
  { label: 'Transactions', icon: <DollarSign size={20} />, path: '/transactions' },
  { label: 'Reports', icon: <BarChart3 size={20} />, path: '/finances/reports' },
  { label: 'Events', icon: <Calendar size={20} />, path: '/events' },
  { label: 'Documents', icon: <Folder size={20} />, path: '/documents' },
  { label: 'Pending Review', icon: <MessageSquare size={20} />, path: '/admin/pending-transactions', adminOnly: true, showBadge: true },
  { label: 'Users', icon: <ShieldCheck size={20} />, path: '/users', adminOnly: true },
  { label: 'Settings', icon: <Settings size={20} />, path: '/settings' },
];

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isMobile, setIsMobile] = useState(window.matchMedia('(max-width: 899px)').matches);
  const { user, logout, isAdmin } = useAuth();

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 899px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // Fetch pending count on mount and periodically
  useEffect(() => {
    const fetchPendingCount = async () => {
      if (isAdmin()) {
        try {
          const count = await pendingTransactionsService.getPendingCount();
          setPendingCount(count);
        } catch (error) {
          console.error('Error fetching pending count:', error);
        }
      }
    };

    fetchPendingCount();

    // Refresh count every 60 seconds
    const interval = setInterval(fetchPendingCount, 60000);

    return () => clearInterval(interval);
  }, [isAdmin]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = async () => {
    await logout();
  };

  // Build sidebar items, filtering by admin and mapping badge counts
  const sidebarItems: SidebarItem[] = navigationItems
    .filter(item => !item.adminOnly || isAdmin())
    .map(item => ({
      label: item.label,
      icon: item.icon,
      path: item.path,
      badge: item.showBadge ? pendingCount : undefined,
    }));

  return (
    <div className={styles.layout}>
      <AppBar className={styles.appbar}>
        <div className={styles.toolbar}>
          {isMobile && (
            <button
              className={styles.menuButton}
              aria-label="open drawer"
              onClick={handleDrawerToggle}
            >
              <Menu size={24} />
            </button>
          )}
          <span className={styles.title}>Landlord Management System</span>
          <div className={styles.actions}>
            <span className={styles.email}>{user?.email}</span>
            <Button
              variant="text"
              size="small"
              startIcon={<LogOut size={18} />}
              onClick={handleLogout}
              className={styles.logoutButton}
            >
              Logout
            </Button>
          </div>
        </div>
      </AppBar>

      <Sidebar
        items={sidebarItems}
        open={mobileOpen}
        onClose={handleDrawerToggle}
        header={<span className={styles.sidebarTitle}>Landlord System</span>}
      />

      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
};
