const API_URL = "https://financeiro-app-okjm.onrender.com"; // Seu link
const CACHE_KEY = 'finance_data_cache';

export const store = {
    transactions: [],
    debtors: [],
    meta: 0,

    getToken() { return localStorage.getItem('inf_auth_token'); },

    // --- CACHE (Mantém igual) ---
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

    // --- INIT ---
    async init() {
        const token = this.getToken();
        if (!token) return;

        this.loadFromCache(); // Carrega o que tem

        try {
            console.log("🔄 Sincronizando com o banco...");
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
                const d = await resMeta.json();
                this.meta = parseFloat(d.meta) || 0;
            }

            this.saveToCache();
            console.log("✅ Banco sincronizado!");
        } catch (error) {
            console.error("⚠️ Usando dados offline:", error);
        }
    },

    // --- ADICIONAR COM SEGURANÇA ---
    async addTransaction(data) {
        const token = this.getToken();

        // 1. Cria objeto temporário
        const newItem = {
            ...data,
            id: Date.now(), // ID provisório
            isTemp: true
        };

        // 2. Adiciona LOCALMENTE (para a UI já ter o dado se quisermos desenhar)
        this.transactions.unshift(newItem);
        this.saveToCache();

        // 3. TENTA SALVAR NO BANCO (AGORA COM AWAIT PARA GARANTIR)
        try {
            const res = await fetch(`${API_URL}/transactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(data)
            });

            if(!res.ok) throw new Error("Erro no servidor");

            const dbItem = await res.json();
            
            // 4. Substitui o item temporário pelo real (com ID do banco)
            // Isso evita duplicidade se a pessoa recarregar a página
            const index = this.transactions.findIndex(t => t.id === newItem.id);
            if(index !== -1) {
                this.transactions[index] = {
                    id: dbItem.id,
                    desc: dbItem.description,
                    amount: parseFloat(dbItem.amount),
                    type: dbItem.type,
                    category: dbItem.category,
                    date: dbItem.transaction_date,
                    month: dbItem.month
                };
                this.saveToCache();
            }
            
            return true; // Sucesso

        } catch (error) {
            // Se der erro, removemos o item da lista para não enganar o usuário
            this.transactions = this.transactions.filter(t => t.id !== newItem.id);
            this.saveToCache();
            alert("❌ Erro ao salvar! O servidor pode estar offline ou dormindo. Tente novamente em alguns segundos.");
            throw error;
        }
    },

    // --- DEMAIS MÉTODOS ---
    async removeTransaction(id) {
        const token = this.getToken();
        const backup = [...this.transactions];
        this.transactions = this.transactions.filter(t => t.id !== id);
        this.saveToCache();

        try {
            await fetch(`${API_URL}/transactions/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
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

    // Dívidas (Mesma lógica segura)
    async addDebt(name, amount) {
        const token = this.getToken();
        try {
            const res = await fetch(`${API_URL}/debtors`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ name, amount })
            });
            const newItem = await res.json();
            this.debtors.unshift(newItem);
            this.saveToCache();
        } catch(e) { alert("Erro ao salvar dívida."); }
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
