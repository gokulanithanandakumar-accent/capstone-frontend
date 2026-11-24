import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchAvailableProducts,
  generateRecommendations,
} from '../api/dashboardApi';
import { extractErrorMessage } from '../api/client';
import AppShell from '../components/AppShell';
import InsuranceProductCard from '../components/InsuranceProductCard';
import { formatEnum, todayIso } from '../utils/format';

const INITIAL_FORM = {
  dateOfBirth: '',
  preferredTerm: '',
  preferredPolicyType: '',
  insuranceGoals: '',
};

const STEPS = [
  'dateOfBirth',
  'preferredTerm',
  'preferredPolicyType',
  'insuranceGoals',
  'confirmation',
];

function toDisplayDate(value) {
  if (!value) {
    return '';
  }

  const [year, month, day] = value.split('-');
  return `${day}-${month}-${year}`;
}

function toPayload(form) {
  const optionalValue = (value) => {
    const normalized = value.trim();
    return normalized ? normalized : null;
  };

  return {
    dateOfBirth: form.dateOfBirth || null,
    preferredTerm: optionalValue(form.preferredTerm),
    preferredPolicyType: optionalValue(form.preferredPolicyType),
    insuranceGoals: optionalValue(form.insuranceGoals),
  };
}

export default function RecommendationsPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState(INITIAL_FORM);
  const [stepIndex, setStepIndex] = useState(0);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'assistant',
      text:
        'Hello! I can help identify suitable insurance products. First, please provide your date of birth.',
    },
  ]);

  const [availableProducts, setAvailableProducts] = useState([]);
  const [productsError, setProductsError] = useState('');
  const [inputError, setInputError] = useState('');
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const currentStep = STEPS[stepIndex];

  useEffect(() => {
    let active = true;

    fetchAvailableProducts()
      .then((products) => {
        if (active) {
          setAvailableProducts(products ?? []);
        }
      })
      .catch((error) => {
        if (active) {
          setProductsError(
            extractErrorMessage(
              error,
              'Unable to load the available insurance types.',
            ),
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const policyTypes = useMemo(
    () =>
      [...new Set(availableProducts.map((product) => product.policyType))]
        .filter(Boolean)
        .sort(),
    [availableProducts],
  );

  const addMessages = (...nextMessages) => {
    setMessages((current) => [
      ...current,
      ...nextMessages.map((message, index) => ({
        id: `${Date.now()}-${index}`,
        ...message,
      })),
    ]);
  };

  const goToNextStep = (userText, assistantText) => {
    addMessages(
      { sender: 'user', text: userText },
      { sender: 'assistant', text: assistantText },
    );

    setInputError('');
    setStepIndex((current) => current + 1);
  };

  const continueFromDob = () => {
    if (!form.dateOfBirth) {
      setInputError('Date of birth is required.');
      return;
    }

    if (form.dateOfBirth > todayIso()) {
      setInputError('Date of birth cannot be in the future.');
      return;
    }

    goToNextStep(
      toDisplayDate(form.dateOfBirth),
      'Do you have a preferred policy term? You can enter something like “10 years”, or skip this question.',
    );
  };

  const continueFromTerm = () => {
    goToNextStep(
      form.preferredTerm.trim() || 'No preferred term',
      'Which type of insurance would you prefer? You may select Any if you are not sure.',
    );
  };

  const continueFromType = () => {
    goToNextStep(
      form.preferredPolicyType
        ? formatEnum(form.preferredPolicyType)
        : 'Any insurance type',
      'Finally, describe any insurance goals or preferences. This is optional, so you may skip it.',
    );
  };

  const continueFromGoals = () => {
    goToNextStep(
      form.insuranceGoals.trim() || 'No additional goals or preferences',
      'Your preferences are ready. Select “Generate Recommendations” and I will compare them with eligible products.',
    );
  };

  const handleGenerate = async () => {
    setLoading(true);
    setApiError('');
    setResult(null);

    addMessages({
      sender: 'user',
      text: 'Generate my recommendations',
    });

    try {
      const response = await generateRecommendations(toPayload(form));
      setResult(response);

      addMessages({
        sender: 'assistant',
        text:
          response?.recommendations?.length > 0
            ? `I found ${response.recommendations.length} suitable ${
                response.recommendations.length === 1
                  ? 'insurance product'
                  : 'insurance products'
              } for you.`
            : 'No eligible products are available for the supplied preferences.',
      });
    } catch (error) {
      const message = extractErrorMessage(
        error,
        'Unable to generate recommendations. Please try again.',
      );

      setApiError(message);
      addMessages({
        sender: 'assistant',
        text: message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = (item) => {
    const {
      recommendationItemId,
      recommendationReason,
      suitability,
      rankOrder,
      ...product
    } = item;

    navigate('/policies/register', {
      state: { product, recommendationItemId },
    });
  };

  const restartConversation = () => {
    setForm(INITIAL_FORM);
    setStepIndex(0);
    setResult(null);
    setApiError('');
    setInputError('');
    setMessages([
      {
        id: Date.now(),
        sender: 'assistant',
        text:
          'Let us start again. Please provide your date of birth.',
      },
    ]);
  };
    const handleChatSubmit = (event) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    switch (currentStep) {
      case 'dateOfBirth':
        continueFromDob();
        break;
      case 'preferredTerm':
        continueFromTerm();
        break;
      case 'preferredPolicyType':
        continueFromType();
        break;
      case 'insuranceGoals':
        continueFromGoals();
        break;
      case 'confirmation':
        handleGenerate();
        break;
      default:
        break;
    }
  };

  return (
    <AppShell
      title="AI Policy Recommendations"
      subtitle="Answer a few questions to receive personalized recommendations from eligible HealthDekho products."
    >
      <div className="recommendation-page-layout">
        <section
          className="recommendation-chat card"
          aria-labelledby="recommendation-chat-heading"
        >
          <div className="chat-header">
            <div className="chat-assistant-icon" aria-hidden="true">
              ✦
            </div>
            <div>
              <h2 id="recommendation-chat-heading">
                HealthDekho Recommendation Assistant
              </h2>
              <p>
                Recommendations use your preferences and available products.
              </p>
            </div>
          </div>

          <div className="chat-messages" aria-live="polite">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`chat-row chat-row-${message.sender}`}
              >
                {message.sender === 'assistant' && (
                  <div className="chat-avatar" aria-hidden="true">
                    ✦
                  </div>
                )}

                <div className={`chat-bubble chat-bubble-${message.sender}`}>
                  {message.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="chat-row chat-row-assistant">
                <div className="chat-avatar" aria-hidden="true">
                  ✦
                </div>
                <div className="chat-bubble chat-bubble-assistant">
                  Comparing your preferences with eligible products...
                </div>
              </div>
            )}
          </div>

          {!result && (
            <form className="chat-composer" onSubmit={handleChatSubmit}>
              {currentStep === 'dateOfBirth' && (
                <>
                  <label htmlFor="recommendation-dob">
                    Date of Birth
                    <span>Use DD-MM-YYYY</span>
                  </label>
                  <input
                    id="recommendation-dob"
                    type="date"
                    max={todayIso()}
                    value={form.dateOfBirth}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        dateOfBirth: event.target.value,
                      }))
                    }
                    aria-invalid={Boolean(inputError)}
                  />
                  <button type="submit" className="btn btn-primary">
  Continue
</button>
                </>
              )}

              {currentStep === 'preferredTerm' && (
                <>
                  <label htmlFor="recommendation-term">
                    Preferred Policy Term
                    <span>Optional</span>
                  </label>
                  <input
                    id="recommendation-term"
                    type="text"
                    maxLength={50}
                    placeholder="For example: 10 years"
                    value={form.preferredTerm}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        preferredTerm: event.target.value,
                      }))
                    }
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={continueFromTerm}
                  >
                    Continue
                  </button>
                </>
              )}

              {currentStep === 'preferredPolicyType' && (
                <>
                  <label htmlFor="recommendation-type">
                    Insurance Type
                    <span>Optional</span>
                  </label>
                  <select
                    id="recommendation-type"
                    value={form.preferredPolicyType}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        preferredPolicyType: event.target.value,
                      }))
                    }
                  >
                    <option value="">Any insurance type</option>
                    {policyTypes.map((type) => (
                      <option key={type} value={type}>
                        {formatEnum(type)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={continueFromType}
                  >
                    Continue
                  </button>
                </>
              )}

              {currentStep === 'insuranceGoals' && (
                <>
                  <label htmlFor="recommendation-goals">
                    Insurance Goals and Preferences
                    <span>Optional</span>
                  </label>
                  <textarea
                    id="recommendation-goals"
                    rows={3}
                    maxLength={500}
                    placeholder="For example: Family health protection and long-term savings"
                    value={form.insuranceGoals}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        insuranceGoals: event.target.value,
                      }))
                    }
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={continueFromGoals}
                  >
                    Continue
                  </button>
                </>
              )}

              {currentStep === 'confirmation' && (
                <button
  type="submit"
  className="btn btn-primary chat-generate-button"
  disabled={loading}
>
                  {loading
                    ? 'Generating Recommendations...'
                    : 'Generate Recommendations'}
                </button>
              )}

              {inputError && (
                <span className="field-error">{inputError}</span>
              )}

              {apiError && (
                <div className="alert alert-error" role="alert">
                  {apiError}
                </div>
              )}
            </form>
          )}

          {result && (
            <div className="chat-restart">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={restartConversation}
              >
                Start Again
              </button>
            </div>
          )}
        </section>

        <aside className="recommendation-summary">
          <section className="card recommendation-info-card">
            <span className="info-card-icon" aria-hidden="true">
              ✓
            </span>
            <h3>Database-restricted results</h3>
            <p>
              Recommendations can reference only active products available to
              the authenticated customer.
            </p>
          </section>

          <section className="card recommendation-info-card">
            <span className="info-card-icon" aria-hidden="true">
              ◇
            </span>
            <h3>Your preferences</h3>
            <dl>
              <div>
                <dt>Date of birth</dt>
                <dd>{toDisplayDate(form.dateOfBirth) || 'Not provided'}</dd>
              </div>
              <div>
                <dt>Preferred term</dt>
                <dd>{form.preferredTerm || 'Any'}</dd>
              </div>
              <div>
                <dt>Insurance type</dt>
                <dd>
                  {form.preferredPolicyType
                    ? formatEnum(form.preferredPolicyType)
                    : 'Any'}
                </dd>
              </div>
              <div>
                <dt>Goals and preferences</dt>
                <dd>{form.insuranceGoals || 'Not provided'}</dd>
              </div>
            </dl>
          </section>

          {productsError && (
            <div className="alert alert-error" role="alert">
              {productsError}
            </div>
          )}
        </aside>
      </div>

      {result && (
        <section className="recommendation-results-section">
          <div className="section-title-row">
            <div>
              <p className="eyebrow">PERSONALIZED RESULTS</p>
              <h2>Recommended Insurance Policies</h2>
              <p>
                Calculated age: <strong>{result.calculatedAge} years</strong>
              </p>
            </div>

            <span className="result-count">
              {result.recommendations.length} recommended
            </span>
          </div>

          {result.recommendations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">✦</div>
              <h3>No eligible products found</h3>
              <p>Try updating your preferences and generating again.</p>
            </div>
          ) : (
            <div className="product-grid recommended-product-grid">
              {result.recommendations.map((item) => (
                <div
                  key={item.recommendationItemId}
                  className="recommended-product-wrapper"
                >
                  <InsuranceProductCard
                    product={item}
                    recommended
                    onRegister={() => handleRegister(item)}
                  />

                  <div className="recommendation-explanation">
                    <span
                      className={`suitability suitability-${item.suitability.toLowerCase()}`}
                    >
                      {formatEnum(item.suitability)} suitability
                    </span>
                    <p>{item.recommendationReason}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </AppShell>
  );
}