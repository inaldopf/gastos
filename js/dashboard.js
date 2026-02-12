import { store } from './store.js';

let evolutionChart = null; // Variável para guardar a instância do gráfico

export const Dashboard = {
    render() {
        // 1. Só desenha se a tela estiver visível
        const view = document.getElementById('viewDashboard');
        if (!view || view.classList.contains('hidden')) return;

        console.log("📊 Renderizando Dashboard...");
        
        this.updateCards();
        
        // 2. Tenta desenhar o gráfico com proteção
        this.tryRenderChart();
        
        this.renderTopExpenses();
    },

    // --- FUNÇÃO DE AUTO-RECUPERAÇÃO ---
    tryRenderChart(tentativas = 0) {
        // Se a biblioteca Chart.js não existe ainda
        if (typeof Chart === 'undefined') {
            if (tentativas < 5) {
                console.warn(`Chart.js ainda não carregou. Tentando de novo em 500ms... (${tentativas + 1}/5)`);
                setTimeout(() => this.tryRenderChart(tentativas + 1), 500);
            } else {
                console.error("ERRO: A biblioteca Chart.js não foi encontrada. Verifique o index.html");
            }
            return;
        }

        // Se carregou, desenha!
        this.renderEvolutionChart();
    },

    // --- 1. CARDS DO TOPO ---
    updateCards() {
        let totalRec = 0;
        let totalDesp = 0;
        let totalInv = 0;

        store.transactions.forEach(t => {
            if (t.type === 'Receita') totalRec += t.amount;
            else if (t.type === 'Despesa') totalDesp += t.amount;
            else if (t.type === 'Investimento') totalInv += t.amount;
        });

        const saldo = totalRec - totalDesp - totalInv;
        const percentSave = totalRec > 0 ? (totalInv / totalRec) * 100 : 0;

        // Atualiza HTML com segurança (verifica se o elemento existe)
        const elBalance = document.getElementById('dashBalance');
        if(elBalance) {
            elBalance.innerText = `R$ ${saldo.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
            elBalance.className = `text-3xl font-bold ${saldo >= 0 ? 'text-indigo-600' : 'text-red-500'}`;
        }
        
        const elIncome = document.getElementById('dashIncome');
        if(elIncome) elIncome.innerText = `R$ ${totalRec.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
        
        const elExpense = document.getElementById('dashExpense');
        if(elExpense) elExpense.innerText = `R$ ${totalDesp.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
        
        const elInvest = document.getElementById('dashInvest');
        if(elInvest) elInvest.innerText = `R$ ${totalInv.toLocaleString('pt-BR', {minimumFractionDigits: 2})} (${percentSave.toFixed(1)}%)`;
    },

    // --- 2. GRÁFICO DE EVOLUÇÃO (3 COLUNAS) ---
    renderEvolutionChart() {
        const ctx = document.getElementById('evolutionChart');
        if (!ctx) {
            console.error("Canvas 'evolutionChart' não encontrado no HTML");
            return;
        }

        // Prepara dados (Agrupa por mês do ano atual)
        const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const dataRec = new Array(12).fill(0);
        const dataDesp = new Array(12).fill(0);
        const dataInv = new Array(12).fill(0);

        const currentYear = new Date().getFullYear();

        store.transactions.forEach(t => {
            if (!t.date) return;
            const parts = t.date.split('/');
            if (parts.length !== 3) return;

            const monthIndex = parseInt(parts[1]) - 1; 
            const year = parseInt(parts[2]);

            if (year === currentYear) {
                if (t.type === 'Receita') dataRec[monthIndex] += t.amount;
                else if (t.type === 'Despesa') dataDesp[monthIndex] += t.amount;
                else if (t.type === 'Investimento') dataInv[monthIndex] += t.amount;
            }
        });

        // Destrói gráfico anterior se existir (evita sobreposição)
        if (evolutionChart) {
            evolutionChart.destroy();
        }

        // Cria novo gráfico
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
                        label: 'Investimento',
                        data: dataInv,
                        backgroundColor: '#3B82F6', // Azul (NOVO)
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
                plugins: {
                    legend: { position: 'bottom' }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    },

    // --- 3. TOP DESPESAS ---
    renderTopExpenses() {
        const list = document.getElementById('topExpensesList');
        if (!list) return;

        list.innerHTML = '';
        const expenses = store.transactions.filter(t => t.type === 'Despesa');
        const totals = {};
        
        expenses.forEach(t => {
            totals[t.category] = (totals[t.category] || 0) + t.amount;
        });

        const sorted = Object.entries(totals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        sorted.forEach(([cat, val]) => {
            const li = document.createElement('li');
            li.className = "flex justify-between p-2 border-b text-sm";
            li.innerHTML = `<span>${cat}</span> <b>R$ ${val.toLocaleString('pt-BR')}</b>`;
            list.appendChild(li);
        });
    },
    
    // --- 4. IA REPORT (MANTIDO) ---
    async generateAIReport() {
        const btn = document.getElementById('btnGenerateReport');
        if(!btn) return;
        /* Lógica da IA mantida igual ao anterior... */
        alert("Função de IA aqui (código abreviado para focar no gráfico).");
    }
};
