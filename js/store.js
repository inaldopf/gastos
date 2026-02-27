const API_URL = "https://financeiro-app-okjm.onrender.com";
const CACHE_KEY = 'finance_data_cache';

export const store = {
    transactions: [],
    debtors: [],
    goals: [],
    objectives: [], // <--- NOVO
    meta: 0,
    vaBalance: 0,
    vaTransactions: [],

    getToken() { return localStorage.getItem('inf_auth_token'); },

    saveToCache() {
        const data = {
            transactions: this.transactions,
            debtors: this.debtors,
            goals: this.goals,
            objectives: this.objectives, // <--- NOVO
            meta: this.meta,
            vaBalance: this.vaBalance,
            vaTransactions: this.vaTransactions,
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
                this.goals = data.goals || [];
                this.objectives = data.objectives || []; // <--- NOVO
                this.meta = data.meta || 0;
                this.vaBalance = data.vaBalance || 0;
                this.vaTransactions = data.vaTransactions || [];
                return true;
            } catch (e) { return false; }
        }
        return false;
    },

    async init() {
        const token = this.getToken();
        if (!token) return;
        this.loadFromCache();

        try {
            const [resTrans, resDebt, resMeta, resGoals, resVA, resObj] = await Promise.all([
                fetch(`${API_URL}/transactions`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/debtors`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/meta`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/goals`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/va`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/objectives`, { headers: { 'Authorization': `Bearer ${token}` } }) // <--- NOVO
            ]);

            if (resTrans.ok) {
                const rawTrans = await resTrans.json();
                this.transactions = rawTrans.map(dbItem => {
                    let dateStr = dbItem.transaction_date;
                    if (dateStr && !dateStr.includes('/')) {
                        const parts = dateStr.split('-');
                        if(parts.length === 3) dateStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
                    }
                    return { ...dbItem, amount: parseFloat(dbItem.amount), date: dateStr };
                });
            }
            if (resDebt.ok) this.debtors = await resDebt.json();
            if (resMeta.ok) {
                const d = await resMeta.json();
                this.meta = parseFloat(d.meta) || 0;
            }
            if (resGoals && resGoals.ok) this.goals = await resGoals.json();
            if (resVA && resVA.ok) {
                const d = await resVA.json();
                this.vaBalance = parseFloat(d.balance) || 0;
                this.vaTransactions = d.transactions || []; 
            }
            if (resObj && resObj.ok) {
                this.objectives = await resObj.json(); // <--- NOVO
            }
            this.saveToCache();
        } catch (error) { 
            console.error("Erro sync:", error); 
            if (error.message === "UNAUTHORIZED") {
                localStorage.removeItem('inf_auth_token');
                window.location.href = 'login.html';
            }
        }
    },

    // ... [MANTENHA addTransaction, removeTransaction, setMeta, getMeta, setCategoryGoal, getGoal, addDebt, toggleDebt, removeDebt, updateVA, removeVATransaction AQUI] ...

    // --- MÉTODOS DE OBJETIVOS (NOVO) ---
    async addObjective(title, targetAmount) {
        const token = this.getToken();
        const tempId = Date.now();
        this.objectives.unshift({ id: tempId, title, target_amount: targetAmount, current_amount: 0 });
        this.saveToCache();
        try {
            const res = await fetch(`${API_URL}/objectives`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ title, target_amount: targetAmount })
            });
            const dbItem = await res.json();
            const idx = this.objectives.findIndex(o => o.id === tempId);
            if(idx !== -1) { this.objectives[idx].id = dbItem.id; this.saveToCache(); }
        } catch(e) { 
            this.objectives = this.objectives.filter(o => o.id !== tempId); 
            this.saveToCache(); 
        }
    },

    async addMoneyToObjective(id, amountToAdd) {
        const token = this.getToken();
        const idx = this.objectives.findIndex(o => o.id === id);
        if(idx !== -1) { 
            this.objectives[idx].current_amount = parseFloat(this.objectives[idx].current_amount) + parseFloat(amountToAdd); 
            this.saveToCache(); 
        }
        try {
            await fetch(`${API_URL}/objectives/${id}/add`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ amountToAdd })
            });
        } catch (e) { console.error("Erro ao adicionar saldo", e); }
    },

    async removeObjective(id) {
        const token = this.getToken();
        this.objectives = this.objectives.filter(o => o.id !== id);
        this.saveToCache();
        fetch(`${API_URL}/objectives/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    }
};
