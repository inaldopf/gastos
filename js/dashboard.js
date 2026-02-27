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
        
        if (!selectedMonths || selectedMonths.length === 0) {
             const allMonths = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
             const currentMonth = allMonths[new Date().getMonth()];
             selectedMonths = [currentMonth];
        }

        console.log("📊 Dashboard filtrado por:", selectedMonths);
        
        this.updateCards(selectedMonths);
        this.tryRenderCharts(selectedMonths);
    },

    tryRenderCharts(selectedMonths, tentativas = 0) {
        if (typeof Chart === 'undefined') {
            if (tentativas < 10) setTimeout(() => this.tryRenderCharts(selectedMonths, tentativas + 1), 300);
            return;
        }
        
        // Configuração global para Dark Mode do Chart.js
        const isDark = document.documentElement.classList.contains('dark');
        Chart.defaults.color = isDark ? '#94a3b8' : '#64748b';
        Chart.defaults.borderColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

        this.renderEvolutionChart(selectedMonths);
        this.renderDailyBalanceChart(selectedMonths);
        this.render503020Chart(selectedMonths);
        this.renderRankExpensesChart(selectedMonths);
        this.renderNetWorthChart();
    },

    getFilteredTransactions(selectedMonths) {
        const transactions = store.transactions || [];
        return transactions.filter(t => selectedMonths.includes(t.month));
    },

    updateCards(selectedMonths) {
        const transactions = store.transactions || [];
        const allMonths = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
        
        let maxMonthIndex = -1;
        selectedMonths.forEach(m => {
            const idx = allMonths.indexOf(m);
            if(idx > maxMonthIndex) maxMonthIndex = idx;
        });

        let accumulatedBalance = 0;
        transactions.forEach(t => {
            const tMonthIndex = allMonths.indexOf(t.month);
            if (tMonthIndex <= maxMonthIndex && tMonthIndex !== -1) {
                 const val = parseFloat(t.amount) || 0;
                 if (t.type === 'Receita') accumulatedBalance += val;
                 else if (t.type === 'Despesa') accumulatedBalance -= val;
                 else if (t.type === 'Investimento') accumulatedBalance -= val; // Investimento sai do saldo livre
            }
        });

        const filtered = this.getFilteredTransactions(selectedMonths);
        let periodRec = 0, periodDesp = 0, periodInv = 0;

        filtered.forEach(t => {
            const val = parseFloat(t.amount) || 0;
            if (t.type === 'Receita') periodRec += val;
            else if (t.type === 'Despesa') periodDesp += val;
            else if (t.type === 'Investimento') periodInv += val;
        });

        const setElement = (id, text, colorClass) => {
            const el = document.getElementById(id);
            if (el) {
                el.innerText = text;
                if (colorClass) el.className = colorClass;
            }
        };

        setElement('dashBalance', `R$ ${accumulatedBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, `text-xl font-bold ${accumulatedBalance >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-600 dark:text-red-400'}`);
        setElement('dashIncome', `R$ ${periodRec.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
        setElement('dashExpense', `R$ ${periodDesp.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
        setElement('dashInvest', `R$ ${periodInv.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    },

    // 1. Gráfico: Evolução Mensal (Barras Empilhadas/Lado a Lado)
    renderEvolutionChart(selectedMonths) {
        const ctx = document.getElementById('evolutionChart');
        if (!ctx) return;

        const allMonths = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
        const shortMap = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        
        const sortedMonths = selectedMonths.sort((a, b) => allMonths.indexOf(a) - allMonths.indexOf(b));
        const labels = sortedMonths.map(m => shortMap[allMonths.indexOf(m)]);
        const dataRec = [], dataDesp = [], dataInv = [];

        sortedMonths.forEach(m => {
            const transInMonth = (store.transactions || []).filter(t => t.month === m);
            let rec = 0, desp = 0, inv = 0;
            transInMonth.forEach(t => {
                const val = parseFloat(t.amount) || 0;
                if (t.type === 'Receita') rec += val;
                else if (t.type === 'Despesa') desp += val;
                else if (t.type === 'Investimento') inv += val;
            });
            dataRec.push(rec); dataDesp.push(desp); dataInv.push(inv);
        });

        if (evolutionChart) evolutionChart.destroy();
        const ctx2d = ctx.getContext('2d');
        const gradRec = ctx2d.createLinearGradient(0, 0, 0, 400); gradRec.addColorStop(0, '#34D399'); gradRec.addColorStop(1, '#059669');
        const gradInv = ctx2d.createLinearGradient(0, 0, 0, 400); gradInv.addColorStop(0, '#60A5FA'); gradInv.addColorStop(1, '#2563EB');
        const gradDesp = ctx2d.createLinearGradient(0, 0, 0, 400); gradDesp.addColorStop(0, '#F87171'); gradDesp.addColorStop(1, '#DC2626');

        evolutionChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Receita', data: dataRec, backgroundColor: gradRec, borderRadius: 4 },
                    { label: 'Investido', data: dataInv, backgroundColor: gradInv, borderRadius: 4 },
                    { label: 'Despesa', data: dataDesp, backgroundColor: gradDesp, borderRadius: 4 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { borderDash: [5, 5] } },
                    x: { grid: { display: false } }
                },
                plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } } }
            }
        });
    },

    // 2. Gráfico: Curva de Saldo Diário
    renderDailyBalanceChart(selectedMonths) {
        const ctx = document.getElementById('dailyBalanceChart');
        if (!ctx) return;

        const allMonths = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
        
        // Pega sempre o último mês selecionado para desenhar a curva
        const targetMonth = selectedMonths[selectedMonths.length - 1];
        const monthIndex = allMonths.indexOf(targetMonth);
        
        // 1. Calcular Saldo Inicial até o início deste mês
        let initialBalance = 0;
        const transactions = store.transactions || [];
        transactions.forEach(t => {
            const tMonthIdx = allMonths.indexOf(t.month);
            if (tMonthIdx < monthIndex && tMonthIdx !== -1) {
                 const val = parseFloat(t.amount) || 0;
                 if (t.type === 'Receita') initialBalance += val;
                 else initialBalance -= val;
            }
        });

        // 2. Separar as transações do mês alvo por dia
        const monthTrans = transactions.filter(t => t.month === targetMonth);
        
        const daysInMonth = new Date(new Date().getFullYear(), monthIndex + 1, 0).getDate();
        const labels = Array.from({length: daysInMonth}, (_, i) => i + 1);
        const dataBalance = [];
        
        let currentBalance = initialBalance;

        for (let day = 1; day <= daysInMonth; day++) {
            // Filtra as transações desse dia específico (assumindo formato DD/MM/YYYY)
            const dayTrans = monthTrans.filter(t => {
                if(!t.date) return false;
                const d = parseInt(t.date.split('/')[0], 10);
                return d === day;
            });

            dayTrans.forEach(t => {
                const val = parseFloat(t.amount) || 0;
                if (t.type === 'Receita') currentBalance += val;
                else currentBalance -= val;
            });

            dataBalance.push(currentBalance);
        }

        if (dailyBalanceChart) dailyBalanceChart.destroy();
        const ctx2d = ctx.getContext('2d');
        const gradient = ctx2d.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.5)'); // Indigo
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

        dailyBalanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Saldo no Dia (R$)',
                    data: dataBalance,
                    borderColor: '#6366F1',
                    backgroundColor: gradient,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 0,
                    pointHoverRadius: 5
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    y: { grid: { borderDash: [5, 5] } },
                    x: { grid: { display: false } }
                },
                plugins: { legend: { display: false } }
            }
        });
    },

    // 3. Gráfico: Regra 50/30/20
    render503020Chart(selectedMonths) {
        const ctx = document.getElementById('rule503020Chart');
        if (!ctx) return;

        const filtered = this.getFilteredTransactions(selectedMonths);
        
        const catEssenciais = ['Aluguel', 'Condomínio', 'Luz', 'Água', 'Internet / TV', 'Gás', 'Telefone / Celular', 'Supermercado', 'Feira / Padaria', 'Comida', 'Combustível', 'Ônibus / Metrô', 'Médico / Hospital', 'Farmácia', 'Material Escolar', 'Impostos', 'Pets', 'Seguros'];
        const catFuturo = ['Investimento', 'Objetivo'];
        
        let essenciais = 0, estilo = 0, futuro = 0;

        filtered.forEach(t => {
            const val = parseFloat(t.amount) || 0;
            if (t.type === 'Despesa') {
                if (catEssenciais.includes(t.category)) essenciais += val;
                else estilo += val; // Tudo que não é essencial vai pra estilo de vida
            } else if (t.type === 'Investimento' || catFuturo.includes(t.category)) {
                futuro += val;
            }
        });

        if (rule503020Chart) rule503020Chart.destroy();

        rule503020Chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['50% Essenciais', '30% Estilo de Vida', '20% Futuro'],
                datasets: [{
                    data: [essenciais, estilo, futuro],
                    backgroundColor: ['#F59E0B', '#EC4899', '#3B82F6'], // Yellow, Pink, Blue
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '70%',
                plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } } }
            }
        });
    },

    // 4. Gráfico: Ranking de Despesas
    renderRankExpensesChart(selectedMonths) {
        const ctx = document.getElementById('rankExpensesChart');
        if (!ctx) return;

        const filtered = this.getFilteredTransactions(selectedMonths);
        const expenses = filtered.filter(t => t.type === 'Despesa');
        
        const totals = {};
        expenses.forEach(t => totals[t.category] = (totals[t.category] || 0) + parseFloat(t.amount));

        // Pega o Top 7
        const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 7);
        const labels = sorted.map(i => i[0]);
        const data = sorted.map(i => i[1]);

        if (rankExpensesChart) rankExpensesChart.destroy();

        rankExpensesChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Gasto no Período',
                    data: data,
                    backgroundColor: '#EF4444', // Red 500
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y', // Isso faz o gráfico ser horizontal
                responsive: true, maintainAspectRatio: false,
                scales: {
                    x: { beginAtZero: true, grid: { borderDash: [5, 5] } },
                    y: { grid: { display: false } }
                },
                plugins: { legend: { display: false } }
            }
        });
    },

    // 5. Gráfico: Panorama do Patrimônio
    renderNetWorthChart() {
        const ctx = document.getElementById('netWorthChart');
        if (!ctx) return;

        // Calcula Saldo Atual Geral
        let saldoLivre = 0;
        (store.transactions || []).forEach(t => {
            const val = parseFloat(t.amount) || 0;
            if (t.type === 'Receita') saldoLivre += val; else saldoLivre -= val;
        });

        // Sonhos (Dinheiro Guardado)
        let sonhosGuardado = 0;
        (store.objectives || []).forEach(o => sonhosGuardado += parseFloat(o.current_amount || 0));

        // VA
        const vaSaldo = store.vaBalance || 0;

        // Dinheiro na Rua (Dívidas a receber)
        let dividasReceber = 0;
        (store.debtors || []).forEach(d => {
            if (!d.paid) dividasReceber += parseFloat(d.amount || 0);
        });

        if (netWorthChart) netWorthChart.destroy();

        netWorthChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Saldo Livre (Conta)', 'Sonhos (Investido)', 'Vale Alimentação', 'Dívidas a Receber'],
                datasets: [{
                    data: [saldoLivre, sonhosGuardado, vaSaldo, dividasReceber],
                    backgroundColor: ['#6366F1', '#8B5CF6', '#F59E0B', '#10B981'], 
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8 } } }
            }
        });
    },
    
    async generateAIReport() {
        // Futura implementação
        alert("O relatório da IA analisará esses novos gráficos na próxima atualização!");
    }
};
