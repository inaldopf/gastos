import { store } from './store.js';

let evolutionChart = null;

const token = localStorage.getItem('token'); // ou o nome da sua chave
if (!token) {
    console.warn("🚫 Usuário não logado. Redirecionando...");
    window.location.href = '/login.html'; // Ajuste para o nome da sua página de login
}

export const Dashboard = {
    render() {
        const view = document.getElementById('viewDashboard');
        if (!view || view.classList.contains('hidden')) return;

        console.log("📊 Renderizando Dashboard...");
        
        this.updateCards();
        this.tryRenderChart();
        this.renderTopExpenses();
    },

    // Tenta renderizar o gráfico com persistência (caso o Chart.js demore a carregar)
    tryRenderChart(tentativas = 0) {
        if (typeof Chart === 'undefined') {
            if (tentativas < 10) {
                setTimeout(() => this.tryRenderChart(tentativas + 1), 300);
            }
            return;
        }
        this.renderEvolutionChart();
    },

    updateCards() {
        let totalRec = 0, totalDesp = 0, totalInv = 0;

        // Proteção contra dados nulos
        (store.transactions || []).forEach(t => {
            const val = parseFloat(t.amount) || 0;
            if (t.type === 'Receita') totalRec += val;
            else if (t.type === 'Despesa') totalDesp += val;
            else if (t.type === 'Investimento') totalInv += val;
        });

        const saldo = totalRec - totalDesp - totalInv;
        const percentSave = totalRec > 0 ? (totalInv / totalRec) * 100 : 0;

        const setElement = (id, text, colorClass) => {
            const el = document.getElementById(id);
            if (el) {
                el.innerText = text;
                if (colorClass) el.className = colorClass;
            }
        };

        setElement('dashBalance', `R$ ${saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, `text-3xl font-bold ${saldo >= 0 ? 'text-indigo-600' : 'text-red-500'}`);
        setElement('dashIncome', `R$ ${totalRec.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
        setElement('dashExpense', `R$ ${totalDesp.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
        setElement('dashInvest', `R$ ${totalInv.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${percentSave.toFixed(1)}%)`);
    },

    renderEvolutionChart() {
        const ctx = document.getElementById('evolutionChart');
        if (!ctx) return;

        const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const dataRec = new Array(12).fill(0);
        const dataDesp = new Array(12).fill(0);
        const dataInv = new Array(12).fill(0);
        const currentYear = new Date().getFullYear();

        (store.transactions || []).forEach(t => {
            if (!t.date) return;
            const parts = t.date.split('/');
            if (parts.length !== 3) return;

            const monthIndex = parseInt(parts[1]) - 1;
            const year = parseInt(parts[2]);

            if (year === currentYear && monthIndex >= 0 && monthIndex < 12) {
                const val = parseFloat(t.amount) || 0;
                if (t.type === 'Receita') dataRec[monthIndex] += val;
                else if (t.type === 'Despesa') dataDesp[monthIndex] += val;
                else if (t.type === 'Investimento') dataInv[monthIndex] += val;
            }
        });

        if (evolutionChart) evolutionChart.destroy();

        evolutionChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Receita',
                        data: dataRec,
                        backgroundColor: '#10B981', // Verde
                        borderRadius: 4
                    },
                    {
                        label: 'Investimento', // NOVA COLUNA
                        data: dataInv,
                        backgroundColor: '#3B82F6', // Azul
                        borderRadius: 4
                    },
                    {
                        label: 'Despesa',
                        data: dataDesp,
                        backgroundColor: '#EF4444', // Vermelho
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true } },
                plugins: { legend: { position: 'bottom' } }
            }
        });
    },

    renderTopExpenses() {
        const list = document.getElementById('topExpensesList');
        if (!list) return;

        list.innerHTML = '';
        const expenses = (store.transactions || []).filter(t => t.type === 'Despesa');
        const totals = {};

        expenses.forEach(t => {
            totals[t.category] = (totals[t.category] || 0) + parseFloat(t.amount);
        });

        Object.entries(totals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .forEach(([cat, val]) => {
                const li = document.createElement('li');
                li.className = "flex justify-between p-2 border-b text-sm";
                li.innerHTML = `<span>${cat}</span> <b>R$ ${val.toLocaleString('pt-BR')}</b>`;
                list.appendChild(li);
            });
    },

    async generateAIReport() {
        // ... (código da IA mantido igual, se necessário)
        alert("Gerando relatório...");
    }
};
