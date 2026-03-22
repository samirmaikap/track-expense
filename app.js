// ===== Supabase Config =====
function getSupabaseConfig() {
  const env = window.APP_CONFIG || {};
  return { url: env.supabaseUrl || '', key: env.supabaseKey || '' };
}

// ===== Supabase Client =====
let supabase = null;

function initSupabase() {
  const { url, key } = getSupabaseConfig();
  if (!url || !key || url.includes('YOUR_')) return false;
  supabase = window.supabase.createClient(url, key);
  return true;
}

// ===== Auth =====
async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ===== Cloud Storage =====
async function loadData(userId) {
  const { data, error } = await supabase
    .from('user_data')
    .select('data')
    .eq('user_id', userId)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return { categories: [] };
    throw error;
  }
  return data.data || { categories: [] };
}

async function saveData(userId, dataToSave) {
  if (!userId) return;
  const { error } = await supabase
    .from('user_data')
    .upsert(
      { user_id: userId, data: dataToSave, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
  if (error) throw error;
}

// ===== Debounced Save =====
let saveTimer = null;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveData(currentUserId, appData).catch(err => {
      console.error('Save failed:', err);
      showSnackbar('Save failed – check your connection');
    });
  }, 1500);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ===== State =====
let appData = { categories: [] };
let currentUserId = null;
let overviewChart = null;
let detailChart = null;
let confirmCallback = null;
let currentDetailCategoryId = null;

// ===== DOM Refs =====
const $ = (sel) => document.querySelector(sel);
const summaryTotal = $('#summaryTotal');
const summaryPaid = $('#summaryPaid');
const summaryPending = $('#summaryPending');
const categoriesContainer = $('#categoriesContainer');
const emptyState = $('#emptyState');
const btnAddCategory = $('#btnAddCategory');

// Category modal
const categoryModal = $('#categoryModal');
const categoryForm = $('#categoryForm');
const categoryModalTitle = $('#categoryModalTitle');
const categoryIdInput = $('#categoryId');
const categoryNameInput = $('#categoryName');
const categoryDescInput = $('#categoryDesc');
const categoryBudgetInput = $('#categoryBudget');
const btnCancelCategory = $('#btnCancelCategory');

// Payment modal
const paymentModal = $('#paymentModal');
const paymentForm = $('#paymentForm');
const paymentCategoryIdInput = $('#paymentCategoryId');
const paymentDateInput = $('#paymentDate');
const paymentLabelInput = $('#paymentLabel');
const paymentAmountInput = $('#paymentAmount');
const btnCancelPayment = $('#btnCancelPayment');

// Confirm modal
const confirmModal = $('#confirmModal');
const confirmMessage = $('#confirmMessage');
const btnConfirmCancel = $('#btnConfirmCancel');
const btnConfirmOk = $('#btnConfirmOk');

// Detail modal
const detailModal = $('#detailModal');
const btnDetailBack = $('#btnDetailBack');
const detailTitle = $('#detailTitle');
const detailSummary = $('#detailSummary');
const detailEntries = $('#detailEntries');
const btnEditCategory = $('#btnEditCategory');
const btnDeleteCategory = $('#btnDeleteCategory');

// Export/Import
const btnExport = $('#btnExport');
const btnImport = $('#btnImport');
const fileImport = $('#fileImport');

// Auth
const authScreen = $('#authScreen');
const authForm = $('#authForm');
const authEmailInput = $('#authEmail');
const authPasswordInput = $('#authPassword');
const authError = $('#authError');
const authTitle = $('#authTitle');
const authSubtitle = $('#authSubtitle');
const btnAuthSubmit = $('#btnAuthSubmit');
const btnToggleAuth = $('#btnToggleAuth');
const userEmailDisplay = $('#userEmail');
const btnLogout = $('#btnLogout');

