'use strict';
const {
  registerSupplier, getSupplier,
  addProduct, createPromo, deletePromo,
  getSupplierStats,
} = require('./supplier-storage');

// ── String tables ─────────────────────────────────────────────────────────────
const T = {
  bm: {
    welcome: `Salam! 👋 Selamat datang ke *KiraBot Supplier Portal*.\n\n🏭 Platform ini menghubungkan produk anda terus kepada ribuan peniaga B40 di seluruh Malaysia.\n\nBoleh saya tahu *nama syarikat* anda?`,
    askCompany: '🏭 Sila masukkan *nama syarikat* anda:',
    askContact: (name) => `Syarikat *${name}* berjaya didaftarkan! ✅\n\nBoleh kongsi *nombor telefon* untuk peniaga hubungi anda? (Taip 'skip' untuk langkau)`,
    registered: (name) => `Semuanya dah set! 🎉\n\nAkaun pembekal *${name}* kini aktif.\n\nTaip arahan berikut:\n• *tambah* Beras 10kg rm45 — Tambah produk\n• *promo* Beras 10kg diskaun 20% — Buat promosi\n• *senarai* — Lihat katalog produk\n• *promosi* — Lihat promosi aktif\n• *statistik* — Lihat analitik jangkauan\n• *tolong* — Panduan lengkap`,
    productAdded: (name, price) => `✅ Produk ditambah!\n\n📦 *${name}*\n💰 Harga: *RM${price.toFixed(2)}*\n\nProduk ini kini boleh dipromosikan kepada peniaga. Taip *promo ${name} diskaun X%* untuk buat tawaran!`,
    askProductName: 'Nama produk anda? (Contoh: Beras Cap Rambutan 10kg)',
    askProductPrice: (name) => `Berapa harga untuk *${name}*? (Contoh: rm45)`,
    promoCreated: (promo) => `🎉 Promosi berjaya dibuat!\n\n🏷️ *${promo.productName}*\n📢 ${promo.promoText}\n\nPromosi ini akan dihantar secara automatik kepada peniaga apabila mereka membeli *${promo.productName}*. Anda akan dapat notifikasi berapa ramai peniaga yang terima tawaran ini.`,
    promoFail: (name) => `Produk *${name}* tidak dijumpai dalam katalog. Sila tambah produk dahulu dengan:\ntambah ${name} rm[harga]`,
    listProducts: (products) => products.length > 0
      ? `📦 *Katalog Produk Anda (${products.length} item):*\n\n${products.map((p, i) => `${i + 1}. *${p.name}* — RM${p.price.toFixed(2)}${p.unit ? ' / ' + p.unit : ''}`).join('\n')}\n\nTaip *promo [nama produk] diskaun X%* untuk buat tawaran!`
      : `📦 Katalog masih kosong.\n\nTambah produk pertama anda:\n*tambah Beras 10kg rm45*`,
    listPromos: (stats) => stats.activePromos === 0
      ? `📢 Tiada promosi aktif.\n\nBuat promosi pertama:\n*promo Beras 10kg diskaun 20%*`
      : `📢 *Promosi Aktif (${stats.activePromos}):*\n\n${stats.promos.map((p, i) => `${i + 1}. ${p.promoText}\n   👁️ ${p.impressions} peniaga dah nampak`).join('\n\n')}\n\nTaip *padam [nombor]* untuk buang promosi.`,
    stats: (stats) => `📊 *Analitik Anda:*\n\n📦 Produk dalam katalog: *${stats.totalProducts}*\n📢 Promosi aktif: *${stats.activePromos}*\n👁️ Jumlah tayangan kepada peniaga: *${stats.totalImpressions}*\n\n_Setiap kali peniaga rekod belian yang berkaitan, promosi anda dipaparkan secara automatik._`,
    promoDeleted: '✅ Promosi berjaya dipadam.',
    promoDeleteFail: 'Promosi tidak dijumpai. Taip *promosi* untuk lihat senarai.',
    help: `*Panduan KiraBot Supplier Portal* 📖\n\n*Tambah Produk:*\ntambah Beras 10kg rm45\ntambah Minyak Sawit 5L rm28.50\n\n*Buat Promosi:*\npromo Beras 10kg diskaun 20%\npromo Minyak rm24.90\npromo Beras penghantaran percuma\n\n*Urus Katalog:*\n• *senarai* — lihat semua produk\n• *promosi* — lihat promosi aktif\n• *statistik* — analitik jangkauan\n• *padam [nombor]* — buang promosi`,
    unknown: `Maaf, saya tak faham. Cuba:\n• *tambah Beras 10kg rm45* — tambah produk\n• *promo Beras 10kg diskaun 20%* — buat promosi\n• *tolong* — panduan lengkap`,
  },
  en: {
    welcome: `Hello! 👋 Welcome to *KiraBot Supplier Portal*.\n\n🏭 This platform connects your products directly to thousands of B40 micro-vendors across Malaysia.\n\nWhat is your *company name*?`,
    askCompany: '🏭 Please enter your *company name*:',
    askContact: (name) => `*${name}* has been registered! ✅\n\nCan you share a *contact number* for vendors to reach you? (Type 'skip' to skip)`,
    registered: (name) => `All set! 🎉\n\nSupplier account for *${name}* is now active.\n\nAvailable commands:\n• *add* Rice 10kg rm45 — Add product\n• *promo* Rice 10kg discount 20% — Create promotion\n• *list* — View product catalogue\n• *promos* — View active promotions\n• *stats* — View reach analytics\n• *help* — Full guide`,
    productAdded: (name, price) => `✅ Product added!\n\n📦 *${name}*\n💰 Price: *RM${price.toFixed(2)}*\n\nThis product can now be promoted to vendors. Type *promo ${name} discount X%* to create an offer!`,
    askProductName: 'Product name? (e.g. Rice Cap Rambutan 10kg)',
    askProductPrice: (name) => `What is the price for *${name}*? (e.g. rm45)`,
    promoCreated: (promo) => `🎉 Promotion created!\n\n🏷️ *${promo.productName}*\n📢 ${promo.promoText}\n\nThis promotion will be automatically shown to vendors when they record a purchase of *${promo.productName}*. You'll see how many vendors received your offer in your stats.`,
    promoFail: (name) => `Product *${name}* not found in your catalogue. Add it first:\nadd ${name} rm[price]`,
    listProducts: (products) => products.length > 0
      ? `📦 *Your Product Catalogue (${products.length} items):*\n\n${products.map((p, i) => `${i + 1}. *${p.name}* — RM${p.price.toFixed(2)}${p.unit ? ' / ' + p.unit : ''}`).join('\n')}\n\nType *promo [product name] discount X%* to create an offer!`
      : `📦 Catalogue is empty.\n\nAdd your first product:\n*add Rice 10kg rm45*`,
    listPromos: (stats) => stats.activePromos === 0
      ? `📢 No active promotions.\n\nCreate your first:\n*promo Rice 10kg discount 20%*`
      : `📢 *Active Promotions (${stats.activePromos}):*\n\n${stats.promos.map((p, i) => `${i + 1}. ${p.promoText}\n   👁️ ${p.impressions} vendors have seen this`).join('\n\n')}\n\nType *delete [number]* to remove a promotion.`,
    stats: (stats) => `📊 *Your Analytics:*\n\n📦 Products in catalogue: *${stats.totalProducts}*\n📢 Active promotions: *${stats.activePromos}*\n👁️ Total impressions to vendors: *${stats.totalImpressions}*\n\n_Every time a vendor records a relevant purchase, your promotion is shown automatically._`,
    promoDeleted: '✅ Promotion deleted.',
    promoDeleteFail: 'Promotion not found. Type *promos* to see the list.',
    help: `*KiraBot Supplier Portal Guide* 📖\n\n*Add Products:*\nadd Rice 10kg rm45\nadd Cooking Oil 5L rm28.50\n\n*Create Promotions:*\npromo Rice 10kg discount 20%\npromo Oil rm24.90\npromo Rice free delivery\n\n*Manage Catalogue:*\n• *list* — view all products\n• *promos* — view active promotions\n• *stats* — reach analytics\n• *delete [number]* — remove promotion`,
    unknown: `Sorry, I didn't understand that. Try:\n• *add Rice 10kg rm45* — add product\n• *promo Rice 10kg discount 20%* — create promotion\n• *help* — full guide`,
  },
};

