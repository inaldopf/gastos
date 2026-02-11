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

// Função auxiliar para atualizar TUDO
function updateAllViews(monthFilter) {
    UI.renderApp(monthFilter);
    Dashboard.render(); 
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM Pronto. Iniciando aplicação...");

    try {
        UI.initCategories();

        // 1. Renderiza IMEDIATAMENTE se tiver cache
        if (store.loadFromCache()) {
            updateAllViews('Todos');
        }

        // 2. Busca atualização do servidor em background
        await store.init();
        
        // 3. Renderiza DE NOVO com os dados frescos do servidor
        updateAllViews('Todos');

        // Resto das configurações...
        const inputMeta = document.getElementById('inputMeta');
        if(inputMeta) inputMeta.value = store.getMeta();
        setupEvents();

    } catch (error) {
        console.error("ERRO CRÍTICO NA INICIALIZAÇÃO:", error);
    }
});
function setupEvents() {
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

    // --- NAVEGAÇÃO ---
    const tabHome = document.getElementById('tabHome');
    const tabDash = document.getElementById('tabDash');
    const viewHome = document.getElementById('viewHome');
    const viewDashboard = document.getElementById('viewDashboard');

    if(tabHome && tabDash) {
        tabHome.addEventListener('click', () => {
            tabHome.className = "px-4 py-1.5 text-xs font-bold rounded-md bg-white shadow-sm text-indigo-600 transition";
            tabDash.className = "px-4 py-1.5 text-xs font-bold rounded-md text-slate-500 hover:text-slate-700 transition";
            viewHome.classList.remove('hidden');
            viewDashboard.classList.add('hidden');
        });

        tabDash.addEventListener('click', () => {
            tabDash.className = "px-4 py-1.5 text-xs font-bold rounded-md bg-white shadow-sm text-indigo-600 transition";
            tabHome.className = "px-4 py-1.5 text-xs font-bold rounded-md text-slate-500 hover:text-slate-700 transition";
            viewDashboard.classList.remove('hidden');
            viewHome.classList.add('hidden');
            Dashboard.render(); 
        });
    }

    // --- SALVAR META ---
    const inputMeta = document.getElementById('inputMeta');
    const btnSaveMeta = document.getElementById('btnSaveMeta');

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

    // --- FORM MANUAL ---
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

    // --- IMPORTAÇÃO ---
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

    // --- GERAIS ---
    const monthFilter = document.getElementById('monthFilter');
    if(monthFilter) monthFilter.addEventListener('change', (e) => updateAllViews(e.target.value));

    const btnSettings = document.getElementById('btnSettings');
    if(btnSettings) btnSettings.addEventListener('click', () => {
        const key = prompt("API Key Gemini:", localStorage.getItem('gemini_api_key') || '');
        if (key) localStorage.setItem('gemini_api_key', key);
    });

    const btnReport = document.getElementById('btnGenerateReport');
    if (btnReport) btnReport.addEventListener('click', () => Dashboard.generateAIReport());
    
    // Reset (Limpar Meta e Dados Visuais, mas não apaga do banco neste exemplo simples)
    const btnReset = document.getElementById('btnReset');
    if(btnReset) btnReset.addEventListener('click', () => location.reload());
}
