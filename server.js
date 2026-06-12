'use strict';
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path    = require('path');

const { processMessage }          = require('./src/chatbot');
const { generatePDF }             = require('./src/pdfgen');
const { createSession }           = require('./src/storage');
const { processSupplierMessage }  = require('./src/supplier-chatbot');
const { createSupplierSession, getSupplier, getSupplierStats } = require('./src/supplier-storage');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'kirabot-dev-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }  // 24 h
}));

// Ensure every request has a bot session
app.use((req, _res, next) => {
  if (!req.session.botSession) {
    req.session.botSession = createSession();
  }
  next();
});

// ── API Routes ──────────────────────────────────────────────────────────────

// GET /api/session  — return current session state (for page-load restore)
app.get('/api/session', (req, res) => {
  const s = req.session.botSession;
  res.json({
    stage:        s.stage,
    businessName: s.businessName,
    language:     s.language,
    dailyStats:   s.dailyStats,
    transactionCount: s.transactions.length,
    dailySummaryCount: s.dailySummaries.length,
  });
});

// POST /api/message  — send a chat message and get bot reply
app.post('/api/message', async (req, res) => {
  const { message, language } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message field is required' });
  }

  const botSession = req.session.botSession;
  if (language && ['bm', 'en'].includes(language)) {
    botSession.language = language;
  }

  try {
    const result = await processMessage(message.trim(), botSession);
    req.session.botSession = result.session;

    res.json({
      messages:   result.messages,
      stage:      result.session.stage,
      dailyStats: result.session.dailyStats,
    });
  } catch (err) {
    console.error('[KiraBot] processMessage error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/reset  — restart the bot session entirely
app.post('/api/reset', (req, res) => {
  req.session.botSession = createSession();
  res.json({ success: true });
});

// POST /api/language  — switch language without sending a message
app.post('/api/language', (req, res) => {
  const { language } = req.body;
  if (!['bm', 'en'].includes(language)) {
    return res.status(400).json({ error: 'language must be bm or en' });
  }
  req.session.botSession.language = language;
  res.json({ success: true, language });
});

// GET /api/report/pdf  — download the monthly P&L PDF
app.get('/api/report/pdf', (req, res) => {
  const s = req.session.botSession;
  if (!s.businessName) {
    return res.status(400).json({ error: 'No active session or business registered' });
  }
  const safeName = (s.businessName || 'KiraBot').replace(/[^a-zA-Z0-9 ]/g, '').trim();
  const month    = new Date().toLocaleDateString('en-MY', { month: 'long', year: 'numeric' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="KiraBot_PL_${safeName}_${month}.pdf"`);
  generatePDF(s, res);
});

// ── Supplier API Routes ─────────────────────────────────────────────────────

// Ensure every request has a supplier session
app.use((req, _res, next) => {
  if (!req.session.supplierSession) {
    req.session.supplierSession = createSupplierSession();
  }
  next();
});

// GET /api/supplier/session
app.get('/api/supplier/session', (req, res) => {
  const s = req.session.supplierSession;
  const supplier = s.supplierId ? getSupplier(s.supplierId) : null;
  res.json({
    stage: s.stage,
    companyName: supplier?.companyName || null,
    language: s.language,
  });
});

// POST /api/supplier/message
app.post('/api/supplier/message', async (req, res) => {
  const { message, language } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message field is required' });
  }

  const supplierSession = req.session.supplierSession;
  if (language && ['bm', 'en'].includes(language)) {
    supplierSession.language = language;
  }

  try {
    const result = await processSupplierMessage(message.trim(), supplierSession);
    req.session.supplierSession = result.session;

    const supplier = result.session.supplierId ? getSupplier(result.session.supplierId) : null;
    res.json({
      messages: result.messages,
      stage: result.session.stage,
      stats: supplier ? getSupplierStats(supplier.id) : null,
    });
  } catch (err) {
    console.error('[KiraBot Supplier] error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/supplier/reset
app.post('/api/supplier/reset', (req, res) => {
  req.session.supplierSession = createSupplierSession();
  res.json({ success: true });
});

// POST /api/supplier/language
app.post('/api/supplier/language', (req, res) => {
  const { language } = req.body;
  if (!['bm', 'en'].includes(language)) return res.status(400).json({ error: 'language must be bm or en' });
  req.session.supplierSession.language = language;
  res.json({ success: true });
});

// ── Optional: WhatsApp Webhook (Meta Cloud API) ─────────────────────────────
// Uncomment and fill .env when you have a WhatsApp Business API account.

// app.get('/webhook', (req, res) => {
//   const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
//   if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
//     return res.status(200).send(challenge);
//   }
//   res.sendStatus(403);
// });

// app.post('/webhook', async (req, res) => {
//   // Parse Meta webhook payload and call processMessage(text, session)
//   // then send reply via WhatsApp Cloud API
//   res.sendStatus(200);
// });

// ── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🤖 KiraBot is running!`);
  console.log(`   Local:  http://localhost:${PORT}`);
  console.log(`   Press Ctrl+C to stop\n`);
});