function t(lang) { return T[lang] || T.bm; }

// ── NLP helpers ───────────────────────────────────────────────────────────────

function extractPrice(text) {
  const m = text.match(/rm\s*(\d+(?:[.,]\d{1,2})?)/i);
  return m ? parseFloat(m[1].replace(',', '.')) : null;
}

function detectSupplierIntent(text) {
  const l = text.toLowerCase().trim();
  if (/\b(tambah|add|daftar|masuk)\b/i.test(l))                      return 'ADD_PRODUCT';
  if (/\b(promo|promosi|diskaun|discount|tawaran|offer|sale)\b/i.test(l)) return 'CREATE_PROMO';
  if (/\b(senarai|list|katalog|catalogue|barang|produk saya)\b/i.test(l))  return 'LIST_PRODUCTS';
  if (/\b(promosi saya|promos|aktif|active promo|promosi aktif)\b/i.test(l)) return 'LIST_PROMOS';
  if (/\b(statistik|stats|analitik|analytics|laporan)\b/i.test(l))    return 'STATS';
  if (/\b(padam|delete|remove|buang|hapus)\b/i.test(l))               return 'DELETE_PROMO';
  if (/\b(tolong|help|bantuan|cara|panduan)\b/i.test(l))              return 'HELP';
  if (/\b(skip|langkau|tak ada|tiada)\b/i.test(l))                   return 'SKIP';
  if (/^rm\s*\d|^\d+(?:[.,]\d{1,2})?\s*$/.test(l))                  return 'PRICE_ANSWER';
  return 'UNKNOWN';
}

