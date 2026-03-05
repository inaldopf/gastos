import { store } from './store.js';
import { UI } from './ui.js';
import { Dashboard } from './dashboard.js';
import { Goals } from './goals.js';
import { VA } from './va.js';
import { Objectives } from './objectives.js';
import { Cards } from './cards.js';
import { getMonthName } from './utils.js';

console.log("🚀 app.js carregado!");

let selectedMonths = [];
let selectedCategory = 'Todas';

// 1. Auth Logic
const isLoginPage = window.location.pathname.includes('login.html');
const authToken = localStorage.getItem('inf_auth_token');
if (!authToken && !isLoginPage) window.location.href = 'login.html';
if (authToken && isLoginPage) window.location.href = 'index.html';

// 2. Setup Theme
function setupTheme() {
    const btnTheme = document.getElementById('btnThemeToggle');
    const html = document.documentElement;
    if (localStorage.getItem('theme') === 'dark') html.classList.add('dark');

    const toggleTheme = () => {
        html.classList.toggle('dark');
        localStorage.setItem('theme', html.classList.contains('dark') ? 'dark' : 'light');
    };

    if(btnTheme) btnTheme.addEventListener('click', toggleTheme);
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
            e.preventDefault(); toggleTheme();
        }
    });
}

// 3. Components Setup
function setupCategoryFilter() {
    const select = document.getElementById('filterCategory');
    if (!select || !UI || !UI.categories) return;
    select.innerHTML = '<option value="Todas">📂 Todas Categorias</option>';
    UI.categories.forEach(cat => {
        if (!cat.hidden) {
            const option = document.createElement('option');
            option.value = cat.id; option.textContent = `${cat.id}`;
            select.appendChild(option);
        }
    });
    select.addEventListener('change', (e) => { selectedCategory = e.target.value; updateAllViews(); });
}

function setupMonthSelector() {
    const btn = document.getElementById('monthDropdownBtn');
    const menu = document.getElementById('monthDropdownMenu');
    const btnText = document.getElementById('monthBtnText');
    if (!btn || !menu) return;
    const months = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
    const shortMonths = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    if (selectedMonths.length === 0) selectedMonths = [months[new Date().getMonth()]];

    const updateButtonText = () => {
        if (selectedMonths.length === 0) { btnText.textContent = "Selecione um mês"; btnText.classList.add('text-red-500'); }
        else if (selectedMonths.length === 12) { btnText.textContent = "📅 Ano Completo"; btnText.classList.remove('text-red-500'); }
        else if (selectedMonths.length <= 2) { btnText.textContent = `📅 ${selectedMonths.map(m => shortMonths[months.indexOf(m)]).join(', ')}`; btnText.classList.remove('text-red-500'); }
        else { btnText.textContent = `📅 ${selectedMonths.length} meses selecionados`; btnText.classList.remove('text-red-500'); }
    };
    menu.innerHTML = '';
    const divAll = document.createElement('div');
    divAll.className = "flex items-center p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer mb-1 border-b border-slate-100 dark:border-slate-700";
    divAll.innerHTML = `<input type="checkbox" id="checkAll" class="w-4 h-4 text-indigo-600 rounded border-gray-300 dark:bg-slate-700 focus:ring-indigo-500 cursor-pointer"><label for="checkAll" class="ml-2 text-sm font-bold text-slate-700 dark:text-slate-200 flex-1 cursor-pointer">Selecionar Todos</label>`;
    divAll.onclick = (e) => { if(e.target.tagName !== 'INPUT') { const chk = divAll.querySelector('input'); chk.checked = !chk.checked; chk.dispatchEvent(new Event('change')); }};
    divAll.querySelector('input').addEventListener('change', (e) => { selectedMonths = e.target.checked ? [...months] : []; setupMonthSelector(); updateAllViews(); });
    menu.appendChild(divAll);
    months.forEach((m, index) => {
        const div = document.createElement('div');
        div.className = "flex items-center p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer";
        div.innerHTML = `<input type="checkbox" id="m-${index}" value="${m}" ${selectedMonths.includes(m)?'checked':''} class="w-4 h-4 text-indigo-600 rounded border-gray-300 dark:bg-slate-700 focus:ring-indigo-500 cursor-pointer"><label for="m-${index}" class="ml-2 text-sm text-slate-600 dark:text-slate-300 flex-1 cursor-pointer">${shortMonths[index]}</label>`;
        div.onclick = (e) => { if(e.target.tagName !== 'INPUT') { const chk = div.querySelector('input'); chk.checked = !chk.checked; chk.dispatchEvent(new Event('change')); }};
        div.querySelector('input').addEventListener('change', (e) => { if(e.target.checked) { if(!selectedMonths.includes(m)) selectedMonths.push(m); } else { selectedMonths = selectedMonths.filter(x => x !== m); } updateButtonText(); updateAllViews(); });
        menu.appendChild(div);
    });
    updateButtonText();
    btn.onclick = (e) => { e.stopPropagation(); menu.classList.toggle('hidden'); };
    document.addEventListener('click', (e) => { if (!btn.contains(e.target) && !menu.contains(e.target)) menu.classList.add('hidden'); });
}

