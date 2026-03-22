import { getTotals, formatCurrency } from '../utils'

export default function Summary({ categories }) {
  const { total, paid, pending } = getTotals(categories)
  return (
    <section className="summary">
      <div className="summary-card summary-card--total">
        <span className="material-symbols-rounded summary-card__icon">account_balance_wallet</span>
        <div className="summary-card__content">
          <span className="summary-card__label">Total Budget</span>
          <span className="summary-card__value">{formatCurrency(total)}</span>
        </div>
      </div>
      <div className="summary-card summary-card--paid">
        <span className="material-symbols-rounded summary-card__icon">check_circle</span>
        <div className="summary-card__content">
          <span className="summary-card__label">Total Paid</span>
          <span className="summary-card__value">{formatCurrency(paid)}</span>
        </div>
      </div>
      <div className="summary-card summary-card--pending">
        <span className="material-symbols-rounded summary-card__icon">pending</span>
        <div className="summary-card__content">
          <span className="summary-card__label">Pending</span>
          <span className="summary-card__value">{formatCurrency(pending)}</span>
        </div>
      </div>
    </section>
  )
}