function parseAddProduct(text) {
  // "tambah Beras Cap Rambutan 10kg rm45"
  // "add Rice 10kg rm45.50"
  const priceMatch = text.match(/rm\s*(\d+(?:[.,]\d{1,2})?)/i);
  const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : null;
  let name = text
    .replace(/\b(tambah|add|daftar|masuk|produk|product)\b/gi, '')
    .replace(priceMatch ? priceMatch[0] : '', '')
    .trim();
  // extract trailing unit e.g. "10kg", "5L", "1 pcs"
  const unitMatch = name.match(/(\d+\s*(?:kg|g|l|ml|liter|litre|pcs|pack|unit|beg|tin))/i);
  const unit = unitMatch ? unitMatch[1] : '';
  return { name: name.replace(/\s+/g, ' ').trim(), price, unit };
}

function parsePromo(text, products) {
  // Patterns:
  // "promo Beras 10kg diskaun 20%"
  // "promo Minyak rm24.90"
  // "promo Beras free delivery"
  let clean = text.replace(/\b(promo|promosi|tawaran|offer)\b/gi, '').trim();

  // Try percent discount
  const pctMatch = clean.match(/(.+?)\s+(?:diskaun|discount)\s+(\d+)\s*%/i);
  if (pctMatch) {
    const productName = matchProductName(pctMatch[1].trim(), products);
    if (!productName) return { error: pctMatch[1].trim() };
    const product = products.find(p => p.name.toLowerCase() === productName.toLowerCase());
    return { productName, discountType: 'percent', discountValue: parseFloat(pctMatch[2]), originalPrice: product?.price || null };
  }

  // Try fixed price
  const rmMatch = clean.match(/(.+?)\s+rm\s*(\d+(?:[.,]\d{1,2})?)/i);
  if (rmMatch) {
    const productName = matchProductName(rmMatch[1].trim(), products);
    if (!productName) return { error: rmMatch[1].trim() };
    return { productName, discountType: 'fixed', discountValue: parseFloat(rmMatch[2].replace(',', '.')) };
  }

  // Free-text promo
  const parts = clean.split(/\s+/);
  const productName = matchProductName(parts.slice(0, 3).join(' '), products) ||
                      matchProductName(parts.slice(0, 2).join(' '), products) ||
                      matchProductName(parts[0], products);
  if (productName) {
    const promoText = clean.replace(new RegExp(productName, 'i'), '').trim();
    return { productName, discountType: 'text', discountValue: promoText || 'Tawaran Khas' };
  }
  return { error: clean };
}

function matchProductName(raw, products) {
  const lower = raw.toLowerCase();
  // Exact or partial match
  const match = products.find(p =>
    p.name.toLowerCase() === lower ||
    p.name.toLowerCase().includes(lower) ||
    lower.includes(p.name.toLowerCase().split(' ')[0])
  );
  return match ? match.name : null;
}

