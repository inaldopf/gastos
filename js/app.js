import { store } from './store.js';
import { UI } from './ui.js';
import { Dashboard } from './dashboard.js';
import { Goals } from './goals.js';
import { VA } from './va.js';
import { Objectives } from './objectives.js'; // <--- IMPORT NOVO
import { getMonthName } from './utils.js';

// ... [MANTENHA AS CONFIGURAÇÕES INICIAIS, THEME, FILTER, MONTH SELECTOR IGUAIS] ...

// 4. Update
function updateAllViews() {
    window.currentSelectedMonths = selectedMonths;
    if (UI && typeof UI.renderApp === 'function') UI.renderApp(selectedMonths, selectedCategory);
    if (Dashboard && typeof Dashboard.render === 'function') Dashboard.render(selectedMonths);
    if (Goals && typeof Goals.render === 'function') Goals.render(selectedMonths);
    if (VA && typeof VA.render === 'function') VA.render(selectedMonths);
    if (Objectives && typeof Objectives.render === 'function') Objectives.render(); // <--- NOVO
    renderDebts();
}
window.updateAllViews = updateAllViews;

// ... [MANTENHA renderDebts e Funções Globais] ...

// Funções globais para os Sonhos (NOVO)
window.removeObjective = async (id) => { if(confirm("Apagar objetivo?")) { await store.removeObjective(id); updateAllViews(); }};
window.addMoneyObjective = async (id) => {
    const val = prompt("Quanto deseja adicionar a este objetivo?");
    if (val && !isNaN(parseFloat(val))) {
        await store.addMoneyToObjective(id, parseFloat(val));
        updateAllViews();
    }
};

// 6. Events
function setupEvents() {
    setupTheme();

    // Adicione a nova aba 'objectives' nos objetos
    const tabs = {
        home: document.getElementById('tabHome'),
        debts: document.getElementById('tabDebts'),
        dash: document.getElementById('tabDash'),
        goals: document.getElementById('tabGoals'),
        va: document.getElementById('tabVA'),
        objectives: document.getElementById('tabObjectives') // <--- NOVO
    };

    const mobileTabs = {
        home: document.getElementById('btnMobileHome'),
        debts: document.getElementById('btnMobileDebts'),
        dash: document.getElementById('btnMobileDash'),
        goals: document.getElementById('btnMobileGoals'),
        va: document.getElementById('btnMobileVA'),
        objectives: document.getElementById('btnMobileObjectives') // <--- NOVO
    };

    const switchTab = (viewId) => {
        ['viewHome', 'viewDebts', 'viewDashboard', 'viewGoals', 'viewVA', 'viewObjectives'].forEach(id => {
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
            if(btn) btn.className = "px-4 py-1.5 text-xs font-bold rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition";
        });

        Object.values(mobileTabs).forEach(btn => {
            if(!btn) return;
            let base = "flex flex-col items-center justify-center p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors w-16";
            if (btn === mobileTabs.va) {
                btn.className = "flex flex-col items-center justify-center p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors w-16";
            } else {
                btn.className = base;
            }
        });

        const activeDesktop = "px-4 py-1.5 text-xs font-bold rounded-md bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-indigo-300 transition";
        const activeMobile = "flex flex-col items-center justify-center p-2 text-indigo-600 dark:text-indigo-400 transition-colors w-16";

        // ... [MANTENHA OS IFs EXISTENTES] ...
        
        // NOVO IF
        if(viewId === 'viewObjectives') {
            if(tabs.objectives) tabs.objectives.className = activeDesktop;
            if(mobileTabs.objectives) mobileTabs.objectives.className = activeMobile;
            Objectives.render();
        }
    };

    // Listeners Desktop
    if(tabs.home) tabs.home.addEventListener('click', () => switchTab('viewHome'));
    if(tabs.debts) tabs.debts.addEventListener('click', () => switchTab('viewDebts'));
    if(tabs.dash) tabs.dash.addEventListener('click', () => switchTab('viewDashboard'));
    if(tabs.goals) tabs.goals.addEventListener('click', () => switchTab('viewGoals'));
    if(tabs.va) tabs.va.addEventListener('click', () => switchTab('viewVA'));
    if(tabs.objectives) tabs.objectives.addEventListener('click', () => switchTab('viewObjectives')); // <--- NOVO

    // Listeners Mobile
    if(mobileTabs.home) mobileTabs.home.addEventListener('click', () => switchTab('viewHome'));
    if(mobileTabs.debts) mobileTabs.debts.addEventListener('click', () => switchTab('viewDebts'));
    if(mobileTabs.dash) mobileTabs.dash.addEventListener('click', () => switchTab('viewDashboard'));
    if(mobileTabs.goals) mobileTabs.goals.addEventListener('click', () => switchTab('viewGoals'));
    if(mobileTabs.va) mobileTabs.va.addEventListener('click', () => switchTab('viewVA'));
    if(mobileTabs.objectives) mobileTabs.objectives.addEventListener('click', () => switchTab('viewObjectives')); // <--- NOVO

    // ... [MANTENHA O RESTO DOS EVENTOS DE FORMS E BOTÕES GERAIS IGUAL] ...
