// --- PROTEÇÃO DE ROTA ---
const token = localStorage.getItem('token');
const path = window.location.pathname

import { store } from './store.js';
import { UI } from './ui.js';
import { Dashboard } from './dashboard.js';
import { readPdfText } from './pdf.js';
import { categorizeWithGemini } from './ai.js';
import { getMonthName } from './utils.js';

console.log("🚀 app.js carregado com sucesso!");


const isLoginPage = path.includes('login.html');

if (!token && !isLoginPage && !isRegisterPage) {
    console.warn("🚫 Acesso negado. Redirecionando para login...");
    window.location.href = 'login.html';
}

// --- 1. FUNÇÕES AUXILIARES ---
function updateAllViews(monthFilter) {
    if (typeof UI.renderApp === 'function') UI.renderApp(monthFilter);
    if (typeof Dashboard.render === 'function') Dashboard.render(); 
    renderDebts();
}

function renderDebts() {
    const list = document.getElementById('debtList');
    const totalEl = document.getElementById('totalDebtAmount');
    
    // Se não tiver a lista de dívidas na tela, sai sem dar erro
    if(!list) return;

    list.innerHTML = '';
    let totalReceber = 0;

    store.debtors.forEach(d => {
        const opacityClass = d.paid ? "opacity-50" : "";
        const statusBadge = d.paid 
            ? `<span class="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold">PAGO</span>`
            : `<span class="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">PENDENTE</span>`;

        if(!d.paid) totalReceber += parseFloat(d.amount);

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

// --- 2. FUNÇÕES GLOBAIS ---
window.removeTransaction = async (id) => {
    if(confirm("Tem certeza que deseja apagar?")) {
        await store.removeTransaction(id);
        const filter = document.getElementById('monthFilter') ? document.getElementById('monthFilter').value : 'Todos';
        updateAllViews(filter);
    }
};

window.toggleDebt = async (id) => { await store.toggleDebt(id); renderDebts(); };
window.deleteDebt = async (id) => { if(confirm("Apagar?")) { await store.removeDebt(id); renderDebts(); }};

// --- 3. INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM Pronto. Iniciando...");

    try {
        UI.initCategories();

        // Tenta cache
        const hasCache = store.loadFromCache();
        if (hasCache) {
            updateAllViews('Todos');
        } else {
            // Loading seguro
            const list = document.getElementById('transactionList');
            if(list) list.innerHTML = '<tr><td colspan="5" class="text-center py-10"><i class="fas fa-spinner fa-spin text-indigo-600 text-3xl"></i><p class="text-slate-500 mt-2">Carregando...</p></td></tr>';
        }

        // Configura eventos (BLINDADO)
        setupEvents();

        // Busca dados
        await store.init();
        
        if (!store.getToken()) return;

        updateAllViews('Todos');

        const inputMeta = document.getElementById('inputMeta');
        if(inputMeta) inputMeta.value = store.getMeta();

    } catch (error) {
        console.error("Erro na inicialização:", error);
    }
});

// --- 4. CONFIGURAÇÃO DE EVENTOS (AQUI ESTAVA O ERRO) ---
function setupEvents() {
    
    // NAVEGAÇÃO ENTRE ABAS
    const tabHome = document.getElementById('tabHome');
    const tabDebts = document.getElementById('tabDebts');
    const tabDash = document.getElementById('tabDash');
    
    // Função auxiliar para trocar aba com segurança
    const switchTab = (activeId) => {
        ['viewHome', 'viewDebts', 'viewDashboard'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.classList.add('hidden');
        });
        const activeEl = document.getElementById(activeId);
        if(activeEl) activeEl.classList.remove('hidden');

        // Estilo dos botões
        [tabHome, tabDebts, tabDash].forEach(btn => {
            if(btn) btn.className = "px-4 py-1.5 text-xs font-bold rounded-md text-slate-500 hover:text-slate-700 transition";
        });
        
        // Ativa o botão certo
        if(activeId === 'viewHome' && tabHome) tabHome.className = "px-4 py-1.5 text-xs font-bold rounded-md bg-white shadow-sm text-indigo-600 transition";
        if(activeId === 'viewDebts' && tabDebts) tabDebts.className = "px-4 py-1.5 text-xs font-bold rounded-md bg-white shadow-sm text-indigo-600 transition";
        if(activeId === 'viewDashboard' && tabDash) tabDash.className = "px-4 py-1.5 text-xs font-bold rounded-md bg-white shadow-sm text-indigo-600 transition";

        if(activeId === 'viewDashboard') Dashboard.render();
        if(activeId === 'viewDebts') renderDebts();
    };

    if(tabHome) tabHome.addEventListener('click', () => switchTab('viewHome'));
    if(tabDebts) tabDebts.addEventListener('click', () => switchTab('viewDebts'));
    if(tabDash) tabDash.addEventListener('click', () => switchTab('viewDashboard'));

    // FORMULÁRIO DE TRANSAÇÃO
    const transForm = document.getElementById('transactionForm');
    if (transForm) {
        transForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const desc = document.getElementById('inputDesc').value;
            const amount = parseFloat(document.getElementById('inputAmount').value);
            const type = document.getElementById('inputType').value;
            const category = document.getElementById('inputCategory').value;
            const btn = transForm.querySelector('button[type="submit"]');
            
            if (!desc || isNaN(amount)) return alert("Preencha tudo.");

            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            btn.disabled = true;

            const filterEl = document.getElementById('monthFilter');
            const filterMonth = filterEl ? filterEl.value : 'Todos';
            const monthToSave = filterMonth === 'Todos' ? getMonthName(new Date().getMonth() + 1) : filterMonth;

            try {
                await store.addTransaction({
                    desc, amount, type, category,
                    date: new Date().toLocaleDateString('pt-BR'),
                    month: monthToSave
                });
                updateAllViews(filterMonth);
                transForm.reset();
            } catch (err) { console.error(err); } 
            finally { btn.innerHTML = originalText; btn.disabled = false; }
        });
    }

    // FORMULÁRIO DE DÍVIDAS
    const debtForm = document.getElementById('debtForm');
    if(debtForm) {
        debtForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('debtName').value;
            const amount = parseFloat(document.getElementById('debtAmount').value);
            if(name && amount) {
                await store.addDebt(name, amount);
                renderDebts();
                debtForm.reset();
            }
        });
    }

    // BOTÕES DIVERSOS (Sempre verificando se existem)
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            if(confirm("Sair?")) { localStorage.removeItem('inf_auth_token'); window.location.href = 'login.html'; }
        });
    }

    const btnSaveMeta = document.getElementById('btnSaveMeta');
    if (btnSaveMeta) {
        btnSaveMeta.addEventListener('click', () => {
            const input = document.getElementById('inputMeta');
            if(input) {
                store.setMeta(parseFloat(input.value));
                Dashboard.render();
                alert("Meta Salva!");
            }
        });
    }

    const monthFilter = document.getElementById('monthFilter');
    if(monthFilter) monthFilter.addEventListener('change', (e) => updateAllViews(e.target.value));

    // IMPORTAÇÃO
    const btnImport = document.getElementById('btnImport');
    const modal = document.getElementById('importModal');
    const btnClose = document.getElementById('btnCloseModal');
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    if(btnImport && modal) {
        btnImport.addEventListener('click', () => {
            modal.classList.remove('hidden');
            if(dropZone) dropZone.classList.remove('hidden');
            const loading = document.getElementById('loadingStatus');
            if(loading) loading.classList.add('hidden');
        });
    }

    if(btnClose && modal) {
        btnClose.addEventListener('click', () => modal.classList.add('hidden'));
    }

    if(dropZone && fileInput) {
        dropZone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            dropZone.classList.add('hidden');
            const loading = document.getElementById('loadingStatus');
            if(loading) loading.classList.remove('hidden');

            try {
                const text = await readPdfText(file);
                const apiKey = localStorage.getItem('gemini_api_key');
                const transactions = await categorizeWithGemini(text, apiKey);

                for (const t of transactions) {
                    let monthCode = "01";
                    if(t.date && t.date.includes('/')) monthCode = t.date.split('/')[1];
                    await store.addTransaction({
                        desc: t.desc, amount: t.amount, type: t.type, category: t.category,
                        date: t.date, month: getMonthName(monthCode)
                    });
                }
                alert("Importado!");
                updateAllViews('Todos');
                modal.classList.add('hidden');
            } catch (err) { alert("Erro: " + err.message); }
            finally { if(loading) loading.classList.add('hidden'); if(dropZone) dropZone.classList.remove('hidden'); }
        });
    }

    // DASH AI
    const btnReport = document.getElementById('btnGenerateReport');
    if (btnReport) btnReport.addEventListener('click', () => Dashboard.generateAIReport());

    const btnSettings = document.getElementById('btnSettings');
    if(btnSettings) btnSettings.addEventListener('click', () => {
        const key = prompt("API Key Gemini:", localStorage.getItem('gemini_api_key') || '');
        if (key) localStorage.setItem('gemini_api_key', key);
    });

    const btnReset = document.getElementById('btnReset');
    if(btnReset) btnReset.addEventListener('click', () => location.reload());
}
