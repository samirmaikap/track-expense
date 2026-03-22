export function formatCurrency(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

export function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

export function getCategoryPaid(cat) {
  return (cat.entries || []).reduce((sum, e) => sum + Number(e.amount), 0)
}

export function getTotals(categories) {
  let total = 0, paid = 0
  for (const cat of categories) {
    if (cat.budget !== null && cat.budget !== undefined) {
      total += Number(cat.budget)
    }
    paid += getCategoryPaid(cat)
  }
  return { total, paid, pending: Math.max(0, total - paid) }
}

export function filterCategoriesByDate(categories, filter) {
  if (!filter || filter.type === 'all') return categories
  return categories.map(cat => ({
    ...cat,
    entries: (cat.entries || []).filter(entry => {
      const parts = entry.date.split('-')
      const y = parseInt(parts[0], 10)
      const m = parseInt(parts[1], 10)
      if (filter.type === 'month') return y === filter.year && m === filter.month
      if (filter.type === 'year') return y === filter.year
      return true
    }),
  }))
}

export function getDefaultFilter(defaultSetting) {
  const now = new Date()
  if (defaultSetting === 'current-month') {
    return { type: 'month', year: now.getFullYear(), month: now.getMonth() + 1 }
  }
  if (defaultSetting === 'current-year') {
    return { type: 'year', year: now.getFullYear() }
  }
  return { type: 'all' }
}
