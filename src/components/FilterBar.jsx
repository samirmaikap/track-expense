const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

function prevMonth(year, month) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
}

function nextMonth(year, month) {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
}

export default function FilterBar({ filter, onChange }) {
  const now = new Date()
  const curYear = now.getFullYear()
  const curMonth = now.getMonth() + 1

  function activateMonth() {
    onChange({ type: 'month', year: filter.year ?? curYear, month: filter.month ?? curMonth })
  }

  function activateYear() {
    onChange({ type: 'year', year: filter.year ?? curYear })
  }

  const activeMonth = filter.month ?? curMonth
  const activeYear = filter.year ?? curYear

  return (
    <div className="filter-bar">
      {/* Segmented control */}
      <div className="filter-segment">
        <button
          className={`filter-segment__btn${filter.type === 'all' ? ' filter-segment__btn--active' : ''}`}
          onClick={() => onChange({ type: 'all' })}
        >
          All
        </button>
        <button
          className={`filter-segment__btn${filter.type === 'month' ? ' filter-segment__btn--active' : ''}`}
          onClick={activateMonth}
        >
          Month
        </button>
        <button
          className={`filter-segment__btn${filter.type === 'year' ? ' filter-segment__btn--active' : ''}`}
          onClick={activateYear}
        >
          Year
        </button>
      </div>

      {/* Period navigator */}
      {filter.type === 'month' && (
        <div className="filter-period">
          <button
            className="filter-period__arrow"
            onClick={() => { const p = prevMonth(activeYear, activeMonth); onChange({ type: 'month', ...p }) }}
            aria-label="Previous month"
          >
            <span className="material-symbols-rounded">chevron_left</span>
          </button>
          <span className="filter-period__label">
            {MONTHS[activeMonth - 1]} <span className="filter-period__year">{activeYear}</span>
          </span>
          <button
            className="filter-period__arrow"
            onClick={() => { const n = nextMonth(activeYear, activeMonth); onChange({ type: 'month', ...n }) }}
            aria-label="Next month"
          >
            <span className="material-symbols-rounded">chevron_right</span>
          </button>
        </div>
      )}

      {filter.type === 'year' && (
        <div className="filter-period">
          <button
            className="filter-period__arrow"
            onClick={() => onChange({ type: 'year', year: activeYear - 1 })}
            aria-label="Previous year"
          >
            <span className="material-symbols-rounded">chevron_left</span>
          </button>
          <span className="filter-period__label">{activeYear}</span>
          <button
            className="filter-period__arrow"
            onClick={() => onChange({ type: 'year', year: activeYear + 1 })}
            aria-label="Next year"
          >
            <span className="material-symbols-rounded">chevron_right</span>
          </button>
        </div>
      )}
    </div>
  )
}
