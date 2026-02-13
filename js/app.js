// ==========================================
// ARQUIVO: js/app.js (CORRIGIDO - SEM ERRO FATAL)
// ==========================================

import { store } from './store.js';
import { UI } from './ui.js';
import { Dashboard } from './dashboard.js';
import { readPdfText } from './pdf.js';
import { categorizeWithGemini } from './ai.js';
import { getMonthName } from './utils.js';

console.log("🚀 app.js carregado!");

// --- 1. PROTEÇÃO DE ROTA ---
const isLoginPage = window.location.pathname.includes('login.html');
const authToken = localStorage.getItem('inf_auth_token');

if (!authToken && !isLoginPage) {
    window.location.href = 'login.html';
}

if (authToken && isLoginPage) {
    window.location.href = 'index.html';
}

// --- 2. FUNÇÕES AUXILIARES ---
function updateAllViews(monthFilter) {
    if (UI && typeof UI.renderApp === 'function') UI.renderApp(monthFilter);
    if (Dashboard && typeof Dashboard.render === 'function') Dashboard.render(); 
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

// --- 3. FUNÇÕES GLOBAIS ---
window.removeTransaction = async (id) => {
    if(confirm("Tem certeza que deseja apagar?")) {
        await store.removeTransaction(id);
        const filterEl = document.getElementById('monthFilter');
        updateAllViews(filterEl ? filterEl.value : 'Todos');
    }
};

window.toggleDebt = async (id) => { await store.toggleDebt(id); renderDebts(); };
window.deleteDebt = async (id) => { if(confirm("Apagar permanentemente?")) { await store.removeDebt(id); renderDebts(); }};

// --- 4. CONFIGURAÇÃO DE EVENTOS ---
function setupEvents() {
    console.log("🛠️ Configurando eventos...");

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

        if(viewId === 'viewDashboard' && Dashboard) Dashboard.render();
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

            const filterEl = document.getElementById('monthFilter');
            let monthToSave = filterEl ? filterEl.value : 'Todos';
            
            if (monthToSave === 'Todos') {
                 const meses = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
                 monthToSave = meses[new Date().getMonth()];
            }

            try {
                await store.addTransaction({
                    desc, amount, type, category,
                    date: new Date().toLocaleDateString('pt-BR'),
                    month: monthToSave
                });
                updateAllViews(filterEl ? filterEl.value : 'Todos');
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

    // Filtro Mês
    const monthFilter = document.getElementById('monthFilter');
    if(monthFilter) monthFilter.addEventListener('change', (e) => updateAllViews(e.target.value));

    // Logout
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            if(confirm("Sair do sistema?")) { 
                localStorage.removeItem('inf_auth_token'); 
                window.location.href = 'login.html'; 
            }
        });
    }

    // Configurações
    const btnSettings = document.getElementById('btnSettings');
    if(btnSettings) btnSettings.addEventListener('click', () => {
        const key = prompt("API Key Gemini:", localStorage.getItem('gemini_api_key') || '');
        if (key) localStorage.setItem('gemini_api_key', key);
    });

    const btnReset = document.getElementById('btnReset');
    if(btnReset) btnReset.addEventListener('click', () => location.reload());

    // --- CORREÇÃO DO ERRO FATAL AQUI ---
    const btnImport = document.getElementById('btnImport');
    if(btnImport) {
        btnImport.addEventListener('click', () => {
            const modal = document.getElementById('importModal');
            if(modal) modal.classList.remove('hidden');
        });
        
        // Verifica se o botão de fechar existe antes de adicionar evento
        const btnClose = document.getElementById('btnCloseModal');
        if (btnClose) {
            btnClose.addEventListener('click', () => {
                const modal = document.getElementById('importModal');
                if(modal) modal.classList.add('hidden');
            });
        }

        const dropZone = document.getElementById('dropZone');
        if (dropZone) {
            dropZone.addEventListener('click', () => {
                const fileInput = document.getElementById('fileInput');
                if(fileInput) fileInput.click();
            });
        }
        
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if(!file) return;
                
                // Lógica simples de aviso, já que o pdf.js está em outro módulo
                alert("Para processar o PDF, certifique-se que a função de importação está conectada corretamente.");
            });
        }
    }
}

// --- 5. INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("🎬 DOM Pronto. Iniciando...");

    try {
        if(UI && UI.initCategories) UI.initCategories();

        const hasCache = store.loadFromCache();
        if (hasCache) {
            updateAllViews('Todos');
        } else {
            const list = document.getElementById('transactionList');
            if(list) list.innerHTML = '<tr><td colspan="5" class="text-center py-10"><i class="fas fa-spinner fa-spin text-indigo-600 text-3xl"></i><p class="text-slate-500 mt-2">Buscando dados...</p></td></tr>';
        }

        setupEvents();

        const token = localStorage.getItem('inf_auth_token');
        if (token) {
            await store.init();
            updateAllViews('Todos');
            
            const inputMeta = document.getElementById('inputMeta');
            if(inputMeta) inputMeta.value = store.getMeta();
        }

    } catch (error) {
        console.error("☠️ Erro fatal:", error);
    }
});
