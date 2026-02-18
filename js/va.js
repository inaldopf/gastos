import { store } from './store.js';

export const VA = {
    render() {
        const view = document.getElementById('viewVA');
        if (!view || view.classList.contains('hidden')) return;

        console.log("💳 Renderizando VA...");
        
        // Atualiza saldo na tela
        const balanceEl = document.getElementById('vaBalanceDisplay');
        if(balanceEl) {
            const saldo = store.vaBalance || 0;
            balanceEl.innerText = `R$ ${saldo.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
            // Muda cor se estiver acabando
            balanceEl.className = `text-4xl font-bold ${saldo < 100 ? 'text-red-500' : 'text-emerald-400'}`;
        }

        // Configura Formulário
        this.setupForm();
    },

    setupForm() {
        const form = document.getElementById('vaForm');
        if (!form) return;

        // Clone para limpar listeners antigos
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);

        newForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const type = document.getElementById('vaType').value; // credit ou debit
            const amount = parseFloat(document.getElementById('vaAmount').value);
            const desc = document.getElementById('vaDesc').value; // Opcional, para log futuro

            if (!amount || isNaN(amount)) return alert("Digite um valor válido.");

            const btn = newForm.querySelector('button');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            btn.disabled = true;

            try {
                await store.updateVA(amount, type);
                
                // Se for débito, podemos opcionalmente salvar no histórico geral também?
                // Por enquanto, vamos manter separado para não poluir a conta bancária.
                
                this.render(); // Atualiza saldo na tela
                newForm.reset();
                alert(type === 'credit' ? "Recarga efetuada!" : "Gasto registrado!");
            } catch (err) {
                console.error(err);
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }
};
