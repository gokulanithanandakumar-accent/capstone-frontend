import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { extractErrorMessage } from '../api/client';
import { fetchAvailableProducts } from '../api/dashboardApi';
import AppShell from '../components/AppShell';
import InsuranceProductCard from '../components/InsuranceProductCard';
import { formatEnum } from '../utils/format';

export default function AvailablePoliciesPage() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [policyType, setPolicyType] = useState('');

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError('');

    fetchAvailableProducts()
      .then((data) => {
        if (active) {
          setProducts(data ?? []);
        }
      })
      .catch((apiError) => {
        if (active) {
          setProducts([]);
          setError(
            extractErrorMessage(
              apiError,
              'Unable to load available insurance policies.',
            ),
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const policyTypes = useMemo(
    () =>
      [...new Set(products.map((product) => product.policyType))]
        .filter(Boolean)
        .sort(),
    [products],
  );

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return products.filter((product) => {
      const matchesQuery =
        !normalizedQuery ||
        product.policyName?.toLowerCase().includes(normalizedQuery) ||
        product.productCode?.toLowerCase().includes(normalizedQuery) ||
        product.policyType?.toLowerCase().includes(normalizedQuery);

      const matchesType =
        !policyType || product.policyType === policyType;

      return matchesQuery && matchesType;
    });
  }, [products, query, policyType]);

  const handleRegister = (product) => {
    navigate('/policies/register', {
      state: { product },
    });
  };

  return (
    <AppShell
      title="Available Insurance Policies"
      subtitle="Explore active insurance products that you have not already registered for."
    >
      <section aria-labelledby="available-heading">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">EXPLORE COVERAGE</p>
            <h2 id="available-heading">
              Find the right protection
            </h2>
            <p>
              Compare eligible HealthDekho plans and register for
              the coverage that suits your needs.
            </p>
          </div>

          {!loading && !error && (
            <span className="result-count">
              {filteredProducts.length} available
            </span>
          )}
        </div>

        <div className="filter-panel">
          <label className="filter-search">
            <span>Search products</span>

            <input
              type="search"
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder="Search by policy name, type or product code"
            />
          </label>

          <label>
            <span>Policy type</span>

            <select
              value={policyType}
              onChange={(event) =>
                setPolicyType(event.target.value)
              }
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
          <div
            className="loading-grid"
            aria-label="Loading policies"
          >
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="product-card product-skeleton"
              />
            ))}
          </div>
        )}

        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}

        {!loading &&
          !error &&
          filteredProducts.length === 0 && (
            <div className="empty-state">
              <div
                className="empty-state-icon"
                aria-hidden="true"
              >
                ▦
              </div>

              <h3>No available insurance policies</h3>

              <p>
                You may already be registered for all currently
                eligible products, or the selected filters returned
                no matches.
              </p>
            </div>
          )}

        {!loading &&
          !error &&
          filteredProducts.length > 0 && (
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
    </AppShell>
  );
}