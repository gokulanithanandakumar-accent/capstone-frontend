import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { extractErrorMessage } from '../api/client';
import { generateRecommendations } from '../api/dashboardApi';
import { formatCurrency, formatEnum, formatTerm, todayIso } from '../utils/format';

const EMPTY_FORM = { dateOfBirth: '', insuranceGoals: '', preferredTerm: '', preferredPolicyType: '' };

function validate(form) {
  const errors = {};
  const anyProvided = Object.values(form).some((value) => value.trim() !== '');
  if (!anyProvided) {
    errors.form = 'Please provide at least one input to generate recommendations.';
  }
  if (form.dateOfBirth && form.dateOfBirth > todayIso()) {
    errors.dateOfBirth = 'Date of birth cannot be in the future.';
  }
  return errors;
}

function toPayload(form) {
  const valueOrNull = (value) => (value.trim() === '' ? null : value.trim());
  return {
    dateOfBirth: valueOrNull(form.dateOfBirth),
    insuranceGoals: valueOrNull(form.insuranceGoals),
    preferredTerm: valueOrNull(form.preferredTerm),
    preferredPolicyType: valueOrNull(form.preferredPolicyType),
  };
}

export default function RecommendationsSection({ availableProducts }) {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [result, setResult] = useState(null);

  const policyTypes = useMemo(
    () => [...new Set((availableProducts ?? []).map((product) => product.policyType))].sort(),
    [availableProducts],
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }
    setLoading(true);
    setApiError('');
    setResult(null);
    try {
      setResult(await generateRecommendations(toPayload(form)));
    } catch (error) {
      setApiError(extractErrorMessage(error, 'Unable to generate recommendations. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = (item) => {
    const { recommendationItemId, recommendationReason, suitability, rankOrder, ...product } = item;
    navigate('/policies/register', { state: { product, recommendationItemId } });
  };

  return (
    <section className="card" aria-labelledby="recommendations-heading">
      <div className="section-header">
        <h2 id="recommendations-heading">AI Policy Recommendations</h2>
        {!showForm && (
          <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
            Get AI Recommendations
          </button>
        )}
      </div>

      {showForm && (
        <form className="recommendation-form" onSubmit={handleSubmit} noValidate aria-label="Recommendation preferences">
          <p className="hint">Provide one or more of the following inputs.</p>
          {errors.form && <div className="alert alert-error" role="alert">{errors.form}</div>}
          <div className="form-grid">
            <label htmlFor="rec-dob">
              Date of Birth
              <input
                id="rec-dob"
                name="dateOfBirth"
                type="date"
                max={todayIso()}
                value={form.dateOfBirth}
                onChange={handleChange}
                aria-invalid={Boolean(errors.dateOfBirth)}
              />
              {errors.dateOfBirth && <span className="field-error">{errors.dateOfBirth}</span>}
            </label>
            <label htmlFor="rec-term">
              Preferred Policy Term
              <input
                id="rec-term"
                name="preferredTerm"
                type="text"
                maxLength={50}
                placeholder="e.g. 10 years"
                value={form.preferredTerm}
                onChange={handleChange}
              />
            </label>
            <label htmlFor="rec-type">
              Insurance Type
              <select id="rec-type" name="preferredPolicyType" value={form.preferredPolicyType} onChange={handleChange}>
                <option value="">Any</option>
                {policyTypes.map((type) => (
                  <option key={type} value={type}>{formatEnum(type)}</option>
                ))}
              </select>
            </label>
            <label htmlFor="rec-goals" className="full-width">
              Insurance Goals and Preferences
              <textarea
                id="rec-goals"
                name="insuranceGoals"
                rows={3}
                maxLength={500}
                placeholder="e.g. Family health protection with long-term savings"
                value={form.insuranceGoals}
                onChange={handleChange}
              />
            </label>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Generating recommendations...' : 'Generate Recommendations'}
          </button>
        </form>
      )}

      {apiError && <div className="alert alert-error" role="alert">{apiError}</div>}

      {result && (
        <div className="recommendation-results">
          <p>Calculated age: <strong>{result.calculatedAge} years</strong></p>
          {result.recommendations.length === 0 ? (
            <p className="empty-message">No eligible insurance products could be recommended for you at the moment.</p>
          ) : (
            <div className="table-wrapper">
              <table aria-label="Recommended insurance policies">
                <thead>
                  <tr>
                    <th>Product Code</th>
                    <th>Policy Name</th>
                    <th>Policy Type</th>
                    <th>Policy Term</th>
                    <th>Sum Insured</th>
                    <th>Premium Frequency</th>
                    <th>Premium Amount</th>
                    <th>Recommendation Reason</th>
                    <th>Suitability</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {result.recommendations.map((item) => (
                    <tr key={item.recommendationItemId}>
                      <td>{item.productCode}</td>
                      <td>{item.policyName}</td>
                      <td>{formatEnum(item.policyType)}</td>
                      <td>{formatTerm(item.termMonths)}</td>
                      <td>{formatCurrency(item.sumInsured)}</td>
                      <td>{formatEnum(item.premiumFrequency)}</td>
                      <td>{formatCurrency(item.premiumAmount)}</td>
                      <td className="wrap">{item.recommendationReason}</td>
                      <td><span className={`suitability suitability-${item.suitability.toLowerCase()}`}>{formatEnum(item.suitability)}</span></td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => handleRegister(item)}
                          aria-label={`Register recommended ${item.policyName}`}
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
        </div>
      )}
    </section>
  );
}
