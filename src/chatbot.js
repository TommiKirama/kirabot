'use strict';
const { detectIntent, parseSales, parseExpenses, generateInsight } = require('./nlp');
const { getMatchingPromos } = require('./supplier-storage');
const {
  resetDailyStats, recordSales, recordExpense,
  closeDailySession, getFinancialHealthScore, getLoanRecommendations
} = require('./storage');

// ── Localised string tables ───────────────────────────────────────────────────
const T = {
  bm: {
    welcome: `Salam! 👋 Saya *KiraBot*, pembantu niaga digital anda.\n\nSaya bantu anda rekod jualan, jejak untung rugi, dan jana laporan kewangan tanpa keluar dari WhatsApp.\n\n📝 Boleh saya tahu *nama perniagaan* anda?`,
    askName: '📝 Boleh saya tahu *nama perniagaan* anda?',
    registered: (name) => `Pendaftaran selesai! 🎉\n\n✅ *${name}* dah boleh mula merekod jualan sekarang!\n\nTaip sahaja macam biasa:\n• Jualan: *ns lmk 5* atau *nasi lemak 5 rm3*\n• Belanja: *tolak beras rm25*\n• Tutup kedai: *tutup kedai*\n• Laporan: *laporan*\n\nReady? Mula rekod sekarang! 🚀`,
    salesRecorded: (items, total, netProfit) => {
      const lines = items.map(i => `• ${i.qty}x ${i.name} (RM${i.price.toFixed(2)}) = RM${i.total.toFixed(2)}`).join('\n');
      return `✅ *Jualan Masuk:*\n${lines}\n💰 *Total Masuk: RM${total.toFixed(2)}*\n\n📊 Untung bersih setakat ini: *RM${netProfit.toFixed(2)}*`;
    },
    expenseRecorded: (items, total, netProfit) => {
      const lines = items.map(i => `• ${i.item} (RM${i.amount.toFixed(2)})`).join('\n');
      return `📦 *Duit Keluar (Kos):*\n${lines}\n💸 *Total Keluar: RM${total.toFixed(2)}*\n\n📊 Untung bersih setakat ini: *RM${netProfit.toFixed(2)}*`;
    },
    askPrice: (item) => `Berapa harga *${item}* ye? (Contoh: rm5)`,
    unknownEntry: `Maaf, saya tak faham. Cuba taip macam ni:\n• Jualan: *nasi lemak 5 rm3*\n• Belanja: *tolak beras rm25*\n• Tutup: *tutup kedai*`,
    dailyClose: (date, sales, expenses, profit, insight) => {
      const d = new Date(date).toLocaleDateString('ms-MY', { day:'numeric', month:'long', year:'numeric' });
      return `Pukul malam! Masa untuk tutup buku. 📚\n\n*Laporan Harian (${d}):*\n✅ Jualan Masuk: *RM${sales.toFixed(2)}*\n📦 Modal/Belanja: *RM${expenses.toFixed(2)}*\n💰 *Untung Bersih: RM${profit.toFixed(2)}*\n\n${insight}\n\nRehat secukupnya, jumpa esok! 😊\n\nTaip *laporan* untuk jana laporan bulanan, atau *hari baru* untuk mula hari baru.`;
    },
    noTransactions: 'Tiada transaksi direkodkan hari ini. Cuba rekod jualan dulu!',
    summary: (sales, expenses, profit) => `📊 *Ringkasan Hari Ini:*\n• Jualan: RM${sales.toFixed(2)}\n• Belanja: RM${expenses.toFixed(2)}\n• Untung Bersih: *RM${profit.toFixed(2)}*`,
    reportIntro: (name, score, loans) => {
      const scoreLabel = score >= 80 ? '⭐⭐⭐ Sangat Baik' : score >= 60 ? '⭐⭐ Baik' : score >= 40 ? '⭐ Sedang' : '📈 Perlu Peningkatan';
      const loanText = loans.length > 0
        ? `\n\nAnda layak mohon pembiayaan melalui:\n${loans.map(l => `• ${l}`).join('\n')}\n\nNak saya bantu mohon? Taip *ya*!`
        : '\n\nTeruskan rekod untuk meningkatkan kelayakan pembiayaan anda.';
      return `Selamat Pagi! 🌅 Ini laporan bulanan untuk *${name}*:\n\n💳 *Skor Kesihatan Kewangan: ${score}/100*\n${scoreLabel}${loanText}\n\nTekan butang *Muat Turun PDF* di bawah untuk laporan penuh. 📄`;
    },
    newDay: (name) => `Selamat pagi! ☀️ Hari baru, peluang baru!\n\n*${name}* bersedia untuk hari baru.\nMula rekod jualan anda sekarang!`,
    help: `*Panduan KiraBot* 📖\n\n*Rekod Jualan:*\n• nasi lemak 5\n• ns lmk 5 rm3, teh ais 3 rm2\n\n*Rekod Belanja/Kos:*\n• tolak beras rm25\n• beli minyak rm15\n\n*Arahan Lain:*\n• *tutup kedai* — Tutup dan ringkasan harian\n• *laporan* — Jana laporan bulanan PDF\n• *ringkasan* — Lihat statistik hari ini\n• *menu* — Lihat senarai item direkodkan`,
    menu: (items) => items.length > 0
      ? `🍽️ *Menu/Senarai Item Anda:*\n${items.map(([k, v]) => `• ${k}: RM${v.toFixed(2)}`).join('\n')}`
      : '🍽️ Tiada item didaftarkan lagi. Rekod jualan dulu!',
    alreadyClosed: 'Kedai sudah tutup untuk hari ini. Taip *laporan* untuk penyata bulanan atau *hari baru* untuk mula esok.',
    notActive: 'Sila daftarkan perniagaan anda dahulu. Taip apa-apa untuk mula!',
  },

  en: {
    welcome: `Hello! 👋 I'm *KiraBot*, your digital business assistant.\n\nI help you record sales, track profit & loss, and generate financial reports — all without leaving WhatsApp.\n\n📝 What is your *business name*?`,
    askName: '📝 What is your *business name*?',
    registered: (name) => `Registration complete! 🎉\n\n✅ *${name}* is ready to start recording!\n\nJust type naturally:\n• Sales: *fried rice 5* or *nasi lemak 5 rm3*\n• Expenses: *buy rice rm25*\n• Close shop: *close shop*\n• Report: *report*\n\nReady? Start recording now! 🚀`,
    salesRecorded: (items, total, netProfit) => {
      const lines = items.map(i => `• ${i.qty}x ${i.name} (RM${i.price.toFixed(2)}) = RM${i.total.toFixed(2)}`).join('\n');
      return `✅ *Sales Recorded:*\n${lines}\n💰 *Total In: RM${total.toFixed(2)}*\n\n📊 Net profit so far: *RM${netProfit.toFixed(2)}*`;
    },
    expenseRecorded: (items, total, netProfit) => {
      const lines = items.map(i => `• ${i.item} (RM${i.amount.toFixed(2)})`).join('\n');
      return `📦 *Expenses Recorded:*\n${lines}\n💸 *Total Out: RM${total.toFixed(2)}*\n\n📊 Net profit so far: *RM${netProfit.toFixed(2)}*`;
    },
    askPrice: (item) => `What is the price of *${item}*? (e.g. rm5)`,
    unknownEntry: `Sorry, I didn't understand that. Try:\n• Sales: *nasi lemak 5 rm3*\n• Expenses: *buy rice rm25*\n• Close: *close shop*`,
    dailyClose: (date, sales, expenses, profit, insight) => {
      const d = new Date(date).toLocaleDateString('en-MY', { day:'numeric', month:'long', year:'numeric' });
      return `Time to close the books! 📚\n\n*Daily Report (${d}):*\n✅ Total Sales: *RM${sales.toFixed(2)}*\n📦 Total Expenses: *RM${expenses.toFixed(2)}*\n💰 *Net Profit: RM${profit.toFixed(2)}*\n\n${insight}\n\nGet some rest, see you tomorrow! 😊\n\nType *report* for monthly PDF, or *new day* to start fresh.`;
    },
    noTransactions: 'No transactions recorded today. Try recording some sales first!',
    summary: (sales, expenses, profit) => `📊 *Today's Summary:*\n• Sales: RM${sales.toFixed(2)}\n• Expenses: RM${expenses.toFixed(2)}\n• Net Profit: *RM${profit.toFixed(2)}*`,
    reportIntro: (name, score, loans) => {
      const scoreLabel = score >= 80 ? '⭐⭐⭐ Excellent' : score >= 60 ? '⭐⭐ Good' : score >= 40 ? '⭐ Fair' : '📈 Needs Improvement';
      const loanText = loans.length > 0
        ? `\n\nYou are eligible to apply for financing via:\n${loans.map(l => `• ${l}`).join('\n')}\n\nWant me to help you apply? Type *yes*!`
        : '\n\nKeep recording to improve your financing eligibility.';
      return `Good morning! 🌅 Here is the monthly report for *${name}*:\n\n💳 *Financial Health Score: ${score}/100*\n${scoreLabel}${loanText}\n\nPress the *Download PDF* button below for the full report. 📄`;
    },
    newDay: (name) => `Good morning! ☀️ New day, new opportunities!\n\n*${name}* is ready for a new day.\nStart recording your sales now!`,
    help: `*KiraBot Guide* 📖\n\n*Record Sales:*\n• nasi lemak 5\n• fried rice 5 rm7, teh ais 3 rm2\n\n*Record Expenses:*\n• buy rice rm25\n• spent oil rm15\n\n*Other Commands:*\n• *close shop* — Close & get daily summary\n• *report* — Generate monthly PDF report\n• *summary* — View today's stats\n• *menu* — View recorded items`,
    menu: (items) => items.length > 0
      ? `🍽️ *Your Menu / Item List:*\n${items.map(([k, v]) => `• ${k}: RM${v.toFixed(2)}`).join('\n')}`
      : '🍽️ No items registered yet. Record some sales first!',
    alreadyClosed: 'Shop is already closed for today. Type *report* for monthly statement or *new day* to start tomorrow.',
    notActive: 'Please register your business first. Type anything to get started!',
  }
};

