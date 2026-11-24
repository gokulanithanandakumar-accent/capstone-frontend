import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { extractErrorMessage } from '../api/client';
import { fetchAvailableProducts, fetchMyPolicies } from '../api/dashboardApi';
import { useAuth } from '../auth/AuthContext';
import { formatCurrency, formatDate, formatEnum, formatTerm } from '../utils/format';
import RecommendationsSection from './RecommendationsSection';
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

  const handleRegister = (product) => {
    navigate('/policies/register', { state: { product } });
  };

  return (
    <section className="card" aria-labelledby="available-heading">
      <h2 id="available-heading">Available Insurance Policies</h2>
      {loading && <p>Loading available policies...</p>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {!loading && !error && data.length === 0 && (
        <p className="empty-message">There are no additional insurance policies available for you at the moment.</p>
      )}
      {!loading && !error && data.length > 0 && (
        <div className="table-wrapper">
          <table aria-label="Available insurance policies">
            <thead>
              <tr>
                <th>Product Code</th>
                <th>Policy Name</th>
                <th>Policy Type</th>
                <th>Policy Term</th>
                <th>Sum Insured</th>
                <th>Premium Frequency</th>
                <th>Premium Amount</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.map((product) => (
                <tr key={product.productId}>
                  <td>{product.productCode}</td>
                  <td>{product.policyName}</td>
                  <td>{formatEnum(product.policyType)}</td>
                  <td>{formatTerm(product.termMonths)}</td>
                  <td>{formatCurrency(product.sumInsured)}</td>
                  <td>{formatEnum(product.premiumFrequency)}</td>
                  <td>{formatCurrency(product.premiumAmount)}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => handleRegister(product)}
                      aria-label={`Register ${product.policyName}`}
                    >
                      Register
                    </button>
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

export default function DashboardPage() {
  const { customer, logout } = useAuth();
  const navigate = useNavigate();
  const availableProducts = useLoad(fetchAvailableProducts, 'Unable to load available insurance policies.');

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="page">
      <header className="app-header">
        <div>
          <h1>HealthDekho</h1>
          <p>Welcome, {customer?.fullName}</p>
        </div>
        <div>
          <Link to="/policies/search" className="btn btn-secondary">Search Policies</Link>{' '}
          <Link to="/policies/payments" className="btn btn-secondary">Premium Payments</Link>{' '}
          <button type="button" className="btn btn-secondary" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>
      <main className="content">
        <PoliciesSection />
        <AvailableProductsSection {...availableProducts} />
        <RecommendationsSection availableProducts={availableProducts.data} />
      </main>
    </div>
  );
}
