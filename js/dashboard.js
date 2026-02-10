import { store } from './store.js';
import { getFinancialAdvice } from './ai.js';

let barChartInstance = null;
let donutChartInstance = null;

export const Dashboard = {
    render() {
        const metrics = this.calculateMetrics();
        // Renderiza gráficos apenas se o canvas existir na tela
        if(document.getElementById('barChart')) {
            this.renderCharts();
        }
        this.renderMeta(metrics.balance);
    },

    calculateMetrics() {
        const transactions = store.transactions;
        let income = 0, expenses = 0, invested = 0;

        transactions.forEach(t => {
            const val = parseFloat(t.amount); // Garante que é número
            if (t.type === 'Receita') income += val;
            if (t.type === 'Despesa') expenses += val;
            if (t.type === 'Investimento') invested += val;
        });

        const savings = income > 0 ? ((invested + (income - expenses - invested)) / income) * 100 : 0;
        
        // Atualiza texto da taxa na tela
        const savingsEl = document.getElementById('savingsRate');
        if(savingsEl) savingsEl.innerText = `${savings.toFixed(1)}%`;
        
        return {
            balance: (income - expenses - invested).toFixed(2),
            invested: invested.toFixed(2),
            expenses: expenses.toFixed(2),
            savingsRate: savings.toFixed(1)
        };
    },

    renderMeta(currentBalanceStr) {
        const metaInput = document.getElementById('inputMeta');
        const progressBar = document.getElementById('metaProgressBar');
        const statusText = document.getElementById('metaStatusText');

        if (!metaInput || !progressBar || !statusText) return;

        // Recupera valores e força conversão para número
        const metaValue = parseFloat(store.getMeta()) || 0;
        const currentBalance = parseFloat(currentBalanceStr) || 0;

        // Se o input estiver vazio (ex: reload da página), preenche com o valor salvo
        if (metaInput.value === "") metaInput.value = metaValue > 0 ? metaValue : "";

        // Lógica da Barra
        let progress = 0;
        if (metaValue > 0) {
            progress = (currentBalance / metaValue) * 100;
        }

        // Limita visualmente entre 0% e 100%
        const visualProgress = Math.min(Math.max(progress, 0), 100);
        progressBar.style.width = `${visualProgress}%`;

        // Textos e Cores
        if (currentBalance >= metaValue && metaValue > 0) {
            statusText.innerText = `Meta Batida! (R$ ${currentBalance.toLocaleString('pt-BR')} disponíveis)`;
            statusText.className = "text-xs font-bold text-emerald-600";
            progressBar.className = "bg-emerald-500 h-2 rounded-full transition-all duration-500";
        } else {
            const falta = metaValue - currentBalance;
            // Se o saldo for negativo ou zero
            if (currentBalance <= 0) {
                 statusText.innerText = "Saldo zerado ou negativo";
                 progressBar.className = "bg-red-500 h-2 rounded-full transition-all duration-500";
            } else {
                 statusText.innerText = `${progress.toFixed(0)}% (Faltam R$ ${falta.toLocaleString('pt-BR')})`;
                 progressBar.className = "bg-indigo-500 h-2 rounded-full transition-all duration-500";
            }
        }
    },

    renderCharts() {
        const transactions = store.transactions;
        const ctxBar = document.getElementById('barChart')?.getContext('2d');
        const ctxDonut = document.getElementById('topExpensesChart')?.getContext('2d');

        if (!ctxBar || !ctxDonut) return;

        // 1. Gráfico de Barras
        const months = {};
        transactions.forEach(t => {
            if (!months[t.month]) months[t.month] = { income: 0, expense: 0 };
            if (t.type === 'Receita') months[t.month].income += parseFloat(t.amount);
            if (t.type === 'Despesa') months[t.month].expense += parseFloat(t.amount);
        });

        const labels = Object.keys(months);
        // Ordenar meses cronologicamente seria ideal, mas vamos manter simples por ordem de inserção ou alfabética por enquanto
        const incomeData = labels.map(m => months[m].income);
        const expenseData = labels.map(m => months[m].expense);

        if (barChartInstance) barChartInstance.destroy();
        barChartInstance = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Entradas', data: incomeData, backgroundColor: '#10b981', borderRadius: 4 },
                    { label: 'Saídas', data: expenseData, backgroundColor: '#ef4444', borderRadius: 4 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });

        // 2. Gráfico de Rosca (Top 5)
        const categories = {};
        transactions.filter(t => t.type === 'Despesa').forEach(t => {
            categories[t.category] = (categories[t.category] || 0) + parseFloat(t.amount);
        });

        const sortedCats = Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 5);
        
        if (donutChartInstance) donutChartInstance.destroy();
        donutChartInstance = new Chart(ctxDonut, {
            type: 'doughnut',
            data: {
                labels: sortedCats.map(i => i[0]),
                datasets: [{
                    data: sortedCats.map(i => i[1]),
                    backgroundColor: ['#6366f1', '#ec4899', '#f59e0b', '#3b82f6', '#8b5cf6'],
                    borderWidth: 0
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'right' } } }
        });

        return sortedCats.map(i => `${i[0]} (R$ ${i[1].toFixed(0)})`).join(', ');
    },

    async generateAIReport() {
        const metrics = this.calculateMetrics();
        const topCats = this.renderCharts(); 
        const meta = store.getMeta();
        const apiKey = localStorage.getItem('gemini_api_key');

        if (!apiKey) return alert("Configure a API Key primeiro!");

        const btn = document.getElementById('btnGenerateReport');
        const area = document.getElementById('aiResponseArea');
        const text = document.getElementById('aiTextContent');

        btn.innerText = "IA Analisando...";
        btn.disabled = true;

        try {
            const advice = await getFinancialAdvice({
                ...metrics,
                topCategories: topCats,
                meta: meta
            }, apiKey);

            area.classList.remove('hidden');
            text.innerText = advice;
        } catch (error) {
            alert("Erro na IA: " + error.message);
        } finally {
            btn.innerText = "Gerar Relatório Financeiro";
            btn.disabled = false;
        }
    }
};