import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js'
import { getCategoryPaid, formatCurrency, formatDate } from '../utils'

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip)

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

    const labels = entries.map(e => e.label || formatDate(e.date))
    const data = entries.map(e => Number(e.amount))

    const chartData = {
      labels,
      datasets: [
        {
          data,
          backgroundColor: 'rgba(79, 70, 229, 0.8)',
          hoverBackgroundColor: 'rgba(79, 70, 229, 1)',
          borderRadius: 6,
          borderSkipped: false,
          barPercentage: 0.55,
        },
      ],
    }

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: ctx => ' ' + formatCurrency(ctx.raw) },
          backgroundColor: '#1e1b4b',
          cornerRadius: 8,
          padding: 10,
          titleFont: { family: "'Inter', sans-serif", size: 12 },
          bodyFont: { family: "'Inter', sans-serif", size: 13 },
          displayColors: false,
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { font: { family: "'Inter', sans-serif", size: 11 }, color: '#5a5a7a', maxRotation: 30 },
        },
        y: {
          grid: { color: 'rgba(0,0,0,0.05)' },
          border: { display: false },
          ticks: {
            font: { family: "'Inter', sans-serif", size: 11 },
            color: '#5a5a7a',
            callback: val => '₹' + Number(val).toLocaleString('en-IN'),
          },
          beginAtZero: true,
        },
      },
    }

    if (chartRef.current) {
      chartRef.current.data = chartData
      chartRef.current.update()
    } else {
      chartRef.current = new Chart(canvas, { type: 'bar', data: chartData, options })
    }
  }, [category])

  useEffect(() => () => { chartRef.current?.destroy(); chartRef.current = null }, [])

  if (!(category.entries || []).length) return null

  return (
    <div className="detail-chart">
      <p className="detail-chart__title">Payments</p>
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
            <button className="icon-btn" onClick={onEdit} title="Edit">
              <span className="material-symbols-rounded">edit</span>
            </button>
            <button className="icon-btn icon-btn--danger" onClick={onDelete} title="Delete">
              <span className="material-symbols-rounded">delete</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="detail-stats">
          <div className="detail-stats__row">
            {hasBudget && (
              <div className="detail-stat-item">
                <span className="detail-stat-item__value">{formatCurrency(budget)}</span>
                <span className="detail-stat-item__label">Budget</span>
              </div>
            )}
            <div className="detail-stat-item detail-stat-item--paid">
              <span className="detail-stat-item__value">{formatCurrency(paid)}</span>
              <span className="detail-stat-item__label">Paid{hasBudget ? ` · ${pct}%` : ''}</span>
            </div>
            {hasBudget && (
              <div className="detail-stat-item">
                <span className="detail-stat-item__value">{formatCurrency(remaining)}</span>
                <span className="detail-stat-item__label">Remaining</span>
              </div>
            )}
            <div className="detail-stat-item">
              <span className="detail-stat-item__value">{entries.length}</span>
              <span className="detail-stat-item__label">Payments</span>
            </div>
          </div>

          {hasBudget && (
            <div className="detail-progress">
              <div className="detail-progress__track">
                <div
                  className={`detail-progress__fill${pct >= 100 ? ' detail-progress__fill--over' : ''}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}

          {category.description && (
            <p className="detail-notes">{category.description}</p>
          )}
        </div>

        {/* Chart */}
        <DetailChart key={category.id} category={category} />

        {/* Entries */}
        <div className="detail-entries">
          <div className="detail-entries__header">
            <h3 className="detail-entries__title">Payment history</h3>
            <button className="btn btn--filled" onClick={onAddPayment}>
              <span className="material-symbols-rounded" style={{ fontSize: 16 }}>add</span> Add
            </button>
          </div>

          {entries.length === 0 ? (
            <p className="entry-empty">No payments yet</p>
          ) : (
            <div className="entry-list">
              {entries.map(entry => (
                <div key={entry.id} className="entry-item">
                  <span className="entry-item__icon material-symbols-rounded">payments</span>
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


