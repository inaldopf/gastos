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
        dash: document.getElementById('view
