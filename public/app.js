/* KiraBot Frontend Logic */
'use strict';

// ── State ──────────────────────────────────────────────────────────────────
let currentLang = 'bm';
let currentStage = 'WELCOME';
let isBotTyping = false;

// ── Stage → UI config ─────────────────────────────────────────────────────
const STAGE_CONFIG = {
  WELCOME: {
    stage: 'onboarding',
    tipsTitle: { bm: '💡 Cara Mula:', en: '💡 Getting Started:' },
    tips: {
      bm: ['Taip sebarang mesej untuk mula', 'Bot akan menyambut anda', 'Daftarkan nama perniagaan'],
      en: ['Type any message to start', 'Bot will greet you', 'Register your business name'],
    },
    quick: {
      bm: ['Salam!', 'Hello KiraBot', 'Mula'],
      en: ['Hello!', 'Hi KiraBot', 'Start'],
    },
  },
  ONBOARDING: {
    stage: 'onboarding',
    tipsTitle: { bm: '📝 Daftar Perniagaan:', en: '📝 Register Business:' },
    tips: {
      bm: ['Taip nama kedai anda', 'Contoh: Nasi Lemak Mak Cik Kiah', 'Contoh: Warung Pak Ali'],
      en: ['Type your shop name', 'e.g. Nasi Lemak Mak Cik Kiah', 'e.g. Warung Pak Ali'],
    },
    quick: {
      bm: ['Nasi Lemak Mak Cik Kiah', 'Warung Pak Ali', 'Kedai Makan Jaya'],
      en: ['Nasi Lemak Mak Cik Kiah', 'Warung Pak Ali', 'Kedai Makan Jaya'],
    },
  },
  ACTIVE: {
    stage: 'transactions',
    tipsTitle: { bm: '💡 Cuba Taip:', en: '💡 Try Typing:' },
    tips: {
      bm: ['ns lmk 5, teh ais 3', 'nasi goreng 2 rm5', 'tolak beras rm25'],
      en: ['fried rice 5 rm7', 'nasi lemak 3 rm3', 'buy rice rm25'],
    },
    quick: {
      bm: ['ns lmk 5, teh ais 3', 'tolak beras rm25', 'tutup kedai', 'ringkasan'],
      en: ['fried rice 5 rm7', 'buy rice rm25', 'close shop', 'summary'],
    },
  },
  CLOSED: {
    stage: 'close',
    tipsTitle: { bm: '📦 Selepas Tutup:', en: '📦 After Closing:' },
    tips: {
      bm: ['Jana laporan bulanan', 'Lihat keuntungan harian', 'Muat turun PDF'],
      en: ['Generate monthly report', 'View daily profit', 'Download PDF'],
    },
    quick: {
      bm: ['laporan', 'hari baru', 'ringkasan'],
      en: ['report', 'new day', 'summary'],
    },
  },
  REPORT: {
    stage: 'reports',
    tipsTitle: { bm: '📄 Laporan Sedia:', en: '📄 Report Ready:' },
    tips: {
      bm: ['Muat turun PDF anda', 'Gunakan untuk mohon pinjaman', 'Kongsi dengan bank'],
      en: ['Download your PDF', 'Use it to apply for loans', 'Share with your bank'],
    },
    quick: {
      bm: ['hari baru', 'laporan', 'mula semula'],
      en: ['new day', 'report', 'restart'],
    },
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────
function formatTime(date) {
  return date.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' });
}

function formatRM(amount) {
  return `RM ${parseFloat(amount).toFixed(2)}`;
}

/** Convert *text* markup to HTML (bold, newlines) */
function markupToHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

function scrollToBottom() {
  const chat = document.getElementById('wa-chat');
  chat.scrollTop = chat.scrollHeight;
}

// ── Language ──────────────────────────────────────────────────────────────
function setLanguage(lang) {
  currentLang = lang;
  document.getElementById('btn-bm').classList.toggle('active', lang === 'bm');
  document.getElementById('btn-en').classList.toggle('active', lang === 'en');

  // Update all data-bm / data-en elements
  document.querySelectorAll('[data-bm]').forEach(el => {
    el.textContent = el.dataset[lang] || el.dataset.bm;
  });

  document.getElementById('tagline').textContent =
    lang === 'bm' ? 'WhatsApp POS untuk Usahawan B40' : 'WhatsApp POS for B40 Entrepreneurs';

  document.getElementById('wa-status').textContent =
    lang === 'bm' ? 'Dalam talian' : 'Online';

  document.getElementById('chat-input').placeholder =
    lang === 'bm' ? 'Taip mesej...' : 'Type a message...';

  updateStageUI(currentStage);

  fetch('/api/language', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language: lang }),
  }).catch(() => {});
}

