import { GoogleGenerativeAI } from "@google/generative-ai";

// Configuração básica de estado
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let debts = JSON.parse(localStorage.getItem('debts')) || [];
let activeTab = 'Home';

// --- NAVEGAÇÃO ENTRE ABAS ---
const tabs = {
    Home: { btn: document.getElementById('tabHome'), view: document.getElementById('viewHome') },
    Debts: { btn: document.getElementById('tabDebts'), view: document.getElementById('viewDebts') },
    Dash: { btn: document.getElementById('tabDash'), view: document.getElementById('viewDashboard') }
};

Object.keys(tabs).forEach(tabKey => {
    tabs[tabKey].btn.addEventListener('click', () => {
        // Esconder todas as views e resetar botões
        Object.values(tabs).forEach(t => {
            t.view.classList.add('hidden');
            t.btn.classList.remove('bg-white', 'shadow-sm', 'text-indigo-600');
            t.btn.classList.add('text-slate-500');
        });
        
        // Mostrar aba ativa
        tabs[tabKey].view.classList.remove('hidden');
        tabs[tabKey].btn.classList.add('bg-white', 'shadow-sm', 'text-indigo-600');
        tabs[tabKey].btn.classList.remove('text-slate-500');
    });
});

// --- LÓGICA DE FORMULÁRIO ---
const transactionForm = document.getElementById('transactionForm');
transactionForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const newTransaction = {
        id: Date.now(),
        type: document.getElementById('inputType').value,
        description: document.getElementById('inputDesc').value,
        amount: parseFloat(document.getElementById('inputAmount').value),
        category: document.getElementById('inputCategory').value,
        date: new Date().toLocaleDateString('pt-BR')
    };

    transactions.push(newTransaction);
    saveAndRefresh();
    transactionForm.reset();
});

function saveAndRefresh() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
    renderTransactions();
    updateKPIs();
}

function updateKPIs() {
    const balance = transactions.reduce((acc, t) => t.type === 'Receita' ? acc + t.amount : acc - t.amount, 0);
    document.getElementById('kpiBalance').innerText = `R$ ${balance.toLocaleString('pt-BR')}`;
}

// Inicialização
updateKPIs();
