import { store } from './store.js';

let evolutionChart = null; // Variável para guardar o gráfico de barras

// NOTA: A verificação de login foi removida daqui pois o app.js já faz isso.

export const Dashboard = {
    render() {
        const view = document.getElementById('viewDashboard');
        // Só renderiza se a view existir e estiver visível
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
                // Tenta de novo em 300ms se a biblioteca não carregou
                setTimeout(() => this.tryRenderChart(tentativas + 1), 300);
            }
            return;
        }
        this.renderEvolutionChart();
    },

    // --- 1. CARDS DO TOPO ---
    updateCards() {
        let totalRec = 0, totalDesp = 0, totalInv = 0;

        // Proteção contra dados nulos
        const transactions = store.transactions || [];

        transactions.forEach(t => {
            const val = parseFloat(t.amount) || 0;
            if (t.type === 'Receita') totalRec += val;
            else if (t.type === 'Despesa') totalDesp += val;
            else if (t.type === 'Investimento') totalInv += val;
        });

        const saldo = totalRec - totalDesp - totalInv;
        // Evita divisão por zero
        const percentSave = totalRec > 0 ? (totalInv / totalRec) * 100 : 0;

        // Função auxiliar para atualizar texto e cor com segurança
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

    // --- 2. GRÁFICO DE BARRAS (3 COLUNAS) ---
    renderEvolutionChart() {
        const ctx = document.getElementById('evolutionChart');
        if (!ctx) return;

        const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const dataRec = new Array(12).fill(0);
        const dataDesp = new Array(12).fill(0);
        const dataInv = new Array(12).fill(0);
        
        // Pega ano atual
        const currentYear = new Date().getFullYear();
        const transactions = store.transactions || [];

        transactions.forEach(t => {
            if (!t.date) return;
            const parts = t.date.split('/');
            // Garante formato DD/MM/AAAA
            if (parts.length !== 3) return;

            const monthIndex = parseInt(parts[1]) - 1; // 0 = Jan
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
                        borderRadius: 4,
                        barPercentage: 0.6
                    },
                    {
                        label: 'Investimento',
                        data: dataInv,
                        backgroundColor: '#3B82F6', // Azul
                        borderRadius: 4,
                        barPercentage: 0.6
                    },
                    {
                        label: 'Despesa',
                        data: dataDesp,
                        backgroundColor: '#EF4444', // Vermelho
                        borderRadius: 4,
                        barPercentage: 0.6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { borderDash: [5, 5] }
                    },
                    x: {
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    },

    // --- 3. TOP DESPESAS ---
    renderTopExpenses() {
        const list = document.getElementById('topExpensesList');
        if (!list) return;

        list.innerHTML = '';
        const transactions = store.transactions || [];
        const expenses = transactions.filter(t => t.type === 'Despesa');
        
        const totals = {};
        expenses.forEach(t => {
            totals[t.category] = (totals[t.category] || 0) + parseFloat(t.amount);
        });

        // Ordena do maior para o menor e pega top 5
        Object.entries(totals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .forEach(([cat, val]) => {
                const li = document.createElement('li');
                li.className = "flex justify-between items-center p-3 bg-slate-50 rounded-lg text-sm mb-2";
                li.innerHTML = `
                    <span class="font-bold text-slate-700">${cat}</span> 
                    <span class="font-bold text-red-500">R$ ${val.toLocaleString('pt-BR')}</span>
                `;
                list.appendChild(li);
            });
            
        if (expenses.length === 0) {
            list.innerHTML = '<p class="text-center text-slate-400 text-xs py-4">Sem despesas registradas.</p>';
        }
    },

    // --- 4. RELATÓRIO IA ---
    async generateAIReport() {
        const btn = document.getElementById('btnGenerateReport');
        const content = document.getElementById('aiTextContent');
        const area = document.getElementById('aiResponseArea');
        
        if (!store.getToken()) return alert("Faça login.");
        
        const apiKey = localStorage.getItem('gemini_api_key');
        if (!apiKey) return alert("Configure sua API Key no ícone de chave (⚙️) primeiro.");

        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analisando...';
        area.classList.remove('hidden');
        content.innerHTML = 'Conectando ao cérebro da IA...';

        try {
            // Importa função da IA dinamicamente ou do arquivo ai.js se já importado no app
            // Aqui vamos assumir que o módulo ai.js exporta getFinancialAdvice
            const { getFinancialAdvice } = await import('./ai.js');
            
            // Prepara dados para a IA
            const transactions = store.transactions || [];
            let totalInv = 0, totalDesp = 0, totalRec = 0;
            const catTotals = {};

            transactions.forEach(t => {
                const val = parseFloat(t.amount);
                if (t.type === 'Investimento') totalInv += val;
                if (t.type === 'Despesa') {
                    totalDesp += val;
                    catTotals[t.category] = (catTotals[t.category] || 0) + val;
                }
                if (t.type === 'Receita') totalRec += val;
            });

            const topCats = Object.entries(catTotals)
                .sort((a,b) => b[1] - a[1])
                .slice(0,3)
                .map(i => i[0])
                .join(", ");

            const savingsRate = totalRec > 0 ? ((totalInv/totalRec)*100).toFixed(1) : 0;

            const summary = {
                balance: (totalRec - totalDesp - totalInv).toFixed(2),
                invested: totalInv.toFixed(2),
                expenses: totalDesp.toFixed(2),
                topCategories: topCats || "Nenhuma",
                savingsRate: savingsRate
            };

            const advice = await getFinancialAdvice(summary, apiKey);
            
            // Formata Markdown básico para HTML simples
            const formattedAdvice = advice
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Negrito
                .replace(/\n/g, '<br>'); // Quebra de linha

            content.innerHTML = formattedAdvice;

        } catch (error) {
            console.error(error);
            content.innerText = "Erro ao gerar relatório: " + error.message;
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Gerar Relatório Financeiro';
        }
    }
};
