// --- PROTEÇÃO DE ROTA ---
if (!localStorage.getItem('inf_auth_token')) {
    window.location.href = 'login.html';
}

import { store } from './store.js';
import { UI } from './ui.js';
import { Dashboard } from './dashboard.js';
import { readPdfText } from './pdf.js';
import { categorizeWithGemini } from './ai.js';
import { getMonthName } from './utils.js';

console.log("🚀 app.js carregado com sucesso!");

// --- 1. FUNÇÕES AUXILIARES DE RENDERIZAÇÃO ---
function updateAllViews(monthFilter) {
    UI.renderApp(monthFilter);
    Dashboard.render(); 
    renderDebts(); // Atualiza a lista de dívidas
}

// --- 2. RENDERIZAÇÃO DE DÍVIDAS (Estava faltando ou perdida) ---
function renderDebts() {
    const list = document.getElementById('debtList');
    const totalEl = document.getElementById('totalDebtAmount');
    if(!list) return;

    list.innerHTML = '';
    let totalReceber = 0;

    store.debtors.forEach(d => {
        const tr = document.createElement('tr');
        
        // Visual: Pago vs Pendente
        const opacityClass = d.paid ? "opacity-50" : "";
        const statusBadge = d.paid 
            ? `<span class="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold">PAGO</span>`
            : `<span class="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">PENDENTE</span>`;

        if(!d.paid) totalReceber += parseFloat(d.amount);

        tr.className = `hover:bg-slate-50 transition ${opacityClass}`;
        tr.innerHTML = `
            <td class="px-6 py-4 font-medium text-slate-900">${d.name}</td>
            <td class="px-6 py-4 text-right font-bold text-slate-600">R$ ${parseFloat(d.amount).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
            <td class="px-6 py-4 text-center">${statusBadge}</td>
            <td class="px-6 py-4 text-center flex justify-center gap-2">
                <button onclick="window.toggleDebt(${d.id})" class="text-indigo-600 hover:text-indigo-900" title="Mudar Status">
                    <i class="fas fa-check-circle"></i>
                </button>
                <button onclick="window.deleteDebt(${d.id})" class="text-red-400 hover:text-red-600" title="Apagar">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        list.appendChild(tr);
    });

    if(totalEl) totalEl.innerText = `R$ ${totalReceber.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
}

// --- 3. FUNÇÕES GLOBAIS (O QUE FAZ OS BOTÕES FUNCIONAREM) ---
// Precisamos definir isso no 'window' para o HTML enxergar

window.removeTransaction = async (id) => {
    if(confirm("Tem certeza que deseja apagar essa transação?")) {
        await store.removeTransaction(id);
        const monthFilter = document.getElementById('monthFilter').value;
        updateAllViews(monthFilter);
    }
};

window.toggleDebt = async (id) => {
    await store.toggleDebt(id);
    renderDebts();
};

window.deleteDebt = async (id) => {
    if(confirm("Apagar esta dívida?")) {
        await store.removeDebt(id);
        renderDebts();
    }
};

// --- 4. INICIALIZAÇÃO INTELIGENTE (CACHE + REDE) ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM Pronto. Iniciando...");

    try {
        UI.initCategories();

        // A) Tenta carregar do Cache primeiro (Instantâneo)
        if (store.loadFromCache()) {
            console.log("⚡ Exibindo versão em cache...");
            updateAllViews('Todos');
        }

        // B) Configura os eventos dos botões (Submit, Tabs, etc)
        // Importante fazer isso logo para os botões funcionarem
        setupEvents();

        // C) Busca atualização do servidor em background
        await store.init();
        
        // D) Renderiza de novo com os dados frescos
        updateAllViews('Todos');

        // Configura Meta visual
        const inputMeta = document.getElementById('inputMeta');
        if(inputMeta) inputMeta.value = store.getMeta();

    } catch (error) {
        console.error("ERRO CRÍTICO NA INICIALIZAÇÃO:", error);
    }
});

// --- 5. CONFIGURAÇÃO DE EVENTOS (FORMULÁRIOS, ABAS, IMPORTAÇÃO) ---
function setupEvents() {
    
    // --- NAVEGAÇÃO ENTRE ABAS ---
    const tabs = {
        home: document.getElementById('tabHome'),
        debts: document.getElementById('tabDebts'), // Botão Dívidas
        dash: document.getElementById('tabDash')
    };
    const views = {
        home: document.getElementById('viewHome'),
        debts: document.getElementById('viewDebts'), // Tela Dívidas
        dash: document.getElementById('viewDashboard')
    };

    function switchTab(active) {
        // Reseta estilos
        Object.values(tabs).forEach(t => {
            if(t) t.className = "px-4 py-1.5 text-xs font-bold rounded-md text-slate-500 hover:text-slate-700 transition";
        });
        // Esconde telas
        Object.values(views).forEach(v => {
            if(v) v.classList.add('hidden');
        });
        
        // Ativa selecionado
        if(tabs[active]) tabs[active].className = "px-4 py-1.5 text-xs font-bold rounded-md bg-white shadow-sm text-indigo-600 transition";
        if(views[active]) views[active].classList.remove('hidden');
        
        if(active === 'dash') Dashboard.render();
        if(active === 'debts') renderDebts();
    }

    if(tabs.home) tabs.home.addEventListener('click', () => switchTab('home'));
    if(tabs.debts) tabs.debts.addEventListener('click', () => switchTab('debts'));
    if(tabs.dash) tabs.dash.addEventListener('click', () => switchTab('dash'));

    // --- FORMULÁRIO DE DÍVIDAS ---
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

    // --- LOGOUT ---
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            if(confirm("Sair do sistema?")) {
                localStorage.removeItem('inf_auth_token');
                window.location.href = 'login.html';
            }
        });
    }

    // --- SALVAR META ---
    const btnSaveMeta = document.getElementById('btnSaveMeta');
    const inputMeta = document.getElementById('inputMeta');
    if (btnSaveMeta && inputMeta) {
        btnSaveMeta.addEventListener('click', () => {
            const valor = parseFloat(inputMeta.value);
            if (!isNaN(valor)) {
                store.setMeta(valor);
                Dashboard.render();
                alert("Meta Salva!");
            }
        });
    }

    // --- ADICIONAR TRANSAÇÃO ---
    const form = document.getElementById('transactionForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const desc = document.getElementById('inputDesc').value;
            const amount = parseFloat(document.getElementById('inputAmount').value);
            const type = document.getElementById('inputType').value;
            const category = document.getElementById('inputCategory').value;
            
            if (!desc || isNaN(amount)) return alert("Preencha corretamente.");

            const filterMonth = document.getElementById('monthFilter').value;
            const monthToSave = filterMonth === 'Todos' ? getMonthName(new Date().getMonth() + 1) : filterMonth;

            // Envia para o banco através da Store
            await store.addTransaction({
                desc, amount, type, category,
                date: new Date().toLocaleDateString('pt-BR'),
                month: monthToSave
            });

            updateAllViews(filterMonth);
            form.reset();
        });
    }

    // --- FILTRO DE MÊS ---
    const monthFilter = document.getElementById('monthFilter');
    if(monthFilter) monthFilter.addEventListener('change', (e) => updateAllViews(e.target.value));

    // --- IMPORTAÇÃO PDF ---
    const btnImport = document.getElementById('btnImport');
    const modal = document.getElementById('importModal');
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const loading = document.getElementById('loadingStatus');

    if(btnImport) {
        btnImport.addEventListener('click', () => {
            modal.classList.remove('hidden');
            dropZone.classList.remove('hidden');
            loading.classList.add('hidden');
        });

        document.getElementById('btnCloseModal').addEventListener('click', () => modal.classList.add('hidden'));
        dropZone.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                dropZone.classList.add('hidden');
                loading.classList.remove('hidden');
                document.getElementById('statusText').innerText = "Processando PDF...";

                const text = await readPdfText(file);
                const apiKey = localStorage.getItem('gemini_api_key');
                const transactions = await categorizeWithGemini(text, apiKey);

                for (const t of transactions) {
                    let monthCode = "01";
                    if(t.date && t.date.includes('/')) monthCode = t.date.split('/')[1];
                    
                    await store.addTransaction({
                        desc: t.desc,
                        amount: t.amount,
                        type: t.type,
                        category: t.category,
                        date: t.date,
                        month: getMonthName(monthCode)
                    });
                }

                alert("Importação concluída!");
                updateAllViews('Todos');
                modal.classList.add('hidden');
            } catch (err) {
                alert("Erro: " + err.message);
            } finally {
                loading.classList.add('hidden');
                dropZone.classList.remove('hidden');
            }
        });
    }

    // --- DASHBOARD AI ---
    const btnReport = document.getElementById('btnGenerateReport');
    if (btnReport) btnReport.addEventListener('click', () => Dashboard.generateAIReport());
    
    // --- RESET ---
    const btnReset = document.getElementById('btnReset');
    if(btnReset) btnReset.addEventListener('click', () => location.reload());

    // --- SETTINGS ---
    const btnSettings = document.getElementById('btnSettings');
    if(btnSettings) btnSettings.addEventListener('click', () => {
        const key = prompt("API Key Gemini:", localStorage.getItem('gemini_api_key') || '');
        if (key) localStorage.setItem('gemini_api_key', key);
    });
}
