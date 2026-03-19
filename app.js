// ===== Storage Keys =====
const STORAGE_KEY     = 'track-expense-data';
const JB_KEY_KEY      = 'track-expense-jb-key';
const JB_BIN_KEY      = 'track-expense-jb-bin';
const JSONBIN_BASE    = 'https://api.jsonbin.io/v3';

// ===== JSONBin Config =====
function getJbConfig() {
  return {
    apiKey: localStorage.getItem(JB_KEY_KEY) || '',
    binId:  localStorage.getItem(JB_BIN_KEY) || '',
  };
}

function saveJbConfig(apiKey, binId) {
  localStorage.setItem(JB_KEY_KEY, apiKey);
  localStorage.setItem(JB_BIN_KEY, binId);
}

function clearJbConfig() {
  localStorage.removeItem(JB_KEY_KEY);
  localStorage.removeItem(JB_BIN_KEY);
}

// ===== JSONBin API =====
async function loadFromCloud() {
  const { apiKey, binId } = getJbConfig();
  if (!apiKey || !binId) return null;
  try {
    const res = await fetch(`${JSONBIN_BASE}/b/${binId}/latest`, {
      headers: { 'X-Master-Key': apiKey },
    });
    if (!res.ok) throw new Error(`JSONBin GET ${res.status}`);
    const json = await res.json();
    return json.record;
  } catch (err) {
    console.error('JSONBin load failed:', err);
    return null;
  }
}

async function saveToCloud(data) {
  const { apiKey, binId } = getJbConfig();
  if (!apiKey || !binId) return false;
  try {
    setSyncStatus('syncing');
    const res = await fetch(`${JSONBIN_BASE}/b/${binId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': apiKey,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || `JSONBin PUT ${res.status}`);
    }
    setSyncStatus('ok');
    return true;
  } catch (err) {
    console.error('JSONBin save failed:', err);
    setSyncStatus('error', err.message);
    return false;
  }
}

async function createBin(apiKey) {
  const res = await fetch(`${JSONBIN_BASE}/b`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': apiKey,
      'X-Bin-Name': 'track-expense',
      'X-Bin-Private': 'true',
    },
    body: JSON.stringify({ categories: [] }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Could not create bin: ${res.status}`);
  }
  const json = await res.json();
  return json.metadata.id;
}

// ===== Sync Status Indicator =====
function setSyncStatus(state, tooltip = '') {
  const el = document.getElementById('syncStatus');
  if (!el) return;
  el.className = 'sync-status';
  if (state === 'syncing') {
    el.className = 'sync-status sync-status--syncing';
    el.innerHTML = '<span class="material-symbols-rounded" style="display:block">sync</span>';
    el.title = 'Syncing…';
  } else if (state === 'ok') {
    el.className = 'sync-status sync-status--ok';
    el.innerHTML = '<span class="material-symbols-rounded">cloud_done</span>';
    el.title = 'Synced – click to pull latest';
    setTimeout(() => {
      el.innerHTML = '<span class="material-symbols-rounded">cloud_sync</span>';
      el.className = 'sync-status sync-status--idle';
      el.title = 'Click to sync now';
    }, 3000);
  } else if (state === 'error') {
    el.className = 'sync-status sync-status--error';
    el.innerHTML = '<span class="material-symbols-rounded">cloud_off</span>';
    el.title = tooltip || 'Sync failed – click to retry';
  } else if (state === 'idle') {
    el.className = 'sync-status sync-status--idle';
    el.innerHTML = '<span class="material-symbols-rounded">cloud_sync</span>';
    el.title = 'Click to sync now';
  } else {
    el.innerHTML = '';
  }
}

// ===== Local Storage Fallback =====
function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { categories: [] };
}

function saveLocal(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ===== Debounced Save =====
let saveTimer = null;
function scheduleSave() {
  saveLocal(appData);
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveToCloud(appData), 1200);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ===== State =====
let appData = loadLocal(); // start with local immediately
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
  return Math.max(0, Number(cat.budget) - getCategoryPaid(cat));
}

function getTotals() {
  let total = 0, paid = 0;
  for (const cat of appData.categories) {
    total += Number(cat.budget);
    paid += getCategoryPaid(cat);
  }
  return { total, paid, pending: Math.max(0, total - paid) };
}

