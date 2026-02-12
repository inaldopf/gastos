import { store } from './store.js';

// Variável segura para o gráfico
let chartInstance = null;

export const UI = {
    // Lista de Categorias
    categories: [
        { id: 'Salário', icon: 'fa-money-bill-wave', color: 'text-emerald-600', hex: '#059669' },
        { id: 'Investimento', icon: 'fa-chart-line', color: 'text-emerald-600', hex: '#10B981' },
        { id: 'Renda Extra', icon: 'fa-plus-circle', color: 'text-emerald-500', hex: '#34D399' },
        { id: 'Aluguel', icon: 'fa-home', color: 'text-indigo-600', hex: '#4F46E5' },
        { id: 'Condomínio', icon: 'fa-building', color: 'text-indigo-500', hex: '#6366F1' },
        { id: 'Luz', icon: 'fa-bolt', color: 'text-yellow-500', hex: '#EAB308' },
        { id: 'Água', icon: 'fa-tint', color: 'text-blue-400', hex: '#60A5FA' },
        { id: 'Internet / TV', icon: 'fa-wifi', color: 'text-cyan-500', hex: '#06B6D4' },
        { id: 'Gás', icon: 'fa-fire', color: 'text-orange-500', hex: '#F97316' },
        { id: 'Telefone / Celular', icon: 'fa-mobile-alt', color: 'text-slate-600', hex: '#475569' },
        { id: 'Supermercado', icon: 'fa-shopping-cart', color: 'text-red-500', hex: '#EF4444' },
        { id: 'Feira / Padaria', icon: 'fa-bread-slice', color: 'text-orange-400', hex: '#FB923C' },
        { id: 'Restaurantes / Bares', icon: 'fa-utensils', color: 'text-red-600', hex: '#DC2626' },
        { id: 'Comida', icon: 'fa-pizza-slice', color: 'text-red-400', hex: '#F87171' },
        { id: 'Combustível', icon: 'fa-gas-pump', color: 'text-slate-700', hex: '#334155' },
        { id: 'Uber / Táxi', icon: 'fa-car', color: 'text-slate-800', hex: '#1E293B' },
        { id: 'Ônibus / Metrô', icon: 'fa-bus', color: 'text-blue-600', hex: '#2563EB' },
        { id: 'Estacionamento', icon: 'fa-parking', color: 'text-slate-500', hex: '#64748B' },
        { id: 'Manutenção Carro', icon: 'fa-tools', color: 'text-slate-600', hex: '#475569' },
        { id: 'Viagens / Passeios', icon: 'fa-plane', color: 'text-sky-500', hex: '#0EA5E9' },
        { id: 'Cinema / Teatro', icon: 'fa-film', color: 'text-purple-500', hex: '#A855F7' },
        { id: 'Clube / Academia', icon: 'fa-dumbbell', color: 'text-rose-500', hex: '#F43F5E' },
        { id: 'Presentes', icon: 'fa-gift', color: 'text-pink-500', hex: '#EC4899' },
        { id: 'Compras', icon: 'fa-shopping-bag', color: 'text-purple-600', hex: '#9333EA' },
        { id: 'Médico / Hospital', icon: 'fa-hospital', color: 'text-green-500', hex: '#22C55E' },
        { id: 'Farmácia', icon: 'fa-capsules', color: 'text-green-600', hex: '#16A34A' },
        { id: 'Material Escolar', icon: 'fa-book', color: 'text-yellow-600', hex: '#CA8A04' },
        { id: 'Educação / Cursos', icon: 'fa-graduation-cap', color: 'text-blue-800', hex: '#1E40AF' },
        { id: 'Impostos', icon: 'fa-file-invoice-dollar', color: 'text-slate-500', hex: '#64748B' },
        { id: 'Outros', icon: 'fa-ellipsis-h', color: 'text-slate-400', hex: '#94A3B8' }
    ],

    // --- 1. PREENCHE O DROPDOWN (CATEGORIAS) ---
    initCategories() {
        const select = document.getElementById('inputCategory');
        if (!select) {
            console.error("ERRO: Não encontrei o <select id='inputCategory'> no HTML.");
            return;
        }

        select.innerHTML = '';
        this.categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.id;
            select.appendChild(option);
        });
        console.log("✅ Categorias carregadas com sucesso!");
    },

    // --- 2. RENDERIZA A LISTA ---
    renderApp(filterMonth) {
        const list = document.getElementById('transactionList');
        if (!list) return;

        list.innerHTML = '';

        // Filtro seguro
        let filtered = store.transactions || [];
        if (filterMonth !== 'Todos') {
            filtered = filtered.filter(t => t.month && t.month.toUpperCase() === filterMonth.toUpperCase());
        }

        // Se não tiver transações, mostra aviso
        if (filtered.length === 0) {
            list.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-slate-400">Nenhum lançamento neste período.</td></tr>';
            this.updateKPIs(0, 0, 0); // Zera KPIs
            this.updateChart([]); // Zera Gráfico
            return;
        }

        let totalRec = 0, totalInv = 0, totalDesp = 0;

        filtered.forEach(t => {
            if (t.type === 'Receita') totalRec += t.amount;
            else if (t.type === 'Investimento') totalInv += t.amount;
            else totalDesp += t.amount;

            const catData = this.categories.find(c => c.id === t.category) || { icon: 'fa-tag', color: 'text-slate-400' };

            const tr = document.createElement('tr');
            tr.className = "hover:bg-slate-50 transition border-b border-slate-50";
            tr.innerHTML = `
                <td class="px-4 py-3 text-xs text-slate-500">${t.date}</td>
                <td class="px-4 py-3 text-sm font-bold text-slate-700">${t.desc}</td>
                <td class="px-4 py-3"><span class="${catData.color} text-xs font-bold uppercase"><i class="fas ${catData.icon}"></i> ${t.category}</span></td>
                <td class="px-4 py-3 text-right font-bold text-sm ${t.type === 'Despesa' ? 'text-red-500' : 'text-emerald-600'}">R$ ${t.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                <td class="px-4 py-3 text-center"><button onclick="window.removeTransaction(${t.id})" class="text-slate-300 hover:text-red-500"><i class="fas fa-trash"></i></button></td>
            `;
            list.appendChild(tr);
        });

        this.updateKPIs(totalRec, totalDesp, totalInv);
        this.updateChart(filtered);
    },

    // --- 3. ATUALIZA NÚMEROS (KPIs) ---
    updateKPIs(rec, desp, inv) {
        const saldo = rec - desp - inv;
        const balEl = document.getElementById('kpiBalance');
        if(balEl) {
            balEl.innerText = `R$ ${saldo.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
            balEl.className = `text-2xl font-bold ${saldo >= 0 ? 'text-indigo-900' : 'text-red-600'}`;
        }
        const invEl = document.getElementById('kpiInvest');
        if(invEl) invEl.innerText = `R$ ${inv.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
        
        const expEl = document.getElementById('kpiExpense');
        if(expEl) expEl.innerText = `R$ ${desp.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    },

    // --- 4. GRÁFICO SEGURO ---
    updateChart(transactions) {
        // Se Chart não existe (erro de carregamento), não faz nada para não travar o resto
        if (typeof Chart === 'undefined') return;

        const ctx = document.getElementById('categoryChart');
        if (!ctx) return;

        const expenses = transactions.filter(t => t.type === 'Despesa');
        const totals = {};
        expenses.forEach(t => totals[t.category] = (totals[t.category] || 0) + t.amount);

        if (chartInstance) chartInstance.destroy();

        chartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(totals),
                datasets: [{
                    data: Object.values(totals),
                    backgroundColor: ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6'],
                    borderWidth: 0
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, cutout: '75%' }
        });
    }
};
