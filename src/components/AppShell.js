import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  detectPolicySearchType,
} from '../utils/policySearch';

const navigationItems = [
  {
    to: '/dashboard',
    icon: '⌂',
    label: 'Dashboard',
    end: true,
  },
  {
    to: '/policies/available',
    icon: '▦',
    label: 'Available Policies',
  },
  {
    to: '/recommendations',
    icon: '✦',
    label: 'AI Recommendations',
  },
  {
    to: '/policies/payments',
    icon: '▤',
    label: 'Premium Payments',
  },
  {
    to: '/policies/search',
    icon: '⌕',
    label: 'Search My Policies',
  },
];

export default function AppShell({
  title,
  subtitle,
  children,
  onLogout,
}) {
  const { customer, logout } = useAuth();
  const navigate = useNavigate();

  const [searchValue, setSearchValue] = useState('');

  const initials =
    customer?.fullName
      ?.split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('') || 'HD';

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
      return;
    }

    logout();
    navigate('/login', { replace: true });
  };

  const handleGlobalSearch = (event) => {
    event.preventDefault();

    const search = detectPolicySearchType(searchValue);

    if (!search) {
      navigate('/policies/search');
      return;
    }

    const params = new URLSearchParams();

    params.set(search.type, search.value);

    navigate(`/policies/search?${params.toString()}`);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div
            className="brand-mark"
            aria-hidden="true"
          >
            ◆
          </div>

          <div>
            <strong>HealthDekho</strong>

            <span>
              Secure Today. Healthier Tomorrow.
            </span>
          </div>
        </div>

        <nav
          className="sidebar-nav"
          aria-label="Primary navigation"
        >
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `sidebar-link${
                  isActive
                    ? ' sidebar-link-active'
                    : ''
                }`
              }
            >
              <span
                className="sidebar-icon"
                aria-hidden="true"
              >
                {item.icon}
              </span>

              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-promo">
          <div
            className="promo-icon"
            aria-hidden="true"
          >
            ☂
          </div>

          <strong>Protection Today</strong>

          <span>Brighter Tomorrow</span>

          <p>
            Explore insurance plans designed around
            your changing needs.
          </p>
        </div>

        <div className="sidebar-footer-links">
          <a href="mailto:support@healthdekho.example">
            Help & Support
          </a>

          <button
            type="button"
            onClick={handleLogout}
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="app-workspace">
        <header className="topbar">
          <div className="mobile-brand">
            <span
              className="brand-mark"
              aria-hidden="true"
            >
              ◆
            </span>

            <strong>HealthDekho</strong>
          </div>

          <form
            className="global-search"
            onSubmit={handleGlobalSearch}
          >
            <span aria-hidden="true">
              ⌕
            </span>

            <input
              type="search"
              value={searchValue}
              onChange={(event) =>
                setSearchValue(event.target.value)
              }
              placeholder="Search by policy ID or customer name"
              aria-label="Search policies"
            />
          </form>

          <div className="topbar-actions">
            <div className="profile-summary">
              <div className="profile-avatar">
                {initials}
              </div>

              <div>
                <strong>
                  {customer?.fullName ||
                    'HealthDekho Customer'}
                </strong>

                <span>
                  {customer?.customerId ||
                    'Customer'}
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="app-content">
          <div className="page-heading">
            <div>
              <p className="breadcrumb">
                Home / {title}
              </p>

              <h1>{title}</h1>

              {subtitle && (
                <p>{subtitle}</p>
              )}
            </div>
          </div>

          {children}
        </main>

        <footer className="app-footer">
          <span>
            © 2026 HealthDekho. All rights reserved.
          </span>

          <div>
            <a href="#privacy">
              Privacy Policy
            </a>

            <a href="#terms">
              Terms of Use
            </a>

            <a href="mailto:support@healthdekho.example">
              Support
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}