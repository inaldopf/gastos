// --- ADICIONAR TRANSAÇÃO (CORRIGIDO) ---
    const form = document.getElementById('transactionForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Pega os dados
            const desc = document.getElementById('inputDesc').value;
            const amount = parseFloat(document.getElementById('inputAmount').value);
            const type = document.getElementById('inputType').value;
            const category = document.getElementById('inputCategory').value;
            const btnSubmit = form.querySelector('button[type="submit"]');
            
            if (!desc || isNaN(amount)) return alert("Preencha corretamente.");

            // Feedback visual
            const originalText = btnSubmit.innerHTML;
            btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
            btnSubmit.disabled = true;

            const filterMonth = document.getElementById('monthFilter').value;
            const monthToSave = filterMonth === 'Todos' ? getMonthName(new Date().getMonth() + 1) : filterMonth;

            try {
                // Manda salvar (O Store vai demorar se o server estiver dormindo)
                await store.addTransaction({
                    desc, amount, type, category,
                    date: new Date().toLocaleDateString('pt-BR'),
                    month: monthToSave
                });

                // Sucesso!
                updateAllViews(filterMonth);
                form.reset();

            } catch (err) {
                console.error(err);
                // Se falhar, o alert já foi dado no store.js
            } finally {
                // Restaura o botão
                btnSubmit.innerHTML = originalText;
                btnSubmit.disabled = false;
            }
        });
    }
