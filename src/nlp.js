'use strict';

// Known Malaysian food/goods item dictionary with default prices (RM)
const ITEM_DICT = {
  'Nasi Lemak':    { aliases: ['nasi lemak','ns lmk','naslem','nslmk','nasilemak','nasi lmk','ns lemak','nasi lk'], defaultPrice: 3 },
  'Teh Ais':       { aliases: ['teh ais','teh o ais','toh ais','tehais','tea ice','teh'], defaultPrice: 2 },
  'Kopi':          { aliases: ['kopi','kopi o','coffee','kopi ais','kopi panas'], defaultPrice: 2 },
  'Mee Goreng':    { aliases: ['mee goreng','mg','mee geng','mi goreng','mgoreng','meegoreng','mee grg'], defaultPrice: 5 },
  'Nasi Goreng':   { aliases: ['nasi goreng','ng','nasgor','nasi geng','ngoreng','nasi grg'], defaultPrice: 5 },
  'Roti Canai':    { aliases: ['roti canai','roti','rc','canai','roticanai','roti cni'], defaultPrice: 1.5 },
  'Air Mineral':   { aliases: ['air','air kosong','water','mineral water','air mineral','air sejuk'], defaultPrice: 1.5 },
  'Ais Batu':      { aliases: ['ais','ais batu','ice','aisbatu','ais kosong'], defaultPrice: 3 },
  'Telur':         { aliases: ['telur','egg','eggs','telor','telur ayam'], defaultPrice: 0.5 },
  'Beras':         { aliases: ['beras','rice','bras','beras wangi'], defaultPrice: 25 },
  'Sayur':         { aliases: ['sayur','sayuran','vegetables','veggie','sayur2'], defaultPrice: 5 },
  'Minyak Masak':  { aliases: ['minyak','minyak masak','cooking oil','oil','minyak goreng'], defaultPrice: 15 },
  'Ayam':          { aliases: ['ayam','chicken','ayam goreng','fried chicken'], defaultPrice: 8 },
  'Ikan':          { aliases: ['ikan','fish','ikan goreng','fried fish'], defaultPrice: 7 },
  'Roti Bakar':    { aliases: ['roti bakar','toast','roti bkr','rb'], defaultPrice: 3 },
  'Kuih':          { aliases: ['kuih','kuih-muih','kueh','cake'], defaultPrice: 1 },
  'Laksa':         { aliases: ['laksa','laks','laksa asam'], defaultPrice: 7 },
  'Char Kuey Teow':{ aliases: ['char kuey teow','ckt','char kt','kuey teow goreng'], defaultPrice: 7 },
  'Mihun Goreng':  { aliases: ['mihun','mihun goreng','bihun','bihun goreng'], defaultPrice: 5 },
  'Pisang Goreng': { aliases: ['pisang goreng','pg','pisang grg','banana fritter'], defaultPrice: 1 },
  'Soya':          { aliases: ['soya','soya bean','soymilk','susu soya'], defaultPrice: 2 },
  'Cincau':        { aliases: ['cincau','grass jelly','air cincau'], defaultPrice: 2.5 },
  'ABC':           { aliases: ['abc','air batu campur','ais kacang','ice kacang'], defaultPrice: 4 },
};

// Expense trigger keywords (Malay + English)
const EXPENSE_KEYWORDS = [
  'tolak','beli','bayar','kos','modal','belanja','perbelanjaan',
  'buy','paid','spent','cost','spend','purchase','keluar'
];

// Command patterns
const COMMANDS = {
  CLOSE:   /\b(tutup\s*kedai|close\s*shop|habis\s*hari|selesai\s*hari|tutup\s*buku|close)\b/i,
  REPORT:  /\b(laporan|report|p&l|pdf|penyata|monthly\s*report|laporan\s*bulanan)\b/i,
  SUMMARY: /\b(ringkasan|summary|jumlah|total|berapa untung|how much)\b/i,
  HELP:    /\b(tolong|help|bantuan|cara|how|macam mana|\?)\b/i,
  MENU:    /\b(menu|senarai|list items|barang)\b/i,
  NEW_DAY: /\b(hari baru|new day|buka kedai|open shop|mula hari)\b/i,
  RESTART: /\b(restart|mula semula|reset|start over|start again)\b/i,
};

function capitalizeWords(str) {
  return str.trim().replace(/\b\w/g, c => c.toUpperCase());
}

function findCanonicalName(raw) {
  const lower = raw.toLowerCase().trim();
  for (const [canonical, data] of Object.entries(ITEM_DICT)) {
    if (data.aliases.includes(lower)) return canonical;
    // partial match – only if the alias is a starting substring of >= 4 chars
    for (const alias of data.aliases) {
      if (alias.length >= 4 && lower.startsWith(alias)) return canonical;
      if (alias.length >= 4 && lower.includes(alias)) return canonical;
    }
  }
  return null;
}

function getDefaultPrice(canonical) {
  return canonical && ITEM_DICT[canonical] ? ITEM_DICT[canonical].defaultPrice : null;
}

// Extract RM price from a string chunk, e.g. "rm3", "rm 3.50", "3.50"
function extractPrice(chunk) {
  const m = chunk.match(/rm\s*(\d+(?:[.,]\d{1,2})?)/i) ||
            chunk.match(/^(\d+(?:[.,]\d{1,2})?)$/);
  return m ? parseFloat(m[1].replace(',', '.')) : null;
}

