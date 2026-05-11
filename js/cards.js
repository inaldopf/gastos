import { store } from './store.js';
import { getMonthName } from './utils.js';

export const Cards = {
    render(selectedMonths = []) {
        const view = document.getElementById('viewCards');
        if (!view || view.classList.contains('hidden')) return;

        let targetMonth = selectedMonths && selectedMonths.length > 0 
            ? selectedMonths[selectedMonths.length - 1] 
            : getMonthName(new Date().getMonth() + 1);

        document.getElementById('cardMonthDisplay').innerText = `Referência: ${targetMonth}`;

        // KPIs agregados
        const cards = store.cards || [];
        const txs = store.cardTransactions || [];
        const monthInvoice = txs.filter(t => t.month === targetMonth).reduce((a, t) => a + parseFloat(t.amount), 0);
        const totalLimit = cards.reduce((a, c) => a + parseFloat(c.limit_amount || 0), 0);
        const totalUsed = txs.reduce((a, t) => a + parseFloat(t.amount), 0);
        const pctUsed = totalLimit > 0 ? Math.min((totalUsed / totalLimit) * 100, 100) : 0;
        const available = Math.max(totalLimit - totalUsed, 0);
        const elI = document.getElementById('cardsTotalInvoice');
        if (elI) elI.innerText = `R$ ${monthInvoice.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
        const elL = document.getElementById('cardsLimitUsed');
        if (elL) elL.innerText = `${pctUsed.toFixed(0)}%`;
        const elB = document.getElementById('cardsLimitBar');
        if (elB) {
            elB.style.width = `${pctUsed}%`;
            elB.classList.remove('bg-indigo-500','bg-amber-500','bg-red-500');
            elB.classList.add(pctUsed > 80 ? 'bg-red-500' : pctUsed > 50 ? 'bg-amber-500' : 'bg-indigo-500');
        }
        const elA = document.getElementById('cardsAvailable');
        if (elA) elA.innerText = `R$ ${available.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;

        this.setupForms();
        this.renderCardsOverview(targetMonth);
        this.renderTransactionsTable(targetMonth);
    },

    setupForms() {
        const formNew = document.getElementById('newCardForm');
        if (formNew && formNew.dataset.listener !== 'true') {
            formNew.dataset.listener = 'true';
            formNew.addEventListener('submit', async (e) => {
                e.preventDefault();
                const name = document.getElementById('newCardName').value;
                const limit = document.getElementById('newCardLimit').value;
                const closing = document.getElementById('newCardClosing').value;
                const due = document.getElementById('newCardDue').value;

                const btn = formNew.querySelector('button');
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; btn.disabled = true;

                await store.addCard(name, limit, closing, due);
                formNew.reset();
                btn.innerHTML = 'Salvar Cartão'; btn.disabled = false;
                window.updateAllViews();
            });
        }

        const formExp = document.getElementById('cardExpenseForm');
        if (formExp && formExp.dataset.listener !== 'true') {
            formExp.dataset.listener = 'true';
            formExp.addEventListener('submit', async (e) => {
                e.preventDefault();
                const cardId = document.getElementById('expenseCardId').value;
                const desc = document.getElementById('expenseCardDesc').value;
                const amount = parseFloat(document.getElementById('expenseCardAmount').value);
                const installments = parseInt(document.getElementById('expenseCardInstallments').value) || 1;

                if (!cardId || !desc || isNaN(amount)) return alert("Preencha todos os campos.");

                const btn = formExp.querySelector('button');
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; btn.disabled = true;

                const partAmount = amount / installments;
                let currentMonthIdx = new Date().getMonth() + 1;
                let year = new Date().getFullYear();

                const dateStr = new Date().toLocaleDateString('pt-BR');

                for (let i = 1; i <= installments; i++) {
                    let loopMonthCode = currentMonthIdx.toString().padStart(2, '0');
                    let targetMonthName = getMonthName(loopMonthCode);
                    
                    await store.addCardTransaction({
                        card_id: parseInt(cardId),
                        description: desc,
                        amount: partAmount,
                        date: dateStr,
                        month: targetMonthName,
                        installments: installments,
                        current_installment: i
                    });

                    currentMonthIdx++;
                    if (currentMonthIdx > 12) { currentMonthIdx = 1; year++; }
                }

                formExp.reset();
                document.getElementById('expenseCardInstallments').value = "1";
                btn.innerHTML = 'Registrar Compra'; btn.disabled = false;
                window.updateAllViews();
            });
        }
    },

    renderCardsOverview(targetMonth) {
        const container = document.getElementById('cardsOverview');
        const selectCard = document.getElementById('expenseCardId');
        if (!container) return;

        container.innerHTML = '';
        if (selectCard) selectCard.innerHTML = '<option value="" disabled selected>Selecione o Cartão</option>';

        const cards = store.cards || [];

        if (cards.length === 0) {
            container.innerHTML = '<p class="text-slate-400 col-span-full text-center py-6">Você ainda não cadastrou nenhum cartão.</p>';
            return;
        }

        cards.forEach(card => {
            if (selectCard) {
                const opt = document.createElement('option');
                opt.value = card.id; opt.textContent = card.name;
                selectCard.appendChild(opt);
            }

            const monthTransactions = (store.cardTransactions || []).filter(t => t.card_id === card.id && t.month === targetMonth);
            const invoiceTotal = monthTransactions.reduce((acc, t) => acc + parseFloat(t.amount), 0);
            
            const allCardTransactions = (store.cardTransactions || []).filter(t => t.card_id === card.id);
            const totalUsed = allCardTransactions.reduce((acc, t) => acc + parseFloat(t.amount), 0);

            const limit = parseFloat(card.limit_amount);
            const available = limit - totalUsed; 
            const percentUsed = limit > 0 ? (totalUsed / limit) * 100 : 0;
            const barColor = percentUsed > 80 ? 'bg-red-500' : percentUsed > 50 ? 'bg-yellow-500' : 'bg-purple-500';

            const div = document.createElement('div');
            div.className = "bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm p-5 relative group";
            div.innerHTML = `
                <button onclick="window.deleteCard(${card.id})" class="absolute top-3 right-3 btn-danger-ghost opacity-0 group-hover:opacity-100 transition"><i class="fas fa-trash text-xs"></i></button>
                <div class="flex items-center gap-2.5 mb-4">
                    <div class="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0"><i class="far fa-credit-card text-purple-500 text-xs"></i></div>
                    <div class="min-w-0">
                        <h3 class="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight truncate">${card.name}</h3>
                        <p class="text-[11px] text-slate-400 font-medium mt-0.5">Vence dia ${card.due_day}</p>
                    </div>
                </div>

                <p class="lbl">Fatura Atual</p>
                <p class="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white blur-target leading-none mt-1">R$ ${invoiceTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>

                <div class="mt-4 mb-2 flex justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <span>Limite ${percentUsed.toFixed(0)}%</span>
                    <span class="blur-target">Disp R$ ${available.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                </div>
                <div class="progress-track"><div class="${barColor} progress-fill" style="width: ${Math.min(percentUsed, 100)}%"></div></div>

                <button onclick="window.payInvoice(${card.id}, '${card.name}', ${invoiceTotal}, '${targetMonth}')" class="mt-4 w-full btn btn-ghost btn-sm font-bold"><i class="fas fa-check-double text-xs"></i> Pagar Fatura</button>
            `;
            container.appendChild(div);
        });
    },

    renderTransactionsTable(targetMonth) {
        const list = document.getElementById('cardTransactionList');
        if (!list) return;
        list.innerHTML = '';

        const transactions = (store.cardTransactions || []).filter(t => t.month === targetMonth);
        
        if (transactions.length === 0) {
            list.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-slate-400 text-sm">Nenhuma compra parcelada ou registada neste mês.</td></tr>';
            return;
        }

        transactions.forEach(t => {
            const cardObj = (store.cards || []).find(c => c.id === t.card_id);
            const cardName = cardObj ? cardObj.name : 'Cartão Eliminado';

            const tr = document.createElement('tr');
            tr.className = "hover:bg-slate-50 dark:hover:bg-slate-700 transition border-b border-slate-50 dark:border-slate-700";
            tr.innerHTML = `
                <td><span class="badge badge-indigo">${cardName}</span></td>
                <td class="font-bold text-slate-700 dark:text-slate-200">${t.description}</td>
                <td class="text-center text-xs text-slate-500">${t.installments > 1 ? `${t.current_installment}/${t.installments}` : '—'}</td>
                <td class="text-right font-bold text-red-500"><span class="blur-target">R$ ${parseFloat(t.amount).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></td>
                <td class="text-center"><button onclick="window.deleteCardTransaction(${t.id})" class="btn-danger-ghost"><i class="fas fa-trash text-xs"></i></button></td>
            `;
            list.appendChild(tr);
        });
    }
};

window.deleteCard = async (id) => {
    if (confirm("Eliminar este cartão e TODAS as compras a ele associadas?")) {
        await store.removeCard(id);
        window.updateAllViews();
    }
};

window.deleteCardTransaction = async (id) => {
    if (confirm("Apagar esta compra? (Se for parcelada, apagará apenas a parcela deste mês)")) {
        await store.removeCardTransaction(id);
        window.updateAllViews();
    }
};

window.payInvoice = async (cardId, cardName, invoiceTotal, month) => {
    if (invoiceTotal <= 0) return alert("A fatura deste mês está a zero!");
    if (confirm(`Pagar a fatura de R$ ${invoiceTotal.toLocaleString('pt-BR')} do cartão ${cardName} e descontar do saldo principal?`)) {
        await store.addTransaction({
            desc: `Fatura Cartão: ${cardName}`,
            amount: invoiceTotal,
            type: 'Despesa',
            category: 'Cartão de Crédito',
            date: new Date().toLocaleDateString('pt-BR'),
            month: month
        });

        alert("Fatura paga! O valor foi descontado do seu Saldo Atual no ecrã de Lançamentos.");
        window.updateAllViews();
    }
};
