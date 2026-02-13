const API_URL = "https://financeiro-app-okjm.onrender.com";
const CACHE_KEY = 'finance_data_cache';
const GOALS_KEY = 'finance_goals_local'; // Nova chave para as metas

export const store = {
    transactions: [],
    debtors: [],
    goals: [], // Lista de metas
    meta: 0,

    getToken() {
        return localStorage.getItem('inf_auth_token');
    },

    saveToCache() {
        const data = {
            transactions: this.transactions,
            debtors: this.debtors,
            meta: this.meta,
            timestamp: new Date().getTime()
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    },

    // Salva as metas separadamente (Local)
    saveGoals() {
        localStorage.setItem(GOALS_KEY, JSON.stringify(this.goals));
    },

    loadFromCache() {
        // Carrega Metas
        const cachedGoals = localStorage.getItem(GOALS_KEY);
        if (cachedGoals) {
            this.goals = JSON.parse(cachedGoals);
        }

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

    async init() {
        const token = this.getToken();
        if (!token) return;

        this.loadFromCache();

        try {
            console.log("🔄 Sincronizando com o servidor...");
            
            const [resTrans, resDebt, resMeta] = await Promise.all([
                fetch(`${API_URL}/transactions`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/debtors`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/meta`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (resTrans.status === 401 || resTrans.status === 403) {
                throw new Error("UNAUTHORIZED");
            }

            if (resTrans.ok) {
                const rawTrans = await resTrans.json();
                this.transactions = rawTrans.map(dbItem => {
                    let dateStr = dbItem.transaction_date;
                    if (dateStr && !dateStr.includes('/')) {
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

            this.saveToCache();
            console.log("✅ Dados sincronizados!");

        } catch (error) {
            console.error("⚠️ Erro na sincronização:", error);
            if (error.message === "UNAUTHORIZED") {
                alert("Sessão expirada. Faça login novamente.");
                localStorage.removeItem('inf_auth_token');
                window.location.href = 'login.html';
            }
        }
    },

    async addTransaction(data) {
        // ... (Mantido igual ao anterior, sem alterações na lógica de transação)
        const token = this.getToken();
        const tempId = Date.now();
        const newItem = { ...data, id: tempId, isTemp: true };
        this.transactions.unshift(newItem);
        this.saveToCache();
        try {
            const res = await fetch(`${API_URL}/transactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(data)
            });
            if(!res.ok) throw new Error("Erro ao salvar");
            const dbItem = await res.json();
            const index = this.transactions.findIndex(t => t.id === tempId);
            if(index !== -1) {
                this.transactions[index].id = dbItem.id;
                delete this.transactions[index].isTemp;
                this.saveToCache();
            }
        } catch (error) {
            this.transactions = this.transactions.filter(t => t.id !== tempId);
            this.saveToCache();
            alert("Erro ao salvar. Verifique sua conexão.");
            throw error;
        }
    },

    async removeTransaction(id) {
        // ... (Mantido igual)
        const token = this.getToken();
        const backup = [...this.transactions];
        this.transactions = this.transactions.filter(t => t.id !== id);
        this.saveToCache();
        try {
            const res = await fetch(`${API_URL}/transactions/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            if(!res.ok) throw new Error("Falha ao apagar");
        } catch (err) {
            this.transactions = backup;
            this.saveToCache();
            alert("Erro ao apagar transação.");
        }
    },

    async setMeta(valor) {
        const token = this.getToken();
        this.meta = valor;
        this.saveToCache();
        fetch(`${API_URL}/meta`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ meta: valor })
        });
    },
    getMeta() { return this.meta; },

    async addDebt(name, amount) { /* ... Mantido igual ... */
        const token = this.getToken();
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
            const idx = this.debtors.findIndex(d => d.id === tempId);
            if(idx !== -1) { this.debtors[idx].id = realItem.id; this.saveToCache(); }
        } catch(e) { this.debtors = this.debtors.filter(d => d.id !== tempId); this.saveToCache(); alert("Erro ao salvar dívida."); }
    },
    async toggleDebt(id) { /* ... Mantido igual ... */ 
        const token = this.getToken();
        const idx = this.debtors.findIndex(d => d.id === id);
        if(idx !== -1) { this.debtors[idx].paid = !this.debtors[idx].paid; this.saveToCache(); }
        fetch(`${API_URL}/debtors/${id}/toggle`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } });
    },
    async removeDebt(id) { /* ... Mantido igual ... */
        const token = this.getToken();
        this.debtors = this.debtors.filter(d => d.id !== id);
        this.saveToCache();
        fetch(`${API_URL}/debtors/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    },

    // --- NOVAS FUNÇÕES DE METAS (GOALS) ---
    setCategoryGoal(category, amount) {
        // Remove meta anterior dessa categoria se existir
        this.goals = this.goals.filter(g => g.category !== category);
        if (amount > 0) {
            this.goals.push({ category, amount: parseFloat(amount) });
        }
        this.saveGoals();
    },

    getGoal(category) {
        const g = this.goals.find(g => g.category === category);
        return g ? g.amount : 0;
    }
};
