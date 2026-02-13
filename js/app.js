import { store } from './store.js';
import { UI } from './ui.js';
import { Dashboard } from './dashboard.js';
import { getMonthName } from './utils.js';

console.log("🚀 app.js carregado!");

// Variável Global para guardar os meses selecionados
let selectedMonths = [];

// --- 1. PROTEÇÃO DE ROTA ---
const isLoginPage = window.location.pathname.includes('login.html');
const authToken = localStorage.getItem('inf_auth_token');

if (!authToken && !isLoginPage) window.location.href = 'login.html';
if (authToken && isLoginPage) window.location.href = 'index.html';

// --- 2. GERENCIADOR DE MESES (NOVO) ---
function setupMonthSelector() {
    const container = document.getElementById('monthSelector');
    if (!container) return;

    const months = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
    const shortMonths = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    
    // Define mês atual como padrão se a lista estiver vazia
    if (selectedMonths.length === 0) {
        const currentMonthIndex = new Date().getMonth(); // 0 a 11
        selectedMonths = [months[currentMonthIndex]];
    }

    container.innerHTML = '';

    months.forEach((m, index) => {
        const btn = document.createElement('button');
        const isActive = selectedMonths.includes(m);
        
        // Estilo do botão (Ativo vs Inativo)
        btn.className = `px-3 py-1.5 text-xs font-bold rounded-full border transition whitespace-nowrap ${
            isActive 
            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
            : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
        }`;
        
        btn.textContent = shortMonths[index];
        
        btn.onclick = () => {
            // Lógica de Multi-Seleção
            if (selectedMonths.includes(m)) {
                // Se já tem, remove (mas impede de ficar vazio)
                if (selectedMonths.length > 1) {
                    selectedMonths = selectedMonths.filter(item => item !== m);
                }
            } else {
                // Se não tem, adiciona
                selectedMonths.push(m);
            }
            
            // Re-renderiza botões e atualiza a tela
            setupMonthSelector();
            updateAllViews();
        };

        container.appendChild(btn);
    });
}

// --- 3. ATUALIZAÇÃO GERAL ---
function updateAllViews() {
    // Passa a lista de meses para as views
    if (UI && typeof UI.renderApp === 'function') UI.renderApp(selectedMonths);
    if (Dashboard && typeof Dashboard.render === 'function') Dashboard.render(selectedMonths); 
    renderDebts();
}

