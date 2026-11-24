import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { extractErrorMessage } from '../api/client';
import { fetchAvailableProducts, fetchMyPolicies } from '../api/dashboardApi';
import { useAuth } from '../auth/AuthContext';
import { formatCurrency, formatDate, formatEnum, formatTerm } from '../utils/format';
import AppShell from '../components/AppShell';
import InsuranceProductCard from '../components/InsuranceProductCard';

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
  const { loading, data, error } = useLoad(fetchMyPolicies, 'Unable to load your policies.');

  return (
    <section className="card" aria-labelledby="my-policies-heading">
      <h2 id="my-policies-heading">My Insurance Policies</h2>
      {loading && <p>Loading your policies...</p>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {!loading && !error && data.length === 0 && (
        <p className="empty-message">You have not registered any insurance policy yet.</p>
      )}
      {!loading && !error && data.length > 0 && (
        <div className="table-wrapper">
          <table aria-label="My insurance policies">
            <thead>
              <tr>
                <th>Policy Identifier</th>
                <th>Policy Name</th>
                <th>Policy Type</th>
                <th>Policy Term</th>
                <th>Policy Start Date</th>
                <th>Policy Maturity Date</th>
                <th>Premium Frequency</th>
                <th>Premium Amount</th>
                <th>Sum Insured</th>
                <th>Policy Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.map((policy) => (
                <tr key={policy.policyNumber}>
                  <td>{policy.policyNumber}</td>
                  <td>{policy.policyName}</td>
                  <td>{formatEnum(policy.policyType)}</td>
                  <td>{formatTerm(policy.termMonths)}</td>
                  <td>{formatDate(policy.startDate)}</td>
                  <td>{formatDate(policy.maturityDate)}</td>
                  <td>{formatEnum(policy.premiumFrequency)}</td>
                  <td>{formatCurrency(policy.premiumAmount)}</td>
                  <td>{formatCurrency(policy.sumInsured)}</td>
                  <td><span className="status">{formatEnum(policy.status)}</span></td>
                  <td>
                    <Link
                      to={`/policies/payments?policyNumber=${encodeURIComponent(policy.policyNumber)}`}
                      className="btn btn-primary"
                      aria-label={`Pay premium for ${policy.policyNumber}`}
                    >
                      Pay Premium
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function AvailableProductsSection({ loading, data, error }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [policyType, setPolicyType] = useState('');

  const policyTypes = [
    ...new Set((data ?? []).map((product) => product.policyType)),
  ];

  const filteredProducts = (data ?? []).filter((product) => {
    const normalizedQuery = query.trim().toLowerCase();

    const matchesQuery =
      !normalizedQuery ||
      product.policyName?.toLowerCase().includes(normalizedQuery) ||
      product.productCode?.toLowerCase().includes(normalizedQuery) ||
      product.policyType?.toLowerCase().includes(normalizedQuery);

    const matchesType =
      !policyType || product.policyType === policyType;

    return matchesQuery && matchesType;
  });

  const handleRegister = (product) => {
    navigate('/policies/register', { state: { product } });
  };

  return (
    <section id="available-policies" aria-labelledby="available-heading">
      <div className="section-title-row">
        <div>
          <p className="eyebrow">EXPLORE COVERAGE</p>
          <h2 id="available-heading">Available Insurance Policies</h2>
          <p>
            Compare eligible plans and register for the coverage that suits
            your needs.
          </p>
        </div>
        <span className="result-count">
          {filteredProducts.length} available
        </span>
      </div>

      <div className="filter-panel">
        <label className="filter-search">
          <span>Search products</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by policy name, type or product code"
          />
        </label>

        <label>
          <span>Policy type</span>
          <select
            value={policyType}
            onChange={(event) => setPolicyType(event.target.value)}
          >
            <option value="">All types</option>
            {policyTypes.map((type) => (
              <option key={type} value={type}>
                {formatEnum(type)}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            setQuery('');
            setPolicyType('');
          }}
        >
          Clear Filters
        </button>
      </div>

      {loading && (
        <div className="loading-grid" aria-label="Loading products">
          {[1, 2, 3].map((item) => (
            <div key={item} className="product-card product-skeleton" />
          ))}
        </div>
      )}

      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      {!loading && !error && filteredProducts.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">▦</div>
          <h3>No insurance policies found</h3>
          <p>Try changing or clearing the selected filters.</p>
        </div>
      )}

      {!loading && !error && filteredProducts.length > 0 && (
        <div className="product-grid">
          {filteredProducts.map((product) => (
            <InsuranceProductCard
              key={product.productId}
              product={product}
              onRegister={handleRegister}
            />
          ))}
        </div>
      )}
    </section>
  );
}
export default function DashboardPage() {
  const { customer, logout } = useAuth();
  const navigate = useNavigate();
  const availableProducts = useLoad(
    fetchAvailableProducts,
    'Unable to load available insurance policies.',
  );

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

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

      <AvailableProductsSection {...availableProducts} />

    </AppShell>
  );
}
