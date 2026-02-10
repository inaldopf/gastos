import { store } from './store.js';
import { getMonthName } from './utils.js';

export function processText(text) {
    if (!text.trim()) return 0;

    const lines = text.split('\n');
    let count = 0;
    
    // Padrões de Regex (Data e Dinheiro)
    const datePattern = /(\d{2}\/\d{2})|(\d{2}\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ))/i;
    const moneyPattern = /(?:R\$\s?)?(-?\d{1,3}(?:\.\d{3})*,\d{2})/;

    lines.forEach(line => {
        line = line.trim();
        if (line.length < 5) return;

        const dateMatch = line.match(datePattern);
        const moneyMatch = line.match(moneyPattern);

        if (dateMatch && moneyMatch) {
            let valStr = moneyMatch[1].replace('.', '').replace(',', '.');
            let amount = parseFloat(valStr);
            
            let dateStr = dateMatch[0];
            if(dateStr.length === 5 && dateStr.includes('/')) dateStr += "/2026"; 

            let desc = line.replace(dateMatch[0], '').replace(moneyMatch[0], '').replace('R$', '').trim();
            desc = desc.replace(/^[-–—\s]+|[-–—\s]+$/g, '');

            const analysis = analyze(desc, amount);
            
            // Define o mês
            let monthCode = "01";
            if(dateStr.includes('/')) monthCode = dateStr.split('/')[1];

            store.addTransaction({
                id: Date.now() + Math.random(),
                date: dateStr,
                month: getMonthName(monthCode),
                desc: desc || "Importado",
                amount: Math.abs(amount),
                type: analysis.type,
                category: analysis.category
            });
            count++;
        }
    });
    return count;
}

function analyze(desc, rawAmount) {
    const d = desc.toLowerCase();
    let type = "Despesa"; 
    let category = "Outros";

    if (d.includes('uber') || d.includes('99') || d.includes('posto')) category = "Transporte";
    else if (d.includes('ifood') || d.includes('mercado') || d.includes('pao')) category = "Comida";
    else if (d.includes('netflix') || d.includes('spotify') || d.includes('amazon')) { category = "Lazer"; }
    else if (d.includes('farmacia') || d.includes('droga')) category = "Saúde";
    
    if (rawAmount > 0 && (d.includes('salario') || d.includes('pix recebido'))) {
        type = "Receita"; category = "Salário";
    }
    if (d.includes('corretora') || d.includes('b3') || d.includes('cdb')) {
        type = "Investimento"; category = "Investimento";
    }
    if (rawAmount < 0) type = "Despesa";

    return { type, category };
}