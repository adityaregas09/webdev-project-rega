/**
 * ========================================================
 * Expense Tracker App — main.js
 * ========================================================
 * Implementasi lengkap semua kriteria (Advanced / Bintang 5)
 * Kriteria 1: DOM Manipulation + Validasi + Dashboard
 * Kriteria 2: localStorage + Edit + Custom Event
 * Kriteria 3: Ubah Tipe + Pencarian (real-time + reset)
 */

// ========================================================
// STATE & STORAGE
// ========================================================

const STORAGE_KEY = 'expense_tracker_transactions';

// Muat data dari localStorage saat halaman dibuka
let transactions = loadFromStorage();

// Variabel untuk mode edit (null = mode tambah, string id = mode edit)
let editingId = null;

// Variabel keyword pencarian aktif
let searchKeyword = '';

// ========================================================
// FUNGSI UTILITAS
// ========================================================

/** Buat ID unik otomatis */
function generateId() {
  return +new Date();
}

/** Format angka ke format Rupiah */
function formatRupiah(amount) {
  return 'Rp' + Number(amount).toLocaleString('id-ID');
}

/** Simpan array transactions ke localStorage */
function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

/** Muat data dari localStorage, kembalikan array kosong jika belum ada */
function loadFromStorage() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/** Kirim sinyal Custom Event: transaction:updated */
function dispatchUpdate() {
  document.dispatchEvent(new Event('transaction:updated'));
}

// ========================================================
// KRITERIA 1 — RENDER & DASHBOARD
// ========================================================

const incomeList = document.getElementById('incomeList');
const expenseList = document.getElementById('expenseList');

/** Buat elemen kartu transaksi sesuai template yang diwajibkan */
function createTransactionCard(transaction) {
  const { id, title, amount, date, type } = transaction;
  const isIncome = type === 'income';

  // Wrapper utama
  const item = document.createElement('div');
  item.setAttribute('data-testid', 'transactionItem');
  item.className = 'tracker-transaction-item';

  // Ikon
  const icon = document.createElement('div');
  icon.className = `tracker-transaction-item__icon tracker-transaction-item__icon--${type}`;
  icon.textContent = isIncome ? '↑' : '↓';

  // Detail kiri
  const detail = document.createElement('div');
  detail.className = 'tracker-transaction-item__detail';

  const titleEl = document.createElement('h3');
  titleEl.setAttribute('data-testid', 'transactionItemTitle');
  titleEl.className = 'tracker-transaction-item__title';
  titleEl.textContent = title;

  const dateEl = document.createElement('p');
  dateEl.setAttribute('data-testid', 'transactionItemDate');
  dateEl.className = 'tracker-transaction-item__date';
  dateEl.textContent = `Tanggal: ${date}`;

  detail.appendChild(titleEl);
  detail.appendChild(dateEl);

  // Sisi kanan
  const right = document.createElement('div');
  right.className = 'tracker-transaction-item__right';

  const amountEl = document.createElement('p');
  amountEl.setAttribute('data-testid', 'transactionItemAmount');
  amountEl.className = `tracker-transaction-item__amount tracker-transaction-item__amount--${type}`;
  amountEl.textContent = `Nominal: ${formatRupiah(amount)}`;

  const typeEl = document.createElement('p');
  typeEl.setAttribute('data-testid', 'transactionItemType');
  typeEl.className = 'tracker-transaction-item__type-badge';
  typeEl.textContent = `Tipe: ${isIncome ? 'Pemasukan' : 'Pengeluaran'}`;

  // Tombol aksi
  const actions = document.createElement('div');
  actions.className = 'tracker-transaction-item__actions';

  const editBtn = document.createElement('button');
  editBtn.setAttribute('data-testid', 'transactionItemEditTypeButton');
  editBtn.className = 'tracker-transaction-item__btn tracker-transaction-item__btn--edit';
  editBtn.textContent = 'Ubah Tipe';
  editBtn.addEventListener('click', () => handleToggleType(id));

  const deleteBtn = document.createElement('button');
  deleteBtn.setAttribute('data-testid', 'transactionItemDeleteButton');
  deleteBtn.className = 'tracker-transaction-item__btn tracker-transaction-item__btn--delete';
  deleteBtn.textContent = 'Hapus';
  deleteBtn.addEventListener('click', () => handleDelete(id));

  // Tombol Edit Data (bonus UX)
  const editDataBtn = document.createElement('button');
  editDataBtn.className = 'tracker-transaction-item__btn tracker-transaction-item__btn--edit-data';
  editDataBtn.textContent = 'Edit';
  editDataBtn.addEventListener('click', () => handleEditData(id));

  actions.appendChild(editBtn);
  actions.appendChild(editDataBtn);
  actions.appendChild(deleteBtn);

  right.appendChild(amountEl);
  right.appendChild(typeEl);
  right.appendChild(actions);

  item.appendChild(icon);
  item.appendChild(detail);
  item.appendChild(right);

  return item;
}