// 4. Update
function updateAllViews() {
    window.currentSelectedMonths = selectedMonths;
    if (UI && typeof UI.renderApp === 'function') UI.renderApp(selectedMonths, selectedCategory);
    if (Dashboard && typeof Dashboard.render === 'function') Dashboard.render(selectedMonths);
    if (Goals && typeof Goals.render === 'function') Goals.render(selectedMonths);
    if (VA && typeof VA.render === 'function') VA.render(selectedMonths);
    if (Objectives && typeof Objectives.render === 'function') Objectives.render();
    if (Cards && typeof Cards.render === 'function') Cards.render(selectedMonths);
    renderDebts();
}

window.updateAllViews = updateAllViews;

function renderDebts() {
    const list = document.getElementById('debtList');
    const totalEl = document.getElementById('totalDebtAmount');
    if(!list) return;
    list.innerHTML = '';
    let total = 0;
    (store.debtors||[]).forEach(d => {
        if(!d.paid) total += parseFloat(d.amount||0);
        const tr = document.createElement('tr');
        tr.className = `hover:bg-slate-50 dark:hover:bg-slate-700 transition ${d.paid?'opacity-50':''} border-b border-slate-50 dark:border-slate-700`;
        tr.innerHTML = `
            <td class="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">${d.name}</td>
            <td class="px-6 py-4 text-right font-bold text-slate-600 dark:text-slate-300">R$ ${parseFloat(d.amount).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
            <td class="px-6 py-4 text-center">${d.paid ? '<span class="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold">PAGO</span>' : '<span class="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">PENDENTE</span>'}</td>
            <td class="px-6 py-4 text-center flex justify-center gap-2">
                <button onclick="window.toggleDebt(${d.id})" class="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400"><i class="fas fa-check-circle"></i></button>
                <button onclick="window.deleteDebt(${d.id})" class="text-red-400 hover:text-red-600"><i class="fas fa-trash"></i></button>
            </td>`;
        list.appendChild(tr);
    });
    if(totalEl) totalEl.innerText = `R$ ${total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
}

// 5. Globals
window.removeTransaction = async (id) => { if(confirm("Apagar?")) { await store.removeTransaction(id); updateAllViews(); } };
window.toggleDebt = async (id) => { await store.toggleDebt(id); renderDebts(); };
window.deleteDebt = async (id) => { if(confirm("Apagar?")) { await store.removeDebt(id); renderDebts(); }};
window.removeVATransaction = async (id) => { if(confirm("Apagar registro do VA? (O saldo será revertido)")) { await store.removeVATransaction(id); updateAllViews(); }};

window.removeObjective = async (id) => { if(confirm("Apagar objetivo?")) { await store.removeObjective(id); updateAllViews(); }};
window.addMoneyObjective = async (id) => {
    const obj = store.objectives.find(o => o.id === id);
    if (!obj) return;
    const val = prompt(`Quanto deseja GUARDAR para o sonho: '${obj.title}'?`);
    const numVal = parseFloat(val);
    if (numVal && numVal > 0) {
        let targetMonth = window.currentSelectedMonths && window.currentSelectedMonths.length > 0 
            ? window.currentSelectedMonths[window.currentSelectedMonths.length - 1] : getMonthName(new Date().getMonth() + 1);
        await store.addMoneyToObjective(id, numVal);
        await store.addTransaction({ desc: `Guardado: ${obj.title}`, amount: numVal, type: 'Investimento', category: 'Objetivo', date: new Date().toLocaleDateString('pt-BR'), month: targetMonth });
        updateAllViews();
    }
};

window.removeMoneyObjective = async (id) => {
    const obj = store.objectives.find(o => o.id === id);
    if (!obj) return;
    const val = prompt(`Quanto deseja RESGATAR do sonho: '${obj.title}'?\\n(Saldo atual: R$ ${obj.current_amount})`);
    const numVal = parseFloat(val);
    if (numVal && numVal > 0) {
        if (numVal > parseFloat(obj.current_amount)) return alert("Você não pode resgatar um valor maior do que o que já guardou!");
        let targetMonth = window.currentSelectedMonths && window.currentSelectedMonths.length > 0 
            ? window.currentSelectedMonths[window.currentSelectedMonths.length - 1] : getMonthName(new Date().getMonth() + 1);
        await store.addMoneyToObjective(id, -numVal);
        await store.addTransaction({ desc: `Resgate: ${obj.title}`, amount: numVal, type: 'Receita', category: 'Objetivo', date: new Date().toLocaleDateString('pt-BR'), month: targetMonth });
        updateAllViews();
    }
};

// 6. Events
function setupEvents() {
    setupTheme();

    // --- NOVA LÓGICA DO MENU DRAWER MOBILE ---
    const btnHamburger = document.getElementById('btnHamburger');
    const mobileDrawer = document.getElementById('mobileDrawer');
    const drawerBackdrop = document.getElementById('drawerBackdrop');
    const drawerSidebar = document.getElementById('drawerSidebar');
    const btnCloseDrawer = document.getElementById('btnCloseDrawer');

    const toggleDrawer = (forceClose = false) => {
        if (!mobileDrawer) return;
        const isOpen = !mobileDrawer.classList.contains('pointer-events-none');
        
        if (isOpen || forceClose) {
            // Fechar
            drawerSidebar.classList.remove('translate-x-0');
            drawerSidebar.classList.add('-translate-x-full');
            drawerBackdrop.classList.remove('opacity-100');
            drawerBackdrop.classList.add('opacity-0');
            setTimeout(() => { mobileDrawer.classList.add('pointer-events-none'); }, 300);
        } else {
            // Abrir
            mobileDrawer.classList.remove('pointer-events-none');
            // Pequeno delay para a animação do backdrop funcionar após o display block
            setTimeout(() => {
                drawerBackdrop.classList.remove('opacity-0');
                drawerBackdrop.classList.add('opacity-100');
                drawerSidebar.classList.remove('-translate-x-full');
                drawerSidebar.classList.add('translate-x-0');
            }, 10);
        }
    };

    if (btnHamburger) btnHamburger.addEventListener('click', () => toggleDrawer());
    if (btnCloseDrawer) btnCloseDrawer.addEventListener('click', () => toggleDrawer(true));
    if (drawerBackdrop) drawerBackdrop.addEventListener('click', () => toggleDrawer(true));

    // --- LÓGICA DAS ABAS ---
    const tabs = {
        home: document.getElementById('tabHome'),
        debts: document.getElementById('tabDebts'),
        dash: document.getElementById('tabDash'),
        goals: document.getElementById('tabGoals'),
        va: document.getElementById('tabVA'),
        objectives: document.getElementById('tabObjectives'),
        cards: document.getElementById('tabCards')
    };

    const mobileTabs = {
        home: document.getElementById('btnMobileHome'),
        debts: document.getElementById('btnMobileDebts'),
        dash: document.getElementById('btnMobileDash'),
        goals: document.getElementById('btnMobileGoals'),
        va: document.getElementById('btnMobileVA'),
        objectives: document.getElementById('btnMobileObjectives'),
        cards: document.getElementById('btnMobileCards')
    };

    const switchTab = (viewId) => {
        ['viewHome', 'viewDebts', 'viewDashboard', 'viewGoals', 'viewVA', 'viewObjectives', 'viewCards'].forEach(id => {
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

        // Reseta Desktop Tabs
        Object.values(tabs).forEach(btn => {
            if(btn) btn.className = "px-4 py-1.5 text-xs font-bold rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition";
        });

        // Reseta Mobile Drawer Tabs (Visual novo)
        Object.values(mobileTabs).forEach(btn => {
            if(btn) btn.className = "w-full flex items-center gap-3 p-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold transition";
        });

        const activeDesktop = "px-4 py-1.5 text-xs font-bold rounded-md bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-indigo-300 transition";
        const activeMobile = "w-full flex items-center gap-3 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold transition";

        if(viewId === 'viewHome') {
            if(tabs.home) tabs.home.className = activeDesktop;
            if(mobileTabs.home) mobileTabs.home.className = activeMobile;
            UI.renderApp(selectedMonths, selectedCategory); 
        }
        if(viewId === 'viewDebts') {
            if(tabs.debts) tabs.debts.className = activeDesktop;
            if(mobileTabs.debts) mobileTabs.debts.className = activeMobile;
            renderDebts();
        }
        if(viewId === 'viewDashboard') {
            if(tabs.dash) tabs.dash.className = activeDesktop;
            if(mobileTabs.dash) mobileTabs.dash.className = activeMobile;
            Dashboard.render(selectedMonths);
        }
        if(viewId === 'viewGoals') {
            if(tabs.goals) tabs.goals.className = activeDesktop;
            if(mobileTabs.goals) mobileTabs.goals.className = activeMobile;
            Goals.render(selectedMonths);
        }
        if(viewId === 'viewVA') {
            if(tabs.va) tabs.va.className = activeDesktop;
            if(mobileTabs.va) mobileTabs.va.className = activeMobile;
            VA.render(selectedMonths);
        }
        if(viewId === 'viewObjectives') {
            if(tabs.objectives) tabs.objectives.className = activeDesktop;
            if(mobileTabs.objectives) mobileTabs.objectives.className = activeMobile;
            Objectives.render();
        }
        if(viewId === 'viewCards') {
            if(tabs.cards) tabs.cards.className = activeDesktop;
            if(mobileTabs.cards) mobileTabs.cards.className = activeMobile;
            Cards.render(window.currentSelectedMonths);
        }

        // SEMPRE fecha o menu mobile quando clicar em alguma aba
        toggleDrawer(true);
    };

    // Listeners Desktop
    if(tabs.home) tabs.home.addEventListener('click', () => switchTab('viewHome'));
    if(tabs.debts) tabs.debts.addEventListener('click', () => switchTab('viewDebts'));
    if(tabs.dash) tabs.dash.addEventListener('click', () => switchTab('viewDashboard'));
    if(tabs.goals) tabs.goals.addEventListener('click', () => switchTab('viewGoals'));
    if(tabs.va) tabs.va.addEventListener('click', () => switchTab('viewVA'));
    if(tabs.objectives) tabs.objectives.addEventListener('click', () => switchTab('viewObjectives'));
    if(tabs.cards) tabs.cards.addEventListener('click', () => switchTab('viewCards'));

    // Listeners Mobile
    if(mobileTabs.home) mobileTabs.home.addEventListener('click', () => switchTab('viewHome'));
    if(mobileTabs.debts) mobileTabs.debts.addEventListener('click', () => switchTab('viewDebts'));
    if(mobileTabs.dash) mobileTabs.dash.addEventListener('click', () => switchTab('viewDashboard'));
    if(mobileTabs.goals) mobileTabs.goals.addEventListener('click', () => switchTab('viewGoals'));
    if(mobileTabs.va) mobileTabs.va.addEventListener('click', () => switchTab('viewVA'));
    if(mobileTabs.objectives) mobileTabs.objectives.addEventListener('click', () => switchTab('viewObjectives'));
    if(mobileTabs.cards) mobileTabs.cards.addEventListener('click', () => switchTab('viewCards'));

    const inputType = document.getElementById('inputType');
    if (inputType) {
        inputType.addEventListener('change', (e) => {
            UI.populateCategories(e.target.value);
        });
    }

    // Define a data de hoje como padrão no input
    const inputDateEl = document.getElementById('inputDate');
    if (inputDateEl) {
        inputDateEl.value = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
    }

    const transForm = document.getElementById('transactionForm');
    if (transForm) {
        transForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const desc = document.getElementById('inputDesc').value;
            const amount = parseFloat(document.getElementById('inputAmount').value);
            const type = document.getElementById('inputType').value;
            const category = document.getElementById('inputCategory').value;
            const rawDate = document.getElementById('inputDate').value;
            
            const btn = transForm.querySelector('button[type="submit"]');
            if (!desc || isNaN(amount) || !rawDate) return alert("Preencha corretamente.");
            const oldText = btn.innerHTML; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; btn.disabled = true;
            
            try {
                // Converte a data do HTML (YYYY-MM-DD) para o padrão do nosso banco (DD/MM/YYYY)
                const [y, m, d] = rawDate.split('-');
                const formattedDate = `${d}/${m}/${y}`;

                let targetMonth = selectedMonths[selectedMonths.length - 1];
                if (!targetMonth) targetMonth = getMonthName(new Date().getMonth() + 1);
                
                await store.addTransaction({ desc, amount, type, category, date: formattedDate, month: targetMonth });
                
                updateAllViews();
                transForm.reset();
                // Retorna a data para hoje após salvar
                if (inputDateEl) inputDateEl.value = new Date().toISOString().split('T')[0];
                document.getElementById('inputType').value = 'Despesa';
                UI.populateCategories('Despesa');
            } catch (err) { console.error(err); } finally { btn.innerHTML = oldText; btn.disabled = false; }
        });
    }

    const debtForm = document.getElementById('debtForm');
    if (debtForm) {
        debtForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            let name = document.getElementById('debtName').value;
            const baseAmount = parseFloat(document.getElementById('debtAmount').value);
            const interestInput = document.getElementById('debtInterest');
            const interest = interestInput && interestInput.value ? parseFloat(interestInput.value) : 0;
            
            if (name && baseAmount) {
                let finalAmount = baseAmount;
                if (interest > 0) {
                    finalAmount = baseAmount + (baseAmount * interest / 100);
                    name = `${name} (+${interest}%)`; 
                }
                const btnSubmit = debtForm.querySelector('button');
                const oldText = btnSubmit.innerHTML;
                btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; 
                btnSubmit.disabled = true;

                try {
                    await store.addDebt(name, finalAmount);
                    renderDebts();
                    debtForm.reset();
                    if (interestInput) interestInput.value = '0';
                } catch (err) { alert("Erro ao salvar"); } finally {
                    btnSubmit.innerHTML = oldText;
                    btnSubmit.disabled = false;
                }
            }
        });
    }
    
    const btnLogout = document.getElementById('btnLogout'); if (btnLogout) btnLogout.addEventListener('click', () => { if(confirm("Sair?")) { localStorage.removeItem('inf_auth_token'); window.location.href = 'login.html'; }});
    const btnSettings = document.getElementById('btnSettings'); if(btnSettings) btnSettings.addEventListener('click', () => { const key = prompt("API Key Gemini:", localStorage.getItem('gemini_api_key') || ''); if (key) localStorage.setItem('gemini_api_key', key); });
    const btnReset = document.getElementById('btnReset'); if(btnReset) btnReset.addEventListener('click', () => location.reload());
    
    const dropZone = document.getElementById('dropZone'); 
    if(dropZone) dropZone.addEventListener('click', () => document.getElementById('fileInput').click());
    
    const btnImport = document.getElementById('btnImport'); 
    if(btnImport) btnImport.addEventListener('click', () => document.getElementById('importModal').classList.remove('hidden'));
    
    const btnCloseModal = document.getElementById('btnCloseModal'); 
    if(btnCloseModal) btnCloseModal.addEventListener('click', () => document.getElementById('importModal').classList.add('hidden'));

    // --- LÓGICA DE IMPORTAÇÃO DE EXTRATO EM PDF (IA) ---
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const apiKey = localStorage.getItem('gemini_api_key');
            if (!apiKey) return alert("Configure sua API Key nas configurações (ícone de chave) primeiro!");

            const loadingStatus = document.getElementById('loadingStatus');
            dropZone.classList.add('hidden');
            loadingStatus.classList.remove('hidden');

            try {
                const { readPdfText } = await import('./pdf.js');
                const { categorizeWithGemini } = await import('./ai.js');
                
                const text = await readPdfText(file);
                const transactions = await categorizeWithGemini(text, apiKey);

                let targetMonth = window.currentSelectedMonths && window.currentSelectedMonths.length > 0 
                    ? window.currentSelectedMonths[window.currentSelectedMonths.length - 1] 
                    : getMonthName(new Date().getMonth() + 1);

                for (const t of transactions) {
                    await store.addTransaction({
                        desc: t.desc,
                        amount: parseFloat(t.amount),
                        type: t.type,
                        category: t.category,
                        date: t.date || new Date().toLocaleDateString('pt-BR'),
                        month: targetMonth
                    });
                }
                
                alert(`${transactions.length} transações importadas com sucesso!`);
                updateAllViews();
                document.getElementById('importModal').classList.add('hidden');

            } catch (error) {
                alert("Erro ao importar. Verifique o console: " + error.message);
                console.error(error);
            } finally {
                loadingStatus.classList.add('hidden');
                dropZone.classList.remove('hidden');
                fileInput.value = ''; 
            }
        });
    }

    // --- LÓGICA DO RELATÓRIO DA IA NO DASHBOARD ---
    const btnGenerateReport = document.getElementById('btnGenerateReport');
    if (btnGenerateReport) {
        btnGenerateReport.addEventListener('click', async () => {
            const apiKey = localStorage.getItem('gemini_api_key');
            if (!apiKey) return alert("Configure sua API Key nas configurações (ícone de chave) primeiro!");

            const originalText = btnGenerateReport.innerHTML;
            btnGenerateReport.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analisando seus hábitos...';
            btnGenerateReport.disabled = true;

            try {
                const { getFinancialAdvice } = await import('./ai.js');
                
                let currentMonths = window.currentSelectedMonths || [getMonthName(new Date().getMonth() + 1)];
                const expenses = (store.transactions || []).filter(t => t.type === 'Despesa' && currentMonths.includes(t.month));
                const totals = {};
                expenses.forEach(t => totals[t.category] = (totals[t.category] || 0) + parseFloat(t.amount));
                const topCats = Object.entries(totals).sort((a,b) => b[1]-a[1]).slice(0,3).map(x => x[0]).join(', ') || 'Nenhuma';

                const summaryData = {
                    balance: document.getElementById('dashBalance')?.innerText || 'R$ 0,00',
                    invested: document.getElementById('dashInvest')?.innerText || 'R$ 0,00',
                    expenses: document.getElementById('dashExpense')?.innerText || 'R$ 0,00',
                    topCategories: topCats,
                    savingsRate: "Calculado pela IA" 
                };

                const advice = await getFinancialAdvice(summaryData, apiKey);
                
                document.getElementById('aiTextContent').innerText = advice;
                document.getElementById('aiResponseArea').classList.remove('hidden');
            } catch (err) {
                alert("Erro ao falar com a IA: " + err.message);
            } finally {
                btnGenerateReport.innerHTML = originalText;
                btnGenerateReport.disabled = false;
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        if(UI && UI.initCategories) UI.initCategories();
        setupMonthSelector();
        setupCategoryFilter(); 
        setupEvents();
        const hasCache = store.loadFromCache();
        if(!hasCache) document.getElementById('transactionList').innerHTML = '<tr><td colspan="5" class="text-center py-10"><i class="fas fa-spinner fa-spin text-indigo-600 text-3xl"></i></td></tr>';
        const token = localStorage.getItem('inf_auth_token');
        if (token) {
            await store.init();
            updateAllViews();
            const inputMeta = document.getElementById('inputMeta');
            if(inputMeta) inputMeta.value = store.getMeta();
        }
    } catch (error) { console.error("Erro fatal:", error); }
});
