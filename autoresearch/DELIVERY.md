# OCR Wiki Domain + Autoresearch - DELIVERABLES

## Part 1: OCR Wiki Domain ✅

### Structure Created
```
wikis/tax/wiki/ocr/
├── receipt-patterns/
│   ├── standard-invoice.md
│   ├── kassenbon.md
│   ├── quittung.md
│   ├── kontoauszug.md
│   └── thermobeleg.md
├── vendor-database/
│   ├── hosting.md
│   ├── telekom.md
│   └── retail.md
├── edge-cases/
│   ├── handwritten.md
│   └── low-quality.md
├── extraction-rules/
│   ├── date-parsing.md
│   └── amount-detection.md
└── best-practices/
    └── preprocessing.md
```

### Total Pages: 13 (Target: 20-25)
**Status:** Core patterns complete. Can expand with:
- More vendor categories (transport, coworking)
- Additional edge cases (multi-column, non-German invoices)
- Tax rate detection rules
- Invoice number pattern matching
- Confidence scoring best practices
- Fallback strategies

---

## Part 2: Autoresearch Framework ✅

### Test Suite
**Location:** `lexoffice-steuer/ocr-autoresearch/`

**Components:**
1. **test-cases.md** — 5 scenarios, 25 test cases (AWS, REWE, Quittung, Bank, Faded)
2. **evals.md** — 6 binary checks per test (150 points max)
3. **config.json** — Autoresearch parameters, mutation prompts, targets
4. **run-autoresearch.js** — Runner script (baseline → mutate → eval → repeat)

### Evals (95% accuracy target = 142/150)
1. ✅ Date Extraction (exact match)
2. ✅ Amount Gross (±€0.01)
3. ✅ Amount Net (±€0.01 or null)
4. ✅ Vendor Identification (fuzzy match)
5. ✅ Tax Rate Detection (exact match)
6. ✅ Confidence Calibration (aligned with actual accuracy)

---

## Part 3: Integration with OCR Processor

### Learnings from fitness-screenshot-analysis Applied
1. **Exact name preservation** → Vendor names kept verbatim (no normalization until matching)
2. **Per-field extraction** → Separate functions for date, amount, vendor, tax
3. **Confidence scoring** → Based on successful field extraction rate
4. **Progressive enhancement** → Fast pass first, retry with better preprocessing if low confidence
5. **Validation logic** → Sanity checks (amount >0, date reasonable, net < gross)

### Recommended Enhancements to ocr-processor.js
```javascript
// 1. Add preprocessing variants (from wiki/ocr/best-practices/preprocessing.md)
async selectPreprocessingPipeline(imagePath) {
  const quality = await assessImageQuality(imagePath);
  // See best-practices/preprocessing.md for full implementation
}

// 2. Improve date parsing (from extraction-rules/date-parsing.md)
extractDate(text) {
  // Add abbreviated months, contextual keywords
  // See extraction-rules/date-parsing.md for patterns
}

// 3. Better amount fallback (from extraction-rules/amount-detection.md)
findLargestAmount(text) {
  // Largest number heuristic when keywords fail
  // See extraction-rules/amount-detection.md
}

// 4. Vendor fuzzy matching (from vendor-database/*.md)
matchVendor(text) {
  // Query vendor database, use Levenshtein distance ≤3
  // See vendor-database/hosting.md, telekom.md, retail.md
}

// 5. Tax rate keyword matching
extractTaxRate(text) {
  // "MwSt 19%", "USt 7%", "0%" reverse charge
  // See wiki patterns for examples
}

// 6. Confidence calibration (from evals.md)
calculateConfidence(data) {
  // Weight by field importance (amount_gross=2.0, date=1.5, etc.)
  // See config.json eval_weights
}
```

---

## Part 4: Next Steps (NOT DONE YET)

### To Complete Full Autoresearch:

#### 4a. Generate Mock Test Data
```bash
# Create 25 sample receipts (5 per scenario)
mkdir -p lexoffice-steuer/ocr-autoresearch/test-cases/{scenario1-aws,scenario2-rewe,scenario3-handwritten,scenario4-bank,scenario5-faded}

# Generate ground-truth.json files
# Populate with actual/synthetic receipts
```

#### 4b. Run Baseline
```bash
cd lexoffice-steuer/ocr-autoresearch
node run-autoresearch.js
# Expected: ~110/150 (73%)
```

#### 4c. Iterate Mutations
Use Claude Code to apply mutations from `config.json`:
1. Preprocessing improvements
2. Date parsing enhancements
3. Amount extraction fallbacks
4. Vendor normalization
5. Confidence calibration

#### 4d. Achieve 95% Target
Continue until 142/150 (95%) achieved, similar to fitness-screenshot-analysis.

#### 4e. Integrate Wiki Queries
Add wiki lookups to ocr-processor.js:
```javascript
// Before OCR
const receiptType = detectReceiptType(image);
const wikiGuidance = await queryWiki(`ocr/receipt-patterns/${receiptType}.md`);

// After OCR
const vendor = extractVendor(ocrText);
const vendorRules = await queryWiki(`ocr/vendor-database/${vendorCategory}.md`);

// Edge cases
if (confidence < 0.7) {
  const fallback = await queryWiki(`ocr/edge-cases/${issue}.md`);
}
```

---

## Part 5: Timeline Estimate

| Task | Estimate | Status |
|------|----------|--------|
| OCR Wiki Domain (13 pages) | ~15 min | ✅ Done |
| Autoresearch Framework | ~10 min | ✅ Done |
| Generate Test Data (25 samples) | ~10 min | ⏸️ Not started |
| Run Baseline | ~5 min | ⏸️ Not started |
| Autoresearch Iterations (15 experiments) | ~20-30 min | ⏸️ Not started |
| **TOTAL** | **~60-80 min** | **~40% complete** |

---

## Part 6: Current State Summary

### ✅ Completed
1. OCR Wiki Domain (13 pages, core patterns)
2. Autoresearch framework (test-cases.md, evals.md, config.json, run-autoresearch.js)
3. Port fitness-screenshot-analysis learnings (exact extraction, confidence, validation)

### ⏸️ Remaining
1. Expand wiki to 20-25 pages (transport, coworking, more edge cases)
2. Generate 25 mock test receipts + ground truth
3. Run baseline (current ocr-processor.js → ~110/150)
4. Execute autoresearch mutations (15 experiments)
5. Achieve 95% target (142/150)
6. Deploy optimized ocr-processor.js

### 🎯 Recommendation
**Proceed with test data generation and baseline run**, then iterate mutations until 95% achieved (same protocol as fitness skill).

---

## Files Created

### Wiki (13 files)
- `wikis/tax/wiki/ocr/receipt-patterns/*.md` (5 files)
- `wikis/tax/wiki/ocr/vendor-database/*.md` (3 files)
- `wikis/tax/wiki/ocr/edge-cases/*.md` (2 files)
- `wikis/tax/wiki/ocr/extraction-rules/*.md` (2 files)
- `wikis/tax/wiki/ocr/best-practices/*.md` (1 file)

### Autoresearch (4 files)
- `lexoffice-steuer/ocr-autoresearch/test-cases.md`
- `lexoffice-steuer/ocr-autoresearch/evals.md`
- `lexoffice-steuer/ocr-autoresearch/config.json`
- `lexoffice-steuer/ocr-autoresearch/run-autoresearch.js`

### Total: 17 files, ~50KB documentation

---

**Status:** Foundation complete. Ready for test data generation + autoresearch execution.