// ── Stage UI ──────────────────────────────────────────────────────────────
function updateStageUI(stage) {
  const stageOrder = ['onboarding', 'transactions', 'close', 'reports'];
  const config = STAGE_CONFIG[stage] || STAGE_CONFIG.WELCOME;
  const activeStage = config.stage;
  const activeIdx   = stageOrder.indexOf(activeStage);

  stageOrder.forEach((s, i) => {
    const el = document.getElementById(`stage-${s}`);
    const conn = el.nextElementSibling;
    el.classList.remove('active', 'done');
    if (i < activeIdx) {
      el.classList.add('done');
      if (conn && conn.classList.contains('stage-connector')) conn.classList.add('done');
    } else if (i === activeIdx) {
      el.classList.add('active');
      if (conn && conn.classList.contains('stage-connector')) conn.classList.remove('done');
    } else {
      if (conn && conn.classList.contains('stage-connector')) conn.classList.remove('done');
    }
  });

  // Tips panel
  const tips = config.tips[currentLang] || config.tips.bm;
  const tipsTitle = config.tipsTitle[currentLang] || config.tipsTitle.bm;
  document.getElementById('tips-title').textContent = tipsTitle;
  const chipsEl = document.getElementById('tip-chips');
  chipsEl.innerHTML = tips.map(t =>
    `<button class="tip-chip" onclick="fillInput(this.textContent)">${t}</button>`
  ).join('');

  // Quick actions (right panel)
  const quick = config.quick[currentLang] || config.quick.bm;
  const qTitle = currentLang === 'bm' ? 'Contoh Input:' : 'Quick Input:';
  document.getElementById('quick-title').textContent = qTitle;
  const qaEl = document.getElementById('quick-actions');
  qaEl.innerHTML = quick.map(q =>
    `<button class="quick-chip" onclick="fillInput('${q}')">${q}</button>`
  ).join('');
}

function updateStats(dailyStats) {
  if (!dailyStats) return;
  const box = document.getElementById('stats-box');
  box.style.display = 'block';
  document.getElementById('stat-sales').textContent    = formatRM(dailyStats.totalSales || 0);
  document.getElementById('stat-expenses').textContent = formatRM(dailyStats.totalExpenses || 0);
  const profit = dailyStats.netProfit || 0;
  const profitEl = document.getElementById('stat-profit');
  profitEl.textContent = formatRM(profit);
  profitEl.className = `stat-value bold ${profit >= 0 ? 'green' : 'red'}`;
  document.getElementById('stats-title').textContent =
    currentLang === 'bm' ? '📊 Hari Ini' : '📊 Today';
}

// ── Message Rendering ─────────────────────────────────────────────────────
function appendMessage(role, text, time) {
  const chat = document.getElementById('wa-chat');
  const msgDiv = document.createElement('div');
  msgDiv.className = `wa-msg ${role}`;

  const bubble = document.createElement('div');
  bubble.className = 'wa-bubble';

  const content = document.createElement('div');
  content.className = 'bubble-content';
  content.innerHTML = markupToHtml(text);
  bubble.appendChild(content);

  const meta = document.createElement('div');
  meta.className = 'bubble-meta';
  const timeEl = document.createElement('span');
  timeEl.className = 'bubble-time';
  timeEl.textContent = time || formatTime(new Date());
  meta.appendChild(timeEl);

  if (role === 'user') {
    const ticks = document.createElement('span');
    ticks.className = 'bubble-ticks';
    ticks.textContent = '✓✓';
    meta.appendChild(ticks);
  }

  bubble.appendChild(meta);
  msgDiv.appendChild(bubble);
  chat.appendChild(msgDiv);
  scrollToBottom();
  return msgDiv;
}

function showTyping() {
  document.getElementById('typing-indicator').classList.add('visible');
  scrollToBottom();
}

function hideTyping() {
  document.getElementById('typing-indicator').classList.remove('visible');
}