// ── Core processor ────────────────────────────────────────────────────────────
async function processSupplierMessage(text, session) {
  const lang = session.language || 'bm';
  const str  = t(lang);
  const messages = [];
  const addMsg = (content, delay = 0) => messages.push({ role: 'bot', content, delay });

  // ── WELCOME ──────────────────────────────────────────────────────────────
  if (session.stage === 'WELCOME') {
    addMsg(str.welcome);
    session.stage = 'ONBOARDING_NAME';
    return { messages, session };
  }

  // ── ONBOARDING: company name ──────────────────────────────────────────────
  if (session.stage === 'ONBOARDING_NAME') {
    const name = text.trim();
    if (name.length < 2) { addMsg(str.askCompany); return { messages, session }; }
    const supplier = registerSupplier(name);
    session.supplierId = supplier.id;
    session.stage = 'ONBOARDING_CONTACT';
    addMsg(str.askContact(name), 600);
    return { messages, session };
  }

  // ── ONBOARDING: contact number ────────────────────────────────────────────
  if (session.stage === 'ONBOARDING_CONTACT') {
    const supplier = getSupplier(session.supplierId);
    const intent = detectSupplierIntent(text);
    if (intent !== 'SKIP') {
      const phone = text.replace(/[^0-9\-+ ]/g, '').trim();
      if (supplier) supplier.contactNumber = phone;
    }
    session.stage = 'ACTIVE';
    addMsg(str.registered(supplier?.companyName || ''), 600);
    return { messages, session };
  }

  // ── Require active supplier ───────────────────────────────────────────────
  if (!session.supplierId) {
    addMsg(str.welcome);
    session.stage = 'ONBOARDING_NAME';
    return { messages, session };
  }

  const supplier = getSupplier(session.supplierId);
  if (!supplier) { addMsg(str.welcome); session.stage = 'ONBOARDING_NAME'; return { messages, session }; }

  // ── Pending product price ─────────────────────────────────────────────────
  if (session.pendingProduct) {
    const intent = detectSupplierIntent(text);
    if (intent === 'PRICE_ANSWER' || extractPrice(text)) {
      const price = extractPrice(text);
      if (price) {
        const { name, unit } = session.pendingProduct;
        addProduct(supplier.id, name, price, unit);
        session.pendingProduct = null;
        addMsg(str.productAdded(name, price));
        return { messages, session };
      }
    }
    addMsg(str.askProductPrice(session.pendingProduct.name));
    return { messages, session };
  }

  // ── ACTIVE: parse commands ────────────────────────────────────────────────
  const intent = detectSupplierIntent(text);

  if (intent === 'HELP') { addMsg(str.help); return { messages, session }; }

  if (intent === 'LIST_PRODUCTS') {
    addMsg(str.listProducts(supplier.products));
    return { messages, session };
  }

  if (intent === 'LIST_PROMOS') {
    const stats = getSupplierStats(supplier.id);
    addMsg(str.listPromos(stats));
    return { messages, session };
  }

  if (intent === 'STATS') {
    const stats = getSupplierStats(supplier.id);
    addMsg(str.stats(stats));
    return { messages, session };
  }

  if (intent === 'DELETE_PROMO') {
    const numMatch = text.match(/\d+/);
    if (numMatch) {
      const idx = parseInt(numMatch[0]) - 1;
      const promo = supplier.promos[idx];
      if (promo) {
        deletePromo(supplier.id, promo.promoId);
        addMsg(str.promoDeleted);
      } else {
        addMsg(str.promoDeleteFail);
      }
    } else {
      addMsg(str.promoDeleteFail);
    }
    return { messages, session };
  }

  if (intent === 'ADD_PRODUCT') {
    const parsed = parseAddProduct(text);
    if (!parsed.name || parsed.name.length < 2) { addMsg(str.askProductName); return { messages, session }; }
    if (!parsed.price) {
      session.pendingProduct = { name: parsed.name, unit: parsed.unit };
      addMsg(str.askProductPrice(parsed.name));
      return { messages, session };
    }
    addProduct(supplier.id, parsed.name, parsed.price, parsed.unit);
    addMsg(str.productAdded(parsed.name, parsed.price));
    return { messages, session };
  }

  if (intent === 'CREATE_PROMO') {
    const parsed = parsePromo(text, supplier.products);
    if (parsed.error) {
      addMsg(str.promoFail(parsed.error));
      return { messages, session };
    }
    const promo = createPromo(
      supplier.id,
      parsed.productName,
      parsed.discountType,
      parsed.discountValue,
      parsed.originalPrice
    );
    if (!promo) { addMsg(str.promoFail(parsed.productName)); return { messages, session }; }
    addMsg(str.promoCreated(promo), 600);
    return { messages, session };
  }

  addMsg(str.unknown);
  return { messages, session };
}

module.exports = { processSupplierMessage };
