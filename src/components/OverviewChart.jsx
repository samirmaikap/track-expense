import { useEffect, useRef } from 'react'
import { Chart, DoughnutController, ArcElement, Tooltip, Legend } from 'chart.js'
import { getCategoryPaid, formatCurrency } from '../utils'

Chart.register(DoughnutController, ArcElement, Tooltip, Legend)

const PALETTE = [
  '#5b5bd6', '#2e9e5a', '#e8841a', '#e05263', '#0ea5e9',
  '#a855f7', '#f59e0b', '#14b8a6', '#f43f5e', '#6366f1',
]

function buildData(categories) {
  const labels = categories.map(c => c.name)
  const data = categories.map(c => getCategoryPaid(c))
  return {
    labels,
    datasets: [
      {
        data,
        backgroundColor: labels.map((_, i) => PALETTE[i % PALETTE.length]),
        borderColor: '#ffffff',
        borderWidth: 2,
        hoverOffset: 8,
      },
    ],
  }
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '65%',
  plugins: {
    legend: {
      display: true,
      position: 'bottom',
      labels: {
        usePointStyle: true,
        pointStyle: 'circle',
        padding: 14,
        font: { family: "'Inter', sans-serif", size: 12 },
      },
    },
    tooltip: {
      callbacks: {
        label: ctx => {
          const total = ctx.dataset.data.reduce((s, v) => s + v, 0)
          const pct = total ? ((ctx.raw / total) * 100).toFixed(1) : 0
          return ` ${ctx.label}: ${formatCurrency(ctx.raw)} (${pct}%)`
        },
      },
      backgroundColor: '#1a1a2e',
      titleFont: { family: "'Inter', sans-serif" },
      bodyFont: { family: "'Inter', sans-serif" },
      cornerRadius: 8,
      padding: 10,
    },
  },
}

export default function OverviewChart({ categories }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  const spentCategories = categories.filter(c => getCategoryPaid(c) > 0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!spentCategories.length) {
      chartRef.current?.destroy()
      chartRef.current = null
      return
    }
    const data = buildData(spentCategories)
    if (chartRef.current) {
      chartRef.current.data = data
      chartRef.current.update()
    } else {
      chartRef.current = new Chart(canvas, { type: 'doughnut', data, options: chartOptions })
    }
  }, [spentCategories])

  useEffect(() => () => { chartRef.current?.destroy(); chartRef.current = null }, [])

  return (
    <section className="chart-section" style={{ display: spentCategories.length ? '' : 'none' }}>
      <div className="card">
        <h2 className="card__title">Spending Breakdown</h2>
        <div className="chart-container">
          <canvas ref={canvasRef} />
        </div>
      </div>
    </section>
  )
}
