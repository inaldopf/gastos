// --- IMPORTAÇÕES ---
import { store } from './store.js';
import { UI } from './ui.js';
import { Dashboard } from './dashboard.js';
import { readPdfText } from './pdf.js';
import { categorizeWithGemini } from './ai.js';
import { getMonthName } from './utils.js'; // Certifique-se que utils.js existe

console.log("🚀 app.js carregado com sucesso!");

// --- PROTEÇÃO DE ROTA (CORRIGIDA) ---
const token = localStorage.getItem('token');
const path = window.location.pathname;

// Define se estamos nas páginas liberadas
const isLoginPage = path.includes('login.html');
const isRegisterPage = path.includes('register.html'); // Adicione se tiver página de cadastro

// Se NÃO tem token E NÃO estou nas páginas liberadas -> Redireciona
if (!token && !isLoginPage && !isRegisterPage) {
    console.warn("🚫 Acesso negado. Redirecionando para login...");
    window.location.href = 'login.html';
}

// --- 1. FUNÇÕES AUXILIARES ---
function updateAllViews(monthFilter) {
    // Verifica se os módulos existem antes de chamar
    if (UI && typeof UI.renderApp === 'function') UI.renderApp(monthFilter);
    if (Dashboard && typeof Dashboard.render === 'function') Dashboard.render(); 
    renderDebts();
}