// --- 4. RENDERIZAÇÃO DE DÍVIDAS ---
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
        tr.className = `hover:bg-slate-50 transition ${opacityClass}`;
        tr.innerHTML = `
            <td class="px-6 py-4 font-medium text-slate-900">${d.name}</td>
            <td class="px-6 py-4 text-right font-bold text-slate-600">R$ ${parseFloat(d.amount).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
            <td class="px-6 py-4 text-center">${statusBadge}</td>
            <td class="px-6 py-4 text-center flex justify-center gap-2">
                <button onclick="window.toggleDebt(${d.id})" class="text-indigo-600 hover:text-indigo-900"><i class="fas fa-check-circle"></i></button>
                <button onclick="window.deleteDebt(${d.id})" class="text-red-400 hover:text-red-600"><i class="fas fa-trash"></i></button>
            </td>
        `;
        list.appendChild(tr);
    });

    if(totalEl) totalEl.innerText = `R$ ${totalReceber.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
}

// --- 5. FUNÇÕES GLOBAIS ---
window.removeTransaction = async (id) => {
    if(confirm("Tem certeza que deseja apagar?")) {
        await store.removeTransaction(id);
        updateAllViews();
    }
};
window.toggleDebt = async (id) => { await store.toggleDebt(id); renderDebts(); };
window.deleteDebt = async (id) => { if(confirm("Apagar permanentemente?")) { await store.removeDebt(id); renderDebts(); }};

// --- 6. CONFIGURAÇÃO DE EVENTOS ---
function setupEvents() {
    // Navegação de Abas
    const tabs = {
        home: document.getElementById('tabHome'),
        debts: document.getElementById('tabDebts'),
        dash: document.getElementById('tabDash')
    };

    const switchTab = (viewId) => {
        ['viewHome', 'viewDebts', 'viewDashboard'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.classList.add('hidden');
        });
        
        const target = document.getElementById(viewId);
        if(target) {
            target.classList.remove('hidden');
            target.classList.remove('animate-fade-in');
            void target.offsetWidth; 
            target.classList.add('animate-fade-in');
        }

        Object.values(tabs).forEach(btn => {
            if(btn) btn.className = "px-3 sm:px-4 py-1.5 text-xs font-bold rounded-md text-slate-500 hover:text-slate-700 transition";
        });

        const activeClass = "px-3 sm:px-4 py-1.5 text-xs font-bold rounded-md bg-white shadow-sm text-indigo-600 transition";
        if(viewId === 'viewHome' && tabs.home) tabs.home.className = activeClass;
        if(viewId === 'viewDebts' && tabs.debts) tabs.debts.className = activeClass;
        if(viewId === 'viewDashboard' && tabs.dash) tabs.dash.className = activeClass;

        if(viewId === 'viewDashboard') Dashboard.render(selectedMonths);
        if(viewId === 'viewDebts') renderDebts();
    };

    if(tabs.home) tabs.home.addEventListener('click', () => switchTab('viewHome'));
    if(tabs.debts) tabs.debts.addEventListener('click', () => switchTab('viewDebts'));
    if(tabs.dash) tabs.dash.addEventListener('click', () => switchTab('viewDashboard'));

    // Formulário de Transação
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
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            btn.disabled = true;

            try {
                // Pega o último mês selecionado ou o atual para salvar
                let targetMonth = selectedMonths[selectedMonths.length - 1];
                
                await store.addTransaction({
                    desc, amount, type, category,
                    date: new Date().toLocaleDateString('pt-BR'),
                    month: targetMonth
                });
                updateAllViews();
                transForm.reset();
            } catch (err) {
                console.error(err);
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }

    // Formulário Dívidas
    const debtForm = document.getElementById('debtForm');
    if(debtForm) {
        debtForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('debtName').value;
            const amount = document.getElementById('debtAmount').value;
            if(name && amount) {
                await store.addDebt(name, parseFloat(amount));
                renderDebts();
                debtForm.reset();
            }
        });
    }

    // Logout e Configs
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) btnLogout.addEventListener('click', () => { if(confirm("Sair?")) { localStorage.removeItem('inf_auth_token'); window.location.href = 'login.html'; }});

    const btnSettings = document.getElementById('btnSettings');
    if(btnSettings) btnSettings.addEventListener('click', () => {
        const key = prompt("API Key Gemini:", localStorage.getItem('gemini_api_key') || '');
        if (key) localStorage.setItem('gemini_api_key', key);
    });

    const btnReset = document.getElementById('btnReset');
    if(btnReset) btnReset.addEventListener('click', () => location.reload());

    // Importar PDF (Apenas evento de abrir)
    const btnImport = document.getElementById('btnImport');
    if(btnImport) btnImport.addEventListener('click', () => document.getElementById('importModal').classList.remove('hidden'));
    
    const btnCloseModal = document.getElementById('btnCloseModal');
    if(btnCloseModal) btnCloseModal.addEventListener('click', () => document.getElementById('importModal').classList.add('hidden'));
    
    const dropZone = document.getElementById('dropZone');
    if(dropZone) dropZone.addEventListener('click', () => document.getElementById('fileInput').click());
}

// --- 7. INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', async () => {
    try {
        if(UI && UI.initCategories) UI.initCategories();

        const hasCache = store.loadFromCache();
        if(!hasCache) {
            const list = document.getElementById('transactionList');
            if(list) list.innerHTML = '<tr><td colspan="5" class="text-center py-10"><i class="fas fa-spinner fa-spin text-indigo-600 text-3xl"></i></td></tr>';
        }

        // Configura o seletor de meses PRIMEIRO
        setupMonthSelector();
        setupEvents();

        const token = localStorage.getItem('inf_auth_token');
        if (token) {
            await store.init();
            updateAllViews();
            const inputMeta = document.getElementById('inputMeta');
            if(inputMeta) inputMeta.value = store.getMeta();
        }
    } catch (error) {
        console.error("Erro fatal:", error);
    }
});