// ===== Render =====
function render() {
  renderSummary();
  renderCategories();
  renderOverviewChart();
  scheduleSave();
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
    const budget = Number(cat.budget);
    const pct = budget > 0 ? Math.min((paid / budget) * 100, 100) : 0;
    const isComplete = paid >= budget && budget > 0;
    const isOver = paid > budget && budget > 0;
    const entryCount = (cat.entries || []).length;

    // Sanitize text content
    const safeName = escapeHtml(cat.name);

    return `
      <div class="category-card" data-id="${cat.id}" onclick="openDetail('${cat.id}')">
        <div class="category-card__header">
          <span class="category-card__name">${safeName}</span>
          <span class="category-card__badge ${isComplete ? 'category-card__badge--complete' : 'category-card__badge--pending'}">
            ${isComplete ? 'Paid' : Math.round(pct) + '%'}
          </span>
        </div>
        <div class="category-card__amounts">
          <div class="category-card__amount">
            <span class="category-card__amount-label">Budget</span>
            <span class="category-card__amount-value">${formatCurrency(budget)}</span>
          </div>
          <div class="category-card__amount">
            <span class="category-card__amount-label">Paid</span>
            <span class="category-card__amount-value">${formatCurrency(paid)}</span>
          </div>
          <div class="category-card__amount">
            <span class="category-card__amount-label">Remaining</span>
            <span class="category-card__amount-value">${formatCurrency(Math.max(0, budget - paid))}</span>
          </div>
        </div>
        <div class="progress">
          <div class="progress__fill ${isComplete ? 'progress__fill--complete' : ''} ${isOver ? 'progress__fill--over' : ''}" style="width:${pct}%"></div>
        </div>
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
    categoryBudgetInput.value = cat.budget;
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
  const budget = parseFloat(categoryBudgetInput.value) || 0;

  if (!name) return;

  if (id) {
    const cat = appData.categories.find(c => c.id === id);
    if (cat) {
      cat.name = name;
      cat.budget = budget;
    }
  } else {
    appData.categories.push({
      id: generateId(),
      name,
      budget,
      entries: [],
    });
  }

  categoryModal.close();
  render();
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
  const budget = Number(cat.budget);
  const remaining = Math.max(0, budget - paid);
  const pct = budget > 0 ? Math.round((paid / budget) * 100) : 0;

  detailSummary.innerHTML = `
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
    </div>
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

// ===== Settings Modal =====
const settingsModal   = $('#settingsModal');
const settingsForm    = $('#settingsForm');
const jbKeyInput      = $('#jbKey');
const jbBinInput      = $('#jbBin');
const btnSettings     = $('#btnSettings');
const btnCancelSettings = $('#btnCancelSettings');
const btnClearToken   = $('#btnClearToken');

function openSettingsModal() {
  const cfg = getJbConfig();
  jbKeyInput.value = cfg.apiKey ? '••••••••' : '';
  jbKeyInput.dataset.hasExisting = cfg.apiKey ? '1' : '0';
  jbBinInput.value = cfg.binId;
  settingsModal.showModal();
}

settingsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const keyVal = jbKeyInput.value.trim();
  const binVal = jbBinInput.value.trim();
  const existing = localStorage.getItem(JB_KEY_KEY) || '';
  const apiKey = (keyVal === '••••••••' && jbKeyInput.dataset.hasExisting === '1') ? existing : keyVal;

  let binId = binVal;
  settingsModal.close();
  if (!apiKey) return;

  if (!binId) {
    try {
      showSnackbar('Creating bin…');
      setSyncStatus('syncing');
      binId = await createBin(apiKey);
      showSnackbar('Bin created!');
    } catch (err) {
      showSnackbar('Could not create bin: ' + err.message);
      setSyncStatus('error', err.message);
      return;
    }
  }

  saveJbConfig(apiKey, binId);
  showSnackbar('Syncing…');
  setSyncStatus('syncing');
  const remote = await loadFromCloud();
  if (remote) {
    appData = remote;
    saveLocal(appData);
    render();
    setSyncStatus('ok');
    showSnackbar('Synced from JSONBin');
  } else {
    await saveToCloud(appData);
    showSnackbar('Local data pushed to bin');
  }
});

btnCancelSettings.addEventListener('click', () => settingsModal.close());
btnClearToken.addEventListener('click', () => {
  clearJbConfig();
  jbKeyInput.value = '';
  jbKeyInput.dataset.hasExisting = '0';
  jbBinInput.value = '';
  setSyncStatus('');
  showSnackbar('JSONBin config cleared');
});
btnSettings.addEventListener('click', openSettingsModal);

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
        saveLocal(appData);
        render();
        showSnackbar('Imported – syncing…');
        await saveToCloud(appData);
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
[categoryModal, paymentModal, confirmModal, detailModal, settingsModal].forEach(modal => {
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
  render();
  const { apiKey, binId } = getJbConfig();
  if (apiKey && binId) {
    setSyncStatus('syncing');
    const remote = await loadFromCloud();
    if (remote) {
      appData = remote;
      saveLocal(appData);
      render();
      setSyncStatus('ok');
    } else {
      setSyncStatus('error', 'Could not load from JSONBin');
    }
  }

  const syncEl = document.getElementById('syncStatus');
  if (syncEl) {
    syncEl.style.cursor = 'pointer';
    syncEl.addEventListener('click', async () => {
      const { apiKey, binId } = getJbConfig();
      if (!apiKey || !binId) { openSettingsModal(); return; }
      setSyncStatus('syncing');
      showSnackbar('Syncing…');
      const remote = await loadFromCloud();
      if (remote) {
        appData = remote;
        saveLocal(appData);
        render();
        setSyncStatus('ok');
        showSnackbar('Synced from JSONBin');
      } else {
        setSyncStatus('error', 'Sync failed');
        showSnackbar('Sync failed – check your API key in Settings');
      }
    });
  }
}

init();
