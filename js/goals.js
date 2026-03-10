import { store } from './store.js';
import { UI } from './ui.js';

let goalsChart = null;

export const Goals = {
    render(selectedMonths = []) {
        const view = document.getElementById('viewGoals');
        if (!view || view.classList.contains('hidden')) return;

        this.setupInputs();

        const income = this.calculateIncome(selectedMonths);
        document.getElementById('goalTotalIncome').innerText = `R$ ${income.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;

        const inputMeta = document.getElementById('goalSavingsInput');
        if (inputMeta && inputMeta.dataset.listener !== 'true') {
            inputMeta.value = store.getMeta() || '';
            inputMeta.dataset.listener = 'true';
            inputMeta.addEventListener('change', async (e) => {
                const val = parseFloat(e.target.value) || 0;
                await store.setMeta(val);
                this.render(selectedMonths);
            });
        }

        const meta = store.getMeta();
        document.getElementById('goalTargetDisplay').innerText = `R$ ${meta.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;

        const fixedExpenses = this.calculateFixedExpenses(selectedMonths);
        const surplus = income - fixedExpenses;
        
        const surplusEl = document.getElementById('goalProjectedSurplus');
        surplusEl.innerText = `R$ ${surplus.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
        surplusEl.className = `text-xl font-bold blur-target ${surplus >= meta ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`;

        const progress = income > 0 ? ((income - fixedExpenses) / income) * 100 : 0;
        const bar = document.getElementById('goalBudgetBar');
        bar.style.width = `${Math.min(Math.max(progress, 0), 100)}%`;
        bar.className = `h-1.5 rounded-full transition-all duration-500 ${surplus >= meta ? 'bg-emerald-500' : 'bg-red-500'}`;

        const msg = document.getElementById('goalBudgetMsg');
        if (surplus >= meta) {
            msg.innerText = "Planejamento Seguro"; msg.className = "text-xs font-bold text-emerald-600 mt-1 text-right";
        } else {
            msg.innerText = "Alerta: Meta Comprometida"; msg.className = "text-xs font-bold text-red-500 mt-1 text-right";
        }

        this.renderGoalsList(selectedMonths);
    },

    setupInputs() {
        const select = document.getElementById('goalCategoryInput');
        if (select && select.options.length <= 1) {
            select.innerHTML = '<option value="" disabled selected>Selecione...</option>';
            const addedCats = new Set();
            UI.categories.forEach(cat => {
                if (cat.id !== 'Salário' && cat.id !== 'Renda Extra' && !cat.hidden && !addedCats.has(cat.id)) {
                    addedCats.add(cat.id);
                    const opt = document.createElement('option');
                    opt.value = cat.id; opt.textContent = cat.id;
                    select.appendChild(opt);
                }
            });
        }

        const form = document.getElementById('goalsForm');
        if (form && form.dataset.listener !== 'true') {
            form.dataset.listener = 'true';
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const cat = document.getElementById('goalCategoryInput').value;
                const amt = parseFloat(document.getElementById('goalAmountInput').value);
                if (cat && !isNaN(amt)) {
                    const btn = form.querySelector('button');
                    const oldText = btn.innerHTML;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; btn.disabled = true;
                    await store.setCategoryGoal(cat, amt);
                    form.reset();
                    btn.innerHTML = oldText; btn.disabled = false;
                    window.updateAllViews();
                }
            });
        }
    },

    calculateIncome(selectedMonths) {
        const filtered = store.transactions.filter(t => selectedMonths.includes(t.month));
        return filtered.reduce((acc, t) => t.type === 'Receita' ? acc + parseFloat(t.amount || 0) : acc, 0);
    },

    calculateFixedExpenses(selectedMonths) {
        const filtered = store.transactions.filter(t => selectedMonths.includes(t.month));
        const expenses = filtered.filter(t => t.type === 'Despesa');
        let totalFixed = 0;
        store.goals.forEach(g => {
            const spent = expenses.filter(t => t.category === g.category).reduce((acc, t) => acc + parseFloat(t.amount || 0), 0);
            totalFixed += Math.max(spent, parseFloat(g.amount)); 
        });
        const unbudgeted = expenses.filter(t => !store.goals.find(g => g.category === t.category)).reduce((acc, t) => acc + parseFloat(t.amount || 0), 0);
        return totalFixed + unbudgeted;
    },

    renderGoalsList(selectedMonths) {
        const list = document.getElementById('goalsList');
        if (!list) return;
        list.innerHTML = '';
        
        const filtered = store.transactions.filter(t => selectedMonths.includes(t.month));
        const expenses = filtered.filter(t => t.type === 'Despesa');
        
        const chartLabels = [];
        const chartSpent = [];
        const chartBudget = [];

        store.goals.forEach(g => {
            const spent = expenses.filter(t => t.category === g.category).reduce((acc, t) => acc + parseFloat(t.amount || 0), 0);
            const budget = parseFloat(g.amount);
            const pct = budget > 0 ? (spent / budget) * 100 : 0;
            let barColor = 'bg-emerald-500';
            if (pct > 80) barColor = 'bg-yellow-500';
            if (pct > 100) barColor = 'bg-red-500';

            chartLabels.push(g.category);
            chartSpent.push(spent);
            chartBudget.push(budget);

            const div = document.createElement('div');
            div.className = "bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 relative group overflow-hidden";
            div.innerHTML = `
                <div class="flex justify-between text-sm mb-2 relative z-10">
                    <span class="font-bold text-slate-700 dark:text-slate-300">${g.category}</span>
                    <span class="font-semibold text-slate-500 dark:text-slate-400 blur-target">
                        <span class="${pct > 100 ? 'text-red-500' : ''}">R$ ${spent.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span> / R$ ${budget.toLocaleString('pt-BR', {minimumFractionDigits:2})}
                    </span>
                </div>
                <div class="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 relative z-10 overflow-hidden">
                    <div class="${barColor} h-2 rounded-full transition-all duration-500" style="width: ${Math.min(pct, 100)}%"></div>
                </div>
                <button onclick="window.removeGoal('${g.category}')" class="absolute top-0 right-0 h-full px-4 bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center translate-x-full group-hover:translate-x-0 duration-300 z-20">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            list.appendChild(div);
        });

        if (store.goals.length === 0) {
            list.innerHTML = '<p class="text-sm text-slate-400 p-4 text-center">Nenhum gasto fixo definido.</p>';
        }

        this.updateChart(chartLabels, chartSpent, chartBudget);
    },

    updateChart(labels, spent, budget) {
        if (typeof Chart === 'undefined') return;
        const ctx = document.getElementById('goalsChart');
        if (!ctx) return;

        if (goalsChart) goalsChart.destroy();

        if (labels.length === 0) return;

        const isDark = document.documentElement.classList.contains('dark');
        const gridColor = isDark ? '#334155' : '#e2e8f0';
        const textColor = isDark ? '#94a3b8' : '#64748b';

        goalsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Gasto Atual', data: spent, backgroundColor: window.IS_PINK_THEME ? '#ec4899' : '#6366f1', borderRadius: 4 },
                    { label: 'Limite', data: budget, backgroundColor: isDark ? '#334155' : '#cbd5e1', borderRadius: 4 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    x: { grid: { display: false }, ticks: { color: textColor } },
                    y: { grid: { color: gridColor }, ticks: { color: textColor } }
                },
                plugins: { legend: { labels: { color: textColor, usePointStyle: true, boxWidth: 8 } } }
            }
        });
    }
};

window.removeGoal = async (cat) => {
    if(confirm(`Remover limite de ${cat}?`)) {
        const btnText = document.querySelector(`button[onclick="window.removeGoal('${cat}')"]`);
        if(btnText) btnText.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        await store.setCategoryGoal(cat, 0); 
        window.updateAllViews();
    }
};