// ===== Formatters =====
function formatCurrency(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function todayStr() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

// ===== Helpers =====
function getCategoryPaid(cat) {
  return (cat.entries || []).reduce((sum, e) => sum + Number(e.amount), 0);
}

function getCategoryPending(cat) {
  if (cat.budget === null || cat.budget === undefined) return null;
  return Math.max(0, Number(cat.budget) - getCategoryPaid(cat));
}

function getTotals() {
  let total = 0, paid = 0, hasBudget = false;
  for (const cat of appData.categories) {
    if (cat.budget !== null && cat.budget !== undefined) {
      total += Number(cat.budget);
      hasBudget = true;
    }
    paid += getCategoryPaid(cat);
  }
  return { total, paid, pending: Math.max(0, total - paid) };
}

// ===== Render =====
function render() {
  renderSummary();
  renderCategories();
  renderOverviewChart();
}

function renderSummary() {
  const { total, paid, pending } = getTotals();
  summaryTotal.textContent = formatCurrency(total);
  summaryPaid.textContent = formatCurrency(paid);
  summaryPending.textContent = formatCurrency(pending);
}

function renderCategories() {
  const cats = appData.categories;
  if (cats.length === 0) {
    categoriesContainer.innerHTML = '';
    emptyState.classList.add('empty-state--visible');
    return;
  }
  emptyState.classList.remove('empty-state--visible');

  categoriesContainer.innerHTML = cats.map(cat => {
    const paid = getCategoryPaid(cat);
    const hasBudget = cat.budget !== null && cat.budget !== undefined;
    const budget = hasBudget ? Number(cat.budget) : 0;
    const pct = hasBudget && budget > 0 ? Math.min((paid / budget) * 100, 100) : 0;
    const isComplete = hasBudget && paid >= budget && budget > 0;
    const isOver = hasBudget && paid > budget && budget > 0;
    const entryCount = (cat.entries || []).length;

    // Sanitize text content
    const safeName = escapeHtml(cat.name);
    const safeDesc = cat.description ? escapeHtml(cat.description) : '';

    return `
      <div class="category-card" data-id="${cat.id}" onclick="openDetail('${cat.id}')">
        <div class="category-card__header">
          <span class="category-card__name">${safeName}</span>
          <span class="category-card__badge ${isComplete ? 'category-card__badge--complete' : hasBudget ? 'category-card__badge--pending' : 'category-card__badge--track'}">
            ${isComplete ? 'Paid' : hasBudget ? Math.round(pct) + '%' : 'Track'}
          </span>
        </div>
        ${safeDesc ? `<p class="category-card__desc">${safeDesc}</p>` : ''}
        <div class="category-card__amounts">
          ${hasBudget ? `
          <div class="category-card__amount">
            <span class="category-card__amount-label">Budget</span>
            <span class="category-card__amount-value">${formatCurrency(budget)}</span>
          </div>` : ''}
          <div class="category-card__amount">
            <span class="category-card__amount-label">Paid</span>
            <span class="category-card__amount-value">${formatCurrency(paid)}</span>
          </div>
          ${hasBudget ? `
          <div class="category-card__amount">
            <span class="category-card__amount-label">Remaining</span>
            <span class="category-card__amount-value">${formatCurrency(Math.max(0, budget - paid))}</span>
          </div>` : ''}
        </div>
        ${hasBudget ? `
        <div class="progress">
          <div class="progress__fill ${isComplete ? 'progress__fill--complete' : ''} ${isOver ? 'progress__fill--over' : ''}" style="width:${pct}%"></div>
        </div>` : ''}
        <div class="category-card__footer">
          <span class="category-card__entries-count">${entryCount} payment${entryCount !== 1 ? 's' : ''}</span>
          <button class="category-card__add-btn" onclick="event.stopPropagation(); openPaymentModal('${cat.id}')">
            <span class="material-symbols-rounded">add</span> Add Payment
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ===== Charts =====
const chartColors = [
  '#5b5bd6', '#e09a2f', '#2e9e5a', '#d93b3b', '#3b82f6',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1'
];

function renderOverviewChart() {
  const canvas = $('#overviewChart');
  const cats = appData.categories;

  if (cats.length === 0) {
    if (overviewChart) { overviewChart.destroy(); overviewChart = null; }
    canvas.parentElement.parentElement.style.display = 'none';
    return;
  }
  canvas.parentElement.parentElement.style.display = '';

  const labels = cats.map(c => c.name);
  const budgets = cats.map(c => Number(c.budget));
  const paids = cats.map(c => getCategoryPaid(c));

  const data = {
    labels,
    datasets: [
      {
        label: 'Budget',
        data: budgets,
        backgroundColor: 'rgba(91, 91, 214, 0.15)',
        borderColor: '#5b5bd6',
        borderWidth: 2,
        borderRadius: 6,
        barPercentage: 0.6,
        categoryPercentage: 0.7,
      },
      {
        label: 'Paid',
        data: paids,
        backgroundColor: 'rgba(46, 158, 90, 0.7)',
        borderColor: '#2e9e5a',
        borderWidth: 2,
        borderRadius: 6,
        barPercentage: 0.6,
        categoryPercentage: 0.7,
      },
    ],
  };

  if (overviewChart) {
    overviewChart.data = data;
    overviewChart.update();
    return;
  }

  overviewChart = new Chart(canvas, {
    type: 'bar',
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 16,
            font: { family: "'Inter', sans-serif", size: 12 },
          },
        },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`,
          },
          backgroundColor: '#1a1a2e',
          titleFont: { family: "'Inter', sans-serif" },
          bodyFont: { family: "'Inter', sans-serif" },
          cornerRadius: 8,
          padding: 10,
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { family: "'Inter', sans-serif", size: 11 } },
        },
        y: {
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: {
            font: { family: "'Inter', sans-serif", size: 11 },
            callback: val => '₹' + Number(val).toLocaleString('en-IN'),
          },
          beginAtZero: true,
        },
      },
    },
  });
}

