const API_URL = "https://financeiro-app-okjm.onrender.com";

export const store = {
    transactions: [],
    debtors: [],
    cards: [],
    objectives: [],
    vaTransactions: [],
    meta: 0,

    getToken() {
        return localStorage.getItem('inf_auth_token');
    },

    // --- CARREGAR DADOS (COM CORREÇÃO DE MAPEAMENTO) ---
    async init() {
        const token = this.getToken();
        if (!token) return;

        try {
            console.log("🔄 Buscando dados no servidor...");

            // 0. Verifica Recorrências (Cria automáticas se virou o mês)
            const resRecur = await fetch(`${API_URL}/transactions/check-recurring`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (resRecur.status === 401 || resRecur.status === 403) throw new Error("UNAUTHORIZED");

            // 1. Pega Transações
            const resTrans = await fetch(`${API_URL}/transactions`, { 
                headers: { 'Authorization': `Bearer ${token}` } 
            });
            
            if (resTrans.status === 401 || resTrans.status === 403) throw new Error("UNAUTHORIZED");
            if (!resTrans.ok) throw new Error("Falha ao buscar transações");

            const rawData = await resTrans.json();
            
            console.log("📦 Dados brutos do Banco:", rawData);

            // AQUI ESTÁ O PULO DO GATO: Traduzir do "Banquês" para o "Javascriptês"
            this.transactions = rawData.map(dbItem => ({
                id: dbItem.id,
                desc: dbItem.description,       // Banco: description -> App: desc
                amount: parseFloat(dbItem.amount), // Banco: "10.00" (String) -> App: 10.00 (Number)
                type: dbItem.type,
                category: dbItem.category,
                date: dbItem.transaction_date,  // Banco: transaction_date -> App: date
                month: dbItem.month,
                isRecurring: dbItem.is_recurring
            }));

            console.log("✅ Dados traduzidos para o App:", this.transactions);

            // 2. Pega Meta
            const resMeta = await fetch(`${API_URL}/meta`, { 
                headers: { 'Authorization': `Bearer ${token}` } 
            });
            if (resMeta.status === 401 || resMeta.status === 403) throw new Error("UNAUTHORIZED");
            const metaData = await resMeta.json();
            this.meta = parseFloat(metaData.meta) || 0;
            
            // 3. Pega Devedores
            const resDebtors = await fetch(`${API_URL}/debtors`, { 
                headers: { 'Authorization': `Bearer ${token}` } 
            });
            if (resDebtors.ok) {
                this.debtors = (await resDebtors.json()) || [];
            }
            
        } catch (error) {
            console.error("❌ Erro ao carregar dados:", error);
            if (error.message === "UNAUTHORIZED" || error.message.includes("403") || error.message.includes("401")) {
                alert("Sessão expirada. Faça login novamente.");
                localStorage.removeItem('inf_auth_token');
                window.location.href = 'login.html';
            }
        }
    },

    // --- ADICIONAR (MANDA PRO BANCO E ATUALIZA LOCAL) ---
    async addTransaction(data) {
        const token = this.getToken();
        
        try {
            const res = await fetch(`${API_URL}/transactions`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                // O backend espera 'desc', 'date' etc, conforme configuramos na rota POST do server.js
                // Se o seu server.js estiver esperando nomes diferentes, ajuste aqui.
                // Baseado no ultimo server.js que te passei, ele aceita o body direto.
                body: JSON.stringify(data)
            });

            if(!res.ok) throw new Error("Erro ao salvar");

            const newDbItem = await res.json();
            
            // Traduz o item recém criado também
            const newItemFormatted = {
                id: newDbItem.id,
                desc: newDbItem.description,
                amount: parseFloat(newDbItem.amount),
                type: newDbItem.type,
                category: newDbItem.category,
                date: newDbItem.transaction_date,
                month: newDbItem.month,
                isRecurring: newDbItem.is_recurring
            };
            
            // Adiciona no topo da lista
            this.transactions.unshift(newItemFormatted); 
            
        } catch (error) {
            console.error(error);
            alert("Erro ao salvar no banco. Verifique a conexão.");
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
    }
};
