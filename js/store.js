const API_URL = "https://financeiro-app-okjm.onrender.com"; // Seu link do Render
const CACHE_KEY = 'finance_data_cache'; // Chave para salvar no navegador

export const store = {
    transactions: [],
    debtors: [],
    meta: 0,

    getToken() {
        return localStorage.getItem('inf_auth_token');
    },

    // --- SALVAR/CARREGAR DO CACHE LOCAL ---
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
            console.log("⚡ Dados carregados do Cache (Instantâneo)");
            return true; // Avisa que tinha cache
        }
        return false;
    },

    // --- INICIALIZAÇÃO INTELIGENTE ---
    async init() {
        const token = this.getToken();
        if (!token) return;

        // 1. Tenta carregar do cache primeiro (Usuário vê dados na hora)
        const hasCache = this.loadFromCache();
        
        // Se já tinha cache, não precisa travar a UI esperando o servidor.
        // Mas chamamos o servidor em seguida para garantir que está atualizado.
        try {
            console.log("🔄 Sincronizando com o servidor...");

            // Busca tudo em paralelo para ser mais rápido
            const [resTrans, resDebt, resMeta] = await Promise.all([
                fetch(`${API_URL}/transactions`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/debtors`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/meta`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (resTrans.ok) {
                const rawTrans = await resTrans.json();
                // Tradução e atualização
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

            // Salva a versão nova do servidor no cache
            this.saveToCache();
            console.log("✅ Dados sincronizados e cacheados!");

        } catch (error) {
            console.error("⚠️ Sem internet ou erro no servidor. Usando versão local.", error);
            // Se der erro (ex: servidor dormindo), o usuário continua usando o cache que carregou no passo 1.
            if (error.message && (error.message.includes("403") || error.message.includes("401"))) {
                alert("Sessão expirada. Faça login novamente.");
                localStorage.removeItem('inf_auth_token');
                window.location.href = 'login.html';
            }
        }
    },

    // --- ADICIONAR (ATUALIZAÇÃO OTIMISTA) ---
    async addTransaction(data) {
        const token = this.getToken();
        
        // 1. Envia para o servidor
        try {
            const res = await fetch(`${API_URL}/transactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(data)
            });

            if(!res.ok) throw new Error("Erro ao salvar");

            const newDbItem = await res.json();
            
            // 2. Formata o item que voltou do servidor
            const newItemFormatted = {
                id: newDbItem.id,
                desc: newDbItem.description,
                amount: parseFloat(newDbItem.amount),
                type: newDbItem.type,
                category: newDbItem.category,
                date: newDbItem.transaction_date,
                month: newDbItem.month
            };
            
            // 3. Adiciona na lista LOCALMENTE (Sem buscar tudo de novo)
            this.transactions.unshift(newItemFormatted); 
            
            // 4. Atualiza o cache
            this.saveToCache();
            
        } catch (error) {
            console.error(error);
            alert("Erro ao salvar. Verifique a conexão.");
            throw error; // Lança erro para o form não limpar se falhar
        }
    },

    async removeTransaction(id) {
        const token = this.getToken();
        
        // Remove visualmente ANTES de confirmar no servidor (Sensação de rapidez)
        const backup = [...this.transactions]; // Backup caso dê erro
        this.transactions = this.transactions.filter(t => t.id !== id);
        this.saveToCache();

        try {
            await fetch(`${API_URL}/transactions/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (err) {
            // Se der erro, desfaz a remoção
            this.transactions = backup;
            this.saveToCache();
            alert("Erro ao apagar. Tente novamente.");
        }
    },

    // --- META ---
    async setMeta(valor) {
        const token = this.getToken();
        this.meta = valor;
        this.saveToCache(); // Atualiza local

        // Manda pro server (sem await para não travar a UI)
        fetch(`${API_URL}/meta`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ meta: valor })
        });
    },

    getMeta() {
        return this.meta;
    },

    // --- DÍVIDAS (OTIMIZADO) ---
    async addDebt(name, amount) {
        const token = this.getToken();
        
        const res = await fetch(`${API_URL}/debtors`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ name, amount })
        });
        
        const newItem = await res.json();
        
        // Adiciona local e salva
        this.debtors.unshift(newItem);
        this.saveToCache();
    },

    async toggleDebt(id) {
        const token = this.getToken();
        
        // Acha localmente e inverte (UI Instantânea)
        const index = this.debtors.findIndex(d => d.id === id);
        if(index !== -1) {
            this.debtors[index].paid = !this.debtors[index].paid;
            this.saveToCache();
        }

        // Manda pro server
        try {
            await fetch(`${API_URL}/debtors/${id}/toggle`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (err) {
            console.error("Erro ao sincronizar status da dívida");
        }
    },

    async removeDebt(id) {
        const token = this.getToken();
        this.debtors = this.debtors.filter(d => d.id !== id);
        this.saveToCache();

        await fetch(`${API_URL}/debtors/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    }
};