function renderDebts() {
    const list = document.getElementById('debtList');
    const totalEl = document.getElementById('totalDebtAmount');
    
    // Se não tiver a lista de dívidas na tela, sai sem dar erro
    if(!list) return;

    list.innerHTML = '';
    let totalReceber = 0;

    // Garante que debtors é um array
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

// --- 2. FUNÇÕES GLOBAIS (Para onclick no HTML) ---
window.removeTransaction = async (id) => {
    if(confirm("Tem certeza que deseja apagar?")) {
        await store.removeTransaction(id);
        const filterEl = document.getElementById('monthFilter');
        const filter = filterEl ? filterEl.value : 'Todos';
        updateAllViews(filter);
    }
};

window.toggleDebt = async (id) => { await store.toggleDebt(id); renderDebts(); };
window.deleteDebt = async (id) => { if(confirm("Apagar?")) { await store.removeDebt(id); renderDebts(); }};

// --- 3. CONFIGURAÇÃO DE EVENTOS ---
function setupEvents() {
    console.log("🛠️ Configurando eventos...");

    // NAVEGAÇÃO ENTRE ABAS
    const tabHome = document.getElementById('tabHome');
    const tabDebts = document.getElementById('tabDebts');
    const tabDash = document.getElementById('tabDash');
    
    const viewHome = document.getElementById('viewHome');
    const viewDebts = document.getElementById('viewDebts');
    const viewDashboard = document.getElementById('viewDashboard');

    // Função auxiliar para trocar aba com segurança
    const switchTab = (activeId) => {
        // Esconde todas
        [viewHome, viewDebts, viewDashboard].forEach(el => {
            if(el) el.classList.add('hidden');
        });
        
        // Mostra a ativa
        const activeEl = document.getElementById(activeId);
        if(activeEl) {
            activeEl.classList.remove('hidden');
            // Remove classe animate-fade-in para reiniciar animação se quiser, ou deixa
            activeEl.classList.remove('animate-fade-in');
            void activeEl.offsetWidth; // Trigger reflow
            activeEl.classList.add('animate-fade-in');
        }

        // Estilo dos botões (Reset)
        [tabHome, tabDebts, tabDash].forEach(btn => {
            if(btn) btn.className = "px-3 sm:px-4 py-1.5 text-xs font-bold rounded-md text-slate-500 hover:text-slate-700 transition";
        });
        
        // Estilo Ativo
        const activeBtnClass = "px-3 sm:px-4 py-1.5 text-xs font-bold rounded-md bg-white shadow-sm text-indigo-600 transition";

        if(activeId === 'viewHome' && tabHome) tabHome.className = activeBtnClass;
        if(activeId === 'viewDebts' && tabDebts) tabDebts.className = activeBtnClass;
        if(activeId === 'viewDashboard' && tabDash) tabDash.className = activeBtnClass;

        // Renderiza conteúdo específico se necessário
        if(activeId === 'viewDashboard' && Dashboard) Dashboard.render();
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
            const descInput = document.getElementById('inputDesc');
            const amountInput = document.getElementById('inputAmount');
            const typeInput = document.getElementById('inputType');
            const catInput = document.getElementById('inputCategory');
            const btn = transForm.querySelector('button[type="submit"]');
            
            if (!descInput || !amountInput) return;

            const desc = descInput.value;
            const amount = parseFloat(amountInput.value);
            const type = typeInput.value;
            const category = catInput.value;

            if (!desc || isNaN(amount)) return alert("Preencha a descrição e o valor.");

            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            btn.disabled = true;

            const filterEl = document.getElementById('monthFilter');
            const filterMonth = filterEl ? filterEl.value : 'Todos';
            
            // Se estiver filtrando "Todos", usa o mês atual para salvar. Se estiver filtrando um mês, usa aquele.
            let monthToSave = filterMonth;
            if (monthToSave === 'Todos') {
                 // Função simples para pegar nome do mês atual se getMonthName falhar
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
                // Mantém o tipo e categoria se quiser UX melhor, ou reseta tudo
                
            } catch (err) { 
                console.error(err); 
                alert("Erro ao salvar: " + err.message);
            } finally { 
                btn.innerHTML = originalText; 
                btn.disabled = false; 
            }
        });
    }

    // FORMULÁRIO DE DÍVIDAS
    const debtForm = document.getElementById('debtForm');
    if(debtForm) {
        debtForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('debtName');
            const amountInput = document.getElementById('debtAmount');
            
            if(!nameInput || !amountInput) return;

            const name = nameInput.value;
            const amount = parseFloat(amountInput.value);
            
            if(name && amount) {
                await store.addDebt(name, amount);
                renderDebts();
                debtForm.reset();
            }
        });
    }

    // BOTÕES DE AÇÃO
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            if(confirm("Deseja realmente sair?")) { 
                localStorage.removeItem('token'); // Use o nome correto da chave
                window.location.href = 'login.html'; 
            }
        });
    }

    const btnSaveMeta = document.getElementById('btnSaveMeta');
    if (btnSaveMeta) {
        btnSaveMeta.addEventListener('click', () => {
            const input = document.getElementById('inputMeta');
            if(input) {
                store.setMeta(parseFloat(input.value));
                if(Dashboard && Dashboard.render) Dashboard.render();
                alert("Meta Salva com Sucesso!");
            }
        });
    }

    const monthFilter = document.getElementById('monthFilter');
    if(monthFilter) {
        monthFilter.addEventListener('change', (e) => updateAllViews(e.target.value));
    }

    // IMPORTAÇÃO DE PDF
    const btnImport = document.getElementById('btnImport');
    const modal = document.getElementById('importModal');
    // Se você tiver um botão de fechar com ID específico, adicione aqui. 
    // No HTML anterior usei onclick inline, mas é bom ter listener.
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
    
    // Fecha modal clicando fora (Opcional)
    if(modal) {
        modal.addEventListener('click', (e) => {
            if(e.target === modal) modal.classList.add('hidden');
        });
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
                
                let transactions = [];
                if (typeof categorizeWithGemini === 'function') {
                     transactions = await categorizeWithGemini(text, apiKey);
                } else {
                    console.warn("Módulo AI não carregado, simulando...");
                }

                for (const t of transactions) {
                    let monthCode = "01";
                    // Extrai mês da data (DD/MM/AAAA)
                    if(t.date && t.date.includes('/')) monthCode = t.date.split('/')[1];
                    
                    // Converte número do mês para nome (01 -> JANEIRO)
                    const meses = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
                    const monthName = meses[parseInt(monthCode) - 1] || "JANEIRO";

                    await store.addTransaction({
                        desc: t.desc, amount: t.amount, type: t.type, category: t.category,
                        date: t.date, month: monthName
                    });
                }
                alert("Importação concluída com sucesso!");
                updateAllViews('Todos');
                if(modal) modal.classList.add('hidden');
                
            } catch (err) { 
                console.error(err);
                alert("Erro na importação: " + err.message); 
            } finally { 
                if(loading) loading.classList.add('hidden'); 
                if(dropZone) dropZone.classList.remove('hidden'); 
                fileInput.value = ''; // Limpa input para permitir selecionar mesmo arquivo
            }
        });
    }

    // DASHBOARD AI REPORT
    const btnReport = document.getElementById('btnGenerateReport');
    if (btnReport) {
        btnReport.addEventListener('click', () => {
            if(Dashboard && Dashboard.generateAIReport) Dashboard.generateAIReport();
        });
    }

    const btnSettings = document.getElementById('btnSettings');
    if(btnSettings) {
        btnSettings.addEventListener('click', () => {
            const key = prompt("API Key Gemini (Google AI):", localStorage.getItem('gemini_api_key') || '');
            if (key !== null) localStorage.setItem('gemini_api_key', key);
        });
    }

    const btnReset = document.getElementById('btnReset');
    if(btnReset) btnReset.addEventListener('click', () => location.reload());
}

// --- 4. INICIALIZAÇÃO (PONTO DE PARTIDA) ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM Pronto. Iniciando aplicação...");

    try {
        // Inicializa UI (Categorias)
        if(UI && UI.initCategories) UI.initCategories();

        // 1. Tenta carregar do Cache primeiro (para ser rápido)
        const hasCache = store.loadFromCache();
        
        if (hasCache) {
            updateAllViews('Todos');
        } else {
            // Loading State na lista se não tiver cache
            const list = document.getElementById('transactionList');
            if(list) list.innerHTML = '<tr><td colspan="5" class="text-center py-10"><i class="fas fa-spinner fa-spin text-indigo-600 text-3xl"></i><p class="text-slate-500 mt-2">Sincronizando dados...</p></td></tr>';
        }

        // 2. Configura os cliques dos botões
        setupEvents();

        // 3. Se tiver token, busca dados atualizados do servidor
        if (token) {
            await store.init();
            updateAllViews('Todos');

            const inputMeta = document.getElementById('inputMeta');
            if(inputMeta) inputMeta.value = store.getMeta();
        }

    } catch (error) {
        console.error("Erro fatal na inicialização:", error);
    }
});
