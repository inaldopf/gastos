// --- 1. CONFIGURAÇÕES INICIAIS ---
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

const app = express();

// --- 2. CORS (PERMISSÕES DE ACESSO) ---
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());

const JWT_SECRET = process.env.JWT_SECRET || "chave_fallback_apenas_para_desenvolvimento";

// --- 3. BANCO DE DADOS ---
if (!process.env.DATABASE_URL) {
    console.warn("⚠️ AVISO: A variável DATABASE_URL não está configurada no ambiente!");
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

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
    } catch (err) {
        console.error(err);
        res.status(400).json({ success: false, error: "Email já existe ou erro no banco." });
    }
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
    } catch (err) { 
        console.error(err);
        res.status(500).json({ error: "Erro interno no login" }); 
    }
});

// --- 6. ROTAS DE TRANSAÇÕES ---
app.get('/transactions', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM transactions WHERE user_id = $1 ORDER BY id DESC', [req.user.id]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/transactions', authenticateToken, async (req, res) => {
    const { desc, amount, type, category, date, month } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO transactions (user_id, description, amount, type, category, transaction_date, month) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [req.user.id, desc, amount, type, category, date, month]
        );
        res.json(result.rows[0]);
    } catch (err) { 
        console.error(err);
        res.status(500).json({ error: err.message }); 
    }
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
        const result = await pool.query(
            'INSERT INTO debtors (user_id, name, amount) VALUES ($1, $2, $3) RETURNING *',
            [req.user.id, name, amount]
        );
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/debtors/:id/toggle', authenticateToken, async (req, res) => {
    try {
        const current = await pool.query('SELECT paid FROM debtors WHERE id = $1', [req.params.id]);
        const newStatus = !current.rows[0].paid;
        const result = await pool.query(
            'UPDATE debtors SET paid = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
            [newStatus, req.params.id, req.user.id]
        );
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/debtors/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM debtors WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 8. ROTAS DE META GERAL (SOBRA) ---
app.post('/meta', authenticateToken, async (req, res) => {
    const { meta } = req.body;
    try {
        await pool.query('UPDATE users SET meta_sobra = $1 WHERE id = $2', [meta, req.user.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/meta', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT meta_sobra FROM users WHERE id = $1', [req.user.id]);
        res.json({ meta: result.rows[0].meta_sobra });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 9. ROTAS DE METAS POR CATEGORIA ---
app.get('/goals', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT category, amount FROM category_goals WHERE user_id = $1', 
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/goals', authenticateToken, async (req, res) => {
    const { category, amount } = req.body;
    try {
        await pool.query(
            `INSERT INTO category_goals (user_id, category, amount) 
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, category) 
             DO UPDATE SET amount = EXCLUDED.amount`,
            [req.user.id, category, amount]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// --- 10. VA (VALE ALIMENTAÇÃO COM HISTÓRICO) ---
app.get('/va', authenticateToken, async (req, res) => {
    try {
        const balanceRes = await pool.query('SELECT va_balance FROM users WHERE id = $1', [req.user.id]);
        const transRes = await pool.query('SELECT * FROM va_transactions WHERE user_id = $1 ORDER BY id DESC', [req.user.id]);
        
        res.json({ 
            balance: parseFloat(balanceRes.rows[0].va_balance || 0),
            transactions: transRes.rows
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/va', authenticateToken, async (req, res) => {
    const { amount, type, desc, date, month } = req.body;
    try {
        const val = parseFloat(amount);
        
        const currentRes = await pool.query('SELECT va_balance FROM users WHERE id = $1', [req.user.id]);
        let currentBalance = parseFloat(currentRes.rows[0].va_balance || 0);
        if (type === 'credit') currentBalance += val; else currentBalance -= val;
        await pool.query('UPDATE users SET va_balance = $1 WHERE id = $2', [currentBalance, req.user.id]);

        const transRes = await pool.query(
            'INSERT INTO va_transactions (user_id, description, amount, type, transaction_date, month) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [req.user.id, desc, val, type, date, month]
        );

        res.json({ success: true, newBalance: currentBalance, transaction: transRes.rows[0] });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/va/:id', authenticateToken, async (req, res) => {
    try {
        const transRes = await pool.query('SELECT amount, type FROM va_transactions WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        if (transRes.rows.length > 0) {
            const t = transRes.rows[0];
            const currentRes = await pool.query('SELECT va_balance FROM users WHERE id = $1', [req.user.id]);
            let currentBalance = parseFloat(currentRes.rows[0].va_balance || 0);

            if (t.type === 'credit') currentBalance -= parseFloat(t.amount);
            else currentBalance += parseFloat(t.amount);

            await pool.query('UPDATE users SET va_balance = $1 WHERE id = $2', [currentBalance, req.user.id]);
            await pool.query('DELETE FROM va_transactions WHERE id = $1', [req.params.id]);
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 11. ROTAS DE OBJETIVOS / SONHOS ---
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

// --- 12. INICIAR O SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Servidor rodando na porta ${PORT}`);
});