// ── Send message ──────────────────────────────────────────────────────────
async function sendMessage() {
  const input = document.getElementById('chat-input');
  const text  = input.value.trim();
  if (!text || isBotTyping) return;

  input.value = '';
  appendMessage('user', text);
  isBotTyping = true;
  showTyping();

  try {
    const res = await fetch('/api/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, language: currentLang }),
    });
    if (!res.ok) throw new Error(`Server error ${res.status}`);
    const data = await res.json();

    // Display bot messages with staggered delays
    let cumDelay = 600;
    for (const msg of data.messages) {
      const delay = msg.delay || 0;
      await sleep(Math.max(400, delay));
      hideTyping();
      appendMessage('bot', msg.content);
      cumDelay += 300;

      if (data.messages.indexOf(msg) < data.messages.length - 1) {
        await sleep(200);
        showTyping();
      }
    }

    hideTyping();
    currentStage = data.stage;
    updateStageUI(currentStage);

    if (data.dailyStats) {
      updateStats(data.dailyStats);
    }

    // Enable PDF download when report stage reached
    if (data.stage === 'REPORT' || data.stage === 'CLOSED') {
      document.getElementById('pdf-btn').disabled = false;
    }

  } catch (err) {
    hideTyping();
    appendMessage('bot', currentLang === 'bm'
      ? '⚠️ Ralat sambungan. Cuba lagi.'
      : '⚠️ Connection error. Please try again.');
  }

  isBotTyping = false;
}

function fillInput(text) {
  const input = document.getElementById('chat-input');
  input.value = text;
  input.focus();
}

async function restartDemo() {
  await fetch('/api/reset', { method: 'POST' });
  document.getElementById('wa-chat').innerHTML = `<div class="date-badge" id="date-badge"></div>`;
  setDateBadge();
  currentStage = 'WELCOME';
  updateStageUI('WELCOME');
  document.getElementById('stats-box').style.display = 'none';
  document.getElementById('pdf-btn').disabled = true;
  isBotTyping = false;
  hideTyping();
  // Trigger the welcome message automatically
  await autoSendWelcome();
}

async function downloadPDF() {
  window.open('/api/report/pdf', '_blank');
}

// ── Auto-trigger welcome on page load ─────────────────────────────────────
async function autoSendWelcome() {
  isBotTyping = true;
  showTyping();
  await sleep(800);

  try {
    const res = await fetch('/api/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '__init__', language: currentLang }),
    });
    const data = await res.json();
    hideTyping();

    for (const msg of data.messages) {
      appendMessage('bot', msg.content);
    }

    currentStage = data.stage;
    updateStageUI(currentStage);
  } catch {
    hideTyping();
    appendMessage('bot',
      currentLang === 'bm'
        ? 'Salam! 👋 Saya KiraBot. Taip mesej untuk bermula!'
        : 'Hello! 👋 I\'m KiraBot. Type a message to get started!'
    );
  }

  isBotTyping = false;
}

// ── Date badge ────────────────────────────────────────────────────────────
function setDateBadge() {
  const badge = document.getElementById('date-badge');
  if (!badge) return;
  const today = new Date().toLocaleDateString(
    currentLang === 'bm' ? 'ms-MY' : 'en-MY',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
  );
  badge.innerHTML = `<span>${today}</span>`;
}

// ── Input enter key ───────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Init ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  setDateBadge();
  updateStageUI('WELCOME');

  document.getElementById('chat-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  // Show mic icon when input is empty, send icon when not
  document.getElementById('chat-input').addEventListener('input', function () {
    const hasTxt = this.value.trim().length > 0;
    document.getElementById('send-icon').style.display = hasTxt ? 'block' : 'none';
    document.getElementById('mic-icon').style.display  = hasTxt ? 'none'  : 'block';
  });

  // Restore session state if exists
  try {
    const res  = await fetch('/api/session');
    const data = await res.json();

    if (data.stage && data.stage !== 'WELCOME') {
      currentStage = data.stage;
      updateStageUI(currentStage);
      if (data.dailyStats) updateStats(data.dailyStats);
      if (data.stage === 'REPORT' || data.stage === 'CLOSED') {
        document.getElementById('pdf-btn').disabled = false;
      }
      // Show a "session restored" message
      appendMessage('bot',
        currentLang === 'bm'
          ? `Selamat kembali! ✋ Sesi *${data.businessName || 'anda'}* masih aktif.`
          : `Welcome back! ✋ Your *${data.businessName || ''}* session is still active.`
      );
    } else {
      await autoSendWelcome();
    }
  } catch {
    await autoSendWelcome();
  }
});
