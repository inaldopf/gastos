import { store } from './store.js';

let evolutionChart = null; // Variável para guardar o gráfico de barras

export const Dashboard = {
    render() {
        const view = document.getElementById('viewDashboard');
        if (view.classList.contains('hidden')) return;

        console.log("📊 Renderizando Dashboard...");
        
        this.updateCards();
        this.renderEvolutionChart();
        this.renderTopExpenses();
    },

    // --- 1. CARDS DO TOPO (RESUMO GERAL) ---
    updateCards() {
        // Zera contadores
        let totalRec = 0;
        let totalDesp = 0;
        let totalInv = 0;

        // Soma tudo (sem filtro de mês, resumo global ou anual)
        // Se quiser filtrar pelo ano atual, pode adicionar filtro aqui.
        store.transactions.forEach(t => {
            if (t.type === 'Receita') totalRec += t.amount;
            else if (t.type === 'Despesa') totalDesp += t.amount;
            else if (t.type === 'Investimento') totalInv += t.amount;
        });

        const saldo = totalRec - totalDesp - totalInv;
        const percentSave = totalRec > 0 ? (totalInv / totalRec) * 100 : 0;

        // Atualiza HTML
        document.getElementById('dashBalance').innerText = `R$ ${saldo.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
        document.getElementById('dashIncome').innerText = `R$ ${totalRec.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
        document.getElementById('dashExpense').innerText = `R$ ${totalDesp.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
        document.getElementById('dashInvest').innerText = `R$ ${totalInv.toLocaleString('pt-BR', {minimumFractionDigits: 2})} (${percentSave.toFixed(1)}%)`;
        
        // Cores dinâmicas
        document.getElementById('dashBalance').className = `text-3xl font-bold ${saldo >= 0 ? 'text-indigo-600' : 'text-red-500'}`;
    },

    // --- 2. GRÁFICO DE EVOLUÇÃO (BARRAS) - AQUI ESTÁ A MUDANÇA ---
    renderEvolutionChart() {
        const ctx = document.getElementById('evolutionChart');
        if (!ctx) return;

        // Prepara os dados por mês (Jan a Dez)
        const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const dataRec = new Array(12).fill(0);
        const dataDesp = new Array(12).fill(0);
        const dataInv = new Array(12).fill(0);

        // Pega o ano atual para não misturar dados de 2024 com 2025
        const currentYear = new Date().getFullYear();

        store.transactions.forEach(t => {
            // Converte data "DD/MM/YYYY" para pegar o mês e ano
            const parts = t.date.split('/');
            const monthIndex = parseInt(parts[1]) - 1; // 0 = Jan
            const year = parseInt(parts[2]);

            if (year === currentYear) {
                if (t.type === 'Receita') dataRec[monthIndex] += t.amount;
                else if (t.type === 'Despesa') dataDesp[monthIndex] += t.amount;
                else if (t.type === 'Investimento') dataInv[monthIndex] += t.amount;
            }
        });

        // Se o gráfico já existe, destrói para recriar
        if (evolutionChart) evolutionChart.destroy();

        evolutionChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Receita',
                        data: dataRec,
                        backgroundColor: '#10B981', // Verde Esmeralda
                        borderRadius: 4,
                        barPercentage: 0.6
                    },
                    {
                        label: 'Investimento',
                        data: dataInv,
                        backgroundColor: '#3B82F6', // Azul Real (NOVO)
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
                        grid: { borderDash: [5, 5], color: '#e2e8f0' },
                        ticks: { font: { family: "'Plus Jakarta Sans', sans-serif" } }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { font: { family: "'Plus Jakarta Sans', sans-serif" } }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { usePointStyle: true, boxWidth: 8 }
                    },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                return ` ${context.dataset.label}: R$ ${context.raw.toLocaleString('pt-BR')}`;
                            }
                        }
                    }
                }
            }
        });
    },

    // --- 3. TOP DESPESAS (LISTA LATERAL) ---
    renderTopExpenses() {
        const list = document.getElementById('topExpensesList');
        if (!list) return;

        list.innerHTML = '';

        // Filtra só despesas
        const expenses = store.transactions.filter(t => t.type === 'Despesa');

        // Agrupa por categoria
        const totals = {};
        expenses.forEach(t => {
            totals[t.category] = (totals[t.category] || 0) + t.amount;
        });

        // Transforma em array e ordena (Maior para menor)
        const sorted = Object.entries(totals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5); // Pega Top 5

        sorted.forEach(([cat, val]) => {
            // Calcula porcentagem em relação ao total de despesas
            const totalExp = expenses.reduce((acc, t) => acc + t.amount, 0);
            const percent = totalExp > 0 ? (val / totalExp) * 100 : 0;

            const li = document.createElement('li');
            li.className = "flex items-center justify-between p-3 bg-slate-50 rounded-lg";
            li.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="w-2 h-2 rounded-full bg-red-500"></div>
                    <span class="text-sm font-bold text-slate-700">${cat}</span>
                </div>
                <div class="text-right">
                    <span class="block text-sm font-bold text-slate-800">R$ ${val.toLocaleString('pt-BR')}</span>
                    <span class="text-[10px] text-slate-500">${percent.toFixed(0)}%</span>
                </div>
            `;
            list.appendChild(li);
        });

        if (sorted.length === 0) {
            list.innerHTML = '<p class="text-center text-slate-400 text-sm py-4">Sem dados ainda.</p>';
        }
    },

    // --- 4. GERA RELATÓRIO COM IA (GEMINI) ---
    async generateAIReport() {
        const btn = document.getElementById('btnGenerateReport');
        const content = document.getElementById('aiReportContent');
        
        if(!store.getToken()) return alert("Faça login.");
        
        const apiKey = localStorage.getItem('gemini_api_key');
        if(!apiKey) return alert("Configure sua API Key nas configurações (⚙️) primeiro.");

        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analisando...';
        content.innerHTML = '';
        content.parentElement.classList.remove('hidden');

        try {
            // Prepara resumo para a IA
            const transactions = store.transactions.slice(0, 50); // Manda os ultimos 50 para nao estourar token
            const prompt = `
                Analise estas finanças pessoais e dê 3 dicas curtas e diretas de economia.
                Dados: ${JSON.stringify(transactions.map(t => `${t.date}: ${t.desc} (${t.category}) R$${t.amount} [${t.type}]`))}
                Responda em tópicos HTML simples (<ul><li>...).
            `;

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });

            const data = await response.json();
            const text = data.candidates[0].content.parts[0].text;
            
            content.innerHTML = text; // Renderiza o HTML da IA

        } catch (error) {
            content.innerText = "Erro ao analisar: " + error.message;
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-magic"></i> Gerar Análise com IA';
        }
    }
};
