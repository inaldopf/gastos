const API_URL = "https://financeiro-app-okjm.onrender.com"; // Seu link
const CACHE_KEY = 'finance_data_cache';

export const store = {
    transactions: [],
    debtors: [],
    meta: 0,

    getToken() {
        return localStorage.getItem('inf_auth_token');
    },

    // --- CACHE (MANTENHA IGUAL) ---
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
            const data = JSON.parse(cached);
            this.transactions = data.transactions || [];
            this.debtors = data.debtors || [];
            this.meta = data.meta || 0;
            return true;
        }
        return false;
    },

    // --- INIT (MANTENHA IGUAL) ---
    async init() {
        const token = this.getToken();
        if (!token) return;

        // Tenta cache primeiro
        this.loadFromCache();

        try {
            // Busca dados novos
            const [resTrans, resDebt, resMeta] = await Promise.all([
                fetch(`${API_URL}/transactions`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/debtors`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/meta`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (resTrans.ok) {
                const rawTrans = await resTrans.json();
                this.transactions = rawTrans.map(dbItem => ({
                    id: dbItem.id,
                    desc: dbItem.description,
                    amount: parseFloat(dbItem.amount),
                    type: dbItem.type,
                    category: dbItem.category,
                    date: dbItem.transaction_date,
                    month: dbItem.month
                }));
            }

            if (resDebt.ok) this.debtors = await resDebt.json();
            
            if (resMeta.ok) {
                const metaData = await resMeta.json();
                this.meta = parseFloat(metaData.meta) || 0;
            }

            this.saveToCache();
        } catch (error) {
            console.log("Usando dados offline.");
        }
    },

    // --- A MÁGICA ACONTECE AQUI (ADD INSTANTÂNEO) ---
    async addTransaction(data) {
        const token = this.getToken();
        
        // 1. Cria um ID provisório (baseado no horário)
        const tempId = Date.now();
        
        const newItem = {
            id: tempId,
            desc: data.desc,
            amount: data.amount,
            type: data.type,
            category: data.category,
            date: data.date,
            month: data.month,
            isTemp: true // Marca que é temporário
        };

        // 2. Adiciona na lista AGORA (Não espera o servidor)
        this.transactions.unshift(newItem);
        this.saveToCache();

        // 3. Manda para o servidor em "segundo plano"
        // (Note que NÃO tem 'await' aqui, para não travar a tela)
        fetch(`${API_URL}/transactions`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify(data)
        })
        .then(async res => {
            if(!res.ok) throw new Error("Erro server");
            const dbItem = await res.json();
            
            // 4. Quando o servidor responder, trocamos o ID temporário pelo Real
            const index = this.transactions.findIndex(t => t.id === tempId);
            if(index !== -1) {
                this.transactions[index].id = dbItem.id;
                this.transactions[index].isTemp = false; // Não é mais temporário
                this.saveToCache(); // Atualiza o cache com o ID real
            }
        })
        .catch(err => {
            console.error("Erro silencioso ao salvar:", err);
            // Opcional: Colocar um ícone de "erro" no item da lista
        });

        // Retorna imediatamente para o app.js limpar o formulário
        return; 
    },

    // --- REMOVER (TAMBÉM INSTANTÂNEO) ---
    async removeTransaction(id) {
        const token = this.getToken();
        
        // Remove visualmente NA HORA
        const backup = [...this.transactions];
        this.transactions = this.transactions.filter(t => t.id !== id);
        this.saveToCache();

        // Manda pro servidor depois
        fetch(`${API_URL}/transactions/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        }).catch(err => {
            // Se der erro, volta o item
            this.transactions = backup;
            this.saveToCache();
            alert("Erro de conexão. Não foi possível apagar.");
        });
    },

    // --- MÉTODOS DE META E DÍVIDA (MANTENHA IGUAL) ---
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

    async addDebt(name, amount) {
        const token = this.getToken();
        // Otimista
        const tempId = Date.now();
        this.debtors.unshift({ id: tempId, name, amount, paid: false });
        this.saveToCache();

        fetch(`${API_URL}/debtors`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ name, amount })
        }).then(async res => {
            const realItem = await res.json();
            const idx = this.debtors.findIndex(d => d.id === tempId);
            if(idx !== -1) { this.debtors[idx].id = realItem.id; this.saveToCache(); }
        });
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
