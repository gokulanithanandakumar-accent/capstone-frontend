import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { extractErrorMessage } from '../api/client';
import { fetchPolicyPremiums, payPremiums } from '../api/dashboardApi';
import {
  formatCurrency,
  formatDate,
  formatEnum,
  formatTerm,
} from '../utils/format';
import AppShell from '../components/AppShell';

const PAYMENT_METHODS = [
  ['UPI', 'UPI'],
  ['NET_BANKING', 'Net Banking'],
  ['CARD', 'Card'],
];
const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

function formatPeriod(yearMonth) {
  if (!yearMonth) {
    return '-';
  }
  const [year, month] = yearMonth.split('-');
  return `${month}-${year}`;
}

function validateAmount(value, amountDue) {
  if (!value || !value.trim()) {
    return 'Amount is required.';
  }
  if (!AMOUNT_PATTERN.test(value.trim())) {
    return 'Enter a valid amount with up to 2 decimal places.';
  }
  const amount = Number(value);
  if (amount <= 0) {
    return 'Amount must be greater than zero.';
  }
  if (amount > Number(amountDue)) {
    return `Amount cannot exceed the amount due of ${formatCurrency(amountDue)}.`;
  }
  return '';
}

function PolicySummary({ policy }) {
  const fields = [
    ['Policy Identifier', policy.policyNumber],
    ['Customer Name', policy.customerName],
    ['Policy Name', policy.policyName],
    ['Policy Term', formatTerm(policy.termMonths)],
    ['Policy Start Date', formatDate(policy.startDate)],
    ['Policy Maturity Date', formatDate(policy.maturityDate)],
    ['Policy Status', formatEnum(policy.policyStatus)],
    ['Total Premium Payable', formatCurrency(policy.totalPremiumPayable)],
    ['Total Premium Paid', formatCurrency(policy.totalPremiumPaid)],
    ['Total Remaining Premium', formatCurrency(policy.totalRemainingPremium)],
    ['Total Late Payment Penalty Paid', formatCurrency(policy.totalPenaltyPaid)],
  ];
  return (
    <section
  className="card payment-summary-card"
  aria-labelledby="policy-summary-heading"
>
      <h2 id="policy-summary-heading">Policy Summary</h2>
      <dl className="details">
        {fields.map(([label, value]) => (
          <div key={label} className="detail-row">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function PaymentHistory({ payments }) {
  return (
    <section
  className="card payment-history-card"
  aria-labelledby="payment-history-heading"
>
      <h2 id="payment-history-heading">Payment History</h2>
      {payments.length === 0 ? (
        <p className="empty-message">No premium payments have been made for this policy yet.</p>
      ) : (
        <div className="table-wrapper">
          <table aria-label="Payment history">
            <thead>
              <tr>
                <th>Transaction Reference</th>
                <th>Installment Number</th>
                <th>Payment Date</th>
                <th>Amount Paid</th>
                <th>Penalty Amount</th>
                <th>Payment Method</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.transactionReference}>
                  <td>{payment.transactionReference}</td>
                  <td>{payment.installmentNumber}</td>
                  <td>{formatDate(payment.paymentDate)}</td>
                  <td>{formatCurrency(payment.amountPaid)}</td>
                  <td>{formatCurrency(payment.penaltyAmount)}</td>
                  <td>{formatEnum(payment.paymentMethod)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/** FR-4 premium payment management: policy search, installment schedule, payment and history. */
export default function PremiumPaymentPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const policyNumber = searchParams.get('policyNumber') ?? '';

  const [searchInput, setSearchInput] = useState(policyNumber);
  const [searchError, setSearchError] = useState('');
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState({});
  const [amountErrors, setAmountErrors] = useState({});
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentMethodError, setPaymentMethodError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [payError, setPayError] = useState('');
  const [result, setResult] = useState(null);

  const load = useCallback(async (number) => {
    setLoading(true);
    setLoadError('');
    try {
      setDetails((await fetchPolicyPremiums(number)) ?? null);
    } catch (error) {
      setDetails(null);
      setLoadError(extractErrorMessage(error, 'Unable to load the policy premium details. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setSearchInput(policyNumber);
    setSelected({});
    setAmountErrors({});
    setPayError('');
    setResult(null);
    if (policyNumber) {
      load(policyNumber);
    } else {
      setDetails(null);
      setLoadError('');
    }
  }, [policyNumber, load]);

  const handleSearch = (event) => {
    event.preventDefault();
    const value = searchInput.trim();
    if (!value) {
      setSearchError('Policy identifier is required.');
      return;
    }
    setSearchError('');
    if (value === policyNumber) {
      load(value);
    } else {
      setSearchParams({ policyNumber: value });
    }
  };

  const toggleInstallment = (installment) => {
    setResult(null);
    setPayError('');
    setSelected((current) => {
      const next = { ...current };
      if (installment.installmentId in next) {
        delete next[installment.installmentId];
      } else {
        next[installment.installmentId] = Number(installment.amountDue).toFixed(2);
      }
      return next;
    });
    setAmountErrors((current) => {
      const next = { ...current };
      delete next[installment.installmentId];
      return next;
    });
  };

  const changeAmount = (installment, value) => {
    setSelected((current) => ({ ...current, [installment.installmentId]: value }));
    setAmountErrors((current) => ({
      ...current,
      [installment.installmentId]: validateAmount(value, installment.amountDue),
    }));
  };

  const handlePay = async (event) => {
    event.preventDefault();
    const installmentsById = Object.fromEntries(details.installments.map((item) => [item.installmentId, item]));
    const selectedIds = Object.keys(selected);
    const errors = Object.fromEntries(selectedIds.map((id) => [id, validateAmount(selected[id], installmentsById[id].amountDue)]));
    setAmountErrors(errors);
    const methodError = paymentMethod ? '' : 'Payment method is required.';
    setPaymentMethodError(methodError);
    if (selectedIds.length === 0) {
      setPayError('Select at least one installment to pay.');
      return;
    }
    if (methodError || Object.values(errors).some(Boolean)) {
      return;
    }
    setSubmitting(true);
    setPayError('');
    try {
      const response = await payPremiums(details.policy.policyNumber, {
        paymentMethod,
        payments: selectedIds.map((id) => ({ installmentId: Number(id), amount: Number(selected[id]) })),
      });
      setSelected({});
      setAmountErrors({});
      await load(details.policy.policyNumber);
      setResult(response);
    } catch (error) {
      setPayError(extractErrorMessage(error, 'Unable to process the premium payment. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCount = Object.keys(selected).length;
  const selectedTotal = Object.values(selected).reduce((sum, value) => sum + (Number(value) || 0), 0);

  return (
  <AppShell
    title="Premium Payments"
    subtitle="Search a registered policy, review its installment schedule and securely record premium payments."
  >
    <div className="payment-page">
      <section
        className="payment-search-hero"
        aria-labelledby="policy-search-heading"
      >
        <div className="payment-search-copy">
          <span className="payment-hero-icon" aria-hidden="true">
            ₹
          </span>
          <div>
            <p className="eyebrow">PREMIUM MANAGEMENT</p>
            <h2 id="policy-search-heading">Find a registered policy</h2>
            <p>
              Enter the exact policy identifier to retrieve the premium
              schedule, outstanding balance and payment history.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSearch}
          noValidate
          aria-label="Policy search"
          className="payment-search-form"
        >
          <label htmlFor="policy-identifier">
            Policy Identifier
            <input
              id="policy-identifier"
              name="policyNumber"
              type="text"
              placeholder="e.g. HDP-2026-0001"
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value);
                setSearchError('');
              }}
              aria-invalid={Boolean(searchError)}
            />
            {searchError && (
              <span className="field-error">{searchError}</span>
            )}
          </label>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Searching...' : 'Search Policy'}
          </button>
        </form>

        {loadError && (
          <div className="alert alert-error" role="alert">
            {loadError}
          </div>
        )}
      </section>

        {result && (
          <section className="card" aria-labelledby="payment-success-heading">
            <h2 id="payment-success-heading">Payment Successful</h2>
            <div className="alert alert-success" role="status">{result.message}</div>
            <div className="table-wrapper">
              <table aria-label="Payment receipts">
                <thead>
                  <tr>
                    <th>Transaction Reference</th>
                    <th>Installment Number</th>
                    <th>Amount Paid</th>
                    <th>Penalty Amount</th>
                    <th>Remaining Outstanding</th>
                    <th>Installment Status</th>
                  </tr>
                </thead>
                <tbody>
                  {result.receipts.map((receipt) => (
                    <tr key={receipt.transactionReference}>
                      <td>{receipt.transactionReference}</td>
                      <td>{receipt.installmentNumber}</td>
                      <td>{formatCurrency(receipt.amountPaid)}</td>
                      <td>{formatCurrency(receipt.penaltyAmount)}</td>
                      <td>{formatCurrency(receipt.remainingOutstanding)}</td>
                      <td>{formatEnum(receipt.paymentStatus)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {details && (
          <>
            <PolicySummary policy={details.policy} />

            <form onSubmit={handlePay} noValidate aria-label="Premium payment">
              <section
  className="card payment-schedule-card"
  aria-labelledby="schedule-heading"
>
                <h2 id="schedule-heading">Premium Installment Schedule</h2>
                <p className="hint">
                  A late payment penalty of 10% of the outstanding premium applies after the one-month grace period.
                </p>
                <div className="table-wrapper">
                  <table aria-label="Premium installment schedule">
                    <thead>
                      <tr>
                        <th>Select</th>
                        <th>Installment Number</th>
                        <th>Premium Period</th>
                        <th>Premium Amount</th>
                        <th>Due Date</th>
                        <th>Grace Period End Date</th>
                        <th>Paid Amount</th>
                        <th>Late Payment Penalty</th>
                        <th>Amount Due</th>
                        <th>Payment Status</th>
                        <th>Amount to Pay</th>
                      </tr>
                    </thead>
                    <tbody>
                      {details.installments.map((installment) => {
                        const id = installment.installmentId;
                        const isSelected = id in selected;
                        return (
                          <tr key={id}>
                            <td>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={!installment.selectable || submitting}
                                onChange={() => toggleInstallment(installment)}
                                aria-label={`Select installment ${installment.installmentNumber}`}
                              />
                            </td>
                            <td>{installment.installmentNumber}</td>
                            <td>{formatPeriod(installment.premiumPeriod)}</td>
                            <td>{formatCurrency(installment.scheduledAmount)}</td>
                            <td>{formatDate(installment.dueDate)}</td>
                            <td>{formatDate(installment.gracePeriodEndDate)}</td>
                            <td>{formatCurrency(installment.paidAmount)}</td>
                            <td>{formatCurrency(Number(installment.applicablePenalty) + Number(installment.penaltyPaid))}</td>
                            <td>{formatCurrency(installment.amountDue)}</td>
                            <td><span className="status">{formatEnum(installment.paymentStatus)}</span></td>
                            <td>
                              {isSelected && (
                                <>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={selected[id]}
                                    onChange={(event) => changeAmount(installment, event.target.value)}
                                    aria-label={`Amount for installment ${installment.installmentNumber}`}
                                    aria-invalid={Boolean(amountErrors[id])}
                                  />
                                  {amountErrors[id] && <span className="field-error">{amountErrors[id]}</span>}
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="form-grid">
                  <label htmlFor="payment-method">
                    Payment Method
                    <select
                      id="payment-method"
                      value={paymentMethod}
                      onChange={(event) => {
                        setPaymentMethod(event.target.value);
                        setPaymentMethodError('');
                      }}
                      aria-invalid={Boolean(paymentMethodError)}
                    >
                      <option value="">Select payment method</option>
                      {PAYMENT_METHODS.map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    {paymentMethodError && <span className="field-error">{paymentMethodError}</span>}
                  </label>
                </div>
                <p>
                  Selected installments: {selectedCount} | Total amount: {formatCurrency(selectedTotal)}
                </p>
                {payError && <div className="alert alert-error" role="alert">{payError}</div>}
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Processing payment...' : 'Pay Premium'}
                </button>
              </section>
            </form>

            <PaymentHistory payments={details.payments} />
          </>
        )}
    </div>
    </AppShell>
  );
}