import { store } from './store.js';

// Variável para guardar a instância do gráfico e poder destruí-la antes de recriar
let chartInstance = null;

export const UI = {
    // --- 1. LISTA DE CATEGORIAS (COM MAPEAMENTO DE CORES PARA O GRÁFICO) ---
    categories: [
        // Rendas (Verdes)
        { id: 'Salário', icon: 'fa-money-bill-wave', color: 'text-emerald-600', hex: '#059669' },
        { id: 'Investimento', icon: 'fa-chart-line', color: 'text-emerald-600', hex: '#10B981' },
        { id: 'Renda Extra', icon: 'fa-plus-circle', color: 'text-emerald-500', hex: '#34D399' },

        // Moradia / Contas (Azuis/Roxos)
        { id: 'Aluguel', icon: 'fa-home', color: 'text-indigo-600', hex: '#4F46E5' },
        { id: 'Condomínio', icon: 'fa-building', color: 'text-indigo-500', hex: '#6366F1' },
        { id: 'Luz', icon: 'fa-bolt', color: 'text-yellow-500', hex: '#EAB308' },
        { id: 'Água', icon: 'fa-tint', color: 'text-blue-400', hex: '#60A5FA' },
        { id: 'Internet / TV', icon: 'fa-wifi', color: 'text-cyan-500', hex: '#06B6D4' },
        { id: 'Gás', icon: 'fa-fire', color: 'text-orange-500', hex: '#F97316' },
        { id: 'Telefone / Celular', icon: 'fa-mobile-alt', color: 'text-slate-600', hex: '#475569' },

        // Alimentação (Vermelhos/Laranjas)
        { id: 'Supermercado', icon: 'fa-shopping-cart', color: 'text-red-500', hex: '#EF4444' },
        { id: 'Feira / Padaria', icon: 'fa-bread-slice', color: 'text-orange-400', hex: '#FB923C' },
        { id: 'Restaurantes / Bares', icon: 'fa-utensils', color: 'text-red-600', hex: '#DC2626' },
        { id: 'Comida (iFood)', icon: 'fa-pizza-slice', color: 'text-red-400', hex: '#F87171' },

        // Transporte (Cinzas/Escuros)
        { id: 'Combustível', icon: 'fa-gas-pump', color: 'text-slate-700', hex: '#334155' },
        { id: 'Uber / Táxi', icon: 'fa-car', color: 'text-slate-800', hex: '#1E293B' },
        { id: 'Ônibus / Metrô', icon: 'fa-bus', color: 'text-blue-600', hex: '#2563EB' },
        { id: 'Estacionamento', icon: 'fa-parking', color: 'text-slate-500', hex: '#64748B' },
        { id: 'Manutenção Carro', icon: 'fa-tools', color: 'text-slate-600', hex: '#475569' },

        // Lazer e Pessoal (Coloridos)
        { id: 'Viagens / Passeios', icon: 'fa-plane', color: 'text-sky-500', hex: '#0EA5E9' },
        { id: 'Cinema / Teatro', icon: 'fa-film', color: 'text-purple-500', hex: '#A855F7' },
        { id: 'Clube / Academia', icon: 'fa-dumbbell', color: 'text-rose-500', hex: '#F43F5E' },
        { id: 'Presentes', icon: 'fa-gift', color: 'text-pink-500', hex: '#EC4899' },
        { id: 'Compras', icon: 'fa-shopping-bag', color: 'text-purple-600', hex: '#9333EA' },

        // Saúde e Educação
        { id: 'Médico / Hospital', icon: 'fa-hospital', color: 'text-green-500', hex: '#22C55E' },
        { id: 'Farmácia', icon: 'fa-capsules', color: 'text-green-600', hex: '#16A34A' },
        { id: 'Material Escolar', icon: 'fa-book', color: 'text-yellow-600', hex: '#CA8A04' },
        { id: 'Educação / Cursos', icon: 'fa-graduation-cap', color: 'text-blue-800', hex: '#1E40AF' },

        // Outros
        { id: 'Impostos', icon: 'fa-file-invoice-dollar', color: 'text-slate-500', hex: '#64748B' },
        { id: 'Outros', icon: 'fa-ellipsis-h', color: 'text-slate-400', hex: '#94A3B8' }
    ],

    // --- 2. PREENCHE O DROPDOWN DO FORMULÁRIO ---
    initCategories() {
        const select = document.getElementById('inputCategory');
        if (!select) return;

        select.innerHTML = '';
        this.categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.id;
            select.appendChild(option);
        });
    },

    // --- 3. RENDERIZA TUDO (TABELA + GRÁFICO) ---
    renderApp(filterMonth) {
        const list = document.getElementById('transactionList');
        const balanceEl = document.getElementById('kpiBalance');
        const investEl = document.getElementById('kpiInvest');
        const expenseEl = document.getElementById('kpiExpense');

        if (!list) return;

        list.innerHTML = '';

        // Filtra os dados pelo mês selecionado
        const filtered = filterMonth === 'Todos' 
            ? store.transactions 
            : store.transactions.filter(t => t.month && t.month.toUpperCase() === filterMonth.toUpperCase());

        let totalReceita = 0;
        let totalInvestido = 0;
        let totalDespesa = 0;

        // Preenche a Tabela
        filtered.forEach(t => {
            if (t.type === 'Receita') totalReceita += t.amount;
            else if (t.type === 'Investimento') totalInvestido += t.amount;
            else totalDespesa += t.amount;

            // Pega os dados da categoria (ícone e cor)
            const catData = this.categories.find(c => c.id === t.category) || { icon: 'fa-tag', color: 'text-slate-400' };

            const tr = document.createElement('tr');
            tr.className = "hover:bg-slate-50 transition";
            tr.innerHTML = `
                <td class="px-4 py-3 font-medium text-slate-600 text-xs">${t.date || '-'}</td>
                <td class="px-4 py-3 text-slate-800 font-bold text-sm">${t.desc}</td>
                <td class="px-4 py-3">
                    <span class="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider ${catData.color}">
                        <i class="fas ${catData.icon}"></i> ${t.category}
                    </span>
                </td>
                <td class="px-4 py-3 text-right font-bold text-sm ${t.type === 'Despesa' ? 'text-red-500' : (t.type === 'Investimento' ? 'text-emerald-600' : 'text-indigo-600')}">
                    ${t.type === 'Despesa' ? '-' : ''} R$ ${t.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                </td>
                <td class="px-4 py-3 text-center">
                    <button onclick="window.removeTransaction(${t.id})" class="text-slate-400 hover:text-red-500 transition">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            list.appendChild(tr);
        });

        // Atualiza KPIs (Números do Topo)
        const saldo = totalReceita - totalDespesa - totalInvestido;
        balanceEl.innerText = `R$ ${saldo.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
        investEl.innerText = `R$ ${totalInvestido.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
        expenseEl.innerText = `R$ ${totalDespesa.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
        balanceEl.className = `text-2xl font-bold ${saldo >= 0 ? 'text-indigo-900' : 'text-red-600'}`;

        // --- CHAMA A FUNÇÃO DO GRÁFICO ---
        this.updateChart(filtered);
    },

    // --- 4. LÓGICA DO GRÁFICO DA HOME ---
    updateChart(transactions) {
        const ctx = document.getElementById('categoryChart');
        if (!ctx) return;

        // 1. Filtra apenas DESPESAS (Gráficos de receitas não fazem muito sentido aqui)
        const expenses = transactions.filter(t => t.type === 'Despesa');

        // 2. Agrupa valores por categoria
        // Ex: { "Supermercado": 500, "Uber": 100 }
        const totals = {};
        expenses.forEach(t => {
            totals[t.category] = (totals[t.category] || 0) + t.amount;
        });

        // 3. Prepara Arrays para o Chart.js
        const labels = Object.keys(totals);
        const dataValues = Object.values(totals);
        
        // Mapeia as cores baseadas no nome da categoria
        const backgroundColors = labels.map(catName => {
            const found = this.categories.find(c => c.id === catName);
            return found ? found.hex : '#cbd5e1'; // Retorna a cor Hex ou cinza se não achar
        });

        // 4. Se já existe um gráfico, destrói antes de criar o novo (evita bugar a tela)
        if (chartInstance) {
            chartInstance.destroy();
        }

        // 5. Se não tiver gastos, mostra vazio
        if (dataValues.length === 0) {
            // Cria um gráfico vazio "placeholder" se quiser, ou deixa em branco
            return; 
        }

        // 6. Cria o Gráfico Novo
        chartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: dataValues,
                    backgroundColor: backgroundColors,
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { 
                            font: { size: 10, family: "'Plus Jakarta Sans', sans-serif" },
                            usePointStyle: true,
                            boxWidth: 8
                        }
                    }
                },
                cutout: '75%' // Deixa a rosca mais fina e elegante
            }
        });
    }
};

window.removeTransaction = async (id) => {
    if(confirm("Tem certeza que deseja apagar?")) {
        await store.removeTransaction(id);
        const monthFilter = document.getElementById('monthFilter').value;
        UI.renderApp(monthFilter);
    }
};
