// ==========================================
// ARQUIVO: app.js
// ==========================================

import { store } from './store.js';
import { UI } from './ui.js';
import { Dashboard } from './dashboard.js';
import { readPdfText } from './pdf.js';
import { categorizeWithGemini } from './ai.js';
import { getMonthName } from './utils.js';

console.log("🚀 app.js carregado!");

// --- 1. PROTEÇÃO DE ROTA (Anti-Loop Infinito) ---
(function checkAuth() {
    const token = localStorage.getItem('token');
    // Converte para minúsculo para garantir que /Login e /login sejam iguais
    const path = window.location.pathname.toLowerCase(); 

    // Define se estamos numa página pública (Login ou Cadastro)
    // A verificação .includes('login') resolve o problema da Vercel (URLs sem .html)
    const isPublicPage = path.includes('login') || path.includes('register') || path.includes('cadastro');

    // Se NÃO tem token E NÃO estamos numa página pública -> TCHAU!
    if (!token && !isPublicPage) {
        console.warn("🚫 Sem token. Redirecionando para login...");
        // .replace() é melhor que .href pois não salva no histórico (evita loop ao voltar)
        window.location.replace('login.html'); 
    }
})();

// --- 2. FUNÇÕES AUXILIARES DE RENDERIZAÇÃO ---
function updateAllViews(monthFilter) {
    // Verifica se os módulos existem antes de chamar para evitar crash
    if (UI && typeof UI.renderApp === 'function') UI.renderApp(monthFilter);
    if (Dashboard && typeof Dashboard.render === 'function') Dashboard.render(); 
    renderDebts();
}

