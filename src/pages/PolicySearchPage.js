import { useCallback, useEffect, useState } from 'react';
import {
  Link,
  useSearchParams,
} from 'react-router-dom';
import { extractErrorMessage } from '../api/client';
import { searchPolicies } from '../api/dashboardApi';
import AppShell from '../components/AppShell';
import {
  formatCurrency,
  formatDate,
  formatEnum,
  todayIso,
} from '../utils/format';

export const PAGE_SIZE = 10;

const POLICY_NUMBER_PATTERN = /^[A-Za-z0-9-]+$/;
const NAME_PATTERN = /^[\p{L} .'-]+$/u;

const EMPTY_FORM = {
  customerName: '',
  policyNumber: '',
  dateOfBirth: '',
};

/**
 * Mirrors the backend rules so invalid criteria are rejected
 * before a request is sent.
 */
export function validateCriteria(form) {
  const customerName = form.customerName
    .trim()
    .replace(/\s+/g, ' ');

  const policyNumber = form.policyNumber.trim();
  const { dateOfBirth } = form;

  const errors = {};

  if (
    customerName &&
    !NAME_PATTERN.test(customerName)
  ) {
    errors.customerName =
      'Customer name may contain only letters, spaces, apostrophes, periods and hyphens.';
  } else if (
    customerName &&
    customerName.length < 2
  ) {
    errors.customerName =
      'Customer name must contain at least 2 characters.';
  } else if (customerName.length > 100) {
    errors.customerName =
      'Customer name cannot exceed 100 characters.';
  }

  if (
    policyNumber &&
    !POLICY_NUMBER_PATTERN.test(policyNumber)
  ) {
    errors.policyNumber =
      'Policy identifier may contain only letters, digits and hyphens.';
  } else if (policyNumber.length > 30) {
    errors.policyNumber =
      'Policy identifier cannot exceed 30 characters.';
  }

  if (
    dateOfBirth &&
    dateOfBirth > todayIso()
  ) {
    errors.dateOfBirth =
      'Date of birth cannot be in the future.';
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
    formError =
      'Search by Policy Identifier, Customer Name, or Policy Identifier and Date of Birth.';
  } else if (customerName && dateOfBirth) {
    formError =
      'Date of Birth can only be used together with Policy Identifier.';
  }

  if (formError) {
    return {
      errors,
      formError,
    };
  }

  const criteria = customerName
    ? { customerName }
    : { policyNumber };

  if (policyNumber && dateOfBirth) {
    criteria.dateOfBirth = dateOfBirth;
  }

  return {
    errors,
    criteria,
  };
}

/**
 * FR-5 customer insurance policy search.
 */
export default function PolicySearchPage() {
  const [searchParams, setSearchParams] =
    useSearchParams();

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [criteria, setCriteria] = useState(null);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] =
    useState('');

  const urlCustomerName =
    searchParams.get('customerName') ?? '';

  const urlPolicyNumber =
    searchParams.get('policyNumber') ?? '';

  const urlDateOfBirth =
    searchParams.get('dateOfBirth') ?? '';

  const runSearch = useCallback(
    async (nextCriteria, page) => {
      setLoading(true);
      setSearchError('');

      try {
        const data = await searchPolicies({
          ...nextCriteria,
          page,
          size: PAGE_SIZE,
        });

        setCriteria(nextCriteria);
        setResponse(data ?? null);
      } catch (error) {
        setResponse(null);

        setSearchError(
          extractErrorMessage(
            error,
            'Unable to search policies. Please try again.',
          ),
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /*
   * Reads criteria supplied by the navbar search.
   * Valid URL criteria are searched automatically.
   */
  useEffect(() => {
    const nextForm = {
      customerName: urlCustomerName,
      policyNumber: urlPolicyNumber,
      dateOfBirth: urlDateOfBirth,
    };

    setForm(nextForm);
    setErrors({});
    setFormError('');
    setSearchError('');
    setResponse(null);
    setCriteria(null);

    const hasUrlSearch =
      Boolean(urlCustomerName) ||
      Boolean(urlPolicyNumber) ||
      Boolean(urlDateOfBirth);

    if (!hasUrlSearch) {
      return;
    }

    const result = validateCriteria(nextForm);

    setErrors(result.errors ?? {});
    setFormError(result.formError ?? '');

    if (result.criteria) {
      runSearch(result.criteria, 0);
    }
  }, [
    urlCustomerName,
    urlPolicyNumber,
    urlDateOfBirth,
    runSearch,
  ]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setErrors((current) => ({
      ...current,
      [name]: '',
    }));

    setFormError('');
    setSearchError('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const result = validateCriteria(form);

    setErrors(result.errors ?? {});
    setFormError(result.formError ?? '');
    setSearchError('');

    if (!result.criteria) {
      setResponse(null);
      setCriteria(null);
      return;
    }

    const nextParams = {};

    if (result.criteria.customerName) {
      nextParams.customerName =
        result.criteria.customerName;
    }

    if (result.criteria.policyNumber) {
      nextParams.policyNumber =
        result.criteria.policyNumber;
    }

    if (result.criteria.dateOfBirth) {
      nextParams.dateOfBirth =
        result.criteria.dateOfBirth;
    }

    /*
     * Updating the URL triggers the effect and performs the search.
     * If the URL already contains the same criteria, run it directly.
     */
    const nextQuery =
      new URLSearchParams(nextParams).toString();

    if (nextQuery === searchParams.toString()) {
      runSearch(result.criteria, 0);
    } else {
      setSearchParams(nextParams);
    }
  };

  const handleReset = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setFormError('');
    setCriteria(null);
    setResponse(null);
    setSearchError('');

    setSearchParams({});
  };

  const field = (
    name,
    label,
    props = {},
  ) => (
    <label htmlFor={`search-${name}`}>
      {label}

      <input
        id={`search-${name}`}
        name={name}
        value={form[name]}
        onChange={handleChange}
        aria-invalid={Boolean(errors[name])}
        aria-describedby={
          errors[name]
            ? `search-${name}-error`
            : undefined
        }
        {...props}
      />

      {errors[name] && (
        <span
          id={`search-${name}-error`}
          className="field-error"
        >
          {errors[name]}
        </span>
      )}
    </label>
  );

  const results = response?.results ?? [];
  const page = response?.page ?? 0;
  const totalPages = response?.totalPages ?? 0;

  return (
    <AppShell
      title="Policy Search"
      subtitle="Search by Policy Identifier, Customer Name, or Policy Identifier and Date of Birth."
    >
      <div className="content">
        <section
          className="card"
          aria-labelledby="search-criteria-heading"
        >
          <h2 id="search-criteria-heading">
            Search Criteria
          </h2>

          <p className="hint">
            Search by Policy Identifier, Customer Name,
            or Policy Identifier and Date of Birth.
          </p>

          <form
            onSubmit={handleSubmit}
            noValidate
            aria-label="Policy search criteria"
            className="form-grid"
          >
            {field(
              'customerName',
              'Customer Name',
              {
                type: 'text',
                placeholder: 'e.g. Demo',
                maxLength: 100,
              },
            )}

            {field(
              'policyNumber',
              'Policy Identifier',
              {
                type: 'text',
                placeholder:
                  'e.g. HDP-2026-0001',
                maxLength: 30,
              },
            )}

            {field(
              'dateOfBirth',
              'Date of Birth',
              {
                type: 'date',
                max: todayIso(),
              },
            )}

            <div className="search-form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading
                  ? 'Searching...'
                  : 'Search'}
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

          {formError && (
            <div
              className="alert alert-error"
              role="alert"
            >
              {formError}
            </div>
          )}

          {searchError && (
            <div
              className="alert alert-error"
              role="alert"
            >
              {searchError}
            </div>
          )}
        </section>

        {response && (
          <section
            className="card"
            aria-labelledby="search-results-heading"
          >
            <h2 id="search-results-heading">
              Search Results
            </h2>

            {results.length === 0 ? (
  <div className="search-result-empty">
    <div
      className="search-result-empty-icon"
      aria-hidden="true"
    >
      ⌕
    </div>

    <h3>No matching policies found</h3>

    <p>
      Try changing the policy identifier, customer
      name or date of birth.
    </p>
  </div>
) : (
  <>
    <div className="search-results-summary">
      <div>
        <strong>
          {response.totalElements}
        </strong>

        <span>
          {response.totalElements === 1
            ? ' matching policy found'
            : ' matching policies found'}
        </span>
      </div>

      <span className="result-count">
        Page {page + 1} of{' '}
        {Math.max(totalPages, 1)}
      </span>
    </div>

    <div className="search-policy-results">
      {results.map((policy) => (
        <article
          key={policy.policyNumber}
          className="search-policy-card"
        >
          <div className="search-policy-accent" />

          <div className="search-policy-heading">
            <div
              className="search-policy-icon"
              aria-hidden="true"
            >
              ◇
            </div>

            <div className="search-policy-name">
              <span>
                {formatEnum(policy.policyType)}
              </span>

              <h3>{policy.policyName}</h3>

              <p>{policy.policyNumber}</p>
            </div>

            <span className="status">
              {formatEnum(
                policy.premiumPaymentStatus,
              )}
            </span>
          </div>

          <div className="search-policy-customer">
            <div>
              <span>Customer</span>
              <strong>
                {policy.customerName}
              </strong>
            </div>

            <div>
              <span>Date of Birth</span>
              <strong>
                {formatDate(
                  policy.dateOfBirth,
                )}
              </strong>
            </div>
          </div>

          <div className="search-policy-financials">
            <div>
              <span>
                Total Premium Payable
              </span>

              <strong>
                {formatCurrency(
                  policy.totalPremiumPayable,
                )}
              </strong>
            </div>

            <div>
              <span>Total Premium Paid</span>

              <strong className="search-money-paid">
                {formatCurrency(
                  policy.totalPremiumPaid,
                )}
              </strong>
            </div>

            <div>
              <span>Remaining Premium</span>

              <strong className="search-money-remaining">
                {formatCurrency(
                  policy.remainingPremium,
                )}
              </strong>
            </div>
          </div>

          <div className="search-policy-period">
            <div>
              <span>Policy Start</span>

              <strong>
                {formatDate(policy.startDate)}
              </strong>
            </div>

            <div
              className="search-period-line"
              aria-hidden="true"
            >
              <i />
              <span />
              <i />
            </div>

            <div>
              <span>Policy Maturity</span>

              <strong>
                {formatDate(
                  policy.maturityDate,
                )}
              </strong>
            </div>
          </div>

          <div className="search-policy-actions">
            <Link
              to={`/policies/payments?policyNumber=${encodeURIComponent(
                policy.policyNumber,
              )}`}
              className="btn btn-primary"
            >
              View Premiums
            </Link>
          </div>
        </article>
      ))}
    </div>

    {totalPages > 1 && (
      <nav
        className="search-pagination"
        aria-label="Search results pagination"
      >
        <button
          type="button"
          className="btn btn-secondary"
          disabled={
            loading ||
            page === 0 ||
            !criteria
          }
          onClick={() =>
            runSearch(criteria, page - 1)
          }
        >
          ← Previous
        </button>

        <span>
          Page <strong>{page + 1}</strong>{' '}
          of <strong>{totalPages}</strong>
        </span>

        <button
          type="button"
          className="btn btn-secondary"
          disabled={
            loading ||
            page + 1 >= totalPages ||
            !criteria
          }
          onClick={() =>
            runSearch(criteria, page + 1)
          }
        >
          Next →
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