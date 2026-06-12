/* KiraBot Supplier Portal Frontend */
'use strict';

let currentLang = 'bm';
let currentStage = 'WELCOME';
let isBotTyping = false;

// ── Stage config ──────────────────────────────────────────────────────────────
const STAGE_CONFIG = {
  WELCOME: {
    stage: 'reg',
    tipsTitle: { bm: '💡 Cara Mula:', en: '💡 Getting Started:' },
    tips: { bm: ['Taip sebarang mesej', 'Daftar syarikat anda', 'Mula promosikan produk'], en: ['Type any message', 'Register your company', 'Start promoting products'] },
    quick: { bm: ['Salam!', 'Hello KiraBot', 'Mula'], en: ['Hello!', 'Hi KiraBot', 'Start'] },
  },
  ONBOARDING_NAME: {
    stage: 'reg',
    tipsTitle: { bm: '🏭 Nama Syarikat:', en: '🏭 Company Name:' },
    tips: { bm: ['Pemborong Beras Haji Samad', 'Syarikat Minyak Sdn Bhd', 'Kedai Runcit Pak Hassan'], en: ['Pemborong Beras Haji Samad', 'Cooking Oil Sdn Bhd', 'Hassan Grocery Supplies'] },
    quick: { bm: ['Pemborong Beras Haji Samad', 'Syarikat Minyak Jaya', 'Pemborong Runcit Maju'], en: ['Pemborong Beras Haji Samad', 'Oil Trading Sdn Bhd', 'Wholesale Supply Co'] },
  },
  ONBOARDING_CONTACT: {
    stage: 'reg',
    tipsTitle: { bm: '📞 Nombor Telefon:', en: '📞 Contact Number:' },
    tips: { bm: ['012-345 6789', '03-1234 5678', 'Taip skip untuk langkau'], en: ['012-345 6789', '03-1234 5678', 'Type skip to skip'] },
    quick: { bm: ['012-345 6789', '03-1234 5678', 'skip'], en: ['012-345 6789', '03-1234 5678', 'skip'] },
  },
  ACTIVE: {
    stage: 'products',
    tipsTitle: { bm: '💡 Cuba Taip:', en: '💡 Try Typing:' },
    tips: { bm: ['tambah Beras 10kg rm45', 'promo Beras diskaun 20%', 'senarai', 'statistik'], en: ['add Rice 10kg rm45', 'promo Rice discount 20%', 'list', 'stats'] },
    quick: { bm: ['tambah Beras 10kg rm45', 'promo Beras 10kg diskaun 20%', 'senarai', 'promosi', 'statistik'], en: ['add Rice 10kg rm45', 'promo Rice 10kg discount 20%', 'list', 'promos', 'stats'] },
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTime(date) {
  return date.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' });
}

function markupToHtml(text) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

function scrollToBottom() {
  const chat = document.getElementById('wa-chat');
  chat.scrollTop = chat.scrollHeight;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Language ──────────────────────────────────────────────────────────────────
function setLanguage(lang) {
  currentLang = lang;
  document.getElementById('btn-bm').classList.toggle('active', lang === 'bm');
  document.getElementById('btn-en').classList.toggle('active', lang === 'en');

  document.querySelectorAll('[data-bm]').forEach(el => {
    el.textContent = el.dataset[lang] || el.dataset.bm;
  });

  document.getElementById('tagline').textContent =
    lang === 'bm' ? 'Supplier Portal — Jangkau Peniaga B40' : 'Supplier Portal — Reach B40 Vendors';
  document.getElementById('wa-status').textContent = lang === 'bm' ? 'Dalam talian' : 'Online';
  document.getElementById('chat-input').placeholder = lang === 'bm' ? 'Taip mesej...' : 'Type a message...';
  document.getElementById('how-title').textContent = lang === 'bm' ? '⚡ Bagaimana ia berfungsi?' : '⚡ How it works?';

  updateStageUI(currentStage);

  fetch('/api/supplier/language', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language: lang }),
  }).catch(() => {});
}

// ── Stage UI ──────────────────────────────────────────────────────────────────
function updateStageUI(stage) {
  const stageOrder = ['reg', 'products', 'promos', 'analytics'];
  const config = STAGE_CONFIG[stage] || STAGE_CONFIG.WELCOME;
  const activeStage = config.stage;
  const activeIdx = stageOrder.indexOf(activeStage);

  stageOrder.forEach((s, i) => {
    const el = document.getElementById(`stage-${s}`);
    const conn = el.nextElementSibling;
    el.classList.remove('active', 'done');
    if (i < activeIdx) {
      el.classList.add('done');
      if (conn?.classList.contains('stage-connector')) conn.classList.add('done');
    } else if (i === activeIdx) {
      el.classList.add('active');
      if (conn?.classList.contains('stage-connector')) conn.classList.remove('done');
    } else {
      if (conn?.classList.contains('stage-connector')) conn.classList.remove('done');
    }
  });

  const tips = config.tips[currentLang] || config.tips.bm;
  const tipsTitle = config.tipsTitle[currentLang] || config.tipsTitle.bm;
  document.getElementById('tips-title').textContent = tipsTitle;
  document.getElementById('tip-chips').innerHTML = tips.map(t =>
    `<button class="tip-chip" onclick="fillInput('${t.replace(/'/g,"\\'")}')">` + t + `</button>`
  ).join('');

  const quick = config.quick[currentLang] || config.quick.bm;
  const qLabel = currentLang === 'bm' ? 'Contoh Arahan:' : 'Example Commands:';
  document.getElementById('quick-title').textContent = qLabel;
  document.getElementById('quick-actions').innerHTML = quick.map(q =>
    `<button class="quick-chip" onclick="fillInput('${q.replace(/'/g,"\\'")}')">` + q + `</button>`
  ).join('');
}

