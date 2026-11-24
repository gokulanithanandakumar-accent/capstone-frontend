import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const navigationItems = [
  { to: '/dashboard', icon: '⌂', label: 'Dashboard', end: true },
  { to: '/products', icon: '▦', label: 'Available Policies' },
  { to: '/recommendations', icon: '✦', label: 'AI Recommendations' },
  { to: '/policies/register', icon: '▣', label: 'Register Policy' },
  { to: '/policies/payments', icon: '▤', label: 'Premium Payments' },
  { to: '/policies/search', icon: '⌕', label: 'Search Policies' },
];

export default function AppShell({
  title,
  subtitle,
  children,
  onLogout,
  searchValue = '',
  onSearchChange,
}) {
  const { customer } = useAuth();

  const initials =
    customer?.fullName
      ?.split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('') || 'HD';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">◆</div>
          <div>
            <strong>HealthDekho</strong>
            <span>Secure Today. Healthier Tomorrow.</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Primary navigation">
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `sidebar-link${isActive ? ' sidebar-link-active' : ''}`
              }
            >
              <span className="sidebar-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-promo">
          <div className="promo-icon">☂</div>
          <strong>Protection Today</strong>
          <span>Brighter Tomorrow</span>
          <p>Explore plans designed around your changing needs.</p>
        </div>

        <div className="sidebar-footer-links">
          <a href="#support">Help & Support</a>
          <button type="button" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </aside>

      <div className="app-workspace">
        <header className="topbar">
          <div className="mobile-brand">
            <span className="brand-mark">◆</span>
            <strong>HealthDekho</strong>
          </div>

          <label className="global-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={searchValue}
              onChange={onSearchChange}
              placeholder="Search policies, products or help..."
              aria-label="Global search"
            />
          </label>

          <div className="topbar-actions">
            <button
              type="button"
              className="icon-button"
              aria-label="Notifications"
            >
              ♢
              <span className="notification-dot" />
            </button>

            <div className="profile-summary">
              <div className="profile-avatar">{initials}</div>
              <div>
                <strong>{customer?.fullName || 'HealthDekho Customer'}</strong>
                <span>{customer?.customerId || 'Customer'}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="app-content">
          <div className="page-heading">
            <div>
              <p className="breadcrumb">Home / {title}</p>
              <h1>{title}</h1>
              {subtitle && <p>{subtitle}</p>}
            </div>
          </div>

          {children}
        </main>

        <footer className="app-footer">
          <span>© 2026 HealthDekho. All rights reserved.</span>
          <div>
            <a href="#privacy">Privacy Policy</a>
            <a href="#terms">Terms of Use</a>
            <a href="#support">Support</a>
          </div>
        </footer>
      </div>
    </div>
  );
}