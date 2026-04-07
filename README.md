# German Tax Assistant 2026 🇩🇪

[![Autoresearch Score](https://img.shields.io/badge/Accuracy-93%25-brightgreen)]()
[![OCR Accuracy](https://img.shields.io/badge/OCR-94.7%25-brightgreen)]()
[![Classification](https://img.shields.io/badge/Private%2FBusiness-100%25-brightgreen)]()
[![Tax Year](https://img.shields.io/badge/Years-2023--2026-blue)]()
[![License](https://img.shields.io/badge/License-MIT-yellow)]()

[📊 Live Dashboard](https://marhenk.github.io/german-tax-assistant-2026/)

## Overview

**Automated German tax management for self-employed individuals:**

- EÜR (Einnahmenüberschussrechnung) calculation
- USt (Umsatzsteuer) tracking
- Private/Business expense classification
- OCR receipt processing (Google Drive integration)
- Bank transaction parsing & matching
- Auto-filing with monthly folders
- TaxMe-compatible export formats

**Autoresearch-validated:** 93% accuracy on 150 real-world test cases

---

## Features

**Core Capabilities:**

- ✅ **OCR Processing** — Tesseract.js German, 94.7% accuracy
- ✅ **Bank Parsing** — CSV/MT940 support (Sparkasse, N26, DKB)
- ✅ **Smart Matching** — Fuzzy matching (±3 days, ±5% amount)
- ✅ **Auto-Classification** — 19 EÜR categories, 40+ vendors, 100% private/business accuracy
- ✅ **EÜR Calculator** — Einnahmen/Ausgaben by category
- ✅ **USt Calculator** — 19%, 7%, 0% + Vorsteuer
- ✅ **Auto-Filing** — Google Drive month folders (Steuern/YYYY/Monat YYYY/)
- ✅ **Visual Dashboard** — FT-style web UI with charts
- ✅ **Export Formats** — JSON, CSV, Markdown, Lexoffice-compatible

---

## Quick Start

**Installation:**
```bash
npm install
```

**OCR Processing:**
```bash
node cli.js ocr-scan --input "Belege Unsortiert/"
node cli.js ocr-process --file receipt.pdf
```

**Bank Transaction Parsing:**
```bash
node cli.js bank-parse --csv sparkasse-export.csv
node cli.js bank-match --tolerance 5
```

**Tax Calculation:**
```bash
node cli.js eur-calculate --year 2025
node cli.js ust-calculate --year 2025
```

**Export:**
```bash
node cli.js export --format json --year 2025
```

**Dashboard:**
```bash
./serve-dashboard.sh
# Open http://localhost:8080
```

---

## Tax Calculation Example

**Programmatic API:**

```javascript
const { EURCalculator, UStCalculator } = require('./src');

// EÜR
const eur = new EURCalculator(transactions);
const result = eur.calculate();
console.log(`Gewinn 2025: € ${result.gewinn}`);

// USt
const ust = new UStCalculator(transactions);
const ustResult = ust.calculate();
console.log(`USt Zahllast: € ${ustResult.zahllast}`);
```

---

## Private/Business Classification

**100% accuracy via autoresearch:**

**Business indicators:**
- Keywords: "Bürobedarf", "Wareneinkauf", "Versand"
- Vendors: Amazon Business, DATEV, Telekom (business account)
- Patterns: Recurring subscriptions, bulk orders

**Private indicators:**
- Keywords: "Lebensmittel", "Kleidung", "Freizeit"
- Vendors: Supermarkets, fashion stores, gyms
- Patterns: Small amounts, irregular

**Edge cases handled:**
- Mixed vendors (Amazon → check item description)
- Borderline amounts (€ 50-200 → context-based)
- Unusual categories (Fachliteratur → business if job-related)

---

## OCR Pipeline

**Google Drive Integration:**

**Workflow:**
1. Upload receipts to `Belege Unsortiert/` folder
2. OCR scans PDF/images (Tesseract.js German)
3. Extract: date, vendor, amount, items
4. Classify: EÜR category + private/business
5. Match: Find corresponding bank transaction (±3 days, ±5%)
6. Auto-file: Move to month folder with standardized name
   - `YYYY-MM-DD_Vendor_Amount.pdf`
   - `Steuern/2025/Mai 2025/2025-05-15_Amazon_42.50.pdf`

**Accuracy:** 94.7% (142/150 test receipts)

---

## Autoresearch Results

**Score:** 28/30 (93.3%)

**Test Coverage:**
- 5 scenarios (single-person, couple, edge cases)
- 6 evals (categorization, classification, EÜR, USt, filing, matching)
- 150 real-world receipts

**Optimizations applied:**
- Categorization keywords expanded (40 → 80+)
- Vendor database enhanced (20 → 40+)
- Edge case handling (mixed vendors, borderline amounts)

**Dashboard:** [autoresearch/FINAL_REPORT.md](autoresearch/FINAL_REPORT.md)

---

## Dashboard

**FT-style visualization:**

**Features:**
- Main metrics (Income, Expenses, Gewinn, USt Zahllast)
- Private/Business split (pie chart)
- Monthly trends (line chart)
- Category breakdown (bar chart)
- Top vendors table
- Missing receipts alert

**Live demo:** [Dashboard Link](https://marhenk.github.io/german-tax-assistant-2026/)

---

## Wiki

**19 pages (Karpathy pattern):**

**Categories:**
- `raw/` — Official sources (EStG sections, Lexoffice docs)
- `wiki/categories/` — 19 EÜR categories explained
- `wiki/calculations/` — EÜR, USt calculation logic
- `wiki/compliance/` — Deadlines, required docs, audit risks
- `wiki/edge-cases/` — Mixed vendors, borderline amounts, unusual categories
- `wiki/best-practices/` — Filing structure, backup strategy

---

## Use Cases

**For Self-Employed (Kleinunternehmer/Regelbesteuerung):**
- Automated EÜR 2023-2026
- USt tracking (quarterly or annual)
- Private/Business expense separation
- Ready-to-submit exports for tax advisor

**For Tax Advisors:**
- Pre-categorized data
- Missing receipt alerts
- Audit-ready folder structure
- Lexoffice-compatible imports

---

## Roadmap

- [ ] DATEV export format
- [ ] ELSTER XML export
- [ ] Multi-year trend analysis
- [ ] Receipt recommendation engine (suggest missing deductions)
- [ ] Email integration (auto-process email receipts)

---

## Contributing

PRs welcome! Please:
- Add test cases for new features
- Update wiki if logic changes
- Run autoresearch before submitting (`npm run autoresearch`)

---

## Disclaimer

⚠️ **Disclaimer:** This is educational software. Always verify calculations with official sources. For legal tax advice, consult a certified tax advisor (Steuerberater). The software is provided "as is", without warranty of any kind.

---

## License

MIT License — see [LICENSE](LICENSE)

---

## Acknowledgments

- **EStG** (German Tax Code)
- **Lexoffice** (API reference)
- **Tesseract.js** (OCR engine)
- **Chart.js** (visualization)
- **OpenClaw** (autoresearch framework)
