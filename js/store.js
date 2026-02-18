const API_URL = "https://financeiro-app-okjm.onrender.com";
const CACHE_KEY = 'finance_data_cache';

export const store = {
    transactions: [],
    debtors: [],
    goals: [],
    meta: 0,
    vaBalance: 0,

    getToken() { return localStorage.getItem('inf_auth_token'); },

    saveToCache() {
        const data = {
            transactions: this.transactions,
            debtors: this.debtors,
            goals: this.goals,
            meta: this.meta,
            vaBalance: this.vaBalance,
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
                this.meta = data.meta || 0;
                this.vaBalance = data.vaBalance || 0;
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
            const [resTrans, resDebt, resMeta, resGoals, resVA] = await Promise.all([
                fetch(`${API_URL}/transactions`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/debtors`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/meta`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/goals`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/va`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

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
            if (resGoals && resGoals.ok) this.goals = await resGoals.json();
            if (resVA && resVA.ok) {
                const d = await resVA.json();
                this.vaBalance = parseFloat(d.balance) || 0;
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

    async addTransaction(data) {
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
            alert("Erro ao salvar.");
        }
    },

    async removeTransaction(id) {
        const token = this.getToken();
        const backup = [...this.transactions];
        this.transactions = this.transactions.filter(t => t.id !== id);
        this.saveToCache();
        try {
            await fetch(`${API_URL}/transactions/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        } catch (err) {
            this.transactions = backup;
            this.saveToCache();
            alert("Erro ao apagar.");
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

    async setCategoryGoal(category, amount) {
        const token = this.getToken();
        this.goals = this.goals.filter(g => g.category !== category);
        if (amount > 0) this.goals.push({ category, amount: parseFloat(amount) });
        this.saveToCache();
        try {
            await fetch(`${API_URL}/goals`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ category, amount: parseFloat(amount) })
            });
        } catch (error) { console.error("Erro goal:", error); }
    },

    getGoal(category) {
        const g = this.goals.find(g => g.category === category);
        return g ? g.amount : 0;
    },

    async addDebt(name, amount) {
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
        } catch(e) { this.debtors = this.debtors.filter(d => d.id !== tempId); this.saveToCache(); }
    },

    async toggleDebt(id) {
        const token = this.getToken();
        const idx = this.debtors.findIndex(d => d.id === id);
        if(idx !== -1) { this.debtors[idx].paid = !this.debtors[idx].paid; this.saveToCache(); }
        fetch(`${API_URL}/debtors/${id}/toggle`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } });
    },

    async removeDebt(id) {
        const token = this.getToken();
        this.debtors = this.debtors.filter(d => d.id !== id);
        this.saveToCache();
        fetch(`${API_URL}/debtors/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    },

    async updateVA(amount, type) {
        const token = this.getToken();
        const val = parseFloat(amount);
        if (type === 'credit') this.vaBalance += val; else this.vaBalance -= val;
        this.saveToCache();
        try {
            await fetch(`${API_URL}/va`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ amount: val, type })
            });
        } catch (e) { alert("Erro Sync VA"); }
    }
};
