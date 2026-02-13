import { store } from './store.js';
import { UI } from './ui.js';
import { Dashboard } from './dashboard.js';
import { getMonthName } from './utils.js';

console.log("🚀 app.js carregado!");

let selectedMonths = [];

// --- 1. PROTEÇÃO DE ROTA ---
const isLoginPage = window.location.pathname.includes('login.html');
const authToken = localStorage.getItem('inf_auth_token');

if (!authToken && !isLoginPage) window.location.href = 'login.html';
if (authToken && isLoginPage) window.location.href = 'index.html';

// --- 2. DARK MODE LOGIC (NOVO) ---
function setupTheme() {
    const btnTheme = document.getElementById('btnThemeToggle');
    const html = document.documentElement;

    // 1. Carrega preferência
    if (localStorage.getItem('theme') === 'dark') {
        html.classList.add('dark');
    }

    // 2. Evento de Click
    if(btnTheme) {
        btnTheme.addEventListener('click', () => {
            html.classList.toggle('dark');
            if (html.classList.contains('dark')) {
                localStorage.setItem('theme', 'dark');
            } else {
                localStorage.setItem('theme', 'light');
            }
        });
    }
}

// --- 3. GERENCIADOR DE MESES ---
function setupMonthSelector() {
    const btn = document.getElementById('monthDropdownBtn');
    const menu = document.getElementById('monthDropdownMenu');
    const btnText = document.getElementById('monthBtnText');
    
    if (!btn || !menu) return;

    const months = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
    const shortMonths = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    if (selectedMonths.length === 0) {
        const currentMonthIndex = new Date().getMonth();
        selectedMonths = [months[currentMonthIndex]];
    }

    const updateButtonText = () => {
        if (selectedMonths.length === 0) {
            btnText.textContent = "Selecione pelo menos um";
            btnText.classList.add('text-red-500');
        } else if (selectedMonths.length === 12) {
            btnText.textContent = "📅 Ano Completo (Todos)";
            btnText.classList.remove('text-red-500');
        } else if (selectedMonths.length <= 2) {
            const names = selectedMonths.map(m => shortMonths[months.indexOf(m)]).join(', ');
            btnText.textContent = `📅 ${names}`;
            btnText.classList.remove('text-red-500');
        } else {
            btnText.textContent = `📅 ${selectedMonths.length} meses selecionados`;
            btnText.classList.remove('text-red-500');
        }
    };

    menu.innerHTML = '';
    
    // Botão "Todos"
    const divAll = document.createElement('div');
    // Ajuste de classes para Dark Mode
    divAll.className = "flex items-center p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer mb-1 border-b border-slate-100 dark:border-slate-700";
    divAll.innerHTML = `
        <input type="checkbox" id="checkAll" class="w-4 h-4 text-indigo-600 rounded border-gray-300 dark:border-slate-500 dark:bg-slate-700 focus:ring-indigo-500 cursor-pointer">
        <label for="checkAll" class="ml-2 text-sm font-bold text-slate-700 dark:text-slate-200 cursor-pointer flex-1">Selecionar Todos</label>
    `;
    divAll.onclick = (e) => {
        if(e.target.tagName !== 'INPUT') {
            const chk = divAll.querySelector('input');
            chk.checked = !chk.checked;
            chk.dispatchEvent(new Event('change'));
        }
    };
    divAll.querySelector('input').addEventListener('change', (e) => {
        if(e.target.checked) {
            selectedMonths = [...months];
        } else {
            selectedMonths = [];
        }
        setupMonthSelector(); 
        updateAllViews();
    });
    menu.appendChild(divAll);

    // Checkboxes dos Meses
    months.forEach((m, index) => {
        const div = document.createElement('div');
        div.className = "flex items-center p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer";
        
        const isChecked = selectedMonths.includes(m);
        
        div.innerHTML = `
            <input type="checkbox" id="month-${index}" value="${m}" ${isChecked ? 'checked' : ''} class="w-4 h-4 text-indigo-600 rounded border-gray-300 dark:border-slate-500 dark:bg-slate-700 focus:ring-indigo-500 cursor-pointer">
            <label for="month-${index}" class="ml-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer flex-1">${shortMonths[index]}</label>
        `;

        div.onclick = (e) => {
            if (e.target.tagName !== 'INPUT') {
                const checkbox = div.querySelector('input');
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change'));
            }
        };

        const checkbox = div.querySelector('input');
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                if (!selectedMonths.includes(m)) selectedMonths.push(m);
            } else {
                selectedMonths = selectedMonths.filter(item => item !== m);
            }
            updateButtonText();
            updateAllViews();
        });

        menu.appendChild(div);
    });

    updateButtonText();

    btn.onclick = (e) => {
        e.stopPropagation();
        menu.classList.toggle('hidden');
        const icon = btn.querySelector('i');
        if(menu.classList.contains('hidden')) {
            icon.className = "fas fa-chevron-down text-xs text-slate-400";
        } else {
            icon.className = "fas fa-chevron-up text-xs text-indigo-500";
        }
    };

    document.addEventListener('click', (e) => {
        if (!btn.contains(e.target) && !menu.contains(e.target)) {
            menu.classList.add('hidden');
            btn.querySelector('i').className = "fas fa-chevron-down text-xs text-slate-400";
        }
    });
}

