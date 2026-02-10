import { store } from './store.js';
import { formatCurrency, categoriesList } from './utils.js';

let chartInstance = null;

export const UI = {
    initCategories() {
        const select = document.getElementById('inputCategory');
        categoriesList.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c; opt.innerText = c; select.appendChild(opt);
        });
    },

    renderApp(monthFilter) {
        const list = document.getElementById('transactionList');
        list.innerHTML = '';
        
        const filtered = monthFilter === 'Todos' ? store.transactions : store.transactions.filter(t => t.month === monthFilter);
        
        let income = 0, expense = 0, invest = 0, catTotals = {};

        filtered.forEach(t => {
            if (t.type === 'Receita') income += t.amount;
            if (t.type === 'Despesa') { 
                expense += t.amount; 
                catTotals[t.category] = (catTotals[t.category] || 0) + t.amount; 
            }
            if (t.type === 'Investimento') invest += t.amount;

            // Render Row
            const row = document.createElement('tr');
            row.className = "hover:bg-slate-50 transition";
            const color = t.type === 'Receita' ? 'text-emerald-600' : (t.type === 'Investimento' ? 'text-indigo-600' : 'text-red-500');
            const sign = t.type === 'Receita' ? '+' : (t.type === 'Despesa' ? '-' : '');
            
            row.innerHTML = `
                <td class="px-4 py-3 text-xs text-slate-500">${t.date}</td>
                <td class="px-4 py-3 font-medium">${t.desc}</td>
                <td class="px-4 py-3"><span class="bg-slate-100 px-2 py-1 rounded text-xs text-slate-600">${t.category}</span></td>
                <td class="px-4 py-3 text-right font-bold ${color}">${sign}${formatCurrency(t.amount)}</td>
                <td class="px-4 py-3 text-center cursor-pointer text-slate-300 hover:text-red-500" data-id="${t.id}"><i class="fas fa-trash"></i></td>
            `;
            
            // Event listener direto no elemento para evitar erro de escopo
            row.querySelector('[data-id]').addEventListener('click', () => {
                if(confirm('Apagar?')) {
                    store.removeTransaction(t.id);
                    UI.renderApp(monthFilter);
                }
            });

            list.prepend(row);
        });

        // KPIs
        document.getElementById('kpiBalance').innerText = formatCurrency(income - expense - invest);
        document.getElementById('kpiInvest').innerText = formatCurrency(invest);
        document.getElementById('kpiExpense').innerText = formatCurrency(expense);

        this.updateChart(catTotals);
    },

    updateChart(data) {
        const ctx = document.getElementById('categoryChart').getContext('2d');
        if (chartInstance) chartInstance.destroy();
        chartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: Object.keys(data), datasets: [{ data: Object.values(data), backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899'], borderWidth: 0 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '70%' }
        });
    },

    renderDebtors() {
        const el = document.getElementById('debtorsList');
        el.innerHTML = '';
        store.debtors.forEach((d, i) => {
            const div = document.createElement('div');
            div.className = "flex justify-between items-center bg-slate-50 p-2 rounded";
            
            // HTML do Devedor
            div.innerHTML = `
                <div>
                    <p class="text-xs font-bold">${d.name}</p>
                    <input type="number" value="${d.amount}" class="debt-input w-16 bg-transparent text-xs text-orange-600 font-bold outline-none" data-index="${i}">
                </div>
                <button class="debt-toggle text-[10px] px-2 py-1 rounded ${d.paid ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}" data-index="${i}">
                    ${d.paid ? 'Pago' : 'Pendente'}
                </button>
            `;
            
            // Listeners
            div.querySelector('.debt-input').addEventListener('change', (e) => {
                store.debtors[i].amount = parseFloat(e.target.value);
                store.saveDebtors();
            });
            div.querySelector('.debt-toggle').addEventListener('click', () => {
                store.debtors[i].paid = !store.debtors[i].paid;
                store.saveDebtors();
                UI.renderDebtors();
            });

            el.appendChild(div);
        });
    }
};