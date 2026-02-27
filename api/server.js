// --- 1. CONFIGURAÇÕES INICIAIS ---
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

const app = express();

app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());

const JWT_SECRET = process.env.JWT_SECRET || "chave_fallback_apenas_para_desenvolvimento";

if (!process.env.DATABASE_URL) {
    console.warn("⚠️ AVISO: A variável DATABASE_URL não está configurada no ambiente!");
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

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

// ... [MANTENHA TODAS AS SUAS ROTAS EXISTENTES DE LOGIN, TRANSAÇÕES, DÍVIDAS, METAS E VA AQUI] ...

// --- 12. ROTAS DE OBJETIVOS / SONHOS (NOVO) ---
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

// --- 13. INICIAR O SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Servidor rodando na porta ${PORT}`);
});
