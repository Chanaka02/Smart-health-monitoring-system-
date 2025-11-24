const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// serve static files (the frontend) if requested
app.use(express.static(path.join(__dirname)));

// ensure db directory
const DB_FILE = path.join(__dirname, 'data.sqlite');
const db = new sqlite3.Database(DB_FILE);

// initialize tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT
  )`);

  // If the database was created earlier without password column, try to add it (no-op if exists)
  db.run(`ALTER TABLE users ADD COLUMN password TEXT`, () => {});

  db.run(`CREATE TABLE IF NOT EXISTS water_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts INTEGER NOT NULL,
    user_email TEXT,
    amount REAL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS health_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts INTEGER NOT NULL,
    user_email TEXT,
    heart_rate INTEGER,
    steps INTEGER,
    stress TEXT
  )`);
});

// API: post events (water, health) -> store in sqlite
app.post('/api/event', (req, res) => {
  const { type, payload } = req.body || {};
  // optionally identify user from Bearer token
  let authUser = null;
  try {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
      const token = auth.slice(7);
      const secret = process.env.JWT_SECRET || 'dev-secret-please-change';
      authUser = jwt.verify(token, secret);
    }
  } catch (e) { /* ignore invalid token */ }
  if (!type || !payload) return res.status(400).json({ error: 'invalid payload' });

  if (type === 'water') {
    const ts = payload.ts || Date.now();
    const amount = parseFloat(payload.amount) || 0;
    const user = (payload.user || (authUser && authUser.email)) || null;
    db.run(`INSERT INTO water_logs (ts, user_email, amount) VALUES (?, ?, ?)`, [ts, user, amount], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ok: true, id: this.lastID });
    });
  } else if (type === 'health') {
    const ts = payload.ts || Date.now();
    const hr = parseInt(payload.hr) || null;
    const steps = parseInt(payload.steps) || 0;
    const stress = payload.stress || null;
    const user = (payload.user || (authUser && authUser.email)) || null;
    db.run(`INSERT INTO health_logs (ts, user_email, heart_rate, steps, stress) VALUES (?, ?, ?, ?, ?)`, [ts, user, hr, steps, stress], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ok: true, id: this.lastID });
    });
  } else {
    res.status(400).json({ error: 'unknown event type' });
  }
});

// Register endpoint
app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!email || !password || password.length < 6) return res.status(400).json({ error: 'invalid input' });
  const hashed = bcrypt.hashSync(password, 10);
  db.run(`INSERT INTO users (name, email, password) VALUES (?, ?, ?)`, [name || null, email, hashed], function(err) {
    if (err) {
      if (err.message && err.message.includes('UNIQUE')) return res.status(409).json({ error: 'email_exists' });
      return res.status(500).json({ error: err.message });
    }
    const secret = process.env.JWT_SECRET || 'dev-secret-please-change';
    const token = jwt.sign({ id: this.lastID, email, name }, secret, { expiresIn: '7d' });
    res.json({ ok: true, token, user: { email, name } });
  });
});

// Login endpoint
app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'invalid input' });
  db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(401).json({ error: 'invalid_credentials' });
    const ok = bcrypt.compareSync(password, row.password || '');
    if (!ok) return res.status(401).json({ error: 'invalid_credentials' });
    const secret = process.env.JWT_SECRET || 'dev-secret-please-change';
    const token = jwt.sign({ id: row.id, email: row.email, name: row.name }, secret, { expiresIn: '7d' });
    res.json({ ok: true, token, user: { email: row.email, name: row.name } });
  });
});

// API: get metrics
app.get('/api/metrics', (req, res) => {
  const metrics = {};
  db.serialize(() => {
    db.get(`SELECT COUNT(*) AS cnt FROM water_logs`, (err, row) => {
      metrics.water_count = row ? row.cnt : 0;
      db.get(`SELECT COUNT(*) AS cnt FROM health_logs`, (err2, row2) => {
        metrics.health_count = row2 ? row2.cnt : 0;
        db.get(`SELECT COALESCE(SUM(amount),0) AS total FROM water_logs`, (err3, row3) => {
          metrics.water_total = row3 ? row3.total : 0;
          res.json(metrics);
        });
      });
    });
  });
});

// API: get health history (limit)
app.get('/api/health', (req, res) => {
  const limit = parseInt(req.query.limit) || 200;
  db.all(`SELECT * FROM health_logs ORDER BY ts DESC LIMIT ?`, [limit], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// API: get water logs
app.get('/api/water', (req, res) => {
  const limit = parseInt(req.query.limit) || 200;
  db.all(`SELECT * FROM water_logs ORDER BY ts DESC LIMIT ?`, [limit], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// fallback
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => console.log(`Server started on http://localhost:${PORT}`));
