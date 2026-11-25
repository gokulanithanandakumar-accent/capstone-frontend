import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  formatCurrency,
  formatEnum,
  formatTerm,
} from '../utils/format';

const PRODUCT_ICONS = {
  HEALTH: '♥',
  TERM: '☂',
  LIFE: '☂',
  SAVINGS: '◆',
  ACCIDENT: '✚',
  TRAVEL: '✈',
  HOME: '⌂',
};

function selectPlans(products) {
  const cheapestByType = new Map();

  for (const product of products ?? []) {
    const type = product.policyType || 'OTHER';
    const current = cheapestByType.get(type);

    if (
      !current ||
      Number(product.premiumAmount) < Number(current.premiumAmount)
    ) {
      cheapestByType.set(type, product);
    }
  }

  return [...cheapestByType.values()].sort((a, b) =>
    String(a.policyType).localeCompare(String(b.policyType)),
  );
}

export default function DashboardPlanCarousel({
  products,
  loading,
  error,
}) {
  const navigate = useNavigate();
  const trackRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const plans = useMemo(
    () => selectPlans(products),
    [products],
  );

  const scrollToIndex = (nextIndex) => {
    if (!plans.length) {
      return;
    }

    const normalizedIndex =
      (nextIndex + plans.length) % plans.length;

    setActiveIndex(normalizedIndex);

    const track = trackRef.current;
    const target = track?.children?.[normalizedIndex];

    target?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  };

  const handleRegister = (product) => {
    navigate('/policies/register', {
      state: { product },
    });
  };

  if (loading) {
    return (
      <section className="dashboard-plans-section">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">EXPLORE COVERAGE</p>
            <h2>Plans You May Like</h2>
          </div>
        </div>

        <div className="dashboard-plan-carousel">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="dashboard-plan-card dashboard-plan-skeleton"
            />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="dashboard-plans-section">
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      </section>
    );
  }

  if (!plans.length) {
    return null;
  }

  return (
    <section
      className="dashboard-plans-section"
      aria-labelledby="dashboard-plans-heading"
    >
      <div className="section-title-row dashboard-plans-heading">
        <div>
          <p className="eyebrow">EXPLORE COVERAGE</p>

          <h2 id="dashboard-plans-heading">
            Plans You May Like
          </h2>

          <p>
            An affordable available option from each insurance
            category, selected from your eligible plans.
          </p>
        </div>

        <Link
          to="/policies/available"
          className="btn btn-secondary"
        >
          See All Plans →
        </Link>
      </div>

      <div className="carousel-stage">
        <button
  type="button"
  className="carousel-arrow carousel-arrow-left"
  onClick={() => scrollToIndex(activeIndex - 1)}
  aria-label="Previous insurance plan"
/>

        <div
          ref={trackRef}
          className="dashboard-plan-carousel"
          onScroll={(event) => {
            const track = event.currentTarget;
            const center =
              track.scrollLeft + track.clientWidth / 2;

            let closestIndex = 0;
            let closestDistance = Number.POSITIVE_INFINITY;

            Array.from(track.children).forEach((child, index) => {
              const childCenter =
                child.offsetLeft + child.offsetWidth / 2;
              const distance = Math.abs(center - childCenter);

              if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = index;
              }
            });

            setActiveIndex(closestIndex);
          }}
        >
          {plans.map((product, index) => {
            const active = index === activeIndex;
            const icon =
              PRODUCT_ICONS[product.policyType] || '◆';

            return (
              <article
                key={product.productId}
                className={`dashboard-plan-card${
                  active ? ' dashboard-plan-card-active' : ''
                }`}
              >
                <div className="dashboard-plan-glow" />

                <div className="dashboard-plan-top">
                  <div
                    className="dashboard-plan-icon"
                    aria-hidden="true"
                  >
                    {icon}
                  </div>

                  <div>
                    <span className="dashboard-plan-type">
                      {formatEnum(product.policyType)}
                    </span>

                    <h3>{product.policyName}</h3>
                  </div>
                </div>

                <p className="dashboard-plan-code">
                  {product.productCode}
                </p>

                <div className="dashboard-plan-price">
                  <span>Premium</span>

                  <strong>
                    {formatCurrency(product.premiumAmount)}
                  </strong>

                  <small>
                    {formatEnum(product.premiumFrequency)}
                  </small>
                </div>

                <dl className="dashboard-plan-stats">
                  <div>
                    <dt>Coverage</dt>
                    <dd>
                      {formatCurrency(product.sumInsured)}
                    </dd>
                  </div>

                  <div>
                    <dt>Policy term</dt>
                    <dd>
                      {formatTerm(product.termMonths)}
                    </dd>
                  </div>
                </dl>

                <div className="dashboard-plan-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleRegister(product)}
                  >
                    Register →
                  </button>

                  <Link
                    to="/policies/available"
                    className="btn btn-ghost"
                  >
                    More Plans
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        <button
  type="button"
  className="carousel-arrow carousel-arrow-right"
  onClick={() => scrollToIndex(activeIndex + 1)}
  aria-label="Next insurance plan"
/>
      </div>

      <div
        className="carousel-indicators"
        aria-label="Insurance plan slides"
      >
        {plans.map((product, index) => (
          <button
            key={product.productId}
            type="button"
            aria-label={`Show ${product.policyName}`}
            aria-current={
              index === activeIndex ? 'true' : undefined
            }
            className={
              index === activeIndex
                ? 'carousel-dot carousel-dot-active'
                : 'carousel-dot'
            }
            onClick={() => scrollToIndex(index)}
          />
        ))}
      </div>
    </section>
  );
}
