import { useState, useRef, useEffect } from 'react'

export default function TopBar({ userEmail, onLogout, onExport, onImport, onSettings }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <header className="top-bar">
      <h1 className="top-bar__title">Track Expense</h1>
      <div className="top-bar__actions" ref={menuRef}>
        <button className="profile-btn" onClick={() => setOpen(v => !v)} aria-label="Account menu">
          <span className="material-symbols-rounded profile-btn__icon">account_circle</span>
        </button>
        {open && (
          <div className="profile-menu">
            <div className="profile-menu__email">{userEmail}</div>
            <div className="profile-menu__divider" />
            <button className="profile-menu__item" onClick={() => { onSettings(); setOpen(false) }}>
              <span className="material-symbols-rounded">settings</span>
              Settings
            </button>
            <div className="profile-menu__divider" />
            <button className="profile-menu__item" onClick={() => { onExport(); setOpen(false) }}>
              <span className="material-symbols-rounded">download</span>
              Export data
            </button>
            <button className="profile-menu__item" onClick={() => { onImport(); setOpen(false) }}>
              <span className="material-symbols-rounded">upload</span>
              Import data
            </button>
            <div className="profile-menu__divider" />
            <button className="profile-menu__item profile-menu__item--danger" onClick={() => { onLogout(); setOpen(false) }}>
              <span className="material-symbols-rounded">logout</span>
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
