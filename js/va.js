import { store } from './store.js';
import { getMonthName } from './utils.js';

export const VA = {
    render(selectedMonths = []) {
        const view = document.getElementById('viewVA');
        if (!view || view.classList.contains('hidden')) return;

        // 1. Atualiza Saldo
        const balanceEl = document.getElementById('vaBalanceDisplay');
        if(balanceEl) {
            balanceEl.innerText = `R$ ${store.vaBalance.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
        }

        // 2. Setup do Formulário
        const form = document.getElementById('vaForm');
        if (form && form.dataset.listener !== 'true') {
            form.dataset.listener = 'true';
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const amount = parseFloat(document.getElementById('vaAmount').value);
                const type = document.getElementById('vaType').value;
                const desc = document.getElementById('vaDesc').value || (type === 'credit' ? 'Recarga' : 'Gasto');
                if (amount) {
                    const btn = form.querySelector('button');
                    const oldText = btn.innerHTML;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; btn.disabled = true;
                    
                    let targetMonth = window.currentSelectedMonths && window.currentSelectedMonths.length > 0 
                        ? window.currentSelectedMonths[window.currentSelectedMonths.length - 1] 
                        : getMonthName(new Date().getMonth() + 1);

                    await store.updateVA(amount, type, desc, new Date().toLocaleDateString('pt-BR'), targetMonth);
                    form.reset();
                    btn.innerHTML = oldText; btn.disabled = false;
                    window.updateAllViews();
                }
            });
        }

        // 3. Renderiza a Tabela
        const list = document.getElementById('vaTransactionList');
        if (list) {
            list.innerHTML = '';
            let filtered = store.vaTransactions;
            if (selectedMonths.length > 0) {
                filtered = store.vaTransactions.filter(t => selectedMonths.includes(t.month));
            }
            if (filtered.length === 0) {
                list.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-slate-400">Nenhum registro encontrado neste período.</td></tr>';
            } else {
                filtered.forEach(t => {
                    const tr = document.createElement('tr');
                    tr.className = "hover:bg-slate-50 dark:hover:bg-slate-700 transition border-b border-slate-50 dark:border-slate-700";
                    const isCredit = t.type === 'credit';
                    tr.innerHTML = `
                        <td class="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">${t.transaction_date}</td>
                        <td class="px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200">${t.description}</td>
                        <td class="px-4 py-3 text-center"><span class="${isCredit ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'} px-2 py-1 rounded text-[10px] font-bold uppercase">${isCredit ? 'Recarga' : 'Gasto'}</span></td>
                        <td class="px-4 py-3 font-bold text-right ${isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}"><span class="blur-target">${isCredit ? '+' : '-'} R$ ${parseFloat(t.amount).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></td>
                        <td class="px-4 py-3 text-center"><button onclick="window.removeVATransaction(${t.id})" class="text-slate-300 hover:text-red-500"><i class="fas fa-trash"></i></button></td>
                    `;
                    list.appendChild(tr);
                });
            }
        }
    }
};
