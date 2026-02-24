export const formatCurrency = (value) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const getMonthName = (monthNumber) => {
    const months = ["", "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
    return months[parseInt(monthNumber)] || "GERAL";
};

export const categoriesList = [
    "Salário", "Investimento", "Aluguel", "Comida", "Transporte", "Lazer", 
    "Saúde", "Educação", "Casa", "Compras", "Outros"
];

// --- NOVO: FUNÇÃO DE SEGURANÇA ANTI-XSS ---
export const escapeHTML = (str) => {
    if (!str) return '';
    return str.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};
