import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { todayStr } from '../utils'

export default function PaymentModal({ isOpen, categoryId, onSave, onClose }) {
  const [date, setDate] = useState('')
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')

  useEffect(() => {
    if (isOpen) {
      setDate(todayStr())
      setLabel('')
      setAmount('')
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  function handleSubmit(e) {
    e.preventDefault()
    if (!label.trim() || !date) return
    onSave({
      categoryId,
      date,
      label: label.trim(),
      amount: parseFloat(amount) || 0,
    })
  }

  return createPortal(
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" role="dialog" aria-modal="true">
        <h2 className="modal__title">Add Payment</h2>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="field__label" htmlFor="payDate">Date</label>
            <input
              className="field__input"
              id="payDate"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="payLabel">Label</label>
            <input
              className="field__input"
              id="payLabel"
              type="text"
              placeholder="e.g. Initial advance"
              value={label}
              onChange={e => setLabel(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="payAmount">Amount</label>
            <input
              className="field__input"
              id="payAmount"
              type="number"
              placeholder="e.g. 5000"
              min="0"
              step="any"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="modal__actions">
            <button type="button" className="btn btn--text" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn--filled">Add Payment</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
