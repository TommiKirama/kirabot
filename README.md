# 🤖 KiraBot — WhatsApp POS Chatbot for B40 Micro-Entrepreneurs

> **Rekod jualan. Jejak untung. Jana laporan. Semua dalam WhatsApp.**
> *Record sales. Track profit. Generate reports. All inside WhatsApp.*

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.18-000000?logo=express&logoColor=white)](https://expressjs.com)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![IIUM](https://img.shields.io/badge/IIUM-G5%20Techno%20Project-006400)](https://www.iium.edu.my)

---

## 📖 Overview

KiraBot is a **WhatsApp-based micro-SaaS point-of-sale chatbot** designed for B40 micro-entrepreneurs in Malaysia — gerai operators, warung owners, and roadside food vendors who manage their business through conversation, not spreadsheets.

Most B40 vendors still track sales in physical notebooks or not at all. Without financial records, they are unable to apply for microfinancing programs like **TEKUN, BSN, AIM, or MARA**. KiraBot solves this by turning their existing WhatsApp habit into a full financial tracking system.

**No app to download. No training needed. Just chat.**

---

## 🏗️ Three-Sided Platform

KiraBot is not just a chatbot — it is a **three-sided digital ecosystem**:

```
┌─────────────────────┐     promo injection     ┌──────────────────────────┐
│   B40 Vendor        │◄────────────────────────│  Wholesale Supplier      │
│   (Vendor Chat)     │   records beras expense  │  (Supplier Portal)       │
│                     │   → beras promo appears  │  adds products & promos  │
└─────────┬───────────┘                          └──────────────────────────┘
          │ financial records
          │ + health score
          ▼
┌─────────────────────┐
│  Microfinancing     │
│  TEKUN / BSN / AIM  │
│  MARA               │
└─────────────────────┘
```

| Party | Role | Value |
|---|---|---|
| **B40 Vendors** | Record daily sales & expenses via chat | Free financial tracking + PDF proof of income for loan applications |
| **Wholesale Suppliers** | Register products & promotions | Direct reach to thousands of B40 vendors without advertising cost |
| **Microfinanciers** | Receive standardised financial reports | Verified income data from verified vendors |

---

## ✨ Features

### Vendor Chat (`/`)
- 🗣️ **Natural Language Understanding** — understands Malay, Manglish, shorthand (`ns lmk`, `teh ais`, `mg`)
- 📊 **Real-time P&L tracking** — sales, expenses, net profit updated live
- 💡 **Supplier promo injection** — relevant wholesale promotions appear automatically when an expense is recorded
- 📈 **Financial Health Score** — 0–100 score based on consistency, profit margin, and profitability rate
- 🏦 **Microfinancing recommendations** — TEKUN, BSN, AIM, MARA matched to score
- 📄 **Professional PDF report** — full P&L statement downloadable in one click
- 🌐 **Bilingual** — full Bahasa Malaysia and English support

### Supplier Portal (`/supplier.html`)
- 🏭 **Company registration** via chat
- 📦 **Product catalogue management** — add products with prices
- 🏷️ **Promotion creation** — percentage or fixed-amount discounts
- 📊 **Live analytics** — impression count per promotion (how many vendors saw it)
- 🔄 **Auto-injection** — promos pushed to vendor chat when matching expense recorded

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Web framework | Express 4 |
| Session management | express-session (MemoryStore) |
| PDF generation | PDFKit |
| NLP engine | Custom regex-based Malay/Manglish parser (no external AI API) |
| Frontend | Vanilla HTML5, CSS3, JavaScript (ES2022) |
| UI design | WhatsApp Web clone (pixel-accurate colours and layout) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18 or higher
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/TommiKirama/kirabot.git
cd kirabot

# Install dependencies
npm install

# Copy environment file (no API keys needed — KiraBot runs fully offline)
cp .env.example .env
```

### Run

```bash
# Development (auto-restart on file changes)
npm run dev

# Production
npm start
```

Open your browser at **http://localhost:3000**

Supplier portal: **http://localhost:3000/supplier.html**

---

## 💬 Usage Guide

### Vendor Commands

| What you want to do | Example input |
|---|---|
| Start / greet | `Salam` / `Hello` |
| Record sales | `nasi goreng 2 rm5, teh ais 3 rm1.50` |
| Record sales (shorthand) | `ns lmk 5, teh ais 3, mg 2` |
| Record expense / cost | `tolak beras rm25` / `beli minyak rm15` |
| Daily summary | `ringkasan` / `summary` |
| Close shop for the day | `tutup kedai` / `close shop` |
| Generate monthly report | `laporan` / `report` |
| Start a new day | `hari baru` / `new day` |
| Help | `bantuan` / `help` |

### Shorthand Dictionary (sample)

| You type | KiraBot understands |
|---|---|
| `ns lmk` | Nasi Lemak |
| `teh ais` / `toh ais` | Teh Ais |
| `mg` / `ng` | Nasi Goreng |
| `mee grg` | Mee Goreng |
| `roti` | Roti Canai |
| `kopi` | Kopi |

### Supplier Commands

| Action | Example input |
|---|---|
| Register company | *(type any message to start)* |
| Add product | `tambah Beras Cap Rambutan 10kg rm45` |
| Create promotion | `promo Beras diskaun 20%` |
| View product list | `senarai` |
| View active promos | `promosi` |
| View analytics | `statistik` |

---

## 📁 Project Structure

```
kirabot/
├── server.js              # Express server + all API routes
├── src/
│   ├── nlp.js             # Malay/Manglish NLP parser + intent detection
│   ├── chatbot.js         # Vendor chat state machine + response builder
│   ├── storage.js         # Session data model + financial health score
│   ├── pdfgen.js          # PDF P&L report generator (PDFKit)
│   ├── supplier-chatbot.js  # Supplier portal state machine
│   └── supplier-storage.js  # Global supplier/promo store + injection logic
└── public/
    ├── index.html         # Vendor chat UI (WhatsApp phone frame)
    ├── style.css          # WhatsApp-accurate styling
    ├── app.js             # Vendor frontend logic
    ├── supplier.html      # Supplier portal UI (orange theme)
    ├── supplier.css       # Supplier theme overrides
    └── supplier.js        # Supplier frontend logic
```

---

## 📊 Financial Health Score

KiraBot calculates a **0–100 Financial Health Score** to match vendors with the right microfinancing program:

| Component | Weight | Description |
|---|---|---|
| Consistency | 30% | How many days in the period had recorded transactions |
| Profit Margin | 30% | Net profit ÷ total revenue |
| Profitability Rate | 25% | Percentage of days with positive profit |
| Average Daily Profit | 15% | Normalised against RM 100/day benchmark |

| Score | Tier | Recommended Programs |
|---|---|---|
| 75–100 | Excellent | TEKUN Nasional, BSN Micro |
| 50–74 | Good | TEKUN Nasional, AIM |
| 25–49 | Fair | AIM, MARA |
| 0–24 | Developing | MARA, financial literacy programmes |

---

## 🖼️ Screenshots

### Vendor Chat
The WhatsApp-accurate phone frame UI with real-time P&L sidebar and quick-reply chips.

### Supplier Portal
Orange-themed portal where wholesale distributors manage products, promotions, and view impression analytics.

### PDF Report
Professional Profit & Loss statement with daily breakdown, health score, and financing recommendations — ready for submission to TEKUN/BSN.

---

## 🎓 About

**KiraBot** was built as a Technopreneurship capstone project at **International Islamic University Malaysia (IIUM)**.

- **Group:** G5
- **Course:** Technopreneurship
- **Year:** 2026

### Business Model
KiraBot operates on a **freemium + B2B subscription** model:
- Vendors use the core chat features **free**
- Wholesale suppliers pay a **monthly subscription** for promotion slots and analytics
- Microfinancing institutions pay for **verified vendor data packages**

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">
  <strong>KiraBot © 2026 — IIUM G5</strong><br>
  <em>Empowering B40 micro-entrepreneurs through conversational commerce</em>
</div>