function t(lang) {
  return T[lang] || T.bm;
}

// ── Supplier promo message builder ────────────────────────────────────────────
function buildPromoMessage(promo, lang) {
  const isBm = lang !== 'en';
  const contact = promo.contactNumber
    ? `\n📞 ${isBm ? 'Hubungi' : 'Contact'}: *${promo.contactNumber}*`
    : '';
  const header = isBm ? '💡 *Tawaran Pembekal Eksklusif!*' : '💡 *Exclusive Supplier Offer!*';
  const from   = isBm ? 'Daripada' : 'From';
  const interested = isBm
    ? '_Taip *ya minat* untuk dapatkan butiran lanjut._'
    : '_Type *yes interested* to get more details._';

  return `${header}\n` +
    `━━━━━━━━━━━━━━━━━\n` +
    `🏭 *${from}: ${promo.companyName}*\n` +
    `📦 ${promo.promoText}` +
    `${contact}\n` +
    `━━━━━━━━━━━━━━━━━\n` +
    `${interested}`;
}

// ── Core message processor ────────────────────────────────────────────────────
async function processMessage(text, session) {
  const lang = session.language || 'bm';
  const str = t(lang);
  const messages = [];

  const addMsg = (content, delay = 0) => messages.push({ role: 'bot', content, delay });

  // ── Handle pending price question ─────────────────────────────────────────
  if (session.pendingPriceItem) {
    const priceMatch = text.match(/rm\s*(\d+(?:[.,]\d{1,2})?)/i) || text.match(/^(\d+(?:[.,]\d{1,2})?)$/);
    if (priceMatch) {
      const price = parseFloat(priceMatch[1].replace(',', '.'));
      const { name, qty } = session.pendingPriceItem;
      session.menu[name] = price;
      session.pendingPriceItem = null;

      const item = { name, qty, price, total: parseFloat((qty * price).toFixed(2)) };
      session = recordSales(session, [item]);

      const total = item.total;
      addMsg(str.salesRecorded([item], total, session.dailyStats.netProfit));
      return { messages, session };
    } else {
      addMsg(str.askPrice(session.pendingPriceItem.name));
      return { messages, session };
    }
  }

  // ── State: WELCOME ────────────────────────────────────────────────────────
  if (session.stage === 'WELCOME') {
    addMsg(str.welcome);
    session.stage = 'ONBOARDING';
    return { messages, session };
  }

  // ── State: ONBOARDING ────────────────────────────────────────────────────
  if (session.stage === 'ONBOARDING') {
    const name = text.trim();
    if (name.length < 2) {
      addMsg(str.askName);
      return { messages, session };
    }
    session.businessName = name;
    session.stage = 'ACTIVE';
    addMsg(str.registered(name), 800);
    return { messages, session };
  }

  // ── State: ACTIVE or CLOSED (parse commands first) ────────────────────────
  const intent = detectIntent(text);

  if (intent === 'RESTART') {
    session.stage = 'ONBOARDING';
    session.businessName = null;
    session.transactions = [];
    session.dailySummaries = [];
    session.menu = {};
    session = resetDailyStats(session);
    addMsg(str.welcome);
    return { messages, session };
  }

  if (intent === 'HELP') {
    addMsg(str.help);
    return { messages, session };
  }

  if (intent === 'MENU') {
    const menuEntries = Object.entries(session.menu);
    addMsg(str.menu(menuEntries));
    return { messages, session };
  }

  if (intent === 'SUMMARY') {
    if (session.stage !== 'ACTIVE') {
      addMsg(str.alreadyClosed);
      return { messages, session };
    }
    const s = session.dailyStats;
    addMsg(str.summary(s.totalSales, s.totalExpenses, s.netProfit));
    return { messages, session };
  }

  if (intent === 'NEW_DAY') {
    session = closeDailySession(session);
    session = resetDailyStats(session);
    session.stage = 'ACTIVE';
    addMsg(str.newDay(session.businessName), 600);
    return { messages, session };
  }

  if (intent === 'REPORT') {
    const score = getFinancialHealthScore(session);
    const loans = getLoanRecommendations(score);
    addMsg(str.reportIntro(session.businessName, score, loans), 800);
    session.stage = 'REPORT';
    return { messages, session };
  }

  if (intent === 'CLOSE') {
    if (session.stage === 'CLOSED') {
      addMsg(str.alreadyClosed);
      return { messages, session };
    }
    if (session.dailyStats.totalSales === 0 && session.dailyStats.totalExpenses === 0) {
      addMsg(str.noTransactions);
      return { messages, session };
    }
    session = closeDailySession(session);
    const last = session.dailySummaries[session.dailySummaries.length - 1];
    const insight = generateInsight(session.dailyStats, lang);
    addMsg(str.dailyClose(
      last.date, last.totalSales, last.totalExpenses, last.netProfit, insight
    ), 1000);
    session.stage = 'CLOSED';
    return { messages, session };
  }

  // ── Require ACTIVE stage for transaction recording ─────────────────────────
  if (session.stage === 'CLOSED') {
    addMsg(str.alreadyClosed);
    return { messages, session };
  }

  if (session.stage !== 'ACTIVE') {
    addMsg(str.notActive);
    return { messages, session };
  }

  // ── Record EXPENSE ────────────────────────────────────────────────────────
  if (intent === 'EXPENSE') {
    const items = parseExpenses(text);
    if (items.length === 0) {
      addMsg(str.unknownEntry);
      return { messages, session };
    }
    const total = items.reduce((s, i) => s + i.amount, 0);
    session = recordExpense(session, items);
    addMsg(str.expenseRecorded(items, total, session.dailyStats.netProfit));

    // ── Inject supplier promos for any matching expense items ──────────────
    // Use a plain Array (not Set) — Set is not JSON-serializable by express-session
    const shownPromos = Array.isArray(session.shownPromos) ? session.shownPromos : [];
    for (const item of items) {
      const promos = getMatchingPromos(item.item);
      for (const promo of promos) {
        if (shownPromos.includes(promo.promoId)) continue;
        shownPromos.push(promo.promoId);
        const promoMsg = buildPromoMessage(promo, lang);
        addMsg(promoMsg, 1200);
      }
    }
    session.shownPromos = shownPromos;

    return { messages, session };
  }

  // ── Record SALES ──────────────────────────────────────────────────────────
  if (intent === 'SALES') {
    const items = parseSales(text, session.menu);
    if (items.length === 0) {
      addMsg(str.unknownEntry);
      return { messages, session };
    }

    // Check for items whose price is unknown
    const unknownItem = items.find(i => !i.priceKnown);
    if (unknownItem) {
      session.pendingPriceItem = { name: unknownItem.name, qty: unknownItem.qty };
      addMsg(str.askPrice(unknownItem.name));
      return { messages, session };
    }

    const total = items.reduce((s, i) => s + i.total, 0);
    session = recordSales(session, items);
    // Update menu with prices for future use
    for (const item of items) {
      if (item.price && !session.menu[item.name]) {
        session.menu[item.name] = item.price;
      }
    }
    addMsg(str.salesRecorded(items, total, session.dailyStats.netProfit));
    return { messages, session };
  }

  // ── Fallback ──────────────────────────────────────────────────────────────
  addMsg(str.unknownEntry);
  return { messages, session };
}

module.exports = { processMessage };
