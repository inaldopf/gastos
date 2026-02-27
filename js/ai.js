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
        Aja como um consultor financeiro de alto nível. Sua abordagem mistura pragmatismo financeiro com a sabedoria do Estoicismo (focando naquilo que podemos controlar, moderação e visão de longo prazo).
        
        Contexto geral (para guiar as dicas):
        - O usuário está utilizando este sistema para melhorar sua saúde financeira, ter clareza sobre seus gastos e construir patrimônio.
        - As dicas devem ser universais, lógicas e focadas em otimização de fluxo de caixa, redução de desperdícios e incentivo aos investimentos, baseando-se estritamente nas categorias de maior gasto detectadas.
        
        Analise os dados financeiros deste mês:
        - Saldo Livre (Conta corrente): ${summaryData.balance}
        - Total Guardado/Investido: ${summaryData.invested}
        - Gastos Totais no mês: ${summaryData.expenses}
        - Top Categorias de Gasto: ${summaryData.topCategories}
        
        Com base nisso, escreva um relatório em formato Markdown com a seguinte estrutura:
        
        ### 📊 Diagnóstico do Mês
        (Análise direta e honesta do cenário atual. O saldo livre sustenta o custo de vida? O nível de investimento e acúmulo de capital está bom?)
        
        ### 💡 Plano de Ação (3 Dicas)
        (Dicas acionáveis e super específicas. Use o contexto de vida dele! Sugira automatizações financeiras, formas de otimizar compras de ração/vacinas para os cachorros sem perder a qualidade, ou como gerenciar o fluxo de caixa inicial dos brownies com a Beta).
        
        ### 🏛️ Reflexão
        (Termine com um pensamento estóico curto, citando Sêneca, Marco Aurélio ou Epicteto, relacionando riqueza, tempo e o que realmente importa na vida).

        Seja conciso, escreva de forma fluida, não invente dados que não foram passados e use formatação em negrito para destacar valores e conceitos importantes.
    `;

    try {
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error("AI Error:", error);
        throw new Error("Erro ao gerar relatório com a IA.");
    }
}
