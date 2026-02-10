// ✅ URL correta do seu Render
const API_URL = "https://financeiro-app-okjm.onrender.com";

export const store = {
    transactions: [],
    debtors: [], // <--- Faltava isso (Lista de Dívidas)
    meta: 0,

    getToken() {
        return localStorage.getItem('inf_auth_token');
    },

    // --- CARREGAR DADOS ---
    async init() {
        const token = this.getToken();
        if (!token) return;

        try {
            console.log("🔄 Buscando dados no servidor...");

            // 1. Pega Transações
            const resTrans = await fetch(`${API_URL}/transactions`, { 
                headers: { 'Authorization': `Bearer ${token}` } 
            });
            
            if (!resTrans.ok) throw new Error("Falha ao buscar transações");

            const rawData = await resTrans.json();
            
            // Traduzir do "Banquês" para o "Javascriptês"
            this.transactions = rawData.map(dbItem => ({
                id: dbItem.id,
                desc: dbItem.description,       
                amount: parseFloat(dbItem.amount), 
                type: dbItem.type,
                category: dbItem.category,
                date: dbItem.transaction_date,  
                month: dbItem.month
            }));

            // 2. Pega Dívidas (Faltava isso)
            const resDebt = await fetch(`${API_URL}/debtors`, { 
                headers: { 'Authorization': `Bearer ${token}` } 
            });
            this.debtors = await resDebt.json();

            // 3. Pega Meta
            const resMeta = await fetch(`${API_URL}/meta`, { 
                headers: { 'Authorization': `Bearer ${token}` } 
            });
            const metaData = await resMeta.json();
            this.meta = parseFloat(metaData.meta) || 0;
            
            console.log("✅ Dados carregados com sucesso!");

        } catch (error) {
            console.error("❌ Erro ao carregar dados:", error);
            if (error.message.includes("403") || error.message.includes("401")) {
                alert("Sessão expirada. Faça login novamente.");
                localStorage.removeItem('inf_auth_token');
                window.location.href = 'login.html';
            }
        }
    },

    // --- TRANSAÇÕES ---
    async addTransaction(data) {
        const token = this.getToken();
        try {
            const res = await fetch(`${API_URL}/transactions`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            if(!res.ok) throw new Error("Erro ao salvar");

            const newDbItem = await res.json();
            
            const newItemFormatted = {
                id: newDbItem.id,
                desc: newDbItem.description,
                amount: parseFloat(newDbItem.amount),
                type: newDbItem.type,
                category: newDbItem.category,
                date: newDbItem.transaction_date,
                month: newDbItem.month
            };
            
            this.transactions.unshift(newItemFormatted); 
            
        } catch (error) {
            console.error(error);
            alert("Erro ao salvar no banco.");
        }
    },

    async removeTransaction(id) {
        const token = this.getToken();
        await fetch(`${API_URL}/transactions/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        this.transactions = this.transactions.filter(t => t.id !== id);
    },

    // --- META ---
    async setMeta(valor) {
        const token = this.getToken();
        this.meta = valor;
        await fetch(`${API_URL}/meta`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ meta: valor })
        });
    },

    getMeta() {
        return this.meta;
    },

    // --- DÍVIDAS (Faltava tudo isso abaixo) ---
    async addDebt(name, amount) {
        const token = this.getToken();
        const res = await fetch(`${API_URL}/debtors`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ name, amount })
        });
        const newItem = await res.json();
        this.debtors.unshift(newItem);
    },

    async toggleDebt(id) {
        const token = this.getToken();
        const res = await fetch(`${API_URL}/debtors/${id}/toggle`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const updated = await res.json();
        
        const index = this.debtors.findIndex(d => d.id === id);
        if(index !== -1) this.debtors[index].paid = updated.paid;
    },

    async removeDebt(id) {
        const token = this.getToken();
        await fetch(`${API_URL}/debtors/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        this.debtors = this.debtors.filter(d => d.id !== id);
    }
};
