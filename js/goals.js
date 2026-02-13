import { store } from './store.js';
import { UI } from './ui.js';

let goalsChart = null;

export const Goals = {
    render(selectedMonths = []) {
        const view = document.getElementById('viewGoals');
        if (!view || view.classList.contains('hidden')) return;

        console.log("🎯 Renderizando Planejador...");
        
        // 1. Configura Inputs e Selects
        this.setupInputs();

        // 2. Calcula Dados
        const income = this.calculateIncome(selectedMonths);
        const goalsData = this.calculateGoalsData(selectedMonths);
        const totalCategoryGoals = goalsData.reduce((acc, item) => acc + item.goal, 0); // Soma das metas cadastradas
        
        // 3. Renderiza Painel Superior (O Orçamento)
        this.renderBudgetOverview(income, totalCategoryGoals, selectedMonths.length || 1);

        // 4. Renderiza Listas e Gráficos
        this.renderProgressCards(goalsData);
        this.renderChart(goalsData);
    },

    setupInputs() {
        // Preenche Select de Categorias
        const select = document.getElementById('goalCategoryInput');
        if (select && select.options.length <= 1) {
            select.innerHTML = '<option value="" disabled selected>Selecione...</option>';
            UI.categories.forEach(cat => {
                // Filtra categorias que não são "Entrada" (Salário, Renda Extra, Investimento)
                if (cat.id !== 'Salário' && cat.id !== 'Renda Extra' && cat.id !== 'Investimento') {
                    const opt = document.createElement('option');
                    opt.value = cat.id; opt.textContent = cat.id;
                    select.appendChild(opt);
                }
            });
        }

        // Input de Meta de Sobra (Carrega valor e adiciona evento de salvar)
        const savingsInput = document.getElementById('goalSavingsInput');
        if (savingsInput) {
            // Remove listeners antigos para não duplicar
            const newInput = savingsInput.cloneNode(true);
            savingsInput.parentNode.replaceChild(newInput, savingsInput);
            
            // Carrega valor atual
            newInput.value = store.getMeta() > 0 ? store.getMeta() : '';

            // Salva ao sair do campo (blur) ou pressionar Enter
            newInput.addEventListener('change', (e) => {
                const val = parseFloat(e.target.value);
                store.setMeta(val);
                // Atualiza a tela para recalcular o orçamento
                this.render(window.currentSelectedMonths); 
                
                // Atualiza também o input lá do Dashboard se existir
                const dashInput = document.getElementById('inputMeta');
                if(dashInput) dashInput.value = val;
            });
        }

        // Formulário de Nova Meta
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
                    // Limpa campo valor
                    document.getElementById('goalAmountInput').value = '';
                    // Recarrega
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

    renderBudgetOverview(income, totalCategoryGoals, monthsCount) {
        // Pega a meta de sobra mensal e multiplica pelos meses selecionados
        const monthlySavingsGoal = store.getMeta();
        const totalSavingsGoal = monthlySavingsGoal * monthsCount;

        // Cálculo do Teto: Quanto sobra da receita para gastar nas categorias?
        // Disponível = Receita - Meta de Sobra Obrigatória
        const availableForSpending = income - totalSavingsGoal;

        // Atualiza HTML
        document.getElementById('goalTotalIncome').innerText = `R$ ${income.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
        document.getElementById('goalSumCategories').innerText = `R$ ${totalCategoryGoals.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
        
        // Exibe o Teto
        const limitEl = document.getElementById('goalAvailableLimit');
        limitEl.innerText = `R$ ${availableForSpending.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;

        // Lógica da Barra e Avisos
        const bar = document.getElementById('goalBudgetBar');
        const msg = document.getElementById('goalBudgetMsg');
        const card = document.getElementById('goalBudgetCard');

        if (availableForSpending <= 0) {
            // Se a receita não paga nem a meta de sobra
            limitEl.classList.remove('text-slate-400'); limitEl.classList.add('text-red-500');
            bar.style.width = '100%';
            bar.className = 'h-1.5 rounded-full bg-red-600 transition-all duration-500';
            msg.innerText = "Receita insuficiente para a Meta de Sobra!";
            msg.className = "text-xs font-bold text-red-600 mt-1 text-right";
            card.className = "glass p-5 rounded-xl border-l-4 border-red-500 shadow-sm";
        } else {
            // Calculo da porcentagem ocupada pelas metas
            const percentUsed = (totalCategoryGoals / availableForSpending) * 100;
            
            // Limitador visual 100%
            bar.style.width = `${Math.min(percentUsed, 100)}%`;

            if (percentUsed > 100) {
                // Estourou o teto
                bar.className = 'h-1.5 rounded-full bg-red-500 transition-all duration-500';
                msg.innerText = `Estourou o teto em R$ ${(totalCategoryGoals - availableForSpending).toLocaleString('pt-BR')}!`;
                msg.className = "text-xs font-bold text-red-500 mt-1 text-right";
                card.className = "glass p-5 rounded-xl border-l-4 border-red-500 shadow-sm";
            } else if (percentUsed > 90) {
                // Perigo
                bar.className = 'h-1.5 rounded-full bg-yellow-400 transition-all duration-500';
                msg.innerText = "No limite do orçamento.";
                msg.className = "text-xs font-bold text-yellow-600 mt-1 text-right";
                card.className = "glass p-5 rounded-xl border-l-4 border-yellow-500 shadow-sm";
            } else {
                // Seguro
                bar.className = 'h-1.5 rounded-full bg-emerald-500 transition-all duration-500';
                msg.innerText = "Planejamento Saudável.";
                msg.className = "text-xs font-bold text-emerald-600 mt-1 text-right";
                card.className = "glass p-5 rounded-xl border-l-4 border-emerald-500 shadow-sm";
                limitEl.classList.add('text-slate-400'); limitEl.classList.remove('text-red-500');
            }
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
            // Ignora categorias de entrada para metas de gasto
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
                        backgroundColor: document.documentElement.classList.contains('dark') ? '#334155' : '#e2e8f0', // Cinza escuro ou claro
                        borderRadius: 4,
                        barPercentage: 0.8, // Mais largo para ficar "atrás"
                        categoryPercentage: 0.9,
                        order: 2 // Fica no fundo
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
                    x: { 
                        display: false 
                    }
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
