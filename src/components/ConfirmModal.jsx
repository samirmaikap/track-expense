import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function ConfirmModal({ confirm, onClose }) {
  useEffect(() => {
    if (!confirm) return
    const handleKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [confirm, onClose])

  if (!confirm) return null

  function handleConfirm() {
    confirm.onConfirm()
    onClose()
  }

  return createPortal(
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" role="dialog" aria-modal="true">
        <h2 className="modal__title">Confirm Delete</h2>
        <p className="modal__body">{confirm.message}</p>
        <div className="modal__actions">
          <button type="button" className="btn btn--text" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn--danger" onClick={handleConfirm}>Delete</button>
        </div>
      </div>
    </div>,
    document.body
  )
}