function renderDebts() {
    const list = document.getElementById('debtList');
    const totalEl = document.getElementById('totalDebtAmount');
    
    // Se não tiver a lista de dívidas na tela (ex: estamos no login), sai sem dar erro
    if(!list) return;

    list.innerHTML = '';
    let totalReceber = 0;

    // Garante que debtors é um array antes de rodar o loop
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

// --- 3. FUNÇÕES GLOBAIS (Necessárias para o onclick="" no HTML) ---
window.removeTransaction = async (id) => {
    if(confirm("Tem certeza que deseja apagar?")) {
        await store.removeTransaction(id);
        const filterEl = document.getElementById('monthFilter');
        const filter = filterEl ? filterEl.value : 'Todos';
        updateAllViews(filter);
    }
};

window.toggleDebt = async (id) => { await store.toggleDebt(id); renderDebts(); };
window.deleteDebt = async (id) => { if(confirm("Apagar permanentemente?")) { await store.removeDebt(id); renderDebts(); }};

// --- 4. CONFIGURAÇÃO DE EVENTOS (SETUP) ---
function setupEvents() {
    console.log("🛠️ Configurando eventos...");

    // --- NAVEGAÇÃO (ABAS) ---
    const tabHome = document.getElementById('tabHome');
    const tabDebts = document.getElementById('tabDebts');
    const tabDash = document.getElementById('tabDash');
    
    // Função para trocar abas
    const switchTab = (activeId) => {
        ['viewHome', 'viewDebts', 'viewDashboard'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.classList.add('hidden');
        });
        
        const activeEl = document.getElementById(activeId);
        if(activeEl) {
            activeEl.classList.remove('hidden');
            activeEl.classList.remove('animate-fade-in'); 
            void activeEl.offsetWidth; // Trigger reflow para reiniciar animação
            activeEl.classList.add('animate-fade-in');
        }

        // Resetar botões
        [tabHome, tabDebts, tabDash].forEach(btn => {
            if(btn) btn.className = "px-3 sm:px-4 py-1.5 text-xs font-bold rounded-md text-slate-500 hover:text-slate-700 transition";
        });
        
        // Ativar botão atual
        const activeBtnClass = "px-3 sm:px-4 py-1.5 text-xs font-bold rounded-md bg-white shadow-sm text-indigo-600 transition";
        if(activeId === 'viewHome' && tabHome) tabHome.className = activeBtnClass;
        if(activeId === 'viewDebts' && tabDebts) tabDebts.className = activeBtnClass;
        if(activeId === 'viewDashboard' && tabDash) tabDash.className = activeBtnClass;

        if(activeId === 'viewDashboard' && Dashboard) Dashboard.render();
        if(activeId === 'viewDebts') renderDebts();
    };

    if(tabHome) tabHome.addEventListener('click', () => switchTab('viewHome'));
    if(tabDebts) tabDebts.addEventListener('click', () => switchTab('viewDebts'));
    if(tabDash) tabDash.addEventListener('click', () => switchTab('viewDashboard'));

    // --- FORMULÁRIO DE TRANSAÇÃO ---
    const transForm = document.getElementById('transactionForm');
    if (transForm) {
        transForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const descInput = document.getElementById('inputDesc');
            const amountInput = document.getElementById('inputAmount');
            const typeInput = document.getElementById('inputType');
            const catInput = document.getElementById('inputCategory');
            const btn = transForm.querySelector('button[type="submit"]');

            if (!descInput || !amountInput) return;

            const desc = descInput.value;
            const amount = parseFloat(amountInput.value);
            const type = typeInput ? typeInput.value : 'Despesa';
            const category = catInput ? catInput.value : 'Outros';

            if (!desc || isNaN(amount)) return alert("Preencha descrição e valor corretamente.");

            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            btn.disabled = true;

            // Define o mês correto para salvar
            const filterEl = document.getElementById('monthFilter');
            const filterMonth = filterEl ? filterEl.value : 'Todos';
            let monthToSave = filterMonth;
            
            // Se o filtro for "Todos", salva no mês atual do sistema
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
                
                updateAllViews(filterMonth);
                transForm.reset();
                // Opcional: manter o foco no campo de descrição
                descInput.focus();
                
            } catch (err) { 
                console.error(err); 
                alert("Erro ao salvar: " + err.message);
            } finally { 
                btn.innerHTML = originalText; 
                btn.disabled = false; 
            }
        });
    }

    // --- FORMULÁRIO DE DÍVIDAS ---
    const debtForm = document.getElementById('debtForm');
    if(debtForm) {
        debtForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nameEl = document.getElementById('debtName');
            const amountEl = document.getElementById('debtAmount');
            
            if(nameEl && amountEl && nameEl.value && amountEl.value) {
                await store.addDebt(nameEl.value, parseFloat(amountEl.value));
                renderDebts();
                debtForm.reset();
            }
        });
    }

    // --- FILTRO DE MÊS ---
    const monthFilter = document.getElementById('monthFilter');
    if(monthFilter) {
        monthFilter.addEventListener('change', (e) => updateAllViews(e.target.value));
    }

    // --- LOGOUT ---
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            if(confirm("Deseja realmente sair?")) { 
                localStorage.removeItem('token'); 
                window.location.href = 'login.html'; 
            }
        });
    }

    // --- META MENSAL ---
    const btnSaveMeta = document.getElementById('btnSaveMeta');
    if (btnSaveMeta) {
        btnSaveMeta.addEventListener('click', () => {
            const input = document.getElementById('inputMeta');
            if(input) {
                store.setMeta(parseFloat(input.value));
                if(Dashboard && Dashboard.render) Dashboard.render();
                alert("Meta salva!");
            }
        });
    }

    // --- IMPORTAÇÃO DE PDF ---
    const btnImport = document.getElementById('btnImport');
    const modal = document.getElementById('importModal');
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    // Abrir Modal
    if(btnImport && modal) {
        btnImport.addEventListener('click', () => {
            modal.classList.remove('hidden');
            if(dropZone) dropZone.classList.remove('hidden');
            const loading = document.getElementById('loadingStatus');
            if(loading) loading.classList.add('hidden');
        });
    }

    // Fechar Modal (clicando fora)
    if(modal) {
        modal.addEventListener('click', (e) => {
            if(e.target === modal) modal.classList.add('hidden');
        });
    }

    // Upload
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
                
                let transactions = [];
                // Chama a IA se disponível
                if (typeof categorizeWithGemini === 'function') {
                     transactions = await categorizeWithGemini(text, apiKey);
                } else {
                    console.warn("Módulo AI não carregado.");
                }

                // Salva cada transação
                for (const t of transactions) {
                    let monthName = "JANEIRO"; // Padrão
                    
                    if(t.date && t.date.includes('/')) {
                        const monthCode = parseInt(t.date.split('/')[1]);
                        const meses = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
                        monthName = meses[monthCode - 1] || "JANEIRO";
                    }

                    await store.addTransaction({
                        desc: t.desc, amount: t.amount, type: t.type, category: t.category,
                        date: t.date, month: monthName
                    });
                }
                
                alert(`Sucesso! ${transactions.length} transações importadas.`);
                updateAllViews('Todos');
                if(modal) modal.classList.add('hidden');
                
            } catch (err) { 
                console.error(err);
                alert("Erro na importação: " + err.message); 
            } finally { 
                if(loading) loading.classList.add('hidden'); 
                if(dropZone) dropZone.classList.remove('hidden'); 
                fileInput.value = ''; // Limpa o input
            }
        });
    }

    // --- DASHBOARD AI & CONFIGS ---
    const btnReport = document.getElementById('btnGenerateReport');
    if (btnReport) {
        btnReport.addEventListener('click', () => {
            if(Dashboard && Dashboard.generateAIReport) Dashboard.generateAIReport();
        });
    }

    const btnSettings = document.getElementById('btnSettings');
    if(btnSettings) {
        btnSettings.addEventListener('click', () => {
            const key = prompt("Insira sua API Key do Gemini (Google AI):", localStorage.getItem('gemini_api_key') || '');
            if (key !== null) localStorage.setItem('gemini_api_key', key);
        });
    }

    const btnReset = document.getElementById('btnReset');
    if(btnReset) btnReset.addEventListener('click', () => location.reload());
}

// --- 5. INICIALIZAÇÃO (PONTO DE PARTIDA) ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("🎬 DOM Pronto. Iniciando...");

    try {
        // Inicializa Categorias na UI
        if(UI && UI.initCategories) UI.initCategories();

        // 1. Carrega do Cache (Rápido)
        const hasCache = store.loadFromCache();
        
        if (hasCache) {
            updateAllViews('Todos');
        } else {
            // Mostra loading apenas se não tiver cache
            const list = document.getElementById('transactionList');
            if(list) list.innerHTML = '<tr><td colspan="5" class="text-center py-10"><i class="fas fa-spinner fa-spin text-indigo-600 text-3xl"></i><p class="text-slate-500 mt-2">Sincronizando...</p></td></tr>';
        }

        // 2. Configura botões (IMPORTANTE: Fazer isso antes do await store.init)
        setupEvents();

        // 3. Se tiver logado, busca dados novos do servidor
        const token = localStorage.getItem('token');
        if (token) {
            await store.init();
            updateAllViews('Todos');

            const inputMeta = document.getElementById('inputMeta');
            if(inputMeta) inputMeta.value = store.getMeta();
        }

    } catch (error) {
        console.error("☠️ Erro fatal na inicialização:", error);
    }
});
