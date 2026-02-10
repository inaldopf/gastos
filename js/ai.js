import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

export async function categorizeWithGemini(text, apiKey) {
    if (!apiKey) throw new Error("API Key não configurada! Clique no ícone de chave.");
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
        Analise o texto deste extrato bancário e extraia as transações em formato JSON.
        
        REGRA DE OURO (PRIORIDADE MÁXIMA):
        - Se contiver "INALDO PEREIRA FREITA", force: "type": "Investimento", "category": "Investimento".

        Formato JSON array: [{"date": "DD/MM/AAAA", "desc": "Texto", "amount": 0.00, "type": "Despesa/Receita/Investimento", "category": "Categoria"}]
        Retorne APENAS o JSON puro.
        
        DADOS: ${text}
    `;

    try {
        const result = await model.generateContent(prompt);
        let jsonString = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("AI Error:", error);
        throw new Error("Erro na IA. Verifique Console.");
    }
}

// NOVA FUNÇÃO: Consultor Financeiro
export async function getFinancialAdvice(summaryData, apiKey) {
    if (!apiKey) throw new Error("API Key não configurada!");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
        Aja como um consultor financeiro pessoal experiente e direto.
        Analise o resumo financeiro do usuário abaixo e forneça:
        1. Um diagnóstico curto da situação.
        2. 3 dicas práticas para economizar ou melhorar os investimentos.
        3. Um elogio sobre o que ele está fazendo certo.
        
        DADOS DO USUÁRIO:
        - Saldo Atual: R$ ${summaryData.balance}
        - Total Investido: R$ ${summaryData.invested}
        - Gastos Totais: R$ ${summaryData.expenses}
        - Top 3 Categorias de Gasto: ${summaryData.topCategories}
        - Taxa de Poupança: ${summaryData.savingsRate}%

        Seja amigável, use emojis e formatação limpa.
    `;

    const result = await model.generateContent(prompt);
    return result.response.text();
}