function renderDetailChart(cat) {
  const canvas = $('#detailChart');
  const entries = (cat.entries || []).sort((a, b) => a.date.localeCompare(b.date));

  if (entries.length === 0) {
    if (detailChart) { detailChart.destroy(); detailChart = null; }
    canvas.parentElement.style.display = 'none';
    return;
  }
  canvas.parentElement.style.display = '';

  // Cumulative payments over time
  let cumulative = 0;
  const labels = entries.map(e => formatDate(e.date));
  const cumulativeData = entries.map(e => {
    cumulative += Number(e.amount);
    return cumulative;
  });
  const budgetLine = entries.map(() => Number(cat.budget));

  const data = {
    labels,
    datasets: [
      {
        label: 'Cumulative Paid',
        data: cumulativeData,
        borderColor: '#5b5bd6',
        backgroundColor: 'rgba(91, 91, 214, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: '#5b5bd6',
        borderWidth: 2,
      },
      {
        label: 'Budget',
        data: budgetLine,
        borderColor: '#d93b3b',
        borderDash: [6, 4],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
      },
    ],
  };

  if (detailChart) {
    detailChart.data = data;
    detailChart.update();
    return;
  }

  detailChart = new Chart(canvas, {
    type: 'line',
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 12,
            font: { family: "'Inter', sans-serif", size: 11 },
          },
        },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`,
          },
          backgroundColor: '#1a1a2e',
          cornerRadius: 8,
          padding: 10,
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { family: "'Inter', sans-serif", size: 10 }, maxRotation: 45 },
        },
        y: {
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: {
            font: { family: "'Inter', sans-serif", size: 11 },
            callback: val => '₹' + Number(val).toLocaleString('en-IN'),
          },
          beginAtZero: true,
        },
      },
    },
  });
}

// ===== Category CRUD =====
function openCategoryModal(editId) {
  if (editId) {
    const cat = appData.categories.find(c => c.id === editId);
    if (!cat) return;
    categoryModalTitle.textContent = 'Edit Category';
    categoryIdInput.value = cat.id;
    categoryNameInput.value = cat.name;
    categoryDescInput.value = cat.description || '';
    categoryBudgetInput.value = cat.budget || '';
  } else {
    categoryModalTitle.textContent = 'Add Category';
    categoryForm.reset();
    categoryIdInput.value = '';
  }
  categoryModal.showModal();
  categoryNameInput.focus();
}

function saveCategory(e) {
  e.preventDefault();
  const id = categoryIdInput.value;
  const name = categoryNameInput.value.trim();
  const description = categoryDescInput.value.trim();
  const budgetRaw = categoryBudgetInput.value.trim();
  const budget = budgetRaw !== '' ? (parseFloat(budgetRaw) || 0) : null;

  if (!name) return;

  if (id) {
    const cat = appData.categories.find(c => c.id === id);
    if (cat) {
      cat.name = name;
      cat.description = description;
      cat.budget = budget;
    }
  } else {
    appData.categories.push({
      id: generateId(),
      name,
      description,
      budget,
      entries: [],
    });
  }

  categoryModal.close();
  render();
  scheduleSave();
  showSnackbar(id ? 'Category updated' : 'Category added');

  // Re-render detail if open
  if (currentDetailCategoryId) {
    const cat = appData.categories.find(c => c.id === currentDetailCategoryId);
    if (cat) renderDetailView(cat);
  }
}

function deleteCategory(id) {
  showConfirm('Delete this category and all its payments?', () => {
    appData.categories = appData.categories.filter(c => c.id !== id);
    render();
    scheduleSave();
    if (detailModal.open) detailModal.close();
    currentDetailCategoryId = null;
    showSnackbar('Category deleted');
  });
}

// ===== Payment CRUD =====
function openPaymentModal(categoryId) {
  paymentForm.reset();
  paymentCategoryIdInput.value = categoryId;
  paymentDateInput.value = todayStr();
  paymentModal.showModal();
  paymentLabelInput.focus();
}

function savePayment(e) {
  e.preventDefault();
  const catId = paymentCategoryIdInput.value;
  const date = paymentDateInput.value;
  const label = paymentLabelInput.value.trim();
  const amount = parseFloat(paymentAmountInput.value) || 0;

  if (!label || !date) return;

  const cat = appData.categories.find(c => c.id === catId);
  if (!cat) return;

  if (!cat.entries) cat.entries = [];
  cat.entries.push({ id: generateId(), date, label, amount });

  paymentModal.close();
  render();
  scheduleSave();
  showSnackbar('Payment added');

  // Re-render detail if open
  if (currentDetailCategoryId === catId) {
    renderDetailView(cat);
  }
}

function deleteEntry(catId, entryId) {
  showConfirm('Delete this payment entry?', () => {
    const cat = appData.categories.find(c => c.id === catId);
    if (!cat) return;
    cat.entries = (cat.entries || []).filter(e => e.id !== entryId);
    render();
    scheduleSave();
    if (currentDetailCategoryId === catId) {
      renderDetailView(cat);
    }
    showSnackbar('Payment deleted');
  });
}

// ===== Detail View =====
function openDetail(catId) {
  const cat = appData.categories.find(c => c.id === catId);
  if (!cat) return;
  currentDetailCategoryId = catId;

  // Destroy old detail chart
  if (detailChart) { detailChart.destroy(); detailChart = null; }

  renderDetailView(cat);
  detailModal.showModal();
}

function renderDetailView(cat) {
  detailTitle.textContent = cat.name;
  const paid = getCategoryPaid(cat);
  const hasBudget = cat.budget !== null && cat.budget !== undefined;
  const budget = hasBudget ? Number(cat.budget) : 0;
  const remaining = hasBudget ? Math.max(0, budget - paid) : null;
  const pct = hasBudget && budget > 0 ? Math.round((paid / budget) * 100) : 0;

  detailSummary.innerHTML = `
    ${hasBudget ? `
    <div class="detail-stat">
      <div class="detail-stat__label">Budget</div>
      <div class="detail-stat__value">${formatCurrency(budget)}</div>
    </div>
    <div class="detail-stat">
      <div class="detail-stat__label">Paid (${Math.min(pct, 100)}%)</div>
      <div class="detail-stat__value">${formatCurrency(paid)}</div>
    </div>
    <div class="detail-stat">
      <div class="detail-stat__label">Remaining</div>
      <div class="detail-stat__value">${formatCurrency(remaining)}</div>
    </div>
    <div class="detail-stat">
      <div class="detail-stat__label">Entries</div>
      <div class="detail-stat__value">${(cat.entries || []).length}</div>
    </div>` : `
    <div class="detail-stat">
      <div class="detail-stat__label">Total Paid</div>
      <div class="detail-stat__value">${formatCurrency(paid)}</div>
    </div>
    <div class="detail-stat">
      <div class="detail-stat__label">Entries</div>
      <div class="detail-stat__value">${(cat.entries || []).length}</div>
    </div>`}
    ${cat.description ? `
    <div class="detail-stat detail-stat--full">
      <div class="detail-stat__label">Notes</div>
      <div class="detail-stat__value detail-stat__value--notes">${escapeHtml(cat.description)}</div>
    </div>` : ''}
  `;

  renderDetailChart(cat);

  const entries = (cat.entries || []).sort((a, b) => b.date.localeCompare(a.date));

  detailEntries.innerHTML = `
    <div class="detail-entries__header">
      <h3 class="detail-entries__title">Payments</h3>
      <button class="btn btn--outlined" onclick="openPaymentModal('${cat.id}')">
        <span class="material-symbols-rounded" style="font-size:16px;vertical-align:middle;">add</span> Add
      </button>
    </div>
    ${entries.length === 0 ? '<p class="entry-empty">No payments yet</p>' : `
      <div class="entry-list">
        ${entries.map(e => `
          <div class="entry-item">
            <div class="entry-item__dot"></div>
            <div class="entry-item__info">
              <div class="entry-item__label">${escapeHtml(e.label)}</div>
              <div class="entry-item__date">${formatDate(e.date)}</div>
            </div>
            <div class="entry-item__amount">${formatCurrency(e.amount)}</div>
            <button class="icon-btn entry-item__delete" onclick="deleteEntry('${cat.id}', '${e.id}')" title="Delete">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
        `).join('')}
      </div>
    `}
  `;
}

// ===== Confirm Dialog =====
function showConfirm(message, callback) {
  confirmMessage.textContent = message;
  confirmCallback = callback;
  confirmModal.showModal();
}

// ===== Snackbar =====
function showSnackbar(message) {
  let el = document.querySelector('.snackbar');
  if (!el) {
    el = document.createElement('div');
    el.className = 'snackbar';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add('snackbar--visible');
  setTimeout(() => el.classList.remove('snackbar--visible'), 2500);
}

// ===== Auth UI =====
let isSignUpMode = false;

function showAuthScreen() {
  authScreen.classList.add('auth-screen--visible');
  document.getElementById('app').style.display = 'none';
}

function hideAuthScreen(email) {
  authScreen.classList.remove('auth-screen--visible');
  document.getElementById('app').style.display = '';
  if (email && userEmailDisplay) userEmailDisplay.textContent = email;
}

function setAuthMode(signUp) {
  isSignUpMode = signUp;
  authTitle.textContent = signUp ? 'Create Account' : 'Welcome Back';
  authSubtitle.textContent = signUp ? 'Sign up with your email' : 'Sign in to your account';
  btnAuthSubmit.textContent = signUp ? 'Create Account' : 'Sign In';
  btnToggleAuth.textContent = signUp
    ? 'Already have an account? Sign In'
    : "Don't have an account? Sign Up";
  authError.textContent = '';
  authError.style.color = '';
  authPasswordInput.autocomplete = signUp ? 'new-password' : 'current-password';
}

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = authEmailInput.value.trim();
  const password = authPasswordInput.value;
  authError.textContent = '';
  authError.style.color = '';
  btnAuthSubmit.disabled = true;
  btnAuthSubmit.textContent = isSignUpMode ? 'Creating…' : 'Signing in…';

  try {
    if (isSignUpMode) {
      const result = await signUp(email, password);
      if (!result.session) {
        authError.style.color = 'var(--md-success)';
        authError.textContent = '✓ Check your email to confirm your account.';
        return;
      }
      currentUserId = result.user.id;
      appData = await loadData(currentUserId).catch(() => ({ categories: [] }));
      hideAuthScreen(result.user.email);
      render();
    } else {
      const result = await signIn(email, password);
      currentUserId = result.user.id;
      appData = await loadData(currentUserId).catch(() => ({ categories: [] }));
      hideAuthScreen(result.user.email);
      render();
    }
  } catch (err) {
    authError.style.color = '';
    authError.textContent = err.message || 'Authentication failed';
  } finally {
    btnAuthSubmit.disabled = false;
    setAuthMode(isSignUpMode);
  }
});

btnToggleAuth.addEventListener('click', () => setAuthMode(!isSignUpMode));

btnLogout.addEventListener('click', async () => {
  try { await signOut(); } catch { /* ignore */ }
  appData = { categories: [] };
  showSnackbar('Signed out');
});

// ===== Export / Import =====
function exportData() {
  const json = JSON.stringify(appData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `track-expense-${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showSnackbar('Data exported');
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (imported && Array.isArray(imported.categories)) {
        appData = imported;
        render();
        showSnackbar('Imported – saving…');
        await saveData(currentUserId, appData);
        showSnackbar('Data saved to cloud');
      } else {
        showSnackbar('Invalid file format');
      }
    } catch {
      showSnackbar('Failed to parse file');
    }
  };
  reader.readAsText(file);
}

