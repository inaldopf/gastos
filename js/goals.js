import { store } from './store.js';
import { UI } from './ui.js';

let goalsChart = null;

export const Goals = {
    render(selectedMonths = []) {
        const view = document.getElementById('viewGoals');
        if (!view || view.classList.contains('hidden')) return;

        console.log("🎯 Renderizando Planejador...");
        
        this.setupInputs();

        // 1. Calcula os Totais
        const income = this.calculateIncome(selectedMonths);
        const goalsData = this.calculateGoalsData(selectedMonths);
        
        // Soma de todas as metas de categorias (O que você pretende gastar)
        const totalPlannedSpend = goalsData.reduce((acc, item) => acc + item.goal, 0); 
        
        // 2. Renderiza o Painel de Projeção
        this.renderBudgetOverview(income, totalPlannedSpend, selectedMonths.length || 1);

        // 3. Renderiza Listas e Gráficos
        this.renderProgressCards(goalsData);
        this.renderChart(goalsData);
    },

    setupInputs() {
        // Preenche Select
        const select = document.getElementById('goalCategoryInput');
        if (select && select.options.length <= 1) {
            select.innerHTML = '<option value="" disabled selected>Selecione...</option>';
            UI.categories.forEach(cat => {
                if (cat.id !== 'Salário' && cat.id !== 'Renda Extra' && cat.id !== 'Investimento') {
                    const opt = document.createElement('option');
                    opt.value = cat.id; opt.textContent = cat.id;
                    select.appendChild(opt);
                }
            });
        }

        // Input Meta de Sobra
        const savingsInput = document.getElementById('goalSavingsInput');
        if (savingsInput) {
            const newInput = savingsInput.cloneNode(true);
            savingsInput.parentNode.replaceChild(newInput, savingsInput);
            
            newInput.value = store.getMeta() > 0 ? store.getMeta() : '';

            newInput.addEventListener('change', (e) => {
                const val = parseFloat(e.target.value);
                store.setMeta(val);
                this.render(window.currentSelectedMonths); 
                
                const dashInput = document.getElementById('inputMeta');
                if(dashInput) dashInput.value = val;
            });
        }

        // Form Nova Meta
        const form = document.getElementById('goalsForm');
        if (form) {
            const newForm = form.cloneNode(true);
            form.parentNode.replaceChild(newForm, form);
            
            newForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const cat = document.getElementById('goalCategoryInput').value;
                const amount = document.getElementById('goalAmountInput').value;
                
                if (cat && amount) {
                    store.setCategoryGoal(cat, amount);
                    document.getElementById('goalAmountInput').value = '';
                    this.render(window.currentSelectedMonths);
                }
            });
        }
    },

    calculateIncome(selectedMonths) {
        const transactions = store.transactions || [];
        let totalIncome = 0;
        
        const filtered = (selectedMonths && selectedMonths.length > 0) 
            ? transactions.filter(t => selectedMonths.includes(t.month))
            : transactions;

        filtered.forEach(t => {
            if (t.type === 'Receita') totalIncome += parseFloat(t.amount);
        });
        return totalIncome;
    },

    renderBudgetOverview(income, totalPlannedSpend, monthsCount) {
        // Meta de Sobra ajustada pelo número de meses selecionados
        const monthlySavingsGoal = store.getMeta();
        const totalSavingsGoal = monthlySavingsGoal * monthsCount;

        // CÁLCULO MÁGICO: Sobra Projetada = Receita - Tudo que planejei gastar
        const projectedSurplus = income - totalPlannedSpend;

        // Atualiza HTML
        document.getElementById('goalTotalIncome').innerText = `R$ ${income.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
        document.getElementById('goalProjectedSurplus').innerText = `R$ ${projectedSurplus.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
        document.getElementById('goalTargetDisplay').innerText = `R$ ${totalSavingsGoal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;

        // Lógica Visual
        const bar = document.getElementById('goalBudgetBar');
        const msg = document.getElementById('goalBudgetMsg');
        const card = document.getElementById('goalBudgetCard');
        const valueEl = document.getElementById('goalProjectedSurplus');

        // Situação 1: Receita zerada ou muito baixa (Cuidado para não dividir por zero)
        if (income <= 0) {
            bar.style.width = '0%';
            msg.innerText = "Sem receita registrada para calcular.";
            msg.className = "text-xs font-bold text-slate-400 mt-1 text-right";
            card.className = "glass p-5 rounded-xl border-l-4 border-slate-400 shadow-sm";
            return;
        }

        // Situação 2: Sobra Projetada MENOR que a Meta (RUIM)
        if (projectedSurplus < totalSavingsGoal) {
            // Calcula quão longe estamos (Barra diminui ou fica vermelha)
            // Vamos fazer a barra representar a "Saúde da Meta".
            // Se Sobra < Meta, estamos em perigo.
            
            bar.style.width = '100%';
            bar.className = 'h-1.5 rounded-full bg-red-500 transition-all duration-500';
            
            const shortfall = totalSavingsGoal - projectedSurplus;
            msg.innerText = `Faltam R$ ${shortfall.toLocaleString('pt-BR')} para atingir a meta!`;
            msg.className = "text-xs font-bold text-red-500 mt-1 text-right";
            
            card.className = "glass p-5 rounded-xl border-l-4 border-red-500 shadow-sm";
            valueEl.classList.remove('text-slate-800', 'dark:text-slate-200');
            valueEl.classList.add('text-red-500');
        
        } else {
            // Situação 3: Sobra Projetada MAIOR ou IGUAL a Meta (BOM)
            // A barra representa o excedente? Não, vamos deixar ela cheia verde.
            
            bar.style.width = '100%';
            bar.className = 'h-1.5 rounded-full bg-emerald-500 transition-all duration-500';
            
            const extra = projectedSurplus - totalSavingsGoal;
            if (extra > 0) {
                msg.innerText = `Parabéns! Vai sobrar R$ ${extra.toLocaleString('pt-BR')} a mais que a meta.`;
            } else {
                msg.innerText = "Planejamento exato na meta.";
            }
            msg.className = "text-xs font-bold text-emerald-600 mt-1 text-right";
            
            card.className = "glass p-5 rounded-xl border-l-4 border-emerald-500 shadow-sm";
            valueEl.classList.remove('text-red-500');
            valueEl.classList.add('text-slate-800', 'dark:text-slate-200');
        }
    },

    calculateGoalsData(selectedMonths) {
        const transactions = store.transactions || [];
        
        let filteredTrans = transactions;
        if (selectedMonths && selectedMonths.length > 0) {
            filteredTrans = transactions.filter(t => selectedMonths.includes(t.month));
        }

        const spending = {};
        filteredTrans.forEach(t => {
            if (t.type === 'Despesa') {
                spending[t.category] = (spending[t.category] || 0) + parseFloat(t.amount);
            }
        });

        const comparison = [];
        const monthsCount = (selectedMonths && selectedMonths.length > 0) ? selectedMonths.length : 1;

        UI.categories.forEach(cat => {
            const monthlyGoal = store.getGoal(cat.id);
            // Ignora categorias de entrada
            if (cat.id === 'Salário' || cat.id === 'Renda Extra' || cat.id === 'Investimento') return;

            if (monthlyGoal > 0 || spending[cat.id] > 0) {
                const totalGoal = monthlyGoal * monthsCount;
                comparison.push({
                    category: cat.id,
                    icon: cat.icon,
                    color: cat.color,
                    spent: spending[cat.id] || 0,
                    goal: totalGoal,
                    percent: totalGoal > 0 ? ((spending[cat.id] || 0) / totalGoal) * 100 : 0
                });
            }
        });

        return comparison.sort((a, b) => b.percent - a.percent);
    },

    renderProgressCards(data) {
        const container = document.getElementById('goalsList');
        if (!container) return;
        container.innerHTML = '';

        if (data.length === 0) {
            container.innerHTML = '<p class="text-slate-400 dark:text-slate-500 text-center py-10 text-sm">Cadastre uma meta acima para começar.</p>';
            return;
        }

        data.forEach(item => {
            let barColor = 'bg-emerald-500';
            let statusText = 'OK';
            let statusColor = 'text-emerald-600 dark:text-emerald-400';

            if (item.percent >= 100) {
                barColor = 'bg-red-500'; statusText = 'Estourou!'; statusColor = 'text-red-500 dark:text-red-400';
            } else if (item.percent >= 80) {
                barColor = 'bg-yellow-400'; statusText = 'Atenção'; statusColor = 'text-yellow-600 dark:text-yellow-400';
            }

            const visualPercent = Math.min(item.percent, 100);

            const div = document.createElement('div');
            div.className = "glass p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm mb-3";
            div.innerHTML = `
                <div class="flex justify-between items-center mb-2">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center ${item.color}">
                            <i class="fas ${item.icon}"></i>
                        </div>
                        <div>
                            <h4 class="font-bold text-slate-700 dark:text-slate-200 text-sm">${item.category}</h4>
                            <p class="text-xs ${statusColor} font-semibold">${statusText}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="text-xs text-slate-400 font-bold uppercase">Gasto / Meta</p>
                        <p class="text-sm font-bold text-slate-800 dark:text-slate-100">
                            R$ ${item.spent.toLocaleString('pt-BR')} <span class="text-slate-400 dark:text-slate-500 text-xs">/ ${item.goal.toLocaleString('pt-BR')}</span>
                        </p>
                    </div>
                </div>
                
                <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div class="${barColor} h-2 rounded-full transition-all duration-1000" style="width: ${visualPercent}%"></div>
                </div>
            `;
            container.appendChild(div);
        });
    },

    renderChart(data) {
        const ctx = document.getElementById('goalsChart');
        if (!ctx) return;

        const topData = data.slice(0, 6); 
        const labels = topData.map(d => d.category);
        const dataSpent = topData.map(d => d.spent);
        const dataGoal = topData.map(d => d.goal);

        if (goalsChart) goalsChart.destroy();

        goalsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Gasto Real',
                        data: dataSpent,
                        backgroundColor: '#EF4444',
                        borderRadius: 4,
                        barPercentage: 0.6,
                        order: 1
                    },
                    {
                        label: 'Meta',
                        data: dataGoal,
                        backgroundColor: document.documentElement.classList.contains('dark') ? '#334155' : '#e2e8f0', 
                        borderRadius: 4,
                        barPercentage: 0.8, 
                        categoryPercentage: 0.9,
                        order: 2 
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { 
                        beginAtZero: true, 
                        grid: { color: document.documentElement.classList.contains('dark') ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
                        ticks: { color: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b' }
                    },
                    x: { display: false }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { 
                            usePointStyle: true,
                            color: document.documentElement.classList.contains('dark') ? '#cbd5e1' : '#64748b' 
                        }
                    }
                }
            }
        });
    }
};
