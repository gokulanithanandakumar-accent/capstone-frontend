import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { extractErrorMessage } from '../api/client';
import { fetchRegistrationDetails, registerPolicy } from '../api/dashboardApi';
import { formatCurrency, formatDate, formatEnum, formatTerm, todayIso } from '../utils/format';

function validateStartDate(startDate) {
  if (!startDate) {
    return 'Policy start date is required.';
  }
  if (startDate < todayIso()) {
    return 'Policy start date cannot be in the past.';
  }
  return '';
}

function DetailList({ fields }) {
  return (
    <dl className="details">
      {fields.map(([label, value]) => (
        <div key={label} className="detail-row">
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** FR-3 policy registration: pre-populated customer/product details, calculated values and submission. */
export default function PolicyRegistrationPage() {
  const location = useLocation();
  const product = location.state?.product;
  const recommendationItemId = location.state?.recommendationItemId ?? null;

  const [startDate, setStartDate] = useState(todayIso);
  const [startDateError, setStartDateError] = useState('');
  const [details, setDetails] = useState(null);
  const [detailsError, setDetailsError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [registration, setRegistration] = useState(null);

  const productId = product?.productId;

  useEffect(() => {
    if (!productId || validateStartDate(startDate)) {
      return undefined;
    }
    let cancelled = false;
    setDetailsError('');
    fetchRegistrationDetails(productId, startDate)
      .then((data) => {
        if (!cancelled) {
          setDetails(data ?? null);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setDetails(null);
          setDetailsError(extractErrorMessage(error, 'Unable to load registration details. Please try again.'));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [productId, startDate]);

  if (!product) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleStartDateChange = (event) => {
    const value = event.target.value;
    setStartDate(value);
    setStartDateError(validateStartDate(value));
    setSubmitError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const error = validateStartDate(startDate);
    setStartDateError(error);
    if (error || !details) {
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      setRegistration(await registerPolicy({ productId, startDate, recommendationItemId }));
    } catch (apiError) {
      setSubmitError(extractErrorMessage(apiError, 'Unable to register the policy. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const source = details ?? product;
  const customerFields = [
    ['Customer Name', details?.customerName ?? '-'],
    ['Date of Birth', formatDate(details?.dateOfBirth)],
    ['Email', details?.email ?? '-'],
    ['Phone', details?.phone ?? '-'],
  ];
  const productFields = [
    ['Product Code', source.productCode],
    ['Policy Name', source.policyName],
    ['Policy Type', formatEnum(source.policyType)],
    ['Policy Term', formatTerm(source.termMonths)],
    ['Sum Insured', formatCurrency(source.sumInsured)],
    ['Premium Frequency', formatEnum(source.premiumFrequency)],
    ['Premium Amount', formatCurrency(source.premiumAmount)],
  ];
  const calculatedFields = [
    ['Policy Maturity Date', formatDate(details?.maturityDate)],
    ['Number of Installments', details?.numberOfInstallments ?? '-'],
    ['Total Premium Payable', formatCurrency(details?.totalPremiumPayable)],
  ];

  return (
    <div className="page">
      <header className="app-header">
        <h1>Policy Registration</h1>
        <Link to="/dashboard" className="btn btn-secondary">Back to Dashboard</Link>
      </header>
      <main className="content">
        {registration ? (
          <section className="card" aria-labelledby="registration-success-heading">
            <h2 id="registration-success-heading">Registration Successful</h2>
            <div className="alert alert-success" role="status">{registration.message}</div>
            <DetailList
              fields={[
                ['Policy Number', registration.policyNumber],
                ['Policy Name', registration.policyName],
                ['Policy Start Date', formatDate(registration.startDate)],
                ['Policy Maturity Date', formatDate(registration.maturityDate)],
                ['Number of Installments', registration.numberOfInstallments],
                ['Total Premium Payable', formatCurrency(registration.totalPremiumPayable)],
                ['Status', formatEnum(registration.status)],
              ]}
            />
            <Link to="/dashboard" className="btn btn-primary">Go to Dashboard</Link>
          </section>
        ) : (
          <form onSubmit={handleSubmit} noValidate aria-label="Policy registration">
            <section className="card" aria-labelledby="customer-details-heading">
              <h2 id="customer-details-heading">Customer Details</h2>
              <DetailList fields={customerFields} />
            </section>

            <section className="card" aria-labelledby="selected-product-heading">
              <h2 id="selected-product-heading">Selected Insurance Product</h2>
              {recommendationItemId && <p className="hint">Selected from your AI recommendations.</p>}
              <DetailList fields={productFields} />
            </section>

            <section className="card" aria-labelledby="policy-dates-heading">
              <h2 id="policy-dates-heading">Policy Dates and Premium</h2>
              <div className="form-grid">
                <label htmlFor="policy-start-date">
                  Policy Start Date
                  <input
                    id="policy-start-date"
                    name="startDate"
                    type="date"
                    min={todayIso()}
                    required
                    value={startDate}
                    onChange={handleStartDateChange}
                    aria-invalid={Boolean(startDateError)}
                  />
                  {startDateError && <span className="field-error">{startDateError}</span>}
                </label>
              </div>
              <DetailList fields={calculatedFields} />
              {detailsError && <div className="alert alert-error" role="alert">{detailsError}</div>}
              {submitError && <div className="alert alert-error" role="alert">{submitError}</div>}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting || !details || Boolean(startDateError)}
              >
                {submitting ? 'Registering policy...' : 'Register Policy'}
              </button>
            </section>
          </form>
        )}
      </main>
    </div>
  );
}