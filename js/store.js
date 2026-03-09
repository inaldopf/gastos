const API_URL = "https://financeiro-app-okjm.onrender.com";
const CACHE_KEY = 'finance_data_cache';

export const store = {
    transactions: [],
    debtors: [],
    goals: [],
    objectives: [],
    meta: 0,
    vaBalance: 0,
    vaTransactions: [],
    cards: [],
    cardTransactions: [],

    getToken() { return localStorage.getItem('inf_auth_token'); },

    saveToCache() {
        const data = {
            transactions: this.transactions,
            debtors: this.debtors,
            goals: this.goals,
            objectives: this.objectives,
            meta: this.meta,
            vaBalance: this.vaBalance,
            vaTransactions: this.vaTransactions,
            cards: this.cards,
            cardTransactions: this.cardTransactions,
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
                this.objectives = data.objectives || [];
                this.meta = data.meta || 0;
                this.vaBalance = data.vaBalance || 0;
                this.vaTransactions = data.vaTransactions || [];
                this.cards = data.cards || [];
                this.cardTransactions = data.cardTransactions || [];
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
            const [resTrans, resDebt, resMeta, resGoals, resVA, resObj, resCards, resCardTrans] = await Promise.all([
                fetch(`${API_URL}/transactions`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/debtors`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/meta`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/goals`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/va`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/objectives`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/cards`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/card-transactions`, { headers: { 'Authorization': `Bearer ${token}` } })
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
                this.vaTransactions = d.transactions || []; 
            }
            if (resObj && resObj.ok) {
                this.objectives = await resObj.json();
            }
            if (resCards && resCards.ok) this.cards = await resCards.json();
            if (resCardTrans && resCardTrans.ok) this.cardTransactions = await resCardTrans.json();
            
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

    async updateVA(amount, type, desc, date, month) {
        const token = this.getToken();
        const val = parseFloat(amount);
        
        if (type === 'credit') this.vaBalance += val; else this.vaBalance -= val;
        
        const tempId = Date.now();
        this.vaTransactions.unshift({ id: tempId, description: desc, amount: val, type, transaction_date: date, month, isTemp: true });
        this.saveToCache();

        try {
            const res = await fetch(`${API_URL}/va`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ amount: val, type, desc, date, month })
            });
            const d = await res.json();
            this.vaBalance = d.newBalance;
            
            const idx = this.vaTransactions.findIndex(t => t.id === tempId);
            if (idx !== -1 && d.transaction) {
                this.vaTransactions[idx].id = d.transaction.id;
                delete this.vaTransactions[idx].isTemp;
            }
            this.saveToCache();
        } catch (e) { alert("Erro Sync VA"); }
    },

    async removeVATransaction(id) {
        const token = this.getToken();
        const t = this.vaTransactions.find(x => x.id === id);
        if(t) {
            if(t.type === 'credit') this.vaBalance -= parseFloat(t.amount);
            else this.vaBalance += parseFloat(t.amount);
        }
        this.vaTransactions = this.vaTransactions.filter(x => x.id !== id);
        this.saveToCache();

        try {
            await fetch(`${API_URL}/va/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }});
        } catch(e) { alert("Erro ao apagar VA"); }
    },

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
    },

    async addCard(name, limit_amount, closing_day, due_day) {
        const token = this.getToken();
        try {
            const res = await fetch(`${API_URL}/cards`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ name, limit_amount: parseFloat(limit_amount), closing_day: parseInt(closing_day), due_day: parseInt(due_day) })
            });
            const dbItem = await res.json();
            this.cards.push(dbItem);
            this.saveToCache();
        } catch(e) { console.error(e); }
    },

    async removeCard(id) {
        const token = this.getToken();
        this.cards = this.cards.filter(c => c.id !== id);
        this.cardTransactions = this.cardTransactions.filter(t => t.card_id !== id); 
        this.saveToCache();
        fetch(`${API_URL}/cards/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    },

    async addCardTransaction(data) {
        const token = this.getToken();
        try {
            const res = await fetch(`${API_URL}/card-transactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(data)
            });
            const dbItem = await res.json();
            this.cardTransactions.unshift(dbItem);
            this.saveToCache();
        } catch(e) { console.error(e); }
    },

    async removeCardTransaction(id) {
        const token = this.getToken();
        this.cardTransactions = this.cardTransactions.filter(t => t.id !== id);
        this.saveToCache();
        fetch(`${API_URL}/card-transactions/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    }
};
