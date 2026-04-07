# OCR Autoresearch Framework

**Goal:** Optimize receipt OCR accuracy from ~73% baseline to 95% target (142/150 points).

**Methodology:** Ported from `~/.openclaw/skills/fitness-screenshot-analysis/` which achieved 95% accuracy.

---

## Quick Start

### 1. Generate Test Data (10 min)
```bash
cd test-cases
./generate-mock-receipts.sh  # Creates 25 sample receipts + ground truth
```

### 2. Run Baseline (5 min)
```bash
node run-autoresearch.js --baseline-only
# Expected: ~110/150 (73%)
```

### 3. Run Full Autoresearch (30 min)
```bash
node run-autoresearch.js
# Iterates through 15 mutation prompts
# Target: 142/150 (95%)
```

### 4. Deploy Optimized Processor (1 min)
```bash
cp ../ocr-processor-optimized.js ../ocr-processor.js
```

---

## File Structure

```
ocr-autoresearch/
├── config.json              — Autoresearch parameters, mutation prompts
├── test-cases.md            — 5 scenarios × 5 samples = 25 tests
├── evals.md                 — 6 binary checks per test
├── run-autoresearch.js      — Runner script
├── DELIVERY.md              — Deliverables summary
├── CHANGELOG.md             — Iteration log
├── FINAL_REPORT.md          — Completion status
├── README.md                — This file
└── test-cases/              — (To be generated)
    ├── scenario1-aws/
    ├── scenario2-rewe/
    ├── scenario3-handwritten/
    ├── scenario4-bank/
    └── scenario5-faded/
```

---

## Evaluation Criteria (6 × 25 = 150 points)

| Eval | Weight | Pass Criteria |
|------|--------|---------------|
| Date Extraction | 1.5 | Exact match (YYYY-MM-DD) |
| Amount Gross | 2.0 | ±€0.01 tolerance |
| Amount Net | 1.0 | ±€0.01 or null |
| Vendor Identification | 1.5 | Fuzzy match (Levenshtein ≤3) |
| Tax Rate Detection | 1.0 | Exact match (19%, 7%, 0%) |
| Confidence Calibration | 1.0 | Aligned with accuracy |

**Passing:** 142/150 (95%)

---

## Mutation Strategy

### 15 Targeted Improvements (from config.json)
1. Preprocessing variants (standard/aggressive/adaptive)
2. Date parsing (abbreviated months)
3. Amount fallback (largest number heuristic)
4. Tax rate keyword matching
5. Vendor fuzzy matching
6. Confidence calibration (weighted)
7. Multi-pass OCR (3 variants)
8. Median filter denoising
9. CLAHE (adaptive histogram equalization)
10. Deskew (Hough line detection)
11. Invoice number patterns
12. Currency conversion
13. Bank CSV optimization
14. Handwriting fallback (Google Vision)
15. Thermal receipt preprocessing

**Each mutation:** Edit ocr-processor.js → Run evals → Keep if improved

---

## Integration with Wiki

Queries `wikis/tax/wiki/ocr/` for:
- Receipt pattern guidance (preprocessing strategy)
- Vendor normalization rules (fuzzy matching)
- Edge case handling (fallback strategies)
- Extraction rules (date/amount parsing)
- Best practices (preprocessing techniques)

---

## Output

- `dashboard.html` — Live progress (auto-refresh every 10s)
- `FINAL_REPORT.md` — Summary (baseline → final score, top improvements)
- `CHANGELOG.md` — Iteration log (each mutation + result)
- `checkpoint.json` — Latest state (resume on failure)
- `../ocr-processor-optimized.js` — Best model

---

## Status

| Component | Status |
|-----------|--------|
| Framework | ✅ Complete |
| Test data | ⏸️ Not generated |
| Baseline | ⏸️ Not run |
| Mutations | ⏸️ 0/15 |
| Target | ⏸️ 95% not achieved |

**Next:** Generate test data → Run baseline → Execute mutations

---

**Estimated runtime:** 45 min (10 min test data + 5 min baseline + 30 min mutations)
