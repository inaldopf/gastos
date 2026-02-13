const API_URL = "https://financeiro-app-okjm.onrender.com";
const CACHE_KEY = 'finance_data_cache';

export const store = {
    transactions: [],
    debtors: [],
    meta: 0,

    // --- 1. TOKEN CORRETO (Essencial para parar o bug de dados vazios) ---
    getToken() {
        return localStorage.getItem('inf_auth_token');
    },

    // --- 2. GERENCIAMENTO DE CACHE ---
    saveToCache() {
        const data = {
            transactions: this.transactions,
            debtors: this.debtors,
            meta: this.meta,
            timestamp: new Date().getTime()
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    },

    loadFromCache() {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            try {
                const data = JSON.parse(cached);
                this.transactions = data.transactions || [];
                this.debtors = data.debtors || [];
                this.meta = data.meta || 0;
                return true;
            } catch (e) {
                console.error("Erro ao ler cache", e);
                return false;
            }
        }
        return false;
    },

    // --- 3. INICIALIZAÇÃO BLINDADA (FIM DO LOOP DA MORTE) ---
    async init() {
        const token = this.getToken();
        if (!token) return; // Se não tem token, o app.js já vai redirecionar.

        // Carrega cache primeiro para o usuário ver algo
        this.loadFromCache();

        try {
            console.log("🔄 Sincronizando com o servidor...");
            
            // Faz as requisições
            const [resTrans, resDebt, resMeta] = await Promise.all([
                fetch(`${API_URL}/transactions`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/debtors`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/meta`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            // --- PROTEÇÃO CONTRA LOOP ---
            // Se der erro 401 (Não autorizado), aí sim lançamos erro para sair.
            if (resTrans.status === 401 || resTrans.status === 403) {
                throw new Error("UNAUTHORIZED");
            }

            if (resTrans.ok) {
                const rawTrans = await resTrans.json();
                
                // Formata e salva transações
                this.transactions = rawTrans.map(dbItem => {
                    // Tratamento de Data para evitar bugs no gráfico
                    let dateStr = dbItem.transaction_date;
                    if (dateStr && !dateStr.includes('/')) {
                        // Se vier 2026-02-13, converte para 13/02/2026
                        const parts = dateStr.split('-');
                        if(parts.length === 3) dateStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
                    }

                    return {
                        id: dbItem.id,
                        desc: dbItem.description,
                        amount: parseFloat(dbItem.amount),
                        type: dbItem.type,
                        category: dbItem.category,
                        date: dateStr, 
                        month: dbItem.month
                    };
                });
            }

            if (resDebt.ok) this.debtors = await resDebt.json();
            
            if (resMeta.ok) {
                const d = await resMeta.json();
                this.meta = parseFloat(d.meta) || 0;
            }

            // Salva tudo no cache
            this.saveToCache();
            console.log("✅ Dados sincronizados!");

        } catch (error) {
            console.error("⚠️ Erro na sincronização:", error);

            // SÓ REDIRECIONA SE FOR ERRO DE AUTENTICAÇÃO REAL
            if (error.message === "UNAUTHORIZED") {
                alert("Sessão expirada. Faça login novamente.");
                localStorage.removeItem('inf_auth_token');
                window.location.href = 'login.html';
            } else {
                console.log("Mantendo sessão offline (Servidor pode estar dormindo).");
                // Não faz nada, mantém os dados do cache na tela
            }
        }
    },

    // --- 4. ADICIONAR (INTERFACE OTIMISTA) ---
    async addTransaction(data) {
        const token = this.getToken();
        
        // Cria ID Temporário (Timestamp)
        const tempId = Date.now();
        
        const newItem = {
            ...data,
            id: tempId,
            isTemp: true
        };

        // Adiciona na lista AGORA (UI Instantânea)
        this.transactions.unshift(newItem);
        this.saveToCache();

        try {
            const res = await fetch(`${API_URL}/transactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(data)
            });

            if(!res.ok) throw new Error("Erro ao salvar no servidor");

            const dbItem = await res.json();
            
            // Troca o ID Temporário pelo Real
            const index = this.transactions.findIndex(t => t.id === tempId);
            if(index !== -1) {
                this.transactions[index].id = dbItem.id;
                delete this.transactions[index].isTemp;
                this.saveToCache();
            }

        } catch (error) {
            console.error(error);
            // Se falhar, remove o item temporário para não enganar o usuário
            this.transactions = this.transactions.filter(t => t.id !== tempId);
            this.saveToCache();
            alert("Erro ao salvar. Verifique sua conexão.");
            throw error; // Lança o erro para o app.js saber que falhou
        }
    },

    // --- 5. REMOVER (INTERFACE OTIMISTA) ---
    async removeTransaction(id) {
        const token = this.getToken();
        
        // Backup caso dê erro
        const backup = [...this.transactions];
        
        // Remove da tela AGORA
        this.transactions = this.transactions.filter(t => t.id !== id);
        this.saveToCache();

        try {
            const res = await fetch(`${API_URL}/transactions/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if(!res.ok) throw new Error("Falha ao apagar");
        } catch (err) {
            // Restaura se der erro
            this.transactions = backup;
            this.saveToCache();
            alert("Erro ao apagar transação.");
        }
    },

    // --- 6. META E DÍVIDAS ---
    async setMeta(valor) {
        const token = this.getToken();
        this.meta = valor;
        this.saveToCache();
        
        // Envia sem esperar (fire and forget)
        fetch(`${API_URL}/meta`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ meta: valor })
        });
    },

    getMeta() { return this.meta; },

    async addDebt(name, amount) {
        const token = this.getToken();
        // Otimista
        const tempId = Date.now();
        this.debtors.unshift({ id: tempId, name, amount, paid: false });
        this.saveToCache();

        try {
            const res = await fetch(`${API_URL}/debtors`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ name, amount })
            });
            const realItem = await res.json();
            // Atualiza ID
            const idx = this.debtors.findIndex(d => d.id === tempId);
            if(idx !== -1) { 
                this.debtors[idx].id = realItem.id; 
                this.saveToCache(); 
            }
        } catch(e) {
            this.debtors = this.debtors.filter(d => d.id !== tempId);
            this.saveToCache();
            alert("Erro ao salvar dívida.");
        }
    },

    async toggleDebt(id) {
        const token = this.getToken();
        const index = this.debtors.findIndex(d => d.id === id);
        if(index !== -1) {
            this.debtors[index].paid = !this.debtors[index].paid;
            this.saveToCache();
        }
        
        fetch(`${API_URL}/debtors/${id}/toggle`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    },

    async removeDebt(id) {
        const token = this.getToken();
        this.debtors = this.debtors.filter(d => d.id !== id);
        this.saveToCache();
        
        fetch(`${API_URL}/debtors/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    }
};
