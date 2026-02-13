import { store } from './store.js';

let evolutionChart = null; // Variável para guardar o gráfico de barras
let categoryChart = null;  // Variável para guardar o gráfico de rosca (se precisar manipular aqui)

export const Dashboard = {
    render() {
        const view = document.getElementById('viewDashboard');
        // Só renderiza se a view existir e estiver visível
        if (!view || view.classList.contains('hidden')) return;

        console.log("📊 Renderizando Dashboard com Visual Glass...");
        
        this.updateCards();
        this.tryRenderChart();
        this.renderTopExpenses();
    },

    // Tenta renderizar o gráfico com persistência
    tryRenderChart(tentativas = 0) {
        if (typeof Chart === 'undefined') {
            if (tentativas < 10) {
                setTimeout(() => this.tryRenderChart(tentativas + 1), 300);
            }
            return;
        }
        this.renderEvolutionChart();
    },

    // --- 1. CARDS DO TOPO ---
    updateCards() {
        let totalRec = 0, totalDesp = 0, totalInv = 0;

        const transactions = store.transactions || [];

        transactions.forEach(t => {
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

    // --- 2. GRÁFICO DE BARRAS (VISUAL GLASS + BARRAS GROSSAS) ---
    renderEvolutionChart() {
        const ctx = document.getElementById('evolutionChart');
        if (!ctx) return;

        const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const dataRec = new Array(12).fill(0);
        const dataDesp = new Array(12).fill(0);
        const dataInv = new Array(12).fill(0);
        
        const currentYear = new Date().getFullYear();
        const transactions = store.transactions || [];

        transactions.forEach(t => {
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

        // --- CRIAÇÃO DOS DEGRADÊS (EFEITO VIDRO) ---
        // Precisamos do contexto 2D para criar o gradiente
        const ctx2d = ctx.getContext('2d');

        // Gradiente Receita (Verde Esmeralda)
        const gradRec = ctx2d.createLinearGradient(0, 0, 0, 400);
        gradRec.addColorStop(0, '#34D399'); // Topo mais claro
        gradRec.addColorStop(1, '#059669'); // Base mais escura

        // Gradiente Investimento (Azul Real)
        const gradInv = ctx2d.createLinearGradient(0, 0, 0, 400);
        gradInv.addColorStop(0, '#60A5FA');
        gradInv.addColorStop(1, '#2563EB');

        // Gradiente Despesa (Vermelho Suave)
        const gradDesp = ctx2d.createLinearGradient(0, 0, 0, 400);
        gradDesp.addColorStop(0, '#F87171');
        gradDesp.addColorStop(1, '#DC2626');

        evolutionChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Receita',
                        data: dataRec,
                        backgroundColor: gradRec,
                        borderRadius: 6, // Cantos mais arredondados
                        borderSkipped: false, // Arredonda em cima e embaixo (estilo pílula) se quiser
                        barPercentage: 0.85, // <--- AQUI ENGROSSA A BARRA (0.1 a 1.0)
                        categoryPercentage: 0.85 // <--- AQUI APROXIMA OS GRUPOS
                    },
                    {
                        label: 'Investimento',
                        data: dataInv,
                        backgroundColor: gradInv,
                        borderRadius: 6,
                        barPercentage: 0.85,
                        categoryPercentage: 0.85
                    },
                    {
                        label: 'Despesa',
                        data: dataDesp,
                        backgroundColor: gradDesp,
                        borderRadius: 6,
                        barPercentage: 0.85,
                        categoryPercentage: 0.85
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(200, 200, 200, 0.3)', // Grade bem suave
                            borderDash: [5, 5], // Pontilhada
                            drawBorder: false
                        },
                        ticks: {
                            font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
                            color: '#64748B'
                        }
                    },
                    x: {
                        grid: { display: false }, // Remove grade vertical (visual mais limpo)
                        ticks: {
                            font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
                            color: '#64748B'
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            boxWidth: 8,
                            padding: 20,
                            font: { family: "'Plus Jakarta Sans', sans-serif", size: 12 }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.9)', // Fundo escuro translúcido
                        titleFont: { family: "'Plus Jakarta Sans', sans-serif", size: 13 },
                        bodyFont: { family: "'Plus Jakarta Sans', sans-serif", size: 12 },
                        padding: 12,
                        cornerRadius: 8,
                        displayColors: true,
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

    // --- 3. TOP DESPESAS (COM ÍCONES) ---
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

        Object.entries(totals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .forEach(([cat, val]) => {
                const li = document.createElement('li');
                li.className = "flex justify-between items-center p-3 bg-white/50 border border-slate-100 rounded-xl text-sm mb-2 hover:bg-white transition shadow-sm";
                li.innerHTML = `
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-500 text-xs">
                            <i class="fas fa-shopping-bag"></i>
                        </div>
                        <span class="font-bold text-slate-700">${cat}</span> 
                    </div>
                    <span class="font-bold text-slate-600">R$ ${val.toLocaleString('pt-BR')}</span>
                `;
                list.appendChild(li);
            });
            
        if (expenses.length === 0) {
            list.innerHTML = '<p class="text-center text-slate-400 text-xs py-4">Sem despesas registradas.</p>';
        }
    },

    // --- 4. RELATÓRIO IA ---
    async generateAIReport() {
        // ... (código da IA mantido igual)
        // Se precisar do código da IA aqui, me avise que eu coloco!
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
            const { getFinancialAdvice } = await import('./ai.js');
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

            const topCats = Object.entries(catTotals).sort((a,b) => b[1] - a[1]).slice(0,3).map(i => i[0]).join(", ");
            const savingsRate = totalRec > 0 ? ((totalInv/totalRec)*100).toFixed(1) : 0;
            const summary = {
                balance: (totalRec - totalDesp - totalInv).toFixed(2),
                invested: totalInv.toFixed(2),
                expenses: totalDesp.toFixed(2),
                topCategories: topCats || "Nenhuma",
                savingsRate: savingsRate
            };

            const advice = await getFinancialAdvice(summary, apiKey);
            const formattedAdvice = advice.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
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
