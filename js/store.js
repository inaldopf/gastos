// ==========================================
// ARQUIVO: js/store.js (COM SYNC DE METAS)
// ==========================================

const API_URL = "https://financeiro-app-okjm.onrender.com";
const CACHE_KEY = 'finance_data_cache';

export const store = {
    transactions: [],
    debtors: [],
    goals: [], // Lista de metas por categoria
    meta: 0,   // Meta de Sobra Geral

    getToken() {
        return localStorage.getItem('inf_auth_token');
    },

    // --- GERENCIAMENTO DE CACHE ---
    saveToCache() {
        const data = {
            transactions: this.transactions,
            debtors: this.debtors,
            goals: this.goals,
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
                this.meta = data.meta || 0;
                return true;
            } catch (e) {
                console.error("Erro ao ler cache", e);
                return false;
            }
        }
        return false;
    },

    // --- INICIALIZAÇÃO (CARREGA DO BANCO) ---
    async init() {
        const token = this.getToken();
        if (!token) return;

        this.loadFromCache();

        try {
            console.log("🔄 Sincronizando com o servidor...");
            
            // Busca tudo em paralelo: Transações, Dívidas, Meta Geral e METAS POR CATEGORIA
            const [resTrans, resDebt, resMeta, resGoals] = await Promise.all([
                fetch(`${API_URL}/transactions`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/debtors`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/meta`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/goals`, { headers: { 'Authorization': `Bearer ${token}` } }) // Novo endpoint
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

            // Carrega as metas do banco
            if (resGoals && resGoals.ok) {
                this.goals = await resGoals.json();
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

    // --- TRANSAÇÕES ---
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
            alert("Erro de conexão ao salvar transação.");
            throw error;
        }
    },

    async removeTransaction(id) {
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

    // --- META DE SOBRA (GERAL) ---
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

    // --- METAS POR CATEGORIA (SYNC COM BANCO) ---
    async setCategoryGoal(category, amount) {
        const token = this.getToken();
        
        // 1. Atualização Otimista (Visual Instantâneo)
        // Remove meta anterior dessa categoria (para não duplicar)
        this.goals = this.goals.filter(g => g.category !== category);
        
        if (amount > 0) {
            this.goals.push({ category, amount: parseFloat(amount) });
        }
        this.saveToCache();

        // 2. Envia para o Banco
        try {
            await fetch(`${API_URL}/goals`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ category, amount: parseFloat(amount) })
            });
        } catch (error) {
            console.error("Erro ao salvar meta no servidor:", error);
            // Não bloqueamos o uso, mas fica o log
        }
    },

    getGoal(category) {
        const g = this.goals.find(g => g.category === category);
        return g ? g.amount : 0;
    },

    // --- DÍVIDAS ---
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
        } catch(e) {
            this.debtors = this.debtors.filter(d => d.id !== tempId);
            this.saveToCache();
            alert("Erro ao salvar dívida.");
        }
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
    }
};
