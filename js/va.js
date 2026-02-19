import { store } from './store.js';

export const VA = {
    render(selectedMonths = []) {
        const view = document.getElementById('viewVA');
        if (!view || view.classList.contains('hidden')) return;

        // 1. Atualiza Saldo
        const balanceEl = document.getElementById('vaBalanceDisplay');
        if(balanceEl) {
            const saldo = store.vaBalance || 0;
            balanceEl.innerText = `R$ ${saldo.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
            balanceEl.className = `text-5xl font-bold mb-6 ${saldo < 100 ? 'text-red-300' : 'text-white'}`;
        }

        // 2. Renderiza a Tabela Filtrada
        this.renderList(selectedMonths);

        // 3. Configura o Form
        this.setupForm(selectedMonths);
    },

    renderList(selectedMonths) {
        const list = document.getElementById('vaTransactionList');
        if (!list) return;
        list.innerHTML = '';

        let filtered = store.vaTransactions || [];
        
        // Filtro de mês (Usa o mesmo filtro geral do sistema)
        if (selectedMonths && selectedMonths.length > 0) {
            filtered = filtered.filter(t => selectedMonths.includes(t.month));
        }

        if (filtered.length === 0) {
            list.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-slate-400">Nenhum registro no período.</td></tr>';
            return;
        }

        filtered.forEach(t => {
            const tr = document.createElement('tr');
            tr.className = "hover:bg-slate-50 dark:hover:bg-slate-700 transition border-b border-slate-50 dark:border-slate-700";
            
            const isCredit = t.type === 'credit';
            const color = isCredit ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400';
            const typeBadge = isCredit 
                ? `<span class="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[10px] font-bold uppercase"><i class="fas fa-arrow-up"></i> Recarga</span>`
                : `<span class="bg-red-100 text-red-700 px-2 py-1 rounded text-[10px] font-bold uppercase"><i class="fas fa-utensils"></i> Gasto</span>`;
            
            const dateStr = t.transaction_date || '--/--/----';
            const descStr = t.description || (isCredit ? 'Recarga' : 'Gasto VA');

            tr.innerHTML = `
                <td class="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">${dateStr}</td>
                <td class="px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200">${descStr}</td>
                <td class="px-4 py-3 text-center">${typeBadge}</td>
                <td class="px-4 py-3 text-right font-bold text-sm ${color}">R$ ${parseFloat(t.amount).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                <td class="px-4 py-3 text-center"><button onclick="window.removeVATransaction(${t.id})" class="text-slate-300 hover:text-red-500"><i class="fas fa-trash"></i></button></td>
            `;
            list.appendChild(tr);
        });
    },

    setupForm(selectedMonths) {
        const form = document.getElementById('vaForm');
        if (!form) return;
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);

        newForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const type = document.getElementById('vaType').value;
            const amount = parseFloat(document.getElementById('vaAmount').value);
            const desc = document.getElementById('vaDesc').value || (type === 'credit' ? 'Recarga VA' : 'Gasto VA');
            
            if (!amount || isNaN(amount)) return alert("Valor inválido.");

            const btn = newForm.querySelector('button');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; btn.disabled = true;

            try {
                // Pega o mês alvo baseado no filtro (pega o último selecionado ou o atual)
                let targetMonth = (selectedMonths && selectedMonths.length > 0) ? selectedMonths[selectedMonths.length - 1] : '';
                if (!targetMonth) {
                    const months = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
                    targetMonth = months[new Date().getMonth()];
                }
                const dateStr = new Date().toLocaleDateString('pt-BR');

                await store.updateVA(amount, type, desc, dateStr, targetMonth);
                
                // Atualiza a tela global
                if(window.updateAllViews) window.updateAllViews();
                else this.render(selectedMonths);

                newForm.reset();
            } catch (err) { console.error(err); } finally { btn.innerHTML = originalText; btn.disabled = false; }
        });
    }
};
