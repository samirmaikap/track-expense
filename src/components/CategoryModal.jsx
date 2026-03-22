import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function CategoryModal({ isOpen, category, onSave, onClose }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [budget, setBudget] = useState('')

  useEffect(() => {
    if (isOpen) {
      setName(category?.name || '')
      setDescription(category?.description || '')
      setBudget(category?.budget !== null && category?.budget !== undefined ? String(category.budget) : '')
    }
  }, [isOpen, category])

  useEffect(() => {
    if (!isOpen) return
    const handleKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    const budgetRaw = budget.trim()
    onSave({
      id: category?.id || null,
      name: name.trim(),
      description: description.trim(),
      budget: budgetRaw !== '' ? (parseFloat(budgetRaw) || 0) : null,
    })
  }

  return createPortal(
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" role="dialog" aria-modal="true">
        <h2 className="modal__title">{category ? 'Edit Category' : 'Add Category'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="field__label" htmlFor="catName">
              Category Name <span className="field__required">*</span>
            </label>
            <input
              className="field__input"
              id="catName"
              type="text"
              placeholder="e.g. Plumber, Electrician"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="catDesc">
              Description <span className="field__optional">optional</span>
            </label>
            <textarea
              className="field__input field__textarea"
              id="catDesc"
              placeholder="Any notes or details…"
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="catBudget">
              Budget Amount <span className="field__optional">optional</span>
            </label>
            <input
              className="field__input"
              id="catBudget"
              type="number"
              placeholder="e.g. 50000"
              min="0"
              step="any"
              value={budget}
              onChange={e => setBudget(e.target.value)}
            />
            <span className="field__hint">Leave blank to track payments without a budget cap</span>
          </div>
          <div className="modal__actions">
            <button type="button" className="btn btn--text" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn--filled">Save</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
