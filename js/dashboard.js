import { store } from './store.js';

let evolutionChart = null;

export const Dashboard = {
    // Agora recebe a lista de meses selecionados
    render(selectedMonths = []) {
        const view = document.getElementById('viewDashboard');
        if (!view || view.classList.contains('hidden')) return;
        
        // Se nenhum mês vier, tenta pegar do seletor ou usa todos (fallback)
        if (!selectedMonths || selectedMonths.length === 0) {
             const allMonths = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
             const currentMonth = allMonths[new Date().getMonth()];
             selectedMonths = [currentMonth];
        }

        console.log("📊 Dashboard filtrado por:", selectedMonths);
        
        this.updateCards(selectedMonths);
        this.tryRenderChart(selectedMonths);
        this.renderTopExpenses(selectedMonths);
    },

    tryRenderChart(selectedMonths, tentativas = 0) {
        if (typeof Chart === 'undefined') {
            if (tentativas < 10) setTimeout(() => this.tryRenderChart(selectedMonths, tentativas + 1), 300);
            return;
        }
        this.renderEvolutionChart(selectedMonths);
    },

    // Filtra transações pelos meses selecionados
    getFilteredTransactions(selectedMonths) {
        const transactions = store.transactions || [];
        // Filtra onde t.month está dentro da lista selectedMonths
        return transactions.filter(t => selectedMonths.includes(t.month));
    },

    updateCards(selectedMonths) {
        const filtered = this.getFilteredTransactions(selectedMonths);
        let totalRec = 0, totalDesp = 0, totalInv = 0;

        filtered.forEach(t => {
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

    renderEvolutionChart(selectedMonths) {
        const ctx = document.getElementById('evolutionChart');
        if (!ctx) return;

        // Mapeamento para garantir a ordem cronológica
        const allMonths = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
        const shortMap = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        
        // Ordena os meses selecionados cronologicamente
        const sortedMonths = selectedMonths.sort((a, b) => allMonths.indexOf(a) - allMonths.indexOf(b));
        
        // Labels para o gráfico (ex: "Jan", "Fev")
        const labels = sortedMonths.map(m => shortMap[allMonths.indexOf(m)]);
        
        // Arrays de dados
        const dataRec = [], dataDesp = [], dataInv = [];

        // Preenche os dados para cada mês selecionado
        sortedMonths.forEach(m => {
            // Filtra transações daquele mês específico
            const transInMonth = (store.transactions || []).filter(t => t.month === m);
            
            let rec = 0, desp = 0, inv = 0;
            transInMonth.forEach(t => {
                const val = parseFloat(t.amount) || 0;
                if (t.type === 'Receita') rec += val;
                else if (t.type === 'Despesa') desp += val;
                else if (t.type === 'Investimento') inv += val;
            });
            
            dataRec.push(rec);
            dataDesp.push(desp);
            dataInv.push(inv);
        });

        if (evolutionChart) evolutionChart.destroy();

        // (Mantém o estilo Glass que fizemos antes)
        const ctx2d = ctx.getContext('2d');
        const gradRec = ctx2d.createLinearGradient(0, 0, 0, 400); gradRec.addColorStop(0, '#34D399'); gradRec.addColorStop(1, '#059669');
        const gradInv = ctx2d.createLinearGradient(0, 0, 0, 400); gradInv.addColorStop(0, '#60A5FA'); gradInv.addColorStop(1, '#2563EB');
        const gradDesp = ctx2d.createLinearGradient(0, 0, 0, 400); gradDesp.addColorStop(0, '#F87171'); gradDesp.addColorStop(1, '#DC2626');

        evolutionChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Receita', data: dataRec, backgroundColor: gradRec, borderRadius: 6, barPercentage: 0.85, categoryPercentage: 0.85 },
                    { label: 'Investimento', data: dataInv, backgroundColor: gradInv, borderRadius: 6, barPercentage: 0.85, categoryPercentage: 0.85 },
                    { label: 'Despesa', data: dataDesp, backgroundColor: gradDesp, borderRadius: 6, barPercentage: 0.85, categoryPercentage: 0.85 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(200, 200, 200, 0.3)', borderDash: [5, 5], drawBorder: false } },
                    x: { grid: { display: false } }
                },
                plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, padding: 20 } } }
            }
        });
    },

    renderTopExpenses(selectedMonths) {
        const list = document.getElementById('topExpensesList');
        if (!list) return;
        list.innerHTML = '';
        
        const filtered = this.getFilteredTransactions(selectedMonths);
        const expenses = filtered.filter(t => t.type === 'Despesa');
        
        const totals = {};
        expenses.forEach(t => totals[t.category] = (totals[t.category] || 0) + parseFloat(t.amount));

        Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([cat, val]) => {
            const li = document.createElement('li');
            li.className = "flex justify-between items-center p-3 bg-white/50 border border-slate-100 rounded-xl text-sm mb-2 hover:bg-white transition shadow-sm";
            li.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-500 text-xs"><i class="fas fa-shopping-bag"></i></div>
                    <span class="font-bold text-slate-700">${cat}</span> 
                </div>
                <span class="font-bold text-slate-600">R$ ${val.toLocaleString('pt-BR')}</span>
            `;
            list.appendChild(li);
        });
        if (expenses.length === 0) list.innerHTML = '<p class="text-center text-slate-400 text-xs py-4">Sem dados nestes meses.</p>';
    },
    
    async generateAIReport() { /* ...Mantido Igual... */ }
};
