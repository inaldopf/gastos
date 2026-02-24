import { store } from './store.js';

let chartInstance = null;

export const UI = {
    categories: [
        { id: 'Salário', icon: 'fa-money-bill-wave', color: 'text-emerald-600', hex: '#059669', type: 'Receita' },
        { id: 'Renda Extra', icon: 'fa-plus-circle', color: 'text-emerald-500', hex: '#34D399', type: 'Receita' },
        { id: 'Investimento', icon: 'fa-chart-line', color: 'text-blue-600', hex: '#3B82F6', type: 'Investimento' },
        { id: 'Aluguel', icon: 'fa-home', color: 'text-indigo-600', hex: '#4F46E5', type: 'Despesa' },
        { id: 'Condomínio', icon: 'fa-building', color: 'text-indigo-500', hex: '#6366F1', type: 'Despesa' },
        { id: 'Luz', icon: 'fa-bolt', color: 'text-yellow-500', hex: '#EAB308', type: 'Despesa' },
        { id: 'Água', icon: 'fa-tint', color: 'text-blue-400', hex: '#60A5FA', type: 'Despesa' },
        { id: 'Internet / TV', icon: 'fa-wifi', color: 'text-cyan-500', hex: '#06B6D4', type: 'Despesa' },
        { id: 'Gás', icon: 'fa-fire', color: 'text-orange-500', hex: '#F97316', type: 'Despesa' },
        { id: 'Telefone / Celular', icon: 'fa-mobile-alt', color: 'text-slate-600', hex: '#475569', type: 'Despesa' },
        { id: 'Supermercado', icon: 'fa-shopping-cart', color: 'text-red-500', hex: '#EF4444', type: 'Despesa' },
        { id: 'Feira / Padaria', icon: 'fa-bread-slice', color: 'text-orange-400', hex: '#FB923C', type: 'Despesa' },
        { id: 'Restaurantes / Bares', icon: 'fa-utensils', color: 'text-red-600', hex: '#DC2626', type: 'Despesa' },
        { id: 'Comida', icon: 'fa-pizza-slice', color: 'text-red-400', hex: '#F87171', type: 'Despesa' },
        { id: 'Combustível', icon: 'fa-gas-pump', color: 'text-slate-700', hex: '#334155', type: 'Despesa' },
        { id: 'Uber / Táxi', icon: 'fa-car', color: 'text-slate-800', hex: '#1E293B', type: 'Despesa' },
        { id: 'Ônibus / Metrô', icon: 'fa-bus', color: 'text-blue-600', hex: '#2563EB', type: 'Despesa' },
        { id: 'Estacionamento', icon: 'fa-parking', color: 'text-slate-500', hex: '#64748B', type: 'Despesa' },
        { id: 'Manutenção Carro', icon: 'fa-tools', color: 'text-slate-600', hex: '#475569', type: 'Despesa' },
        { id: 'Viagens / Passeios', icon: 'fa-plane', color: 'text-sky-500', hex: '#0EA5E9', type: 'Despesa' },
        { id: 'Cinema / Teatro', icon: 'fa-film', color: 'text-purple-500', hex: '#A855F7', type: 'Despesa' },
        { id: 'Clube / Academia', icon: 'fa-dumbbell', color: 'text-rose-500', hex: '#F43F5E', type: 'Despesa' },
        { id: 'Presentes', icon: 'fa-gift', color: 'text-pink-500', hex: '#EC4899', type: 'Despesa' },
        { id: 'Compras', icon: 'fa-shopping-bag', color: 'text-purple-600', hex: '#9333EA', type: 'Despesa' },
        { id: 'Médico / Hospital', icon: 'fa-hospital', color: 'text-green-500', hex: '#22C55E', type: 'Despesa' },
        { id: 'Farmácia', icon: 'fa-capsules', color: 'text-green-600', hex: '#16A34A', type: 'Despesa' },
        { id: 'Material Escolar', icon: 'fa-book', color: 'text-yellow-600', hex: '#CA8A04', type: 'Despesa' },
        { id: 'Educação / Cursos', icon: 'fa-graduation-cap', color: 'text-blue-800', hex: '#1E40AF', type: 'Despesa' },
        { id: 'Impostos', icon: 'fa-file-invoice-dollar', color: 'text-slate-500', hex: '#64748B', type: 'Despesa' },
        { id: 'Pets', icon: 'fa-paw', color: 'text-orange-600', hex: '#EA580C', type: 'Despesa' },
        { id: 'Beleza', icon: 'fa-cut', color: 'text-pink-400', hex: '#F472B6', type: 'Despesa' },
        { id: 'Roupas', icon: 'fa-tshirt', color: 'text-indigo-400', hex: '#818CF8', type: 'Despesa' },
        { id: 'Seguros', icon: 'fa-shield-alt', color: 'text-slate-600', hex: '#475569', type: 'Despesa' },
        { id: 'Eletrônicos', icon: 'fa-laptop', color: 'text-gray-800', hex: '#1F2937', type: 'Despesa' },
        { id: 'Doações', icon: 'fa-hand-holding-heart', color: 'text-rose-400', hex: '#FB7185', type: 'Despesa' },
        { id: 'Assinaturas', icon: 'fa-file-signature', color: 'text-purple-400', hex: '#C084FC', type: 'Despesa' },
        { id: 'Outros', icon: 'fa-ellipsis-h', color: 'text-slate-400', hex: '#94A3B8', type: 'Despesa' }
    ],

    populateCategories(filterType = 'Despesa') {
        const select = document.getElementById('inputCategory');
        if (!select) return;
        select.innerHTML = '';
        const filtered = this.categories.filter(cat => cat.type === filterType);
        filtered.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id; option.textContent = cat.id;
            select.appendChild(option);
        });
        if (filtered.length === 0) {
             const opt = document.createElement('option');
             opt.value = 'Outros'; opt.textContent = 'Outros';
             select.appendChild(opt);
        }
    },

    initCategories() {
        this.populateCategories('Despesa');
    },

    renderApp(selectedMonths = [], selectedCategory = 'Todas') {
        const list = document.getElementById('transactionList');
        if (!list) return;

        list.innerHTML = '';
        const transactions = store.transactions || [];

        // Lógica Saldo Acumulado (Global)
        const allMonths = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
        let maxMonthIndex = -1;
        selectedMonths.forEach(m => {
            const idx = allMonths.indexOf(m);
            if(idx > maxMonthIndex) maxMonthIndex = idx;
        });

        let accumulatedBalance = 0;
        transactions.forEach(t => {
            const tMonthIndex = allMonths.indexOf(t.month);
            if (tMonthIndex <= maxMonthIndex && tMonthIndex !== -1) {
                 const val = parseFloat(t.amount) || 0;
                 if (t.type === 'Receita') accumulatedBalance += val;
                 else if (t.type === 'Despesa') accumulatedBalance -= val;
                 else if (t.type === 'Investimento') accumulatedBalance -= val;
            }
        });

        // FILTRAGEM
        let filtered = [];
        if (selectedMonths.length > 0) {
            filtered = transactions.filter(t => selectedMonths.includes(t.month));
        }

        let totalRec = 0, totalInv = 0, totalDesp = 0;
        
        // Se houver filtro de categoria selecionado, a tabela reduz
        let tableFiltered = [...filtered];
        if (selectedCategory && selectedCategory !== 'Todas') {
            tableFiltered = tableFiltered.filter(t => t.category === selectedCategory);
        }

        tableFiltered.forEach(t => {
            if (t.type === 'Receita') totalRec += parseFloat(t.amount || 0);
            else if (t.type === 'Investimento') totalInv += parseFloat(t.amount || 0);
            else totalDesp += parseFloat(t.amount || 0);
        });

        if (tableFiltered.length === 0) {
            list.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-slate-400 dark:text-slate-500">Nenhum lançamento encontrado.</td></tr>';
            this.updateKPIs(accumulatedBalance, 0, 0, 0); 
            this.updateChart(filtered); // Passa a lista não-filtrada-por-categoria para não sumir o gráfico
            return;
        }

        tableFiltered.forEach(t => {
            const catData = this.categories.find(c => c.id === t.category) || { icon: 'fa-tag', color: 'text-slate-400' };
            const tr = document.createElement('tr');
            tr.className = "hover:bg-slate-50 dark:hover:bg-slate-700 transition border-b border-slate-50 dark:border-slate-700";
            tr.innerHTML = `
                <td class="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">${t.date}</td>
                <td class="px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200">${t.desc}</td>
                <td class="px-4 py-3"><span class="${catData.color} text-xs font-bold uppercase"><i class="fas ${catData.icon}"></i> ${t.category}</span></td>
                <td class="px-4 py-3 text-right font-bold text-sm ${t.type === 'Despesa' ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}">R$ ${t.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                <td class="px-4 py-3 text-center"><button onclick="window.removeTransaction(${t.id})" class="text-slate-300 hover:text-red-500"><i class="fas fa-trash"></i></button></td>
            `;
            list.appendChild(tr);
        });

        this.updateKPIs(accumulatedBalance, totalRec, totalDesp, totalInv);
        this.updateChart(filtered); // Gráfico sempre exibe a proporção inteira do mês
    },

    updateKPIs(accumulatedBalance, rec, desp, inv) {
        const balEl = document.getElementById('kpiBalance');
        if(balEl) {
            balEl.innerText = `R$ ${accumulatedBalance.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
            // --- CÓDIGO NOVO: Alterado de 'text-indigo-900' para 'text-emerald-600' ---
            balEl.className = `text-3xl font-bold ${accumulatedBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`;
        }
        const invEl = document.getElementById('kpiInvest');
        if(invEl) invEl.innerText = `R$ ${inv.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
        const expEl = document.getElementById('kpiExpense');
        if(expEl) expEl.innerText = `R$ ${desp.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    },

    updateChart(transactions, tentativas = 0) {
        // CORREÇÃO: Sistema de Retry para garantir que o Chart.js baixou
        if (typeof Chart === 'undefined') {
            if (tentativas < 10) setTimeout(() => this.updateChart(transactions, tentativas + 1), 300);
            return;
        }
        
        const ctx = document.getElementById('categoryChart');
        if (!ctx) return;

        // Filtra apenas despesas para o gráfico
        const expenses = transactions.filter(t => t.type === 'Despesa');
        const totals = {};
        expenses.forEach(t => totals[t.category] = (totals[t.category] || 0) + parseFloat(t.amount || 0));

        if (chartInstance) {
            chartInstance.destroy();
            chartInstance = null;
        }

        const labels = Object.keys(totals);
        if (labels.length === 0) return; // Se não tem dado, o gráfico não quebra

        const dataValues = Object.values(totals);
        
        // CORREÇÃO: Cores dinâmicas combinando perfeitamente com as categorias!
        const bgColors = labels.map(label => {
            const catObj = this.categories.find(c => c.id === label);
            return catObj ? catObj.hex : '#94A3B8';
        });

        chartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: dataValues,
                    backgroundColor: bgColors,
                    borderColor: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff',
                    borderWidth: 2
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                cutout: '75%', 
                plugins: { 
                    legend: { 
                        position: 'right', 
                        labels: { 
                            usePointStyle: true, 
                            boxWidth: 8, 
                            font: { size: 10 },
                            color: document.documentElement.classList.contains('dark') ? '#cbd5e1' : '#64748b' 
                        } 
                    } 
                } 
            }
        });
    }
};
