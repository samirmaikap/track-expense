import { createPortal } from 'react-dom'

export default function Snackbar({ message }) {
  if (!message) return null
  return createPortal(
    <div className="snackbar snackbar--visible">{message}</div>,
    document.body
  )
}
