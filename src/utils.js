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
