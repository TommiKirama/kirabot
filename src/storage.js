'use strict';
const { v4: uuidv4 } = require('uuid');

function createSession() {
  const today = new Date().toISOString().split('T')[0];
  return {
    id: uuidv4(),
    stage: 'WELCOME',       // WELCOME | ONBOARDING | ACTIVE | CLOSED | REPORT
    language: 'bm',         // bm | en
    businessName: null,
    menu: {},               // { 'Nasi Lemak': 3.0, 'Teh Ais': 2.0 }
    unknownItems: {},       // items whose price we still need to ask { 'Item': pendingQty }
    pendingExpense: null,   // { item, amount } waiting for confirmation
    transactions: [],       // [{ type, items, timestamp, date }]
    dailySummaries: [],     // [{ date, totalSales, totalExpenses, netProfit, topItem }]
    currentDate: today,
    dailyStats: {
      totalSales: 0,
      totalExpenses: 0,
      netProfit: 0,
      itemSales: {}
    }
  };
}

function resetDailyStats(session) {
  session.currentDate = new Date().toISOString().split('T')[0];
  session.dailyStats = {
    totalSales: 0,
    totalExpenses: 0,
    netProfit: 0,
    itemSales: {}
  };
  return session;
}

function recordSales(session, items) {
  const timestamp = new Date().toISOString();
  const totalAmount = items.reduce((sum, i) => sum + i.total, 0);

  session.transactions.push({
    type: 'sales',
    items,
    total: totalAmount,
    timestamp,
    date: session.currentDate
  });

  session.dailyStats.totalSales += totalAmount;
  session.dailyStats.netProfit = session.dailyStats.totalSales - session.dailyStats.totalExpenses;

  for (const item of items) {
    session.dailyStats.itemSales[item.name] = (session.dailyStats.itemSales[item.name] || 0) + item.qty;
  }

  return session;
}

function recordExpense(session, items) {
  const timestamp = new Date().toISOString();
  const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);

  session.transactions.push({
    type: 'expense',
    items,
    total: totalAmount,
    timestamp,
    date: session.currentDate
  });

  session.dailyStats.totalExpenses += totalAmount;
  session.dailyStats.netProfit = session.dailyStats.totalSales - session.dailyStats.totalExpenses;

  return session;
}

function closeDailySession(session) {
  const stats = session.dailyStats;
  const topItem = Object.entries(stats.itemSales).sort((a, b) => b[1] - a[1])[0];

  session.dailySummaries.push({
    date: session.currentDate,
    totalSales: stats.totalSales,
    totalExpenses: stats.totalExpenses,
    netProfit: stats.netProfit,
    topItem: topItem ? topItem[0] : null,
    topItemQty: topItem ? topItem[1] : 0
  });

  return session;
}

function getFinancialHealthScore(session) {
  const summaries = session.dailySummaries;
  if (summaries.length === 0) return 0;

  const totalDays = summaries.length;
  const totalRevenue = summaries.reduce((s, d) => s + d.totalSales, 0);
  const totalProfit = summaries.reduce((s, d) => s + d.netProfit, 0);
  const avgDailyProfit = totalProfit / totalDays;
  const profitDays = summaries.filter(d => d.netProfit > 0).length;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  let score = 0;
  score += Math.min(30, totalDays * 3);         // consistency (max 30)
  score += Math.min(30, profitMargin * 0.6);    // profit margin (max 30)
  score += Math.min(20, (profitDays / totalDays) * 20); // profitability rate (max 20)
  score += Math.min(20, Math.min(avgDailyProfit / 10, 1) * 20); // avg profit level (max 20)

  return Math.round(Math.min(100, score));
}

function getLoanRecommendations(score) {
  if (score >= 80) {
    return ['TEKUN Nasional (sehingga RM100,000)', 'BSN Micro-i', 'Amanah Ikhtiar Malaysia (AIM)', 'MARA'];
  } else if (score >= 60) {
    return ['TEKUN Nasional (RM5,000 – RM50,000)', 'Amanah Ikhtiar Malaysia (AIM)', 'BSN Micro-i'];
  } else if (score >= 40) {
    return ['TEKUN Nasional (RM1,000 – RM10,000)', 'Amanah Ikhtiar Malaysia (AIM)'];
  }
  return [];
}

module.exports = {
  createSession,
  resetDailyStats,
  recordSales,
  recordExpense,
  closeDailySession,
  getFinancialHealthScore,
  getLoanRecommendations
};
