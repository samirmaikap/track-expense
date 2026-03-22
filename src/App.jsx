import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, isConfigured, dbLoadData, dbSaveData } from './supabase'
import { generateId, filterCategoriesByDate, getDefaultFilter } from './utils'
import AuthScreen from './components/AuthScreen'
import TopBar from './components/TopBar'
import Summary from './components/Summary'
import OverviewChart from './components/OverviewChart'
import CategoryCard from './components/CategoryCard'
import CategoryModal from './components/CategoryModal'
import PaymentModal from './components/PaymentModal'
import DetailView from './components/DetailView'
import ConfirmModal from './components/ConfirmModal'
import Snackbar from './components/Snackbar'
import FilterBar from './components/FilterBar'
import SettingsScreen from './components/SettingsScreen'

export default function App() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [appData, setAppData] = useState({ categories: [] })

  // Settings (persisted to localStorage)
  const [settings, setSettings] = useState(() => {
    try { return JSON.parse(localStorage.getItem('expense-settings') || '{}') } catch { return {} }
  })
  const [showSettings, setShowSettings] = useState(false)

  // Date filter (session state, initialized from settings)
  const [dateFilter, setDateFilter] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem('expense-settings') || '{}')
      return getDefaultFilter(s.defaultFilter)
    } catch { return { type: 'all' } }
  })

  // Modal states
  const [categoryModal, setCategoryModal] = useState({ open: false, editId: null })
  const [paymentModal, setPaymentModal] = useState({ open: false, categoryId: null })
  const [detailCategoryId, setDetailCategoryId] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [snackbar, setSnackbar] = useState(null)

  const userRef = useRef(null)
  const saveTimerRef = useRef(null)
  const fileInputRef = useRef(null)

  const showSnackbar = useCallback((msg) => {
    setSnackbar(msg)
    setTimeout(() => setSnackbar(s => s === msg ? null : s), 2500)
  }, [])

  const scheduleSave = useCallback((data) => {
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      const uid = userRef.current?.id
      if (!uid) return
      dbSaveData(uid, data).catch(err => {
        console.error('Save failed:', err)
        showSnackbar('Save failed – check your connection')
      })
    }, 1500)
  }, [showSnackbar])

  useEffect(() => { userRef.current = user }, [user])

  // Auth init
  useEffect(() => {
    if (!isConfigured || !supabase) {
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser({ id: session.user.id, email: session.user.email })
        dbLoadData(session.user.id)
          .then(data => setAppData(data))
          .catch(() => {})
          .finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null)
        setAppData({ categories: [] })
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleAuth = useCallback(async (email, password, isSignUp) => {
    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      if (!data.session) return { needsConfirmation: true }
      setUser({ id: data.user.id, email: data.user.email })
      const loaded = await dbLoadData(data.user.id).catch(() => ({ categories: [] }))
      setAppData(loaded)
      return {}
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      setUser({ id: data.user.id, email: data.user.email })
      const loaded = await dbLoadData(data.user.id).catch(() => ({ categories: [] }))
      setAppData(loaded)
      return {}
    }
  }, [])

  const handleLogout = useCallback(async () => {
    try { await supabase.auth.signOut() } catch {}
    setUser(null)
    setAppData({ categories: [] })
    showSnackbar('Signed out')
  }, [showSnackbar])

  // Category handlers
  const openAddCategory = useCallback(() => setCategoryModal({ open: true, editId: null }), [])
  const openEditCategory = useCallback((id) => setCategoryModal({ open: true, editId: id }), [])
  const closeCategoryModal = useCallback(() => setCategoryModal({ open: false, editId: null }), [])

  const saveCategory = useCallback(({ id, name, description, budget }) => {
    setAppData(prev => {
      const next = id
        ? { ...prev, categories: prev.categories.map(c => c.id === id ? { ...c, name, description, budget } : c) }
        : { ...prev, categories: [...prev.categories, { id: generateId(), name, description, budget, entries: [] }] }
      scheduleSave(next)
      return next
    })
    closeCategoryModal()
    showSnackbar(id ? 'Category updated' : 'Category added')
  }, [scheduleSave, showSnackbar, closeCategoryModal])

  const deleteCategory = useCallback((id) => {
    setConfirm({
      message: 'Delete this category and all its payments?',
      onConfirm: () => {
        setAppData(prev => {
          const next = { ...prev, categories: prev.categories.filter(c => c.id !== id) }
          scheduleSave(next)
          return next
        })
        setDetailCategoryId(null)
        showSnackbar('Category deleted')
      },
    })
  }, [scheduleSave, showSnackbar])

  // Payment handlers
  const openAddPayment = useCallback((categoryId) => setPaymentModal({ open: true, categoryId }), [])
  const closePaymentModal = useCallback(() => setPaymentModal({ open: false, categoryId: null }), [])

  const savePayment = useCallback(({ categoryId, date, label, amount }) => {
    setAppData(prev => {
      const next = {
        ...prev,
        categories: prev.categories.map(c =>
          c.id === categoryId
            ? { ...c, entries: [...(c.entries || []), { id: generateId(), date, label, amount }] }
            : c
        ),
      }
      scheduleSave(next)
      return next
    })
    closePaymentModal()
    showSnackbar('Payment added')
  }, [scheduleSave, showSnackbar, closePaymentModal])

  const deleteEntry = useCallback((catId, entryId) => {
    setConfirm({
      message: 'Delete this payment entry?',
      onConfirm: () => {
        setAppData(prev => {
          const next = {
            ...prev,
            categories: prev.categories.map(c =>
              c.id === catId ? { ...c, entries: (c.entries || []).filter(e => e.id !== entryId) } : c
            ),
          }
          scheduleSave(next)
          return next
        })
        showSnackbar('Payment deleted')
      },
    })
  }, [scheduleSave, showSnackbar])

  // Settings handler
  const saveSettings = useCallback((next) => {
    setSettings(next)
    localStorage.setItem('expense-settings', JSON.stringify(next))
    // If the default filter changed, also reset the active date filter
    if (next.defaultFilter !== settings.defaultFilter) {
      setDateFilter(getDefaultFilter(next.defaultFilter))
    }
  }, [settings])

  // Export / Import
  const exportData = useCallback(() => {
    const json = JSON.stringify(appData, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `track-expense-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    showSnackbar('Data exported')
  }, [appData, showSnackbar])

  const importData = useCallback(async (file) => {
    try {
      const text = await file.text()
      const imported = JSON.parse(text)
      if (imported && Array.isArray(imported.categories)) {
        setAppData(imported)
        showSnackbar('Imported – saving…')
        const uid = userRef.current?.id
        if (uid) await dbSaveData(uid, imported)
        showSnackbar('Saved to cloud')
      } else {
        showSnackbar('Invalid file format')
      }
    } catch {
      showSnackbar('Failed to parse file')
    }
  }, [showSnackbar])

  if (loading) {
    return (
      <div className="loading-screen">
        <span className="material-symbols-rounded spin">sync</span>
      </div>
    )
  }

  if (!isConfigured || !user) {
    return <AuthScreen notConfigured={!isConfigured} onAuth={handleAuth} />
  }

  const editCategory = categoryModal.editId
    ? appData.categories.find(c => c.id === categoryModal.editId)
    : null

  const detailCategory = detailCategoryId
    ? appData.categories.find(c => c.id === detailCategoryId)
    : null

  const filteredCategories = filterCategoriesByDate(appData.categories, dateFilter)

  return (
    <>
      <div id="app">
        <TopBar
          userEmail={user.email}
          onLogout={handleLogout}
          onExport={exportData}
          onImport={() => fileInputRef.current?.click()}
          onSettings={() => setShowSettings(true)}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          hidden
          onChange={e => { if (e.target.files[0]) importData(e.target.files[0]); e.target.value = '' }}
        />

        <FilterBar filter={dateFilter} onChange={setDateFilter} />

        <Summary categories={filteredCategories} />
        <OverviewChart categories={filteredCategories} />

        <section className="categories">
          {filteredCategories.map(cat => (
            <CategoryCard
              key={cat.id}
              category={cat}
              onOpen={() => setDetailCategoryId(cat.id)}
              onAddPayment={() => openAddPayment(cat.id)}
            />
          ))}
        </section>

        {appData.categories.length === 0 && (
          <div className="empty-state empty-state--visible">
            <span className="material-symbols-rounded empty-state__icon">receipt_long</span>
            <p className="empty-state__text">No expenses yet. Tap + to add a category.</p>
          </div>
        )}

        <button className="fab" onClick={openAddCategory} title="Add Category">
          <span className="material-symbols-rounded">add</span>
        </button>
      </div>

      <CategoryModal
        isOpen={categoryModal.open}
        category={editCategory}
        onSave={saveCategory}
        onClose={closeCategoryModal}
      />

      <PaymentModal
        isOpen={paymentModal.open}
        categoryId={paymentModal.categoryId}
        onSave={savePayment}
        onClose={closePaymentModal}
      />

      {detailCategory && (
        <DetailView
          category={detailCategory}
          allCategories={appData.categories}
          onClose={() => setDetailCategoryId(null)}
          onEdit={() => { setDetailCategoryId(null); openEditCategory(detailCategoryId) }}
          onDelete={() => { setDetailCategoryId(null); deleteCategory(detailCategoryId) }}
          onAddPayment={() => openAddPayment(detailCategoryId)}
          onDeleteEntry={deleteEntry}
        />
      )}

      {showSettings && (
        <SettingsScreen
          settings={settings}
          onSave={saveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      <ConfirmModal confirm={confirm} onClose={() => setConfirm(null)} />
      <Snackbar message={snackbar} />
    </>
  )
}
