import { formatCurrency, formatEnum, formatTerm } from '../utils/format';

const PRODUCT_ICONS = {
  HEALTH: '♥',
  LIFE: '☂',
  TRAVEL: '✈',
  HOME: '⌂',
  ACCIDENT: '✚',
};

export default function InsuranceProductCard({
  product,
  onRegister,
  recommended = false,
}) {
  const icon = PRODUCT_ICONS[product.policyType] || '◆';

  return (
    <article className="product-card">
      <div className="product-card-heading">
        <div className="product-icon" aria-hidden="true">
          {icon}
        </div>

        <div className="product-title">
          <div className="product-name-row">
            <h3>{product.policyName}</h3>
            {recommended && (
              <span className="product-badge product-badge-recommended">
                Recommended
              </span>
            )}
          </div>
          <p>{formatEnum(product.policyType)} Insurance</p>
        </div>
      </div>

      <div className="product-reference">
        Product code: <strong>{product.productCode}</strong>
      </div>

      <dl className="product-stats">
        <div>
          <dt>Policy term</dt>
          <dd>{formatTerm(product.termMonths)}</dd>
        </div>
        <div>
          <dt>Sum insured</dt>
          <dd>{formatCurrency(product.sumInsured)}</dd>
        </div>
        <div>
          <dt>Premium</dt>
          <dd>{formatCurrency(product.premiumAmount)}</dd>
        </div>
        <div>
          <dt>Frequency</dt>
          <dd>{formatEnum(product.premiumFrequency)}</dd>
        </div>
      </dl>

      <div className="product-actions">
        <button type="button" className="btn btn-ghost">
          View Details
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onRegister(product)}
        >
          Register Now →
        </button>
      </div>
    </article>
  );
}
