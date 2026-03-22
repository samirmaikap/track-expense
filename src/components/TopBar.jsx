export default function TopBar({ userEmail, onLogout, onExport, onImport }) {
  return (
    <header className="top-bar">
      <h1 className="top-bar__title">Track Expense</h1>
      <div className="top-bar__actions">
        <span className="user-email" title={userEmail}>{userEmail}</span>
        <button className="icon-btn" onClick={onExport} title="Export Data">
          <span className="material-symbols-rounded">download</span>
        </button>
        <button className="icon-btn" onClick={onImport} title="Import Data">
          <span className="material-symbols-rounded">upload</span>
        </button>
        <button className="icon-btn" onClick={onLogout} title="Sign Out">
          <span className="material-symbols-rounded">logout</span>
        </button>
      </div>
    </header>
  )
}