// ===== Event Listeners =====
btnAddCategory.addEventListener('click', () => openCategoryModal());
categoryForm.addEventListener('submit', saveCategory);
btnCancelCategory.addEventListener('click', () => categoryModal.close());

paymentForm.addEventListener('submit', savePayment);
btnCancelPayment.addEventListener('click', () => paymentModal.close());

btnConfirmCancel.addEventListener('click', () => { confirmModal.close(); confirmCallback = null; });
btnConfirmOk.addEventListener('click', () => {
  confirmModal.close();
  if (confirmCallback) { confirmCallback(); confirmCallback = null; }
});

btnDetailBack.addEventListener('click', () => {
  detailModal.close();
  currentDetailCategoryId = null;
  if (detailChart) { detailChart.destroy(); detailChart = null; }
});

btnEditCategory.addEventListener('click', () => {
  if (currentDetailCategoryId) {
    detailModal.close();
    openCategoryModal(currentDetailCategoryId);
  }
});

btnDeleteCategory.addEventListener('click', () => {
  if (currentDetailCategoryId) deleteCategory(currentDetailCategoryId);
});

btnExport.addEventListener('click', exportData);
btnImport.addEventListener('click', () => fileImport.click());
fileImport.addEventListener('change', (e) => {
  if (e.target.files[0]) importData(e.target.files[0]);
  e.target.value = '';
});

// Close modals on backdrop click
[categoryModal, paymentModal, confirmModal, detailModal].forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.close();
      if (modal === detailModal) {
        currentDetailCategoryId = null;
        if (detailChart) { detailChart.destroy(); detailChart = null; }
      }
    }
  });
});

// ===== Init =====
async function init() {
  if (!initSupabase()) {
    const configErr = document.getElementById('configError');
    if (configErr) {
      configErr.style.display = 'block';
      authForm.style.display = 'none';
      btnToggleAuth.style.display = 'none';
    }
    showAuthScreen();
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    currentUserId = session.user.id;
    try {
      appData = await loadData(currentUserId);
    } catch {
      appData = { categories: [] };
    }
    hideAuthScreen(session.user.email);
    render();
  } else {
    showAuthScreen();
  }

  supabase.auth.onAuthStateChange((_event, session) => {
    if (!session) {
      currentUserId = null;
      appData = { categories: [] };
      render();
      showAuthScreen();
    }
  });
}

init();
