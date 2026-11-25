import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { extractErrorMessage } from '../api/client';
import {
  fetchAvailableProducts,
  fetchMyPolicies,
} from '../api/dashboardApi';import { useAuth } from '../auth/AuthContext';
import { formatCurrency, formatDate, formatEnum, formatTerm } from '../utils/format';
import AppShell from '../components/AppShell';
import DashboardPlanCarousel from '../components/DashboardPlanCarousel';

function useLoad(loader, fallbackError) {
  const [state, setState] = useState({ loading: true, data: [], error: '' });

  useEffect(() => {
    let active = true;
    loader()
      .then((data) => active && setState({ loading: false, data: data ?? [], error: '' }))
      .catch((error) => active && setState({ loading: false, data: [], error: extractErrorMessage(error, fallbackError) }));
    return () => {
      active = false;
    };
  }, [loader, fallbackError]);

  return state;
}
function PoliciesSection() {
  const {
    loading,
    data,
    error,
  } = useLoad(
    fetchMyPolicies,
    'Unable to load your policies.',
  );

  const getPolicyIcon = (policyType) => {
    const icons = {
      HEALTH: '♥',
      TERM: '☂',
      LIFE: '☂',
      SAVINGS: '◆',
      ACCIDENT: '✚',
      TRAVEL: '✈',
      HOME: '⌂',
    };

    return icons[policyType] || '◇';
  };

  return (
    <section
      className="my-policies-section"
      aria-labelledby="my-policies-heading"
    >
      <div className="section-title-row my-policies-heading">
        <div>
          <p className="eyebrow">MY COVERAGE</p>

          <h2 id="my-policies-heading">
            My Insurance Policies
          </h2>

          <p>
            View your registered coverage and manage premium
            payments.
          </p>
        </div>

        {!loading && !error && data.length > 0 && (
          <span className="result-count">
            {data.length}{' '}
            {data.length === 1
              ? 'active policy'
              : 'active policies'}
          </span>
        )}
      </div>

      {loading && (
        <div className="owned-policy-grid">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="owned-policy-card owned-policy-skeleton"
            />
          ))}
        </div>
      )}

      {error && (
        <div
          className="alert alert-error"
          role="alert"
        >
          {error}
        </div>
      )}

      {!loading && !error && data.length === 0 && (
        <div className="owned-policy-empty">
          <div
            className="owned-policy-empty-icon"
            aria-hidden="true"
          >
            ☂
          </div>

          <div>
            <h3>No registered policies yet</h3>

            <p>
              Explore available HealthDekho plans and register
              your first insurance policy.
            </p>
          </div>

          <Link
            to="/policies/available"
            className="btn btn-primary"
          >
            Explore Policies →
          </Link>
        </div>
      )}

      {!loading && !error && data.length > 0 && (
        <div className="owned-policy-grid">
          {data.map((policy) => (
            <article
              key={policy.policyNumber}
              className="owned-policy-card"
            >
              <div className="owned-policy-decoration" />

              <div className="owned-policy-header">
                <div
                  className="owned-policy-icon"
                  aria-hidden="true"
                >
                  {getPolicyIcon(policy.policyType)}
                </div>

                <div className="owned-policy-title">
                  <span>
                    {formatEnum(policy.policyType)}
                  </span>

                  <h3>{policy.policyName}</h3>

                  <p>{policy.policyNumber}</p>
                </div>

                <span
                  className={`owned-policy-status owned-policy-status-${String(
                    policy.status || '',
                  ).toLowerCase()}`}
                >
                  <span
                    className="owned-policy-status-dot"
                    aria-hidden="true"
                  />

                  {formatEnum(policy.status)}
                </span>
              </div>

              <div className="owned-policy-coverage">
                <span>Sum Insured</span>

                <strong>
                  {formatCurrency(policy.sumInsured)}
                </strong>

                <small>
                  Your total policy coverage
                </small>
              </div>

              <dl className="owned-policy-stats">
                <div>
                  <dt>Premium</dt>

                  <dd>
                    {formatCurrency(
                      policy.premiumAmount,
                    )}
                  </dd>

                  <small>
                    {formatEnum(
                      policy.premiumFrequency,
                    )}
                  </small>
                </div>

                <div>
                  <dt>Policy Term</dt>

                  <dd>
                    {formatTerm(
                      policy.termMonths,
                    )}
                  </dd>
                </div>
              </dl>

              <div className="owned-policy-dates">
                <div>
                  <span>Start Date</span>

                  <strong>
                    {formatDate(policy.startDate)}
                  </strong>
                </div>

                <div
                  className="owned-policy-date-line"
                  aria-hidden="true"
                >
                  <span />
                  <div />
                  <span />
                </div>

                <div>
                  <span>Maturity</span>

                  <strong>
                    {formatDate(
                      policy.maturityDate,
                    )}
                  </strong>
                </div>
              </div>

              <div className="owned-policy-actions">
                <Link
                  to={`/policies/payments?policyNumber=${encodeURIComponent(
                    policy.policyNumber,
                  )}`}
                  className="btn btn-primary"
                >
                  Pay Premium
                </Link>

                <Link
                  to={`/policies/payments?policyNumber=${encodeURIComponent(
                    policy.policyNumber,
                  )}`}
                  className="btn btn-ghost"
                >
                  Payment Details
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default function DashboardPage() {
  const { customer, logout } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const availableProducts = useLoad(
  fetchAvailableProducts,
  'Unable to load available insurance policies.',
);

  return (
    <AppShell
      title="Customer Dashboard"
      subtitle={`Welcome back, ${customer?.fullName || 'Customer'}. Manage your coverage, recommendations and premium payments.`}
      onLogout={handleLogout}
    >
      <section className="dashboard-banner">
        <div>
          <span className="banner-label">YOUR COVERAGE</span>
          <h2>Protection for today and confidence for tomorrow</h2>
          <p>
            Review active policies, discover suitable plans and keep premium
            payments up to date.
          </p>
        </div>
        <div className="banner-shield" aria-hidden="true">
          ◆
        </div>
      </section>

      <PoliciesSection />

      <DashboardPlanCarousel
  products={availableProducts.data}
  loading={availableProducts.loading}
  error={availableProducts.error}
/>

      <section className="dashboard-discovery-card">
  <div>
    <p className="eyebrow">EXPLORE COVERAGE</p>
    <h2>Looking for additional protection?</h2>
    <p>
      Browse active insurance products that are available to you
      and compare coverage, premium and policy terms.
    </p>
  </div>

  <Link
    to="/policies/available"
    className="btn btn-primary"
  >
    Browse Available Policies →
  </Link>
</section>


    </AppShell>
  );
}
