import { useState } from 'react';
import { extractErrorMessage } from '../api/client';
import { searchPolicies } from '../api/dashboardApi';
import { useAuth } from '../auth/AuthContext';
import { formatCurrency, formatDate, formatEnum, todayIso } from '../utils/format';
import AppShell from '../components/AppShell';

export const PAGE_SIZE = 10;
const POLICY_NUMBER_PATTERN = /^[A-Za-z0-9-]+$/;
const NAME_PATTERN = /^[\p{L} .'-]+$/u;

const EMPTY_FORM = { customerName: '', policyNumber: '', dateOfBirth: '' };

/** Mirrors the backend rules so invalid criteria are rejected before a request is sent. */
export function validateCriteria(form) {
  const customerName = form.customerName.trim().replace(/\s+/g, ' ');
  const policyNumber = form.policyNumber.trim();
  const { dateOfBirth } = form;
  const errors = {};

  if (customerName && !NAME_PATTERN.test(customerName)) {
    errors.customerName = 'Customer name may contain only letters, spaces, apostrophes, periods and hyphens.';
  } else if (customerName && customerName.length < 2) {
    errors.customerName = 'Customer name must contain at least 2 characters.';
  } else if (customerName.length > 100) {
    errors.customerName = 'Customer name cannot exceed 100 characters.';
  }
  if (policyNumber && !POLICY_NUMBER_PATTERN.test(policyNumber)) {
    errors.policyNumber = 'Policy identifier may contain only letters, digits and hyphens.';
  } else if (policyNumber.length > 30) {
    errors.policyNumber = 'Policy identifier cannot exceed 30 characters.';
  }
  if (dateOfBirth && dateOfBirth > todayIso()) {
    errors.dateOfBirth = 'Date of birth cannot be in the future.';
  }
  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  let formError = '';
  if (!customerName && !policyNumber) {
    formError = dateOfBirth
      ? 'Date of Birth can only be used together with Policy Identifier.'
      : 'Enter a Policy Identifier or Customer Name to search.';
  } else if (customerName && policyNumber) {
    formError = 'Search by Policy Identifier, Customer Name, or Policy Identifier and Date of Birth.';
  } else if (customerName && dateOfBirth) {
    formError = 'Date of Birth can only be used together with Policy Identifier.';
  }
  if (formError) {
    return { errors, formError };
  }

  const criteria = customerName ? { customerName } : { policyNumber };
  if (policyNumber && dateOfBirth) {
    criteria.dateOfBirth = dateOfBirth;
  }
  return { errors, criteria };
}

/** FR-5 customer insurance policy search. */
export default function PolicySearchPage() {
    const { logout } = useAuth();

  const handleLogout = () => {
    logout();
  };
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [criteria, setCriteria] = useState(null);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  const runSearch = async (nextCriteria, page) => {
    setLoading(true);
    setSearchError('');
    try {
      const data = await searchPolicies({ ...nextCriteria, page, size: PAGE_SIZE });
      setCriteria(nextCriteria);
      setResponse(data ?? null);
    } catch (error) {
      setResponse(null);
      setSearchError(extractErrorMessage(error, 'Unable to search policies. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
    setFormError('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const result = validateCriteria(form);
    setErrors(result.errors);
    setFormError(result.formError ?? '');
    if (result.criteria) {
      runSearch(result.criteria, 0);
    }
  };

  const handleReset = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setFormError('');
    setCriteria(null);
    setResponse(null);
    setSearchError('');
  };

  const field = (name, label, props = {}) => (
    <label htmlFor={`search-${name}`}>
      {label}
      <input
        id={`search-${name}`}
        name={name}
        value={form[name]}
        onChange={handleChange}
        aria-invalid={Boolean(errors[name])}
        {...props}
      />
      {errors[name] && <span className="field-error">{errors[name]}</span>}
    </label>
  );

  const results = response?.results ?? [];
  const page = response?.page ?? 0;
  const totalPages = response?.totalPages ?? 0;

  return (
    <AppShell
  title="Policy Search"
  subtitle="Find customer policies using approved search criteria."
  onLogout={handleLogout}
>
    <div className="content">
        <section className="card" aria-labelledby="search-criteria-heading">
          <h2 id="search-criteria-heading">Search Criteria</h2>
          <p className="hint">
            Search by Policy Identifier, Customer Name, or Policy Identifier and Date of Birth.
          </p>
          <form onSubmit={handleSubmit} noValidate aria-label="Policy search criteria" className="form-grid">
            {field('customerName', 'Customer Name', { type: 'text', placeholder: 'e.g. Demo' })}
            {field('policyNumber', 'Policy Identifier', { type: 'text', placeholder: 'e.g. HDP-2026-0001' })}
            {field('dateOfBirth', 'Date of Birth', { type: 'date', max: todayIso() })}
            <div className="search-form-actions">
  <button type="submit" className="btn btn-primary" disabled={loading}>
    {loading ? 'Searching...' : 'Search'}
  </button>

  <button
    type="button"
    className="btn btn-secondary"
    onClick={handleReset}
    disabled={loading}
  >
    Clear
  </button>
</div>

          </form>
          {formError && <div className="alert alert-error" role="alert">{formError}</div>}
          {searchError && <div className="alert alert-error" role="alert">{searchError}</div>}
        </section>

        {response && (
          <section className="card" aria-labelledby="search-results-heading">
            <h2 id="search-results-heading">Search Results</h2>
            {results.length === 0 ? (
              <p className="empty-message">No matching policies found.</p>
            ) : (
              <>
                <p>{response.totalElements} matching {response.totalElements === 1 ? 'policy' : 'policies'} found.</p>
                <div className="table-wrapper">
                  <table aria-label="Policy search results">
                    <thead>
                      <tr>
                        <th>Policy Identifier</th>
                        <th>Customer Name</th>
                        <th>Date of Birth</th>
                        <th>Policy Name</th>
                        <th>Policy Type</th>
                        <th>Policy Start Date</th>
                        <th>Policy Maturity Date</th>
                        <th>Total Premium Payable</th>
                        <th>Premium Payment Status</th>
                        <th>Total Premium Paid</th>
                        <th>Remaining Premium</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((policy) => (
                        <tr key={policy.policyNumber}>
                          <td>{policy.policyNumber}</td>
                          <td>{policy.customerName}</td>
                          <td>{formatDate(policy.dateOfBirth)}</td>
                          <td>{policy.policyName}</td>
                          <td>{formatEnum(policy.policyType)}</td>
                          <td>{formatDate(policy.startDate)}</td>
                          <td>{formatDate(policy.maturityDate)}</td>
                          <td>{formatCurrency(policy.totalPremiumPayable)}</td>
                          <td><span className="status">{formatEnum(policy.premiumPaymentStatus)}</span></td>
                          <td>{formatCurrency(policy.totalPremiumPaid)}</td>
                          <td>{formatCurrency(policy.remainingPremium)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <nav aria-label="Search results pagination">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={loading || page === 0}
                      onClick={() => runSearch(criteria, page - 1)}
                    >
                      Previous
                    </button>{' '}
                    <span>Page {page + 1} of {totalPages}</span>{' '}
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={loading || page + 1 >= totalPages}
                      onClick={() => runSearch(criteria, page + 1)}
                    >
                      Next
                    </button>
                  </nav>
                )}
              </>
            )}
          </section>
        )}
    </div>
    </AppShell>
  );
}
