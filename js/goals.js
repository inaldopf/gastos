import { store } from './store.js';
import { UI } from './ui.js';

let goalsChart = null;

export const Goals = {
    render(selectedMonths = []) {
        const view = document.getElementById('viewGoals');
        if (!view || view.classList.contains('hidden')) return;

        console.log("🎯 Renderizando Metas...");
        
        // 1. Preenche o Select de Categorias no formulário de Metas
        this.populateCategorySelect();

        // 2. Calcula Gastos vs Metas
        const data = this.calculateGoalsData(selectedMonths);

        // 3. Renderiza a Lista de Progresso
        this.renderProgressCards(data);

        // 4. Renderiza o Gráfico Comparativo
        this.renderChart(data);
    },

    populateCategorySelect() {
        const select = document.getElementById('goalCategoryInput');
        if (!select || select.options.length > 1) return; // Já preenchido

        select.innerHTML = '<option value="" disabled selected>Selecione uma categoria...</option>';
        UI.categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = cat.id;
            select.appendChild(opt);
        });

        // Configura o evento do formulário aqui mesmo para garantir
        const form = document.getElementById('goalsForm');
        if (form) {
            // Remove listener antigo para não duplicar (clonando o node)
            const newForm = form.cloneNode(true);
            form.parentNode.replaceChild(newForm, form);
            
            newForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const cat = document.getElementById('goalCategoryInput').value;
                const amount = document.getElementById('goalAmountInput').value;
                
                if (cat && amount) {
                    store.setCategoryGoal(cat, amount);
                    alert(`Meta de R$ ${amount} definida para ${cat}!`);
                    // Recarrega a tela
                    this.render(window.currentSelectedMonths || []); // Usa variavel global ou recarrega tudo
                    // Limpa form
                    document.getElementById('goalAmountInput').value = '';
                    
                    // Hack para atualizar a view chamando o updateAllViews do app.js se possível,
                    // ou apenas redesenhando esta tela:
                    this.render();
                }
            });
        }
    },

    calculateGoalsData(selectedMonths) {
        const transactions = store.transactions || [];
        
        // Filtra transações pelos meses selecionados
        let filteredTrans = transactions;
        if (selectedMonths && selectedMonths.length > 0) {
            filteredTrans = transactions.filter(t => selectedMonths.includes(t.month));
        }

        // Soma gastos por categoria (Apenas Despesas)
        const spending = {};
        filteredTrans.forEach(t => {
            if (t.type === 'Despesa') {
                spending[t.category] = (spending[t.category] || 0) + parseFloat(t.amount);
            }
        });

        // Monta array comparativo
        const comparison = [];
        
        // Percorre todas as categorias cadastradas na UI
        UI.categories.forEach(cat => {
            const goalAmount = store.getGoal(cat.id);
            // Se tiver meta definida OU tiver gasto, a gente mostra
            if (goalAmount > 0 || spending[cat.id] > 0) {
                // Se selecionou múltiplos meses, a meta multiplica? 
                // Por enquanto vamos manter a Meta como "Mensal Fixa". 
                // O usuário deve comparar "Gasto do Mês" vs "Meta Mensal".
                // Se ele selecionar 2 meses, o gasto dobra, então a meta deveria dobrar visualmente?
                // Vamos multiplicar a meta pelo numero de meses selecionados para ficar justo.
                const monthsCount = (selectedMonths && selectedMonths.length > 0) ? selectedMonths.length : 1;
                const adjustedGoal = goalAmount * monthsCount;

                comparison.push({
                    category: cat.id,
                    icon: cat.icon,
                    color: cat.color,
                    spent: spending[cat.id] || 0,
                    goal: adjustedGoal,
                    percent: adjustedGoal > 0 ? ((spending[cat.id] || 0) / adjustedGoal) * 100 : 0
                });
            }
        });

        // Ordena: Quem estourou a meta primeiro
        return comparison.sort((a, b) => b.percent - a.percent);
    },

    renderProgressCards(data) {
        const container = document.getElementById('goalsList');
        if (!container) return;
        container.innerHTML = '';

        if (data.length === 0) {
            container.innerHTML = '<p class="text-slate-400 text-center py-10">Nenhuma meta ou gasto registrado para este período.</p>';
            return;
        }

        data.forEach(item => {
            // Define cor da barra baseada na porcentagem
            let barColor = 'bg-emerald-500'; // Seguro
            let statusText = 'Dentro da meta';
            let statusColor = 'text-emerald-600';

            if (item.percent >= 100) {
                barColor = 'bg-red-500';
                statusText = 'Meta estourada!';
                statusColor = 'text-red-500';
            } else if (item.percent >= 80) {
                barColor = 'bg-yellow-400';
                statusText = 'Atenção';
                statusColor = 'text-yellow-600';
            }

            // Limita a barra visualmente a 100% para não quebrar o layout
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
                            R$ ${item.spent.toLocaleString('pt-BR')} <span class="text-slate-400">/ ${item.goal.toLocaleString('pt-BR')}</span>
                        </p>
                    </div>
                </div>
                
                <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                    <div class="${barColor} h-2.5 rounded-full transition-all duration-1000" style="width: ${visualPercent}%"></div>
                </div>
                <div class="text-right mt-1">
                    <span class="text-xs font-bold ${statusColor}">${item.percent.toFixed(1)}%</span>
                </div>
            `;
            container.appendChild(div);
        });
    },

    renderChart(data) {
        const ctx = document.getElementById('goalsChart');
        if (!ctx) return;

        // Pega apenas as top 5 categorias para o gráfico não ficar poluido
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
                        backgroundColor: '#EF4444', // Vermelho para gasto
                        borderRadius: 4,
                        barPercentage: 0.6,
                    },
                    {
                        label: 'Meta Definida',
                        data: dataGoal,
                        backgroundColor: '#10B981', // Verde para meta
                        borderRadius: 4,
                        barPercentage: 0.6,
                        // Faz a meta aparecer como um "fundo" ou ao lado? Ao lado é melhor (grouped)
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(200, 200, 200, 0.1)' }
                    },
                    x: {
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: document.documentElement.classList.contains('dark') ? '#cbd5e1' : '#64748b' }
                    }
                }
            }
        });
    }
};
