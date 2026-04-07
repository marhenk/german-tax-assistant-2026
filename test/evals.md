# Evaluation Results

See `../autoresearch/FINAL_REPORT.md` and `../autoresearch/evals.md` for detailed evaluation results.

## Summary

**Test Configuration:**
- 5 scenarios (single-person, couple, edge cases)
- 6 evaluation categories
- 150 real-world receipts

**Scores:**
- Categorization: ✅ 5/5
- Classification: ✅ 5/5
- EÜR Calculation: ✅ 5/5
- USt Calculation: ✅ 4/5
- Auto-filing: ✅ 5/5
- Transaction Matching: ✅ 4/5

**Total: 28/30 (93.3%)**

## Evaluation Scripts

Run autoresearch evaluations:
```bash
npm run autoresearch
```

Or directly:
```bash
node autoresearch/run-autoresearch.js
```
