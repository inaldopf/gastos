import { store } from './store.js';

export const UI = {
    // Lista completa baseada no seu Excel
    categories: [
        // Rendas
        { id: 'Salário', icon: 'fa-money-bill-wave', color: 'text-emerald-600' },
        { id: 'Investimento', icon: 'fa-chart-line', color: 'text-emerald-600' },
        { id: 'Renda Extra', icon: 'fa-plus-circle', color: 'text-emerald-500' },

        // Moradia / Contas Fixas
        { id: 'Aluguel', icon: 'fa-home', color: 'text-indigo-600' },
        { id: 'Condomínio', icon: 'fa-building', color: 'text-indigo-500' },
        { id: 'Luz', icon: 'fa-bolt', color: 'text-yellow-500' },
        { id: 'Água', icon: 'fa-tint', color: 'text-blue-400' },
        { id: 'Internet / TV', icon: 'fa-wifi', color: 'text-cyan-500' },
        { id: 'Gás', icon: 'fa-fire', color: 'text-orange-500' },
        { id: 'Telefone / Celular', icon: 'fa-mobile-alt', color: 'text-slate-600' },

        // Alimentação
        { id: 'Supermercado', icon: 'fa-shopping-cart', color: 'text-red-500' },
        { id: 'Feira / Padaria', icon: 'fa-bread-slice', color: 'text-orange-400' },
        { id: 'Restaurantes / Bares', icon: 'fa-utensils', color: 'text-red-600' },
        { id: 'Comida (iFood)', icon: 'fa-pizza-slice', color: 'text-red-400' },

        // Transporte
        { id: 'Combustível', icon: 'fa-gas-pump', color: 'text-slate-700' },
        { id: 'Uber / Táxi', icon: 'fa-car', color: 'text-slate-800' },
        { id: 'Ônibus / Metrô', icon: 'fa-bus', color: 'text-blue-600' },
        { id: 'Estacionamento', icon: 'fa-parking', color: 'text-slate-500' },
        { id: 'Manutenção Carro', icon: 'fa-tools', color: 'text-slate-600' },

        // Lazer e Pessoal
        { id: 'Viagens / Passeios', icon: 'fa-plane', color: 'text-sky-500' },
        { id: 'Cinema / Teatro', icon: 'fa-film', color: 'text-purple-500' },
        { id: 'Clube / Academia', icon: 'fa-dumbbell', color: 'text-rose-500' },
        { id: 'Presentes', icon: 'fa-gift', color: 'text-pink-500' },
        { id: 'Compras', icon: 'fa-shopping-bag', color: 'text-purple-600' },

        // Saúde e Educação
        { id: 'Médico / Hospital', icon: 'fa-hospital', color: 'text-green-500' },
        { id: 'Farmácia', icon: 'fa-capsules', color: 'text-green-600' },
        { id: 'Material Escolar', icon: 'fa-book', color: 'text-yellow-600' },
        { id: 'Educação / Cursos', icon: 'fa-graduation-cap', color: 'text-blue-800' },

        // Outros
        { id: 'Impostos', icon: 'fa-file-invoice-dollar', color: 'text-slate-500' },
        { id: 'Outros', icon: 'fa-ellipsis-h', color: 'text-slate-400' }
    ],

    initCategories() {
        const select = document.getElementById('inputCategory');
        if (!select) return;

        select.innerHTML = '';
        this.categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.id; // Mostra o nome bonitinho
            select.appendChild(option);
        });
    },

    renderApp(filterMonth) {
        const list = document.getElementById('transactionList');
        const balanceEl = document.getElementById('kpiBalance');
        const investEl = document.getElementById('kpiInvest');
        const expenseEl = document.getElementById('kpiExpense');

        if (!list) return;

        list.innerHTML = '';

        // Filtra por Mês
        const filtered = filterMonth === 'Todos' 
            ? store.transactions 
            : store.transactions.filter(t => t.month && t.month.toUpperCase() === filterMonth.toUpperCase());

        let totalReceita = 0;
        let totalInvestido = 0;
        let totalDespesa = 0;

        filtered.forEach(t => {
            if (t.type === 'Receita') totalReceita += t.amount;
            else if (t.type === 'Investimento') totalInvestido += t.amount;
            else totalDespesa += t.amount;

            // Busca o ícone e cor correspondente
            const catData = this.categories.find(c => c.id === t.category) || { icon: 'fa-tag', color: 'text-slate-400' };

            const tr = document.createElement('tr');
            tr.className = "hover:bg-slate-50 transition";
            tr.innerHTML = `
                <td class="px-4 py-3 font-medium text-slate-600">${t.date || '-'}</td>
                <td class="px-4 py-3 text-slate-800 font-bold">${t.desc}</td>
                <td class="px-4 py-3">
                    <span class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${catData.color}">
                        <i class="fas ${catData.icon}"></i> ${t.category}
                    </span>
                </td>
                <td class="px-4 py-3 text-right font-bold ${t.type === 'Despesa' ? 'text-red-500' : (t.type === 'Investimento' ? 'text-emerald-600' : 'text-indigo-600')}">
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

        // Atualiza KPIs
        const saldo = totalReceita - totalDespesa - totalInvestido;
        balanceEl.innerText = `R$ ${saldo.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
        investEl.innerText = `R$ ${totalInvestido.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
        expenseEl.innerText = `R$ ${totalDespesa.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
        
        // Cores dinâmicas do Saldo
        balanceEl.className = `text-2xl font-bold ${saldo >= 0 ? 'text-indigo-900' : 'text-red-600'}`;
    }
};

// Torna a função de remover global para o HTML acessar
window.removeTransaction = async (id) => {
    if(confirm("Tem certeza que deseja apagar?")) {
        await store.removeTransaction(id);
        const monthFilter = document.getElementById('monthFilter').value;
        UI.renderApp(monthFilter);
    }
};
