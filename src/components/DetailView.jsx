import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Chart, LineController, LineElement, PointElement, CategoryScale, LinearScale, Filler, Tooltip, Legend } from 'chart.js'
import { getCategoryPaid, formatCurrency, formatDate } from '../utils'

Chart.register(LineController, LineElement, PointElement, CategoryScale, LinearScale, Filler, Tooltip, Legend)

function DetailChart({ category }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const entries = [...(category.entries || [])].sort((a, b) => a.date.localeCompare(b.date))

    if (!entries.length) {
      chartRef.current?.destroy()
      chartRef.current = null
      return
    }

    let cumulative = 0
    const labels = entries.map(e => formatDate(e.date))
    const cumulativeData = entries.map(e => { cumulative += Number(e.amount); return cumulative })
    const hasBudget = category.budget !== null && category.budget !== undefined
    const budgetLine = hasBudget ? entries.map(() => Number(category.budget)) : null

    const datasets = [
      {
        label: 'Cumulative Paid',
        data: cumulativeData,
        borderColor: '#5b5bd6',
        backgroundColor: 'rgba(91, 91, 214, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: '#5b5bd6',
        borderWidth: 2,
      },
    ]

    if (budgetLine) {
      datasets.push({
        label: 'Budget',
        data: budgetLine,
        borderColor: '#d93b3b',
        borderDash: [6, 4],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
      })
    }

    const data = { labels, datasets }

    if (chartRef.current) {
      chartRef.current.data = data
      chartRef.current.update()
    } else {
      chartRef.current = new Chart(canvas, {
        type: 'line',
        data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'bottom',
              labels: {
                usePointStyle: true,
                pointStyle: 'circle',
                padding: 12,
                font: { family: "'Inter', sans-serif", size: 11 },
              },
            },
            tooltip: {
              callbacks: { label: ctx => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}` },
              backgroundColor: '#1a1a2e',
              cornerRadius: 8,
              padding: 10,
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { family: "'Inter', sans-serif", size: 10 }, maxRotation: 45 },
            },
            y: {
              grid: { color: 'rgba(0,0,0,0.04)' },
              ticks: {
                font: { family: "'Inter', sans-serif", size: 11 },
                callback: val => '₹' + Number(val).toLocaleString('en-IN'),
              },
              beginAtZero: true,
            },
          },
        },
      })
    }
  }, [category])

  useEffect(() => () => { chartRef.current?.destroy(); chartRef.current = null }, [])

  const hasEntries = (category.entries || []).length > 0
  if (!hasEntries) return null

  return (
    <div className="detail-chart">
      <canvas ref={canvasRef} />
    </div>
  )
}

export default function DetailView({ category, onClose, onEdit, onDelete, onAddPayment, onDeleteEntry }) {
  useEffect(() => {
    const handleKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const paid = getCategoryPaid(category)
  const hasBudget = category.budget !== null && category.budget !== undefined
  const budget = hasBudget ? Number(category.budget) : 0
  const remaining = hasBudget ? Math.max(0, budget - paid) : null
  const pct = hasBudget && budget > 0 ? Math.round(Math.min((paid / budget) * 100, 100)) : 0

  const entries = [...(category.entries || [])].sort((a, b) => b.date.localeCompare(a.date))

  return createPortal(
    <div className="detail-screen">
      <div className="detail-screen__content">
        {/* Header */}
        <div className="detail-header">
          <button className="icon-btn" onClick={onClose}>
            <span className="material-symbols-rounded">arrow_back</span>
          </button>
          <h2 className="modal__title">{category.name}</h2>
          <div className="detail-header__actions">
            <button className="icon-btn" onClick={onEdit} title="Edit Category">
              <span className="material-symbols-rounded">edit</span>
            </button>
            <button className="icon-btn" onClick={onDelete} title="Delete Category">
              <span className="material-symbols-rounded">delete</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="detail-summary">
          {hasBudget ? (
            <>
              <div className="detail-stat">
                <div className="detail-stat__label">Budget</div>
                <div className="detail-stat__value">{formatCurrency(budget)}</div>
              </div>
              <div className="detail-stat">
                <div className="detail-stat__label">Paid ({pct}%)</div>
                <div className="detail-stat__value">{formatCurrency(paid)}</div>
              </div>
              <div className="detail-stat">
                <div className="detail-stat__label">Remaining</div>
                <div className="detail-stat__value">{formatCurrency(remaining)}</div>
              </div>
              <div className="detail-stat">
                <div className="detail-stat__label">Entries</div>
                <div className="detail-stat__value">{entries.length}</div>
              </div>
            </>
          ) : (
            <>
              <div className="detail-stat">
                <div className="detail-stat__label">Total Paid</div>
                <div className="detail-stat__value">{formatCurrency(paid)}</div>
              </div>
              <div className="detail-stat">
                <div className="detail-stat__label">Entries</div>
                <div className="detail-stat__value">{entries.length}</div>
              </div>
            </>
          )}
          {category.description && (
            <div className="detail-stat detail-stat--full">
              <div className="detail-stat__label">Notes</div>
              <div className="detail-stat__value detail-stat__value--notes">{category.description}</div>
            </div>
          )}
        </div>

        {/* Chart - keyed on category id so it remounts fresh per category */}
        <DetailChart key={category.id} category={category} />

        {/* Entries */}
        <div className="detail-entries">
          <div className="detail-entries__header">
            <h3 className="detail-entries__title">Payments</h3>
            <button className="btn btn--outlined" onClick={onAddPayment}>
              <span className="material-symbols-rounded" style={{ fontSize: 16, verticalAlign: 'middle' }}>add</span> Add
            </button>
          </div>

          {entries.length === 0 ? (
            <p className="entry-empty">No payments yet</p>
          ) : (
            <div className="entry-list">
              {entries.map(entry => (
                <div key={entry.id} className="entry-item">
                  <div className="entry-item__dot" />
                  <div className="entry-item__info">
                    <div className="entry-item__label">{entry.label}</div>
                    <div className="entry-item__date">{formatDate(entry.date)}</div>
                  </div>
                  <div className="entry-item__amount">{formatCurrency(entry.amount)}</div>
                  <button
                    className="icon-btn entry-item__delete"
                    onClick={() => onDeleteEntry(category.id, entry.id)}
                    title="Delete"
                  >
                    <span className="material-symbols-rounded">close</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
