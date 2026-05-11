// --- 1. CONFIGURAÇÕES INICIAIS ---
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();

// --- 2. SEGURANÇA: Headers HTTP ---
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// --- 3. CORS ---
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://127.0.0.1:5500'];

app.use(cors({
    origin: (origin, callback) => {
        // Permite requisições sem origin (ex: apps mobile, Postman) e origens da lista
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());

// --- 4. CONFIGURAÇÕES SENSÍVEIS (via env) ---
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!JWT_SECRET) {
    console.error('FATAL: JWT_SECRET não definido nas variáveis de ambiente.');
    process.exit(1);
}

// --- 5. BANCO DE DADOS ---
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false }
});

if (!process.env.DATABASE_URL) {
    console.error('FATAL: DATABASE_URL não definido nas variáveis de ambiente.');
    process.exit(1);
}

// MIGRATION AUTOMÁTICA
const initDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, email VARCHAR(255) UNIQUE, password VARCHAR(255), meta_sobra NUMERIC(10,2) DEFAULT 0);
            CREATE TABLE IF NOT EXISTS transactions (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), description VARCHAR(255), amount NUMERIC(10,2), type VARCHAR(50), category VARCHAR(100), transaction_date VARCHAR(20), month VARCHAR(20));
            ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;
            CREATE TABLE IF NOT EXISTS debtors (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), name VARCHAR(255), amount NUMERIC(10,2), paid BOOLEAN DEFAULT FALSE);
            CREATE TABLE IF NOT EXISTS goals (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), category VARCHAR(100), amount NUMERIC(10,2), UNIQUE(user_id, category));
            CREATE TABLE IF NOT EXISTS va_transactions (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), description VARCHAR(255), amount NUMERIC(10,2), type VARCHAR(20), transaction_date VARCHAR(20), month VARCHAR(20));
            CREATE TABLE IF NOT EXISTS objectives (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), title VARCHAR(255), target_amount NUMERIC(10,2), current_amount NUMERIC(10,2) DEFAULT 0);
            CREATE TABLE IF NOT EXISTS credit_cards (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, name VARCHAR(255) NOT NULL, limit_amount NUMERIC(10, 2) NOT NULL, closing_day INTEGER NOT NULL, due_day INTEGER NOT NULL);
            CREATE TABLE IF NOT EXISTS card_transactions (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, card_id INTEGER REFERENCES credit_cards(id) ON DELETE CASCADE, description VARCHAR(255) NOT NULL, amount NUMERIC(10, 2) NOT NULL, transaction_date VARCHAR(20), month VARCHAR(20) NOT NULL, installments INTEGER DEFAULT 1, current_installment INTEGER DEFAULT 1);
        `);
        console.log("✅ Schema verificado e tabelas sincronizadas com sucesso.");
    } catch(e) {
        console.error("⚠️ Erro ao verificar schema:", e.message);
    }
};
initDB();

// --- 6. RATE LIMITING ---
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10,
    message: { success: false, message: 'Muitas tentativas. Tente novamente em 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// --- 7. MIDDLEWARE DE AUTENTICAÇÃO ---
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// --- 8. HELPERS DE VALIDAÇÃO ---
function isValidAmount(val) {
    const n = parseFloat(val);
    return !isNaN(n) && isFinite(n) && n >= 0;
}

function isValidDay(val) {
    const n = parseInt(val);
    return Number.isInteger(n) && n >= 1 && n <= 31;
}

function isValidString(val, maxLen = 255) {
    return typeof val === 'string' && val.trim().length > 0 && val.length <= maxLen;
}

// --- 9. ROTAS DE LOGIN/REGISTRO ---
app.post('/register', loginLimiter, async (req, res) => {
    const { email, password } = req.body;
    if (!isValidString(email, 255) || !isValidString(password, 255)) {
        return res.status(400).json({ success: false, error: 'Dados inválidos.' });
    }
    try {
        const hash = await bcrypt.hash(password, 10);
        await pool.query('INSERT INTO users (email, password) VALUES ($1, $2)', [email.trim(), hash]);
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ success: false, error: 'Email já existe ou erro no cadastro.' });
    }
});

app.post('/login', loginLimiter, async (req, res) => {
    const { email, password } = req.body;
    if (!isValidString(email, 255) || !isValidString(password, 255)) {
        return res.status(400).json({ success: false, message: 'Dados inválidos.' });
    }
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.trim()]);
        if (result.rows.length === 0) return res.status(401).json({ success: false, message: 'Usuário não encontrado.' });

        const user = result.rows[0];
        if (await bcrypt.compare(password, user.password)) {
            const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
            res.json({ success: true, token, email: user.email, meta: user.meta_sobra });
        } else {
            res.status(401).json({ success: false, message: 'Senha incorreta.' });
        }
    } catch (err) {
        console.error('Erro no login:', err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

// --- 10. ROTAS DE TRANSAÇÕES PRINCIPAIS ---
app.get('/transactions', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM transactions WHERE user_id = $1 ORDER BY id DESC', [req.user.id]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.post('/transactions', authenticateToken, async (req, res) => {
    const { desc, amount, type, category, date, month, isRecurring } = req.body;
    if (!isValidString(desc) || !isValidAmount(amount) || !isValidString(type) || !isValidString(category) || !isValidString(month)) {
        return res.status(400).json({ error: 'Dados inválidos.' });
    }
    try {
        const result = await pool.query(
            'INSERT INTO transactions (user_id, description, amount, type, category, transaction_date, month, is_recurring) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [req.user.id, desc, parseFloat(amount), type, category, date || null, month, !!isRecurring]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.delete('/transactions/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM transactions WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

// --- 11. ROTAS DE DÍVIDAS ---
app.get('/debtors', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM debtors WHERE user_id = $1 ORDER BY id DESC', [req.user.id]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.post('/debtors', authenticateToken, async (req, res) => {
    const { name, amount } = req.body;
    if (!isValidString(name) || !isValidAmount(amount)) {
        return res.status(400).json({ error: 'Dados inválidos.' });
    }
    try {
        const result = await pool.query('INSERT INTO debtors (user_id, name, amount) VALUES ($1, $2, $3) RETURNING *', [req.user.id, name, parseFloat(amount)]);
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.put('/debtors/:id/toggle', authenticateToken, async (req, res) => {
    try {
        // Busca filtrando por user_id para evitar IDOR
        const current = await pool.query('SELECT paid FROM debtors WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        if (current.rows.length === 0) return res.sendStatus(404);
        const newStatus = !current.rows[0].paid;
        const result = await pool.query('UPDATE debtors SET paid = $1 WHERE id = $2 AND user_id = $3 RETURNING *', [newStatus, req.params.id, req.user.id]);
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.delete('/debtors/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM debtors WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

// --- 12. ROTAS DE METAS E GASTO FIXO ---
app.post('/meta', authenticateToken, async (req, res) => {
    const { meta } = req.body;
    if (!isValidAmount(meta)) return res.status(400).json({ error: 'Dados inválidos.' });
    try {
        await pool.query('UPDATE users SET meta_sobra = $1 WHERE id = $2', [parseFloat(meta), req.user.id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.get('/meta', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT meta_sobra FROM users WHERE id = $1', [req.user.id]);
        res.json({ meta: result.rows[0].meta_sobra });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.get('/goals', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM goals WHERE user_id = $1', [req.user.id]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.post('/goals', authenticateToken, async (req, res) => {
    const { category, amount } = req.body;
    if (!isValidString(category) || !isValidAmount(amount)) {
        return res.status(400).json({ error: 'Dados inválidos.' });
    }
    try {
        await pool.query(
            'INSERT INTO goals (user_id, category, amount) VALUES ($1, $2, $3) ON CONFLICT (user_id, category) DO UPDATE SET amount = $3',
            [req.user.id, category, parseFloat(amount)]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

// --- 13. ROTAS DE VA/VR ---
app.get('/va', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM va_transactions WHERE user_id = $1 ORDER BY id DESC', [req.user.id]);
        let balance = 0;
        result.rows.forEach(t => { if(t.type === 'credit') balance += parseFloat(t.amount); else balance -= parseFloat(t.amount); });
        res.json({ balance, transactions: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.post('/va', authenticateToken, async (req, res) => {
    const { amount, type, desc, date, month } = req.body;
    if (!isValidAmount(amount) || !['credit','debit'].includes(type) || !isValidString(month)) {
        return res.status(400).json({ error: 'Dados inválidos.' });
    }
    try {
        const result = await pool.query(
            'INSERT INTO va_transactions (user_id, description, amount, type, transaction_date, month) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [req.user.id, desc || '', parseFloat(amount), type, date || null, month]
        );
        const all = await pool.query('SELECT amount, type FROM va_transactions WHERE user_id = $1', [req.user.id]);
        let balance = 0;
        all.rows.forEach(t => { if(t.type === 'credit') balance += parseFloat(t.amount); else balance -= parseFloat(t.amount); });
        res.json({ transaction: result.rows[0], newBalance: balance });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.delete('/va/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM va_transactions WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

// --- 14. ROTAS DE OBJETIVOS (SONHOS) ---
app.get('/objectives', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM objectives WHERE user_id = $1 ORDER BY id DESC', [req.user.id]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.post('/objectives', authenticateToken, async (req, res) => {
    const { title, target_amount } = req.body;
    if (!isValidString(title) || !isValidAmount(target_amount)) {
        return res.status(400).json({ error: 'Dados inválidos.' });
    }
    try {
        const result = await pool.query(
            'INSERT INTO objectives (user_id, title, target_amount, current_amount) VALUES ($1, $2, $3, 0) RETURNING *',
            [req.user.id, title, parseFloat(target_amount)]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.put('/objectives/:id/add', authenticateToken, async (req, res) => {
    const { amountToAdd } = req.body;
    if (amountToAdd === undefined || isNaN(parseFloat(amountToAdd))) {
        return res.status(400).json({ error: 'Dados inválidos.' });
    }
    try {
        const result = await pool.query(
            'UPDATE objectives SET current_amount = current_amount + $1 WHERE id = $2 AND user_id = $3 RETURNING *',
            [parseFloat(amountToAdd), req.params.id, req.user.id]
        );
        if (result.rows.length === 0) return res.sendStatus(404);
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.delete('/objectives/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM objectives WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

// --- 15. ROTAS DE CARTÃO DE CRÉDITO ---
app.get('/cards', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM credit_cards WHERE user_id = $1 ORDER BY id ASC', [req.user.id]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.post('/cards', authenticateToken, async (req, res) => {
    const { name, limit_amount, closing_day, due_day } = req.body;
    if (!isValidString(name) || !isValidAmount(limit_amount) || !isValidDay(closing_day) || !isValidDay(due_day)) {
        return res.status(400).json({ error: 'Dados inválidos.' });
    }
    try {
        const result = await pool.query(
            'INSERT INTO credit_cards (user_id, name, limit_amount, closing_day, due_day) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [req.user.id, name, parseFloat(limit_amount), parseInt(closing_day), parseInt(due_day)]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.delete('/cards/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM credit_cards WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.get('/card-transactions', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM card_transactions WHERE user_id = $1 ORDER BY id DESC', [req.user.id]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.post('/card-transactions', authenticateToken, async (req, res) => {
    const { card_id, description, amount, date, month, installments, current_installment } = req.body;
    if (!card_id || !isValidString(description) || !isValidAmount(amount) || !isValidString(month)) {
        return res.status(400).json({ error: 'Dados inválidos.' });
    }
    try {
        const result = await pool.query(
            'INSERT INTO card_transactions (user_id, card_id, description, amount, transaction_date, month, installments, current_installment) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [req.user.id, card_id, description, parseFloat(amount), date || null, month, parseInt(installments) || 1, parseInt(current_installment) || 1]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.delete('/card-transactions/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM card_transactions WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

// --- 16. INICIAR O SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Servidor rodando na porta ${PORT}`);
});
