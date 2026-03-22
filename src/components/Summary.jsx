import { getTotals, formatCurrency } from '../utils'

export default function Summary({ categories }) {
  const { total, paid, pending } = getTotals(categories)
  return (
    <section className="summary">
      <div className="summary-stat summary-stat--budget">
        <span className="summary-stat__icon material-symbols-rounded">savings</span>
        <div className="summary-stat__body">
          <span className="summary-stat__label">Budget</span>
          <span className="summary-stat__value">{formatCurrency(total)}</span>
        </div>
      </div>
      <div className="summary-stat summary-stat--paid">
        <span className="summary-stat__icon material-symbols-rounded">done_all</span>
        <div className="summary-stat__body">
          <span className="summary-stat__label">Paid</span>
          <span className="summary-stat__value">{formatCurrency(paid)}</span>
        </div>
      </div>
      <div className="summary-stat summary-stat--pending">
        <span className="summary-stat__icon material-symbols-rounded">hourglass_empty</span>
        <div className="summary-stat__body">
          <span className="summary-stat__label">Pending</span>
          <span className="summary-stat__value">{formatCurrency(pending)}</span>
        </div>
      </div>
    </section>
  )
}