function updateAllViews() {
    if (UI && typeof UI.renderApp === 'function') UI.renderApp(selectedMonths);
    if (Dashboard && typeof Dashboard.render === 'function') Dashboard.render(selectedMonths); 
    renderDebts();
}

function renderDebts() {
    const list = document.getElementById('debtList');
    const totalEl = document.getElementById('totalDebtAmount');
    if(!list) return;
    list.innerHTML = '';
    let totalReceber = 0;
    const debtors = Array.isArray(store.debtors) ? store.debtors : [];

    debtors.forEach(d => {
        const opacityClass = d.paid ? "opacity-50" : "";
        const statusBadge = d.paid 
            ? `<span class="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold">PAGO</span>`
            : `<span class="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">PENDENTE</span>`;

        if(!d.paid) totalReceber += parseFloat(d.amount || 0);

        const tr = document.createElement('tr');
        // Estilo de linha no Dark Mode
        tr.className = `hover:bg-slate-50 dark:hover:bg-slate-700 transition ${opacityClass} border-b border-slate-50 dark:border-slate-700`;
        tr.innerHTML = `
            <td class="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">${d.name}</td>
            <td class="px-6 py-4 text-right font-bold text-slate-600 dark:text-slate-300">R$ ${parseFloat(d.amount).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
            <td class="px-6 py-4 text-center">${statusBadge}</td>
            <td class="px-6 py-4 text-center flex justify-center gap-2">
                <button onclick="window.toggleDebt(${d.id})" class="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"><i class="fas fa-check-circle"></i></button>
                <button onclick="window.deleteDebt(${d.id})" class="text-red-400 hover:text-red-600"><i class="fas fa-trash"></i></button>
            </td>
        `;
        list.appendChild(tr);
    });
    if(totalEl) totalEl.innerText = `R$ ${totalReceber.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
}

window.removeTransaction = async (id) => { if(confirm("Tem certeza que deseja apagar?")) { await store.removeTransaction(id); updateAllViews(); } };
window.toggleDebt = async (id) => { await store.toggleDebt(id); renderDebts(); };
window.deleteDebt = async (id) => { if(confirm("Apagar permanentemente?")) { await store.removeDebt(id); renderDebts(); }};

function setupEvents() {
    // Configura Tema
    setupTheme();

    const tabs = { home: document.getElementById('tabHome'), debts: document.getElementById('tabDebts'), dash: document.getElementById('tabDash') };
    const switchTab = (viewId) => {
        ['viewHome', 'viewDebts', 'viewDashboard'].forEach(id => { const el = document.getElementById(id); if(el) el.classList.add('hidden'); });
        const target = document.getElementById(viewId);
        if(target) { target.classList.remove('hidden'); target.classList.remove('animate-fade-in'); void target.offsetWidth; target.classList.add('animate-fade-in'); }
        
        // Estilo Botões Abas (Dark Mode)
        Object.values(tabs).forEach(btn => { if(btn) btn.className = "px-3 sm:px-4 py-1.5 text-xs font-bold rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"; });
        
        const activeClass = "px-3 sm:px-4 py-1.5 text-xs font-bold rounded-md bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-indigo-300 transition";
        if(viewId === 'viewHome' && tabs.home) tabs.home.className = activeClass;
        if(viewId === 'viewDebts' && tabs.debts) tabs.debts.className = activeClass;
        if(viewId === 'viewDashboard' && tabs.dash) tabs.dash.className = activeClass;
        
        if(viewId === 'viewDashboard') Dashboard.render(selectedMonths);
        if(viewId === 'viewDebts') renderDebts();
    };
    if(tabs.home) tabs.home.addEventListener('click', () => switchTab('viewHome'));
    if(tabs.debts) tabs.debts.addEventListener('click', () => switchTab('viewDebts'));
    if(tabs.dash) tabs.dash.addEventListener('click', () => switchTab('viewDashboard'));

    const transForm = document.getElementById('transactionForm');
    if (transForm) {
        transForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const desc = document.getElementById('inputDesc').value;
            const amount = parseFloat(document.getElementById('inputAmount').value);
            const type = document.getElementById('inputType').value;
            const category = document.getElementById('inputCategory').value;
            const btn = transForm.querySelector('button[type="submit"]');
            if (!desc || isNaN(amount)) return alert("Preencha corretamente.");
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; btn.disabled = true;
            try {
                let targetMonth = selectedMonths[selectedMonths.length - 1];
                if (!targetMonth) targetMonth = getMonthName(new Date().getMonth() + 1);
                await store.addTransaction({ desc, amount, type, category, date: new Date().toLocaleDateString('pt-BR'), month: targetMonth });
                updateAllViews();
                transForm.reset();
            } catch (err) { console.error(err); } finally { btn.innerHTML = originalText; btn.disabled = false; }
        });
    }

    const debtForm = document.getElementById('debtForm');
    if(debtForm) { debtForm.addEventListener('submit', async (e) => { e.preventDefault(); const name = document.getElementById('debtName').value; const amount = document.getElementById('debtAmount').value; if(name && amount) { await store.addDebt(name, parseFloat(amount)); renderDebts(); debtForm.reset(); } }); }
    const btnLogout = document.getElementById('btnLogout'); if (btnLogout) btnLogout.addEventListener('click', () => { if(confirm("Sair?")) { localStorage.removeItem('inf_auth_token'); window.location.href = 'login.html'; }});
    const btnSettings = document.getElementById('btnSettings'); if(btnSettings) btnSettings.addEventListener('click', () => { const key = prompt("API Key Gemini:", localStorage.getItem('gemini_api_key') || ''); if (key) localStorage.setItem('gemini_api_key', key); });
    const btnReset = document.getElementById('btnReset'); if(btnReset) btnReset.addEventListener('click', () => location.reload());
    const btnImport = document.getElementById('btnImport'); if(btnImport) btnImport.addEventListener('click', () => document.getElementById('importModal').classList.remove('hidden'));
    const btnCloseModal = document.getElementById('btnCloseModal'); if(btnCloseModal) btnCloseModal.addEventListener('click', () => document.getElementById('importModal').classList.add('hidden'));
    const dropZone = document.getElementById('dropZone'); if(dropZone) dropZone.addEventListener('click', () => document.getElementById('fileInput').click());
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        if(UI && UI.initCategories) UI.initCategories();
        const hasCache = store.loadFromCache();
        if(!hasCache) { const list = document.getElementById('transactionList'); if(list) list.innerHTML = '<tr><td colspan="5" class="text-center py-10"><i class="fas fa-spinner fa-spin text-indigo-600 text-3xl"></i></td></tr>'; }
        
        setupMonthSelector(); 
        setupEvents();
        
        const token = localStorage.getItem('inf_auth_token');
        if (token) { await store.init(); updateAllViews(); const inputMeta = document.getElementById('inputMeta'); if(inputMeta) inputMeta.value = store.getMeta(); }
    } catch (error) { console.error("Erro fatal:", error); }
});