/** Render semua transaksi ke incomeList & expenseList */
function renderTransactions() {
  // Kosongkan kontainer
  incomeList.innerHTML = '';
  expenseList.innerHTML = '';

  // Filter berdasarkan keyword pencarian
  const filtered = searchKeyword
    ? transactions.filter(t =>
        t.title.toLowerCase().includes(searchKeyword.toLowerCase())
      )
    : transactions;

  // Render ke kontainer yang sesuai
  filtered.forEach(transaction => {
    const card = createTransactionCard(transaction);
    if (transaction.type === 'income') {
      incomeList.appendChild(card);
    } else {
      expenseList.appendChild(card);
    }
  });
}

/** Update panel dasbor (saldo, total pemasukan, total pengeluaran) */
function updateDashboard() {
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;

  // Ambil elemen dashboard
  const balanceEl = document.querySelector('.tracker-summary__balance-amount');
  const incomeEl = document.querySelector('.tracker-summary__stat-amount--income');
  const expenseEl = document.querySelector('.tracker-summary__stat-amount--expense');

  if (balanceEl) balanceEl.textContent = formatRupiah(balance);
  if (incomeEl) incomeEl.textContent = formatRupiah(totalIncome);
  if (expenseEl) expenseEl.textContent = formatRupiah(totalExpense);

  // Warnai saldo berdasarkan positif/negatif
  if (balanceEl) {
    balanceEl.style.color = balance < 0 ? 'var(--color-expense)' : 'var(--text-dark)';
  }
}

// ========================================================
// KRITERIA 2 — FORM SUBMIT, EDIT, HAPUS, localStorage
// ========================================================

const transactionForm = document.getElementById('transactionForm');
const titleInput = document.getElementById('transactionFormTitleInput');
const amountInput = document.getElementById('transactionFormAmountInput');
const dateInput = document.getElementById('transactionFormDateInput');
const typeSelect = document.getElementById('transactionFormTypeSelect');
const submitBtn = document.querySelector('[data-testid="transactionFormSubmitButton"]');
const formHeading = document.getElementById('form-heading');

/** Reset form ke mode Tambah */
function resetForm() {
  transactionForm.reset();
  editingId = null;
  submitBtn.textContent = 'Simpan';
  if (formHeading) formHeading.textContent = 'Tambah Pencatatan Baru';
}

/** Handler: submit form (tambah atau update) */
transactionForm.addEventListener('submit', function (e) {
  e.preventDefault();

  const title = titleInput.value.trim();
  const amount = Number(amountInput.value);
  const date = dateInput.value;
  const type = typeSelect.value;

  // Validasi input (Kriteria 1 - Skilled)
  if (!title) {
    alert('Keterangan transaksi tidak boleh kosong!');
    return;
  }
  if (amount < 1) {
    alert('Nominal harus minimal Rp1!');
    return;
  }

  if (editingId !== null) {
    // Mode Edit: perbarui data transaksi yang ada
    transactions = transactions.map(t =>
      t.id === editingId ? { ...t, title, amount, date, type } : t
    );
  } else {
    // Mode Tambah: buat transaksi baru
    const newTransaction = {
      id: generateId(),
      title,
      amount,
      date,
      type,
    };
    transactions.push(newTransaction);
  }

  saveToStorage();
  resetForm();
  dispatchUpdate(); // Kirim Custom Event
});

/** Handler: klik tombol Edit Data → isi form dengan data transaksi */
function handleEditData(id) {
  const transaction = transactions.find(t => t.id === id);
  if (!transaction) return;

  editingId = id;
  titleInput.value = transaction.title;
  amountInput.value = transaction.amount;
  dateInput.value = transaction.date;
  typeSelect.value = transaction.type;

  submitBtn.textContent = 'Perbarui';
  if (formHeading) formHeading.textContent = 'Edit Pencatatan';

  // Scroll ke form
  transactionForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Handler: hapus transaksi */
function handleDelete(id) {
  transactions = transactions.filter(t => t.id !== id);
  saveToStorage();
  dispatchUpdate();
}

// ========================================================
// KRITERIA 3 — UBAH TIPE & PENCARIAN
// ========================================================

/** Handler: ubah tipe transaksi (income ↔ expense) */
function handleToggleType(id) {
  transactions = transactions.map(t =>
    t.id === id
      ? { ...t, type: t.type === 'income' ? 'expense' : 'income' }
      : t
  );
  saveToStorage();
  dispatchUpdate();
}

// Pencarian — event listener 'input' untuk real-time search
const searchInput = document.getElementById('searchTransactionFormTitleInput');
const searchForm = document.getElementById('searchTransactionForm');

if (searchInput) {
  searchInput.addEventListener('input', function () {
    searchKeyword = this.value;
    renderTransactions(); // Re-render dengan filter keyword
  });
}

// Handle submit tombol "Cari"
if (searchForm) {
  searchForm.addEventListener('submit', function (e) {
    e.preventDefault();
    searchKeyword = searchInput.value;
    renderTransactions();
  });
}

// ========================================================
// CUSTOM EVENT LISTENER — Kriteria 2 Advanced
// ========================================================

/**
 * Satu listener untuk event 'transaction:updated'
 * Dipanggil setiap kali data berubah (tambah/hapus/edit/ubah tipe)
 */
document.addEventListener('transaction:updated', function () {
  renderTransactions();
  updateDashboard();
});

// ========================================================
// INIT — Jalankan saat halaman pertama kali dimuat
// ========================================================

(function init() {
  renderTransactions();
  updateDashboard();
})();
