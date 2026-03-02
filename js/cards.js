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

        this.setupForms();
        this.renderCardsOverview(targetMonth);
        this.renderTransactionsTable(targetMonth);
    },

    setupForms() {
        // Form: Novo Cartão
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

        // Form: Passar Cartão (Lançar Despesa)
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

                // Lógica de Parcelamento (Se for em 3x, divide o valor e joga 1 parcela pra cada mês subsequente)
                const partAmount = amount / installments;
                let currentMonthIdx = new Date().getMonth() + 1; // 1 a 12
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

                    // Avança o mês pra próxima parcela
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
            // Popula o Select do formulário
            if (selectCard) {
                const opt = document.createElement('option');
                opt.value = card.id; opt.textContent = card.name;
                selectCard.appendChild(opt);
            }

            // Calcula a fatura do mês selecionado
            const monthTransactions = (store.cardTransactions || []).filter(t => t.card_id === card.id && t.month === targetMonth);
            const invoiceTotal = monthTransactions.reduce((acc, t) => acc + parseFloat(t.amount), 0);
            
            const limit = parseFloat(card.limit_amount);
            const available = limit - invoiceTotal; // Simplificado pro MVP
            const percentUsed = limit > 0 ? (invoiceTotal / limit) * 100 : 0;
            const barColor = percentUsed > 80 ? 'bg-red-500' : percentUsed > 50 ? 'bg-yellow-500' : 'bg-purple-500';

            const div = document.createElement('div');
            div.className = "glass p-5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden group";
            div.innerHTML = `
                <button onclick="window.deleteCard(${card.id})" class="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"><i class="fas fa-trash"></i></button>
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="font-bold text-slate-800 dark:text-slate-200 text-lg flex items-center gap-2"><i class="far fa-credit-card text-slate-400"></i> ${card.name}</h3>
                        <p class="text-[10px] font-bold text-slate-400 mt-1 uppercase">Venc: Dia ${card.due_day}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-[10px] font-bold text-slate-400 uppercase">Fatura Atual</p>
                        <p class="text-xl font-bold text-slate-800 dark:text-slate-200">R$ ${invoiceTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                    </div>
                </div>
                
                <div class="mb-2 flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <span>Limite Usado: ${percentUsed.toFixed(1)}%</span>
                    <span>Disp: R$ ${available.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                </div>
                <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                    <div class="${barColor} h-1.5 rounded-full" style="width: ${Math.min(percentUsed, 100)}%"></div>
                </div>

                <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex gap-2">
                    <button onclick="window.payInvoice(${card.id}, '${card.name}', ${invoiceTotal}, '${targetMonth}')" class="flex-1 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 font-bold py-2 rounded-lg text-xs hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition border border-emerald-100 dark:border-emerald-800">
                        <i class="fas fa-check-double mr-1"></i> Pagar Fatura
                    </button>
                </div>
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
            list.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-slate-400 text-sm">Nenhuma compra parcelada ou registrada neste mês.</td></tr>';
            return;
        }

        transactions.forEach(t => {
            const cardObj = (store.cards || []).find(c => c.id === t.card_id);
            const cardName = cardObj ? cardObj.name : 'Cartão Deletado';

            const tr = document.createElement('tr');
            tr.className = "hover:bg-slate-50 dark:hover:bg-slate-700 transition border-b border-slate-50 dark:border-slate-700";
            tr.innerHTML = `
                <td class="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300"><span class="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-2 py-1 rounded text-[10px] uppercase">${cardName}</span></td>
                <td class="px-4 py-3 text-slate-800 dark:text-slate-200">${t.description}</td>
                <td class="px-4 py-3 text-center text-xs text-slate-500">${t.installments > 1 ? `${t.current_installment}/${t.installments}` : 'À vista'}</td>
                <td class="px-4 py-3 text-right font-bold text-red-500">R$ ${parseFloat(t.amount).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                <td class="px-4 py-3 text-center">
                    <button onclick="window.deleteCardTransaction(${t.id})" class="text-slate-300 hover:text-red-500"><i class="fas fa-trash"></i></button>
                </td>
            `;
            list.appendChild(tr);
        });
    }
};

// Funções globais para botões
window.deleteCard = async (id) => {
    if (confirm("Deletar este cartão e TODAS as compras atreladas a ele?")) {
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
    if (invoiceTotal <= 0) return alert("A fatura deste mês está zerada!");
    if (confirm(`Pagar a fatura de R$ ${invoiceTotal.toLocaleString('pt-BR')} do cartão ${cardName} e descontar do saldo principal?`)) {
        
        // Lança como uma Despesa na conta principal!
        await store.addTransaction({
            desc: `Fatura Cartão: ${cardName}`,
            amount: invoiceTotal,
            type: 'Despesa',
            category: 'Cartão de Crédito',
            date: new Date().toLocaleDateString('pt-BR'),
            month: month
        });

        alert("Fatura paga! O valor foi descontado do seu Saldo Atual na tela de Lançamentos.");
        window.updateAllViews();
    }
};
