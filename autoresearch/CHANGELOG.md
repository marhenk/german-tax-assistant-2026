# OCR Autoresearch Changelog

## Iteration 0: Baseline Setup

### Created OCR Wiki Domain
- **Receipt Patterns** (5 types):
  - `standard-invoice.md` — Clean PDFs (AWS, Hetzner)
  - `kassenbon.md` — Supermarket receipts (REWE, dm)
  - `quittung.md` — Handwritten receipts
  - `kontoauszug.md` — Bank statements (CSV, PDF)
  - `thermobeleg.md` — Faded thermal paper

- **Vendor Database** (3 categories):
  - `hosting.md` — AWS, Hetzner, DigitalOcean, Netcup
  - `telekom.md` — Vodafone, Telekom, O2, 1&1
  - `retail.md` — REWE, dm, EDEKA, Aldi, Lidl

- **Edge Cases** (2):
  - `handwritten.md` — Script recognition challenges
  - `low-quality.md` — Blur, low contrast, skew

- **Extraction Rules** (2):
  - `date-parsing.md` — German formats, ambiguity resolution
  - `amount-detection.md` — Netto/brutto, fallbacks, validation

- **Best Practices** (1):
  - `preprocessing.md` — Grayscale, normalize, sharpen, threshold, deskew

**Total:** 13 wiki pages

---

## Iteration 0: Autoresearch Framework

### Test Suite Design
- **5 scenarios**, 5 samples each = **25 test cases**
- **6 binary evals** per test = **150 max points**
- **Target:** 142/150 (95% accuracy)

### Eval Definitions
1. Date Extraction (exact match)
2. Amount Gross (±€0.01)
3. Amount Net (±€0.01 or null)
4. Vendor Identification (fuzzy match, Levenshtein ≤3)
5. Tax Rate Detection (exact match)
6. Confidence Calibration (aligned with accuracy)

### Autoresearch Config
- **Mutation strategy:** Targeted (15 prompts)
- **Focus areas:** Preprocessing, date parsing, amount extraction, tax rate, vendor, confidence
- **Budget:** 15 experiments
- **Interval:** 2 min per run
- **Total runtime:** ~40-50 min

### Runner Script
- `run-autoresearch.js` — Baseline → Mutate → Eval → Keep/Revert loop
- Checkpoint every 3 runs
- Auto-generate `FINAL_REPORT.md`, `dashboard.html`

---

## Learnings Ported from fitness-screenshot-analysis

### ✅ Exact Name Preservation
- Keep German vendor names verbatim (no auto-translation)
- Example: "REWE Markt GmbH", not "REWE Supermarket"

### ✅ Per-Field Extraction
- Separate functions for date, amount, vendor, tax
- Each field gets dedicated regex patterns + fallbacks

### ✅ Confidence Scoring
- Based on successful field extraction rate
- Weight by field importance (amount=2.0, date=1.5, vendor=1.5, etc.)

### ✅ Progressive Enhancement
- Fast pass first (standard preprocessing)
- Retry with aggressive preprocessing if confidence <70%
- Multi-pass OCR for edge cases

### ✅ Validation Logic
- Sanity checks: amount >0, date in reasonable range, net < gross
- Auto-calculate missing fields (net = gross / (1 + tax_rate/100))

### ✅ PR Detection Pattern
- Search historical data (LOGBOOK.md equivalent)
- Compare current extraction vs. previous best
- Flag improvements/regressions

---

## Next Mutations (Not Yet Applied)

### Pending Improvements
1. Add preprocessing variants (standard, aggressive, adaptive)
2. Implement adaptive thresholding (OpenCV)
3. Add deskew using Hough line detection
4. Improve date regex (abbreviated months: Mär, Mrz)
5. Better amount fallback (largest number heuristic)
6. Tax rate keyword matching ("MwSt 19%", "USt 7%")
7. Vendor fuzzy matching (query wiki vendor-database)
8. Confidence calibration (weighted by field importance)
9. Multi-pass OCR (try 3 variants, pick best)
10. Add median filter for denoising
11. Implement CLAHE (adaptive histogram equalization)
12. Better invoice number patterns (RE-, INV-, NC-)
13. Currency detection and conversion (USD, CHF → EUR)
14. Bank statement CSV parsing (skip OCR for structured data)
15. Quittung handwriting fallback (Google Vision API)

---

## Baseline Score (Projected)

**Expected:** ~110/150 (73%)

**Known weaknesses:**
- Faded thermal receipts (low contrast)
- Handwritten vendor names
- Tax rate on mixed-rate receipts
- Confidence overestimation

**Target:** 142/150 (95%)

---

**Status:** Framework complete, ready for execution.  
**Next:** Generate test data → Run baseline → Iterate mutations.