// Extract standalone integer quantity from a chunk
function extractQty(chunk) {
  const m = chunk.match(/^(\d+)$/);
  return m ? parseInt(m[1]) : null;
}

/**
 * Parse a single item segment, e.g.:
 *   "nasi lemak 5 rm3"  → { name, qty:5, price:3, total:15 }
 *   "nasi lemak 5"      → { name, qty:5, price:null }
 *   "nasi lemak rm3"    → { name, qty:1, price:3 }
 * Returns null if no item name can be determined.
 */
function parseItemSegment(segment, knownMenu = {}) {
  let text = segment.toLowerCase().trim();

  // Extract price token
  const priceMatch = text.match(/rm\s*(\d+(?:[.,]\d{1,2})?)/i);
  const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : null;
  if (priceMatch) text = text.replace(priceMatch[0], '').trim();

  // Extract leading or trailing number as quantity
  const leadQtyMatch = text.match(/^(\d+)\s+(.+)$/);
  const trailQtyMatch = text.match(/^(.+?)\s+(\d+)$/);

  let qty = 1;
  let rawName = text;

  if (leadQtyMatch) {
    qty = parseInt(leadQtyMatch[1]);
    rawName = leadQtyMatch[2];
  } else if (trailQtyMatch) {
    qty = parseInt(trailQtyMatch[2]);
    rawName = trailQtyMatch[1];
  }

  rawName = rawName.trim();
  if (!rawName) return null;

  const canonical = findCanonicalName(rawName);
  const finalName = canonical || capitalizeWords(rawName);
  const finalPrice = price || knownMenu[finalName] || getDefaultPrice(canonical);

  return {
    name: finalName,
    qty,
    price: finalPrice,
    total: finalPrice ? parseFloat((qty * finalPrice).toFixed(2)) : null,
    priceKnown: finalPrice !== null
  };
}

/**
 * Parse sales transaction text.
 * Input:  "nasi lemak 5, teh ais 3 rm2"
 * Output: [{ name, qty, price, total, priceKnown }]
 */
function parseSales(text, knownMenu = {}) {
  // Remove expense keywords if accidentally included
  let clean = text.replace(new RegExp(`\\b(${EXPENSE_KEYWORDS.join('|')})\\b`, 'gi'), '').trim();

  const segments = clean.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
  const items = [];

  for (const seg of segments) {
    const item = parseItemSegment(seg, knownMenu);
    if (item && item.name.length > 1) items.push(item);
  }

  return items;
}

/**
 * Parse expense transaction text.
 * Input:  "tolak ais rm5, telur rm10"
 * Output: [{ item, amount }]
 */
function parseExpenses(text) {
  // Remove expense trigger keywords
  let clean = text.replace(new RegExp(`\\b(${EXPENSE_KEYWORDS.join('|')})\\b`, 'gi'), '').trim();

  const segments = clean.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
  const items = [];

  for (const seg of segments) {
    const priceMatch = seg.match(/rm\s*(\d+(?:[.,]\d{1,2})?)/i);
    if (!priceMatch) {
      // Try just a number
      const numMatch = seg.match(/^(.+?)\s+(\d+(?:[.,]\d{1,2})?)$/);
      if (numMatch) {
        const amount = parseFloat(numMatch[2].replace(',', '.'));
        const rawName = numMatch[1].trim();
        const canonical = findCanonicalName(rawName);
        items.push({ item: canonical || capitalizeWords(rawName), amount });
      }
      continue;
    }
    const amount = parseFloat(priceMatch[1].replace(',', '.'));
    const rawName = seg.replace(priceMatch[0], '').trim();
    if (!rawName) continue;
    const canonical = findCanonicalName(rawName);
    items.push({ item: canonical || capitalizeWords(rawName), amount });
  }

  return items;
}

/**
 * Detect the intent of an incoming message.
 * Returns one of: CLOSE | REPORT | SUMMARY | HELP | MENU | NEW_DAY | RESTART | EXPENSE | SALES | UNKNOWN
 */
function detectIntent(text) {
  const lower = text.toLowerCase().trim();

  for (const [intent, pattern] of Object.entries(COMMANDS)) {
    if (pattern.test(lower)) return intent;
  }

  // Check expense keywords
  if (new RegExp(`\\b(${EXPENSE_KEYWORDS.join('|')})\\b`, 'i').test(lower)) return 'EXPENSE';

  // If numbers are present, likely a sales entry
  if (/\d/.test(lower)) return 'SALES';

  return 'UNKNOWN';
}

/**
 * Generate a contextual insight about today's top performer.
 * Example: "Nasi Lemak laku keras hari ini!"
 */
function generateInsight(dailyStats, language) {
  const topEntry = Object.entries(dailyStats.itemSales || {}).sort((a, b) => b[1] - a[1])[0];
  if (!topEntry) return '';

  const [item, qty] = topEntry;
  if (language === 'en') {
    return `${item} was your best seller today with ${qty} sold! 🔥`;
  }
  return `${item} laku keras hari ini — ${qty} unit terjual! 🔥`;
}

module.exports = {
  detectIntent,
  parseSales,
  parseExpenses,
  generateInsight,
  ITEM_DICT
};
