import { getCategoryPaid, formatCurrency } from '../utils'

export default function CategoryCard({ category, onOpen, onAddPayment }) {
  const paid = getCategoryPaid(category)
  const hasBudget = category.budget !== null && category.budget !== undefined
  const budget = hasBudget ? Number(category.budget) : 0
  const pct = hasBudget && budget > 0 ? Math.min((paid / budget) * 100, 100) : 0
  const isComplete = hasBudget && paid >= budget && budget > 0
  const isOver = hasBudget && paid > budget && budget > 0
  const entryCount = (category.entries || []).length

  return (
    <div className="category-card" onClick={onOpen}>
      <div className="category-card__header">
        <span className="category-card__name">{category.name}</span>
        <span className={`category-card__badge category-card__badge--${isComplete ? 'complete' : hasBudget ? 'pending' : 'track'}`}>
          {isComplete ? 'Paid' : hasBudget ? `${Math.round(pct)}%` : 'Track'}
        </span>
      </div>

      {category.description && (
        <p className="category-card__desc">{category.description}</p>
      )}

      <div className="category-card__amounts">
        {hasBudget && (
          <div className="category-card__amount">
            <span className="category-card__amount-label">Budget</span>
            <span className="category-card__amount-value">{formatCurrency(budget)}</span>
          </div>
        )}
        <div className="category-card__amount">
          <span className="category-card__amount-label">Paid</span>
          <span className="category-card__amount-value">{formatCurrency(paid)}</span>
        </div>
        {hasBudget && (
          <div className="category-card__amount">
            <span className="category-card__amount-label">Remaining</span>
            <span className="category-card__amount-value">{formatCurrency(Math.max(0, budget - paid))}</span>
          </div>
        )}
      </div>

      {hasBudget && (
        <div className="progress">
          <div
            className={`progress__fill${isComplete ? ' progress__fill--complete' : ''}${isOver ? ' progress__fill--over' : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      <div className="category-card__footer">
        <span className="category-card__entries-count">{entryCount} payment{entryCount !== 1 ? 's' : ''}</span>
        <button
          className="category-card__add-btn"
          onClick={e => { e.stopPropagation(); onAddPayment() }}
        >
          <span className="material-symbols-rounded">add</span> Add Payment
        </button>
      </div>
    </div>
  )
}
