import { useEffect, useRef } from 'react'
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'
import { getCategoryPaid, formatCurrency } from '../utils'

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'bottom',
      labels: {
        usePointStyle: true,
        pointStyle: 'circle',
        padding: 16,
        font: { family: "'Inter', sans-serif", size: 12 },
      },
    },
    tooltip: {
      callbacks: { label: ctx => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}` },
      backgroundColor: '#1a1a2e',
      titleFont: { family: "'Inter', sans-serif" },
      bodyFont: { family: "'Inter', sans-serif" },
      cornerRadius: 8,
      padding: 10,
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { font: { family: "'Inter', sans-serif", size: 11 } },
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
}

function buildData(categories) {
  return {
    labels: categories.map(c => c.name),
    datasets: [
      {
        label: 'Budget',
        data: categories.map(c => (c.budget !== null && c.budget !== undefined ? Number(c.budget) : 0)),
        backgroundColor: 'rgba(91, 91, 214, 0.15)',
        borderColor: '#5b5bd6',
        borderWidth: 2,
        borderRadius: 6,
        barPercentage: 0.6,
        categoryPercentage: 0.7,
      },
      {
        label: 'Paid',
        data: categories.map(c => getCategoryPaid(c)),
        backgroundColor: 'rgba(46, 158, 90, 0.7)',
        borderColor: '#2e9e5a',
        borderWidth: 2,
        borderRadius: 6,
        barPercentage: 0.6,
        categoryPercentage: 0.7,
      },
    ],
  }
}

export default function OverviewChart({ categories }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!categories.length) {
      chartRef.current?.destroy()
      chartRef.current = null
      return
    }
    const data = buildData(categories)
    if (chartRef.current) {
      chartRef.current.data = data
      chartRef.current.update()
    } else {
      chartRef.current = new Chart(canvas, { type: 'bar', data, options: chartOptions })
    }
  }, [categories])

  useEffect(() => () => { chartRef.current?.destroy(); chartRef.current = null }, [])

  return (
    <section className="chart-section" style={{ display: categories.length ? '' : 'none' }}>
      <div className="card">
        <h2 className="card__title">Overview</h2>
        <div className="chart-container">
          <canvas ref={canvasRef} />
        </div>
      </div>
    </section>
  )
}
