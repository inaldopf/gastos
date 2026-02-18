const API_URL = "https://financeiro-app-okjm.onrender.com";
const CACHE_KEY = 'finance_data_cache';

export const store = {
    transactions: [],
    debtors: [],
    goals: [],
    vaTransactions: [], // NOVA LISTA
    meta: 0,

    getToken() {
        return localStorage.getItem('inf_auth_token');
    },

    saveToCache() {
        const data = {
            transactions: this.transactions,
            debtors: this.debtors,
            goals: this.goals,
            vaTransactions: this.vaTransactions, // Salva no cache
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
                this.goals = data.goals || [];
                this.vaTransactions = data.vaTransactions || []; // Carrega do cache
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
            console.log("🔄 Sincronizando...");
            
            // Adicionado o fetch do /va
            const [resTrans, resDebt, resMeta, resGoals, resVA] = await Promise.all([
                fetch(`${API_URL}/transactions`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/debtors`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/meta`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/goals`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/va`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (resTrans.status === 401) throw new Error("UNAUTHORIZED");

            if (resTrans.ok) {
                const rawTrans = await resTrans.json();
                this.transactions = this.normalizeTransactions(rawTrans);
            }
            if (resDebt.ok) this.debtors = await resDebt.json();
            if (resMeta.ok) { const d = await resMeta.json(); this.meta = parseFloat(d.meta) || 0; }
            if (resGoals && resGoals.ok) this.goals = await resGoals.json();
            if (resVA && resVA.ok) this.vaTransactions = await resVA.json(); // Salva dados do VA

            this.saveToCache();

        } catch (error) {
            console.error("Erro sync:", error);
            if (error.message === "UNAUTHORIZED") {
                localStorage.removeItem('inf_auth_token');
                window.location.href = 'login.html';
            }
        }
    },

    // Helper para formatar datas vindo do banco
    normalizeTransactions(raw) {
        return raw.map(dbItem => {
            let dateStr = dbItem.transaction_date || dbItem.date;
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
    },

    // --- FUNÇÕES GERAIS MANTIDAS (addTransaction, etc) ---
    async addTransaction(data) {
        const token = this.getToken();
        const tempId = Date.now();
        this.transactions.unshift({ ...data, id: tempId, isTemp: true });
        this.saveToCache();
        try {
            const res = await fetch(`${API_URL}/transactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(data)
            });
            const dbItem = await res.json();
            const index = this.transactions.findIndex(t => t.id === tempId);
            if(index !== -1) { this.transactions[index].id = dbItem.id; delete this.transactions[index].isTemp; this.saveToCache(); }
        } catch (error) { this.transactions = this.transactions.filter(t => t.id !== tempId); this.saveToCache(); alert("Erro ao salvar."); }
    },
    
    async removeTransaction(id) {
        const token = this.getToken();
        const backup = [...this.transactions];
        this.transactions = this.transactions.filter(t => t.id !== id);
        this.saveToCache();
        try { await fetch(`${API_URL}/transactions/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }); } 
        catch (err) { this.transactions = backup; this.saveToCache(); }
    },

    async setMeta(valor) {
        this.meta = valor; this.saveToCache();
        fetch(`${API_URL}/meta`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.getToken()}` }, body: JSON.stringify({ meta: valor }) });
    },
    getMeta() { return this.meta; },

    async setCategoryGoal(category, amount) {
        this.goals = this.goals.filter(g => g.category !== category);
        if (amount > 0) this.goals.push({ category, amount: parseFloat(amount) });
        this.saveToCache();
        fetch(`${API_URL}/goals`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.getToken()}` }, body: JSON.stringify({ category, amount: parseFloat(amount) }) });
    },
    getGoal(category) { const g = this.goals.find(g => g.category === category); return g ? g.amount : 0; },

    async addDebt(name, amount) {
        const tempId = Date.now();
        this.debtors.unshift({ id: tempId, name, amount, paid: false });
        this.saveToCache();
        try {
            const res = await fetch(`${API_URL}/debtors`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.getToken()}` }, body: JSON.stringify({ name, amount }) });
            const item = await res.json();
            const idx = this.debtors.findIndex(d => d.id === tempId);
            if(idx!==-1){ this.debtors[idx].id = item.id; this.saveToCache(); }
        } catch(e) { this.debtors = this.debtors.filter(d => d.id !== tempId); this.saveToCache(); }
    },
    async toggleDebt(id) {
        const idx = this.debtors.findIndex(d => d.id === id);
        if(idx!==-1){ this.debtors[idx].paid = !this.debtors[idx].paid; this.saveToCache(); }
        fetch(`${API_URL}/debtors/${id}/toggle`, { method: 'PUT', headers: { 'Authorization': `Bearer ${this.getToken()}` } });
    },
    async removeDebt(id) {
        this.debtors = this.debtors.filter(d => d.id !== id); this.saveToCache();
        fetch(`${API_URL}/debtors/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${this.getToken()}` } });
    },

    // --- FUNÇÕES VA (NOVAS) ---
    async addVaTransaction(data) {
        const tempId = Date.now();
        this.vaTransactions.unshift({ ...data, id: tempId });
        this.saveToCache();
        
        try {
            const res = await fetch(`${API_URL}/va`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.getToken()}` },
                body: JSON.stringify(data)
            });
            const dbItem = await res.json();
            const index = this.vaTransactions.findIndex(t => t.id === tempId);
            if(index !== -1) { this.vaTransactions[index].id = dbItem.id; this.saveToCache(); }
        } catch (err) {
            this.vaTransactions = this.vaTransactions.filter(t => t.id !== tempId);
            this.saveToCache();
            alert("Erro ao salvar no VA.");
        }
    },

    async removeVaTransaction(id) {
        const backup = [...this.vaTransactions];
        this.vaTransactions = this.vaTransactions.filter(t => t.id !== id);
        this.saveToCache();
        try {
            await fetch(`${API_URL}/va/${id}`, { method: '
