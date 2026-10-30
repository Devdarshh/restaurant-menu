// ── STATE ──────────────────────────────────────────────────────────
let dishes = [];
let activeCategory = 'All';
let authToken = localStorage.getItem('spicegarden_token') || '';

// ── DOM ELEMENTS ──────────────────────────────────────────────────
const loginOverlay  = document.getElementById('login-overlay');
const loginForm     = document.getElementById('login-form');
const adminPassword = document.getElementById('admin-password');
const loginError    = document.getElementById('login-error');
const appContainer  = document.getElementById('app-container');
const logoutBtn     = document.getElementById('logout-btn');

const statTotal       = document.getElementById('stat-total');
const statAvailable   = document.getElementById('stat-available');
const statUnavailable = document.getElementById('stat-unavailable');

const adminSearch   = document.getElementById('admin-search');
const categoryPills = document.querySelectorAll('#admin-category-filters .pill');
const dishesTbody   = document.getElementById('dishes-tbody');
const noResults     = document.getElementById('no-results');

const dishModal       = document.getElementById('dish-modal');
const modalTitle      = document.getElementById('modal-title');
const dishForm        = document.getElementById('dish-form');
const modalCloseBtn   = document.getElementById('modal-close-btn');
const modalCancelBtn  = document.getElementById('modal-cancel-btn');
const addDishBtn      = document.getElementById('add-dish-btn');

const inputId         = document.getElementById('dish-id');
const inputName       = document.getElementById('dish-name');
const inputCategory   = document.getElementById('dish-category');
const inputPrice      = document.getElementById('dish-price');
const inputBadge      = document.getElementById('dish-badge');
const inputVeg        = document.getElementById('dish-veg');
const inputDesc       = document.getElementById('dish-desc');
const inputImage      = document.getElementById('dish-image');
const inputAvailable  = document.getElementById('dish-available');
const toastEl         = document.getElementById('toast');

// ── TOAST HELPER ──────────────────────────────────────────────────
function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.remove('hidden');
  setTimeout(() => {
    toastEl.classList.add('hidden');
  }, 3200);
}

// ── API HELPERS ───────────────────────────────────────────────────
async function apiFetch(url, options = {}) {
  const headers = options.headers || {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  headers['Content-Type'] = 'application/json';

  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error('Unauthorized');
  }
  return res;
}

function handleUnauthorized() {
  localStorage.removeItem('spicegarden_token');
  authToken = '';
  appContainer.classList.add('hidden');
  loginOverlay.classList.remove('hidden');
}

// ── AUTH FLOW ─────────────────────────────────────────────────────
async function checkAuth() {
  if (!authToken) {
    loginOverlay.classList.remove('hidden');
    appContainer.classList.add('hidden');
    return;
  }

  try {
    const res = await fetch('/api/auth/check', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    if (data.authenticated) {
      loginOverlay.classList.add('hidden');
      appContainer.classList.remove('hidden');
      loadDishes();
    } else {
      handleUnauthorized();
    }
  } catch (e) {
    handleUnauthorized();
  }
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.classList.add('hidden');
  const password = adminPassword.value.trim();

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      authToken = data.token;
      localStorage.setItem('spicegarden_token', authToken);
      loginOverlay.classList.add('hidden');
      appContainer.classList.remove('hidden');
      adminPassword.value = '';
      loadDishes();
      showToast('Welcome back, Admin!');
    } else {
      loginError.textContent = data.error || 'Invalid password. Please try again.';
      loginError.classList.remove('hidden');
    }
  } catch (err) {
    loginError.textContent = 'Connection error. Please try again.';
    loginError.classList.remove('hidden');
  }
});

logoutBtn.addEventListener('click', async () => {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' });
  } catch (e) {}
  handleUnauthorized();
});

// ── LOAD & RENDER DISHES ──────────────────────────────────────────
async function loadDishes() {
  try {
    const res = await apiFetch('/api/menu');
    dishes = await res.json();
    updateStats();
    renderTable();
  } catch (e) {
    console.error('Failed to load dishes:', e);
  }
}

function updateStats() {
  const total = dishes.length;
  const available = dishes.filter(d => d.available !== false).length;
  const unavailable = total - available;

  statTotal.textContent = total;
  statAvailable.textContent = available;
  statUnavailable.textContent = unavailable;
}

