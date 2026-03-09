// --- 1. CONFIGURAÇÕES INICIAIS ---
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

const app = express();

// --- 2. CORS ---
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());

const JWT_SECRET = "sua_chave_secreta_super_segura_123";

// --- 3. BANCO DE DADOS ---
const pool = new Pool({
    connectionString: "postgres://avnadmin:AVNS_tHRnfzTKgOv5_yTnCfh@gastos-inaldofreitasjr-95a2.c.aivencloud.com:16334/defaultdb",
    ssl: { rejectUnauthorized: false }
});

// MIGRATION AUTOMÁTICA (Cria tabelas ausentes automaticamente)
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

// --- 4. MIDDLEWARE DE AUTENTICAÇÃO ---
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

// --- 5. ROTAS DE LOGIN/REGISTRO ---
app.post('/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        const hash = await bcrypt.hash(password, 10);
        await pool.query('INSERT INTO users (email, password) VALUES ($1, $2)', [email, hash]);
        res.json({ success: true });
    } catch (err) { res.status(400).json({ success: false, error: "Email já existe ou erro no banco." }); }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) return res.status(401).json({ success: false, message: "Usuário não encontrado" });

        const user = result.rows[0];
        if (await bcrypt.compare(password, user.password)) {
            const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
            res.json({ success: true, token, email: user.email, meta: user.meta_sobra });
        } else {
            res.status(401).json({ success: false, message: "Senha incorreta" });
        }
    } catch (err) { res.status(500).json({ error: "Erro interno no login" }); }
});

// --- 6. ROTAS DE TRANSAÇÕES PRINCIPAIS ---
app.get('/transactions', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM transactions WHERE user_id = $1 ORDER BY id DESC', [req.user.id]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/transactions', authenticateToken, async (req, res) => {
    const { desc, amount, type, category, date, month, isRecurring } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO transactions (user_id, description, amount, type, category, transaction_date, month, is_recurring) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [req.user.id, desc, amount, type, category, date, month, isRecurring || false]
        );
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/transactions/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM transactions WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 7. ROTAS DE DÍVIDAS ---
app.get('/debtors', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM debtors WHERE user_id = $1 ORDER BY id DESC', [req.user.id]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/debtors', authenticateToken, async (req, res) => {
    const { name, amount } = req.body;
    try {
        const result = await pool.query('INSERT INTO debtors (user_id, name, amount) VALUES ($1, $2, $3) RETURNING *', [req.user.id, name, amount]);
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/debtors/:id/toggle', authenticateToken, async (req, res) => {
    try {
        const current = await pool.query('SELECT paid FROM debtors WHERE id = $1', [req.params.id]);
        const newStatus = !current.rows[0].paid;
        const result = await pool.query('UPDATE debtors SET paid = $1 WHERE id = $2 AND user_id = $3 RETURNING *', [newStatus, req.params.id, req.user.id]);
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/debtors/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM debtors WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 8. ROTAS DE METAS E GASTO FIXO ---
app.post('/meta', authenticateToken, async (req, res) => {
    try {
        await pool.query('UPDATE users SET meta_sobra = $1 WHERE id = $2', [req.body.meta, req.user.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/meta', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT meta_sobra FROM users WHERE id = $1', [req.user.id]);
        res.json({ meta: result.rows[0].meta_sobra });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/goals', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM goals WHERE user_id = $1', [req.user.id]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/goals', authenticateToken, async (req, res) => {
    const { category, amount } = req.body;
    try {
        await pool.query(
            'INSERT INTO goals (user_id, category, amount) VALUES ($1, $2, $3) ON CONFLICT (user_id, category) DO UPDATE SET amount = $3',
            [req.user.id, category, amount]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 9. ROTAS DE VA/VR ---
app.get('/va', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM va_transactions WHERE user_id = $1 ORDER BY id DESC', [req.user.id]);
        let balance = 0;
        result.rows.forEach(t => { if(t.type === 'credit') balance += parseFloat(t.amount); else balance -= parseFloat(t.amount); });
        res.json({ balance, transactions: result.rows });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/va', authenticateToken, async (req, res) => {
    const { amount, type, desc, date, month } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO va_transactions (user_id, description, amount, type, transaction_date, month) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [req.user.id, desc, amount, type, date, month]
        );
        const all = await pool.query('SELECT amount, type FROM va_transactions WHERE user_id = $1', [req.user.id]);
        let balance = 0;
        all.rows.forEach(t => { if(t.type === 'credit') balance += parseFloat(t.amount); else balance -= parseFloat(t.amount); });
        res.json({ transaction: result.rows[0], newBalance: balance });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/va/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM va_transactions WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 10. ROTAS DE OBJETIVOS (SONHOS) ---
app.get('/objectives', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM objectives WHERE user_id = $1 ORDER BY id DESC', [req.user.id]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/objectives', authenticateToken, async (req, res) => {
    const { title, target_amount } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO objectives (user_id, title, target_amount, current_amount) VALUES ($1, $2, $3, 0) RETURNING *',
            [req.user.id, title, target_amount]
        );
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/objectives/:id/add', authenticateToken, async (req, res) => {
    const { amountToAdd } = req.body;
    try {
        const result = await pool.query(
            'UPDATE objectives SET current_amount = current_amount + $1 WHERE id = $2 AND user_id = $3 RETURNING *',
            [amountToAdd, req.params.id, req.user.id]
        );
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/objectives/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM objectives WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 11. ROTAS DE CARTÃO DE CRÉDITO ---
app.get('/cards', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM credit_cards WHERE user_id = $1 ORDER BY id ASC', [req.user.id]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/cards', authenticateToken, async (req, res) => {
    const { name, limit_amount, closing_day, due_day } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO credit_cards (user_id, name, limit_amount, closing_day, due_day) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [req.user.id, name, limit_amount, closing_day, due_day]
        );
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/cards/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM credit_cards WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/card-transactions', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM card_transactions WHERE user_id = $1 ORDER BY id DESC', [req.user.id]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/card-transactions', authenticateToken, async (req, res) => {
    const { card_id, description, amount, date, month, installments, current_installment } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO card_transactions (user_id, card_id, description, amount, transaction_date, month, installments, current_installment) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [req.user.id, card_id, description, amount, date, month, installments, current_installment]
        );
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/card-transactions/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM card_transactions WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 12. INICIAR O SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Servidor rodando na porta ${PORT}`);
});
