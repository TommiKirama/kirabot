'use strict';
/**
 * Global in-memory supplier store.
 * Shared across all HTTP sessions so vendor chatbot can read supplier promos.
 * In production this would be a database (MongoDB/PostgreSQL).
 */

const store = {
  // supplierId → { id, companyName, contactNumber, products, promos, stats, registeredAt }
  suppliers: new Map(),

  // Flat list of all active promos for fast lookup by vendor chatbot
  // [{ promoId, supplierId, companyName, productName, triggerKeywords, promoText,
  //    discountType, discountValue, originalPrice, promoPrice, impressions, createdAt }]
  activePromos: [],
};

let _promoCounter = 1;
let _supplierCounter = 1;

// ── Supplier management ───────────────────────────────────────────────────────

function createSupplierSession() {
  return {
    stage: 'WELCOME',     // WELCOME | ONBOARDING | ACTIVE
    language: 'bm',
    supplierId: null,     // set after registration
    pendingProduct: null, // { name, price } waiting for confirmation
  };
}

function registerSupplier(companyName, contactNumber = '') {
  const id = `SUP-${String(_supplierCounter++).padStart(3, '0')}`;
  const supplier = {
    id,
    companyName,
    contactNumber,
    products: [],   // [{ name, price, unit }]
    promos: [],     // [{ promoId, ... }]
    stats: { totalImpressions: 0, totalPromos: 0 },
    registeredAt: new Date().toISOString(),
  };
  store.suppliers.set(id, supplier);
  return supplier;
}

function getSupplier(supplierId) {
  return store.suppliers.get(supplierId) || null;
}

// ── Product management ────────────────────────────────────────────────────────

function addProduct(supplierId, name, price, unit = '') {
  const supplier = getSupplier(supplierId);
  if (!supplier) return null;
  // Remove existing entry with same name (update)
  supplier.products = supplier.products.filter(p => p.name.toLowerCase() !== name.toLowerCase());
  const product = { name, price, unit };
  supplier.products.push(product);
  return product;
}

// ── Promo management ──────────────────────────────────────────────────────────

/**
 * Create a promotion for a supplier product.
 * discountType: 'percent' | 'fixed' | 'text'
 * discountValue: number (% or RM) | string (for 'text' type)
 */
function createPromo(supplierId, productName, discountType, discountValue, originalPrice = null) {
  const supplier = getSupplier(supplierId);
  if (!supplier) return null;

  const promoId = `PROMO-${String(_promoCounter++).padStart(4, '0')}`;

  // Derive promo price
  let promoPrice = null;
  if (discountType === 'percent' && originalPrice) {
    promoPrice = parseFloat((originalPrice * (1 - discountValue / 100)).toFixed(2));
  } else if (discountType === 'fixed') {
    promoPrice = discountValue;
  }

  // Build promo text shown to vendor
  let promoText = '';
  if (discountType === 'percent') {
    promoText = `*${productName}* — ${discountValue}% DISKAUN!` +
      (promoPrice ? ` Harga promo: *RM${promoPrice.toFixed(2)}*` : '');
  } else if (discountType === 'fixed') {
    promoText = `*${productName}* — harga istimewa *RM${discountValue.toFixed(2)}* sahaja!`;
  } else {
    promoText = `*${productName}* — ${discountValue}`;
  }

  // Keywords derived from product name for trigger matching
  const triggerKeywords = productName.toLowerCase()
    .replace(/[0-9]+\s*(kg|g|l|ml|unit|pcs|pack)/gi, '')
    .split(/\s+/)
    .filter(w => w.length >= 3);

  const promo = {
    promoId,
    supplierId,
    companyName: supplier.companyName,
    contactNumber: supplier.contactNumber,
    productName,
    triggerKeywords,
    promoText,
    discountType,
    discountValue,
    originalPrice,
    promoPrice,
    impressions: 0,
    createdAt: new Date().toISOString(),
    active: true,
  };

  supplier.promos.push(promo);
  supplier.stats.totalPromos++;
  store.activePromos.push(promo);
  return promo;
}

function deletePromo(supplierId, promoId) {
  const supplier = getSupplier(supplierId);
  if (!supplier) return false;
  supplier.promos = supplier.promos.filter(p => p.promoId !== promoId);
  const idx = store.activePromos.findIndex(p => p.promoId === promoId && p.supplierId === supplierId);
  if (idx !== -1) { store.activePromos.splice(idx, 1); return true; }
  return false;
}

// ── Promo matching (called by vendor chatbot) ─────────────────────────────────

/**
 * Find active promos that match an expense item or product name.
 * Returns up to 2 matching promos to avoid spam.
 */
function getMatchingPromos(itemName) {
  if (!itemName) return [];
  const lower = itemName.toLowerCase();
  const matches = store.activePromos.filter(promo =>
    promo.active &&
    promo.triggerKeywords.some(kw => lower.includes(kw) || kw.includes(lower.split(' ')[0]))
  );
  // Track impressions
  matches.slice(0, 2).forEach(p => {
    p.impressions++;
    const s = store.suppliers.get(p.supplierId);
    if (s) s.stats.totalImpressions++;
  });
  return matches.slice(0, 2);
}

// ── Stats ─────────────────────────────────────────────────────────────────────

function getSupplierStats(supplierId) {
  const supplier = getSupplier(supplierId);
  if (!supplier) return null;
  return {
    totalProducts: supplier.products.length,
    totalPromos: supplier.promos.length,
    activePromos: supplier.promos.filter(p => p.active).length,
    totalImpressions: supplier.stats.totalImpressions,
    promos: supplier.promos.map(p => ({
      promoId: p.promoId,
      productName: p.productName,
      promoText: p.promoText,
      impressions: p.impressions,
      createdAt: p.createdAt,
    })),
  };
}

// ── Seed demo data so the portal feels alive on first load ────────────────────
function seedDemoData() {
  if (store.suppliers.size > 0) return; // already seeded
  const demo = registerSupplier('Pemborong Beras Haji Samad', '012-345 6789');
  addProduct(demo.id, 'Beras Cap Rambutan 10kg', 45, '10kg');
  addProduct(demo.id, 'Minyak Sawit Saji 5L', 28.50, '5L');
  addProduct(demo.id, 'Gula Pasir 1kg', 3.20, '1kg');
  createPromo(demo.id, 'Beras Cap Rambutan 10kg', 'percent', 20, 45);
  createPromo(demo.id, 'Minyak Sawit Saji 5L', 'fixed', 24.90, 28.50);
}

seedDemoData();

module.exports = {
  createSupplierSession,
  registerSupplier,
  getSupplier,
  addProduct,
  createPromo,
  deletePromo,
  getMatchingPromos,
  getSupplierStats,
};