function renderTable() {
  const searchTerm = adminSearch.value.trim().toLowerCase();

  const filtered = dishes.filter(d => {
    const matchCat = activeCategory === 'All' || d.category === activeCategory;
    const matchSearch = d.name.toLowerCase().includes(searchTerm) ||
                        (d.description && d.description.toLowerCase().includes(searchTerm));
    return matchCat && matchSearch;
  });

  if (filtered.length === 0) {
    dishesTbody.innerHTML = '';
    noResults.classList.remove('hidden');
    return;
  }
  noResults.classList.add('hidden');

  dishesTbody.innerHTML = filtered.map(dish => {
    const isAvail = dish.available !== false;
    return `
      <tr data-id="${dish.id}">
        <td>
          <img src="${dish.image}" class="dish-thumb" alt="${dish.name}" onerror="this.src='https://placehold.co/100x100/eae9dc/1e392d?text=Dish'">
        </td>
        <td>
          <div class="dish-info">
            <h4>
              ${dish.name}
              ${dish.veg ? '<span class="veg-indicator" title="Vegetarian"></span>' : ''}
              ${dish.badge ? `<span class="badge-tag">${dish.badge}</span>` : ''}
            </h4>
            <div class="dish-desc-preview">${dish.description || 'No description added.'}</div>
          </div>
        </td>
        <td>
          <span class="category-badge">${dish.category}</span>
        </td>
        <td>
          <span class="price-display">₹${dish.price}</span>
        </td>
        <td>
          <button class="stock-badge ${isAvail ? 'in-stock' : 'out-stock'}" onclick="toggleStock('${dish.id}')" title="Click to toggle availability">
            <span>●</span> ${isAvail ? 'In Stock' : 'Out of Stock'}
          </button>
        </td>
        <td>
          <div class="table-actions">
            <button class="action-btn" onclick="openEditModal('${dish.id}')">Edit</button>
            <button class="action-btn btn-del" onclick="deleteDish('${dish.id}')">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ── FILTER & SEARCH ───────────────────────────────────────────────
adminSearch.addEventListener('input', renderTable);

categoryPills.forEach(pill => {
  pill.addEventListener('click', () => {
    categoryPills.forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    activeCategory = pill.dataset.cat;
    renderTable();
  });
});

// ── TOGGLE STOCK ──────────────────────────────────────────────────
window.toggleStock = async function(id) {
  try {
    const res = await apiFetch(`/api/menu/${id}/toggle`, { method: 'PATCH' });
    const data = await res.json();
    if (data.success) {
      const idx = dishes.findIndex(d => d.id === id);
      if (idx !== -1) {
        dishes[idx].available = data.dish.available;
      }
      updateStats();
      renderTable();
      showToast(`Updated "${data.dish.name}" status: ${data.dish.available ? 'In Stock' : 'Out of Stock'}`);
    }
  } catch (e) {
    showToast('Failed to update stock status');
  }
};

// ── DELETE DISH ───────────────────────────────────────────────────
window.deleteDish = async function(id) {
  const dish = dishes.find(d => d.id === id);
  const name = dish ? dish.name : 'this item';
  if (!confirm(`Are you sure you want to permanently delete "${name}"?`)) return;

  try {
    const res = await apiFetch(`/api/menu/${id}`, { method: 'DELETE' });
    if (res.ok) {
      dishes = dishes.filter(d => d.id !== id);
      updateStats();
      renderTable();
      showToast(`Deleted "${name}"`);
    }
  } catch (e) {
    showToast('Failed to delete dish');
  }
};

// ── MODAL: ADD / EDIT ─────────────────────────────────────────────
function openAddModal() {
  modalTitle.textContent = 'Add New Dish';
  dishForm.reset();
  inputId.value = '';
  inputVeg.checked = true;
  inputAvailable.checked = true;
  dishModal.classList.remove('hidden');
  inputName.focus();
}

window.openEditModal = function(id) {
  const dish = dishes.find(d => d.id === id);
  if (!dish) return;

  modalTitle.textContent = 'Edit Dish Details';
  inputId.value        = dish.id;
  inputName.value      = dish.name;
  inputCategory.value  = dish.category;
  inputPrice.value     = dish.price;
  inputBadge.value     = dish.badge || '';
  inputVeg.checked     = Boolean(dish.veg);
  inputDesc.value      = dish.description || '';
  inputImage.value     = dish.image || '';
  inputAvailable.checked = dish.available !== false;

  dishModal.classList.remove('hidden');
};

function closeModal() {
  dishModal.classList.add('hidden');
}

addDishBtn.addEventListener('click', openAddModal);
modalCloseBtn.addEventListener('click', closeModal);
modalCancelBtn.addEventListener('click', closeModal);

dishModal.addEventListener('click', (e) => {
  if (e.target === dishModal) closeModal();
});

dishForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = inputId.value;

  const payload = {
    name: inputName.value.trim(),
    category: inputCategory.value,
    price: Number(inputPrice.value),
    badge: inputBadge.value || null,
    veg: inputVeg.checked,
    description: inputDesc.value.trim(),
    image: inputImage.value.trim(),
    available: inputAvailable.checked
  };

  try {
    let res;
    if (id) {
      // Edit
      res = await apiFetch(`/api/menu/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    } else {
      // Create
      res = await apiFetch('/api/menu', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }

    const data = await res.json();
    if (res.ok && data.success) {
      closeModal();
      showToast(id ? `Updated "${payload.name}"` : `Added "${payload.name}" to menu!`);
      loadDishes();
    } else {
      alert(data.error || 'Failed to save dish');
    }
  } catch (err) {
    alert('Network error while saving dish.');
  }
});

// ── INITIAL CHECK ─────────────────────────────────────────────────
checkAuth();
