import { useEffect } from 'react'
import { createPortal } from 'react-dom'

const DEFAULT_FILTER_OPTIONS = [
  { value: 'all', label: 'All time', desc: 'Show all payments on open' },
  { value: 'current-month', label: 'Current month', desc: 'Show only this month\'s payments on open' },
  { value: 'current-year', label: 'Current year', desc: 'Show only this year\'s payments on open' },
]

export default function SettingsScreen({ settings, onSave, onClose }) {
  useEffect(() => {
    const handleKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const current = settings.defaultFilter ?? 'all'

  return createPortal(
    <div className="detail-screen">
      <div className="detail-screen__content">
        <div className="detail-header">
          <button className="icon-btn" onClick={onClose} aria-label="Back">
            <span className="material-symbols-rounded">arrow_back</span>
          </button>
          <h2 className="modal__title">Settings</h2>
          <div style={{ width: 40 }} />
        </div>

        <div className="settings-body">
          <section className="settings-section">
            <h3 className="settings-section__title">Default date filter</h3>
            <p className="settings-section__desc">
              Choose the date range applied automatically when you open the app.
            </p>
            <div className="settings-options">
              {DEFAULT_FILTER_OPTIONS.map(opt => (
                <label key={opt.value} className={`settings-option${current === opt.value ? ' settings-option--active' : ''}`}>
                  <input
                    type="radio"
                    name="defaultFilter"
                    value={opt.value}
                    checked={current === opt.value}
                    onChange={() => onSave({ ...settings, defaultFilter: opt.value })}
                    className="settings-option__radio"
                  />
                  <div className="settings-option__body">
                    <span className="settings-option__label">{opt.label}</span>
                    <span className="settings-option__desc">{opt.desc}</span>
                  </div>
                  {current === opt.value && (
                    <span className="material-symbols-rounded settings-option__check">check_circle</span>
                  )}
                </label>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>,
    document.body
  )
}