function updateStats(stats) {
  if (!stats) return;
  const box = document.getElementById('stats-box');
  box.style.display = 'block';
  document.getElementById('stat-products').textContent    = stats.totalProducts || 0;
  document.getElementById('stat-promos').textContent      = stats.activePromos  || 0;
  document.getElementById('stat-impressions').textContent = stats.totalImpressions || 0;
  document.getElementById('stats-title').textContent =
    currentLang === 'bm' ? '📊 Analitik Anda' : '📊 Your Analytics';

  // Auto-advance stage UI based on data
  if ((stats.totalProducts || 0) > 0 && (stats.activePromos || 0) === 0) {
    updateStageUIForStep('promos');
  } else if ((stats.activePromos || 0) > 0) {
    updateStageUIForStep('analytics');
  }
}

function updateStageUIForStep(step) {
  const stageOrder = ['reg', 'products', 'promos', 'analytics'];
  const activeIdx = stageOrder.indexOf(step);
  stageOrder.forEach((s, i) => {
    const el = document.getElementById(`stage-${s}`);
    const conn = el.nextElementSibling;
    el.classList.remove('active', 'done');
    if (i < activeIdx) {
      el.classList.add('done');
      if (conn?.classList.contains('stage-connector')) conn.classList.add('done');
    } else if (i === activeIdx) {
      el.classList.add('active');
    }
  });
}

// ── Messages ──────────────────────────────────────────────────────────────────
function appendMessage(role, text, time) {
  const chat = document.getElementById('wa-chat');
  const msgDiv = document.createElement('div');
  msgDiv.className = `wa-msg ${role}`;

  const bubble = document.createElement('div');
  bubble.className = 'wa-bubble';
  const content = document.createElement('div');
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
}

function showTyping() { document.getElementById('typing-indicator').classList.add('visible'); scrollToBottom(); }
function hideTyping()  { document.getElementById('typing-indicator').classList.remove('visible'); }

// ── Send message ──────────────────────────────────────────────────────────────
async function sendMessage() {
  const input = document.getElementById('chat-input');
  const text  = input.value.trim();
  if (!text || isBotTyping) return;

  input.value = '';
  appendMessage('user', text);
  isBotTyping = true;
  showTyping();

  try {
    const res  = await fetch('/api/supplier/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, language: currentLang }),
    });
    if (!res.ok) throw new Error(`Server error ${res.status}`);
    const data = await res.json();

    for (const msg of data.messages) {
      await sleep(Math.max(400, msg.delay || 0));
      hideTyping();
      appendMessage('bot', msg.content);
      if (data.messages.indexOf(msg) < data.messages.length - 1) {
        await sleep(200);
        showTyping();
      }
    }

    hideTyping();
    currentStage = data.stage;
    updateStageUI(currentStage);
    if (data.stats) updateStats(data.stats);

  } catch {
    hideTyping();
    appendMessage('bot', currentLang === 'bm' ? '⚠️ Ralat sambungan. Cuba lagi.' : '⚠️ Connection error. Try again.');
  }

  isBotTyping = false;
}

function fillInput(text) {
  const input = document.getElementById('chat-input');
  input.value = text;
  input.focus();
}

async function restartPortal() {
  await fetch('/api/supplier/reset', { method: 'POST' });
  document.getElementById('wa-chat').innerHTML = `<div class="date-badge" id="date-badge"></div>`;
  setDateBadge();
  currentStage = 'WELCOME';
  updateStageUI('WELCOME');
  document.getElementById('stats-box').style.display = 'none';
  isBotTyping = false;
  hideTyping();
  await autoSendWelcome();
}

async function autoSendWelcome() {
  isBotTyping = true;
  showTyping();
  await sleep(700);

  try {
    const res  = await fetch('/api/supplier/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '__init__', language: currentLang }),
    });
    const data = await res.json();
    hideTyping();
    for (const msg of data.messages) appendMessage('bot', msg.content);
    currentStage = data.stage;
    updateStageUI(currentStage);
  } catch {
    hideTyping();
    appendMessage('bot',
      currentLang === 'bm'
        ? 'Salam! 👋 Selamat datang ke KiraBot Supplier Portal. Taip mesej untuk bermula!'
        : 'Hello! 👋 Welcome to KiraBot Supplier Portal. Type a message to get started!'
    );
  }

  isBotTyping = false;
}

function setDateBadge() {
  const badge = document.getElementById('date-badge');
  if (!badge) return;
  const today = new Date().toLocaleDateString(
    currentLang === 'bm' ? 'ms-MY' : 'en-MY',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
  );
  badge.innerHTML = `<span>${today}</span>`;
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  setDateBadge();
  updateStageUI('WELCOME');

  document.getElementById('chat-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  try {
    const res  = await fetch('/api/supplier/session');
    const data = await res.json();
    if (data.stage && data.stage !== 'WELCOME' && data.companyName) {
      currentStage = data.stage;
      updateStageUI(currentStage);
      appendMessage('bot',
        currentLang === 'bm'
          ? `Selamat kembali! ✋ Akaun pembekal *${data.companyName}* masih aktif. Apa yang boleh saya bantu?`
          : `Welcome back! ✋ Supplier account *${data.companyName}* is still active. How can I help?`
      );
    } else {
      await autoSendWelcome();
    }
  } catch {
    await autoSendWelcome();
  }
});
