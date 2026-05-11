import { store } from './store.js';

let evolutionChart = null;
let dailyBalanceChart = null;
let rule503020Chart = null;
let rankExpensesChart = null;
let netWorthChart = null;

export const Dashboard = {
    render(selectedMonths = []) {
        const view = document.getElementById('viewDashboard');
        if (!view || view.classList.contains('hidden')) return;

        let filteredTrans = store.transactions;
        if (selectedMonths.length > 0) {
            filteredTrans = store.transactions.filter(t => selectedMonths.includes(t.month));
        }

        let income = 0, expense = 0, invest = 0;
        filteredTrans.forEach(t => {
            const val = parseFloat(t.amount || 0);
            if (t.type === 'Receita') income += val;
            else if (t.type === 'Despesa') expense += val;
            else if (t.type === 'Investimento') invest += val;
        });

        // 1. Atualizar Cards Superiores
        // NOTA: As classes "blur-target" já foram adicionadas diretamente no HTML desta aba!
        const elInc = document.getElementById('dashIncome');
        if (elInc) elInc.innerText = `R$ ${income.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;

        const elExp = document.getElementById('dashExpense');
        if (elExp) elExp.innerText = `R$ ${expense.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;

        const elInv = document.getElementById('dashInvest');
        if (elInv) elInv.innerText = `R$ ${invest.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;

        const elBal = document.getElementById('dashBalance');
        if (elBal) {
            const bal = income - expense - invest;
            elBal.innerText = `R$ ${bal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
            // Preserva tipografia da KPI bar; só troca a cor conforme sinal
            elBal.classList.remove('text-slate-900', 'dark:text-white', 'text-red-500');
            if (bal >= 0) {
                elBal.classList.add('text-slate-900', 'dark:text-white');
            } else {
                elBal.classList.add('text-red-500');
            }
        }

        // 2. Renderizar Gráficos
        this.renderDailyBalance(filteredTrans);
        this.renderEvolution(selectedMonths);
        this.render503020(income, expense, invest);
        this.renderRankExpenses(filteredTrans);
        this.renderNetWorth();
    },

    getCommonChartOptions(isDark) {
        const textColor = isDark ? '#94a3b8' : '#64748b';
        const gridColor = isDark ? '#334155' : '#e2e8f0';
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: textColor, usePointStyle: true, boxWidth: 8 } }
            },
            scales: {
                x: { ticks: { color: textColor }, grid: { display: false } },
                y: { ticks: { color: textColor }, grid: { color: gridColor } }
            }
        };
    },

    renderDailyBalance(transactions) {
        if (typeof Chart === 'undefined') return;
        const ctx = document.getElementById('dailyBalanceChart');
        if (!ctx) return;

        if (dailyBalanceChart) dailyBalanceChart.destroy();

        // Organizar por dia
        const dailyMap = {};
        transactions.forEach(t => {
            if (!t.date) return;
            const [d, m, y] = t.date.split('/');
            const dayKey = `${d}/${m}`;
            if (!dailyMap[dayKey]) dailyMap[dayKey] = 0;

            if (t.type === 'Receita') dailyMap[dayKey] += parseFloat(t.amount);
            else if (t.type === 'Despesa' || t.type === 'Investimento') dailyMap[dayKey] -= parseFloat(t.amount);
        });

        const sortedDays = Object.keys(dailyMap).sort((a, b) => {
            const [da, ma] = a.split('/'); const [db, mb] = b.split('/');
            return (parseInt(ma) - parseInt(mb)) || (parseInt(da) - parseInt(db));
        });

        const labels = [];
        const data = [];
        let acc = 0;

        sortedDays.forEach(day => {
            labels.push(day);
            acc += dailyMap[day];
            data.push(acc);
        });

        const isDark = document.documentElement.classList.contains('dark');
        const opts = this.getCommonChartOptions(isDark);
        opts.plugins.legend.display = false;

        dailyBalanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Saldo Acumulado',
                    data: data,
                    borderColor: window.IS_PINK_THEME ? '#ec4899' : '#6366f1',
                    backgroundColor: window.IS_PINK_THEME ? 'rgba(236, 72, 153, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 2
                }]
            },
            options: opts
        });
    },

    renderEvolution(selectedMonths) {
        if (typeof Chart === 'undefined') return;
        const ctx = document.getElementById('evolutionChart');
        if (!ctx) return;
        if (evolutionChart) evolutionChart.destroy();

        const months = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
        const labels = selectedMonths.length > 0 ? selectedMonths : [months[new Date().getMonth()]];

        const recData = [];
        const despData = [];

        labels.forEach(m => {
            const mTrans = store.transactions.filter(t => t.month === m);
            let mRec = 0, mDesp = 0;
            mTrans.forEach(t => {
                if (t.type === 'Receita') mRec += parseFloat(t.amount);
                else if (t.type === 'Despesa') mDesp += parseFloat(t.amount);
            });
            recData.push(mRec);
            despData.push(mDesp);
        });

        const isDark = document.documentElement.classList.contains('dark');
        
        evolutionChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels.map(l => l.substring(0, 3)),
                datasets: [
                    { label: 'Receitas', data: recData, backgroundColor: '#10b981', borderRadius: 4 },
                    { label: 'Despesas', data: despData, backgroundColor: '#ef4444', borderRadius: 4 }
                ]
            },
            options: this.getCommonChartOptions(isDark)
        });
    },

    render503020(income, expense, invest) {
        if (typeof Chart === 'undefined') return;
        const ctx = document.getElementById('rule503020Chart');
        if (!ctx) return;
        if (rule503020Chart) rule503020Chart.destroy();

        if (income === 0) return;

        const isDark = document.documentElement.classList.contains('dark');

        rule503020Chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Necessidades (Alvo 50%)', 'Desejos (Alvo 30%)', 'Investimentos (Alvo 20%)'],
                datasets: [{
                    data: [expense * 0.6, expense * 0.4, invest], // Estimativa simplificada (60/40 das despesas)
                    backgroundColor: [window.IS_PINK_THEME ? '#ec4899' : '#6366f1', '#f59e0b', '#10b981'],
                    borderColor: isDark ? '#1e293b' : '#ffffff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '70%',
                plugins: {
                    legend: { position: 'bottom', labels: { color: isDark ? '#94a3b8' : '#64748b', usePointStyle: true } }
                }
            }
        });
    },

    renderRankExpenses(transactions) {
        if (typeof Chart === 'undefined') return;
        const ctx = document.getElementById('rankExpensesChart');
        if (!ctx) return;
        if (rankExpensesChart) rankExpensesChart.destroy();

        const expenses = transactions.filter(t => t.type === 'Despesa');
        const catMap = {};
        expenses.forEach(t => {
            catMap[t.category] = (catMap[t.category] || 0) + parseFloat(t.amount);
        });

        const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const labels = sorted.map(i => i[0]);
        const data = sorted.map(i => i[1]);

        const isDark = document.documentElement.classList.contains('dark');
        const opts = this.getCommonChartOptions(isDark);
        opts.indexAxis = 'y'; // Barras horizontais

        rankExpensesChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Valor Gasto',
                    data: data,
                    backgroundColor: '#ef4444',
                    borderRadius: 4
                }]
            },
            options: opts
        });
    },

    renderNetWorth() {
        if (typeof Chart === 'undefined') return;
        const ctx = document.getElementById('netWorthChart');
        if (!ctx) return;
        if (netWorthChart) netWorthChart.destroy();

        // Patrimônio: Total Guardado nos Sonhos + Dinheiro a Receber de Devedores
        let totalDreams = 0;
        (store.objectives || []).forEach(o => totalDreams += parseFloat(o.current_amount || 0));

        let totalDebts = 0;
        (store.debtors || []).forEach(d => { if (!d.paid) totalDebts += parseFloat(d.amount || 0); });

        const isDark = document.documentElement.classList.contains('dark');

        netWorthChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Guardado (Sonhos)', 'A Receber (Empréstimos)'],
                datasets: [{
                    data: [totalDreams, totalDebts],
                    backgroundColor: ['#3b82f6', '#8b5cf6'],
                    borderColor: isDark ? '#1e293b' : '#ffffff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { color: isDark ? '#94a3b8' : '#64748b', usePointStyle: true } } }
            }
        });
    }
};
