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