# OCR Autoresearch Binary Evals

## Evaluation Protocol

Each test case is evaluated against **6 binary checks**.
- **Pass (1 point):** Field extracted correctly (exact match or within tolerance)
- **Fail (0 points):** Field missing, incorrect, or outside tolerance

**Max Score per Test:** 6 points  
**Max Score per Scenario:** 6 × 5 samples = 30 points  
**Max Total Score:** 6 × 25 samples = **150 points**

**Passing Threshold:** 142/150 (95% accuracy)

---

## EVAL 1: Date Extraction

### Question
Is the date extracted correctly (exact match)?

### Pass Criteria
- **Extracted date** matches **ground truth date** (YYYY-MM-DD format)
- Tolerance: ±0 days (must be exact)

### Fail Criteria
- Date missing (`null`)
- Date incorrect (wrong day, month, or year)
- Date in wrong format (not YYYY-MM-DD)

### Code
```javascript
function eval1_dateExtraction(extracted, groundTruth) {
  if (!extracted.date) return 0;  // Missing
  if (extracted.date !== groundTruth.date) return 0;  // Incorrect
  return 1;  // Pass
}
```

### Examples
- ✅ Pass: Extracted `2024-03-15`, Ground Truth `2024-03-15`
- ❌ Fail: Extracted `2024-03-16`, Ground Truth `2024-03-15`
- ❌ Fail: Extracted `null`, Ground Truth `2024-03-15`

---

## EVAL 2: Amount Extraction (Gross)

### Question
Is the gross amount correct (±€0.01)?

### Pass Criteria
- **Extracted amount_gross** matches **ground truth** within ±€0.01
- Rounding tolerance: €0.01 (handles OCR rounding errors)

### Fail Criteria
- Amount missing (`null`)
- Amount deviation >€0.01
- Negative amount (unless ground truth is refund)

### Code
```javascript
function eval2_amountGross(extracted, groundTruth) {
  if (!extracted.amount_gross) return 0;  // Missing
  const diff = Math.abs(extracted.amount_gross - groundTruth.amount_gross);
  if (diff > 0.01) return 0;  // Deviation too large
  return 1;  // Pass
}
```

### Examples
- ✅ Pass: Extracted `66.91`, Ground Truth `66.91`
- ✅ Pass: Extracted `66.90`, Ground Truth `66.91` (within ±0.01)
- ❌ Fail: Extracted `66.80`, Ground Truth `66.91` (deviation 0.11)
- ❌ Fail: Extracted `null`, Ground Truth `66.91`

---

## EVAL 3: Amount Extraction (Net)

### Question
Is the net amount correct (±€0.01)?

### Pass Criteria
- **Extracted amount_net** matches **ground truth** within ±€0.01
- OR: amount_net is `null` AND ground truth is `null` (acceptable for Kassenbon)

### Fail Criteria
- Amount deviation >€0.01
- Extracted `null` when ground truth has value (for invoices)

### Code
```javascript
function eval3_amountNet(extracted, groundTruth) {
  // Both null is acceptable (e.g., Kassenbon, Quittung)
  if (extracted.amount_net === null && groundTruth.amount_net === null) {
    return 1;
  }
  
  if (!extracted.amount_net) return 0;  // Missing when expected
  const diff = Math.abs(extracted.amount_net - groundTruth.amount_net);
  if (diff > 0.01) return 0;  // Deviation too large
  return 1;  // Pass
}
```

### Examples
- ✅ Pass: Extracted `66.91`, Ground Truth `66.91`
- ✅ Pass: Extracted `null`, Ground Truth `null` (Kassenbon)
- ❌ Fail: Extracted `null`, Ground Truth `66.91` (Invoice)
- ❌ Fail: Extracted `65.00`, Ground Truth `66.91`

---

## EVAL 4: Vendor Identification

### Question
Is the vendor name extracted and normalized?

### Pass Criteria
- **Extracted vendor** matches **ground truth** (fuzzy match acceptable)
- Fuzzy match tolerance: Levenshtein distance ≤3 OR substring match
- Examples: "REWE" matches "REWE Markt GmbH" ✅
- Examples: "AWS" matches "Amazon Web Services" ✅

### Fail Criteria
- Vendor missing (`null`)
- Vendor completely wrong (no substring/fuzzy match)

### Code
```javascript
const levenshtein = require('fast-levenshtein');

function eval4_vendorIdentification(extracted, groundTruth) {
  if (!extracted.vendor) return 0;  // Missing
  
  const extractedLower = extracted.vendor.toLowerCase();
  const truthLower = groundTruth.vendor.toLowerCase();
  
  // Exact match
  if (extractedLower === truthLower) return 1;
  
  // Substring match (either direction)
  if (extractedLower.includes(truthLower) || truthLower.includes(extractedLower)) {
    return 1;
  }
  
  // Fuzzy match (Levenshtein distance ≤3)
  const distance = levenshtein.get(extractedLower, truthLower);
  if (distance <= 3) return 1;
  
  return 0;  // Fail
}
```

### Examples
- ✅ Pass: Extracted `"REWE"`, Ground Truth `"REWE Markt GmbH"` (substring)
- ✅ Pass: Extracted `"Amazon Web Services"`, Ground Truth `"AWS"` (substring)
- ✅ Pass: Extracted `"REW"`, Ground Truth `"REWE"` (Levenshtein=1)
- ❌ Fail: Extracted `"Edeka"`, Ground Truth `"REWE"`
- ❌ Fail: Extracted `null`, Ground Truth `"REWE"`

---

## EVAL 5: Tax Rate Detection

### Question
Is the tax rate correct (19%, 7%, 0%)?

### Pass Criteria
- **Extracted tax_rate** matches **ground truth** (exact match)
- OR: tax_rate is `null` AND ground truth is `null` (acceptable)

### Fail Criteria
- Tax rate incorrect (e.g., 7% when should be 19%)
- Tax rate missing when ground truth has value

### Code
```javascript
function eval5_taxRateDetection(extracted, groundTruth) {
  // Both null is acceptable (e.g., mixed tax rates, bank statements)
  if (extracted.tax_rate === null && groundTruth.tax_rate === null) {
    return 1;
  }
  
  if (!extracted.tax_rate && extracted.tax_rate !== 0) return 0;  // Missing
  if (extracted.tax_rate !== groundTruth.tax_rate) return 0;  // Incorrect
  return 1;  // Pass
}
```

### Examples
- ✅ Pass: Extracted `19`, Ground Truth `19`
- ✅ Pass: Extracted `0`, Ground Truth `0` (reverse charge)
- ✅ Pass: Extracted `null`, Ground Truth `null` (mixed rates)
- ❌ Fail: Extracted `19`, Ground Truth `7`
- ❌ Fail: Extracted `null`, Ground Truth `19`

---

## EVAL 6: Confidence Calibration

### Question
Is the confidence score accurate?

### Pass Criteria
- **Low confidence (<70%)** for failed extractions (≥2 fields wrong)
- **High confidence (≥90%)** for successful extractions (all fields correct)
- **Medium confidence (70-89%)** for partial success (1 field wrong)

### Fail Criteria
- High confidence (≥90%) on wrong data (false positive)
- Low confidence (<70%) on correct data (false negative)

### Code
```javascript
function eval6_confidenceCalibration(extracted, groundTruth, evalResults) {
  const correctFields = evalResults.filter(e => e.pass).length;
  const totalFields = evalResults.length - 1;  // Exclude confidence eval itself
  
  const accuracy = correctFields / totalFields;
  const confidence = extracted.confidence;
  
  // Failed extraction (≤50% fields correct) → Should have low confidence
  if (accuracy <= 0.5 && confidence >= 0.7) return 0;  // Fail: Too confident
  
  // Successful extraction (≥80% fields correct) → Should have high confidence
  if (accuracy >= 0.8 && confidence < 0.7) return 0;  // Fail: Not confident enough
  
  // Partial success (50-80% correct) → Medium confidence acceptable
  return 1;  // Pass
}
```

### Examples
- ✅ Pass: 5/5 fields correct, confidence 95%
- ✅ Pass: 2/5 fields correct, confidence 60%
- ❌ Fail: 1/5 fields correct, confidence 95% (overconfident)
- ❌ Fail: 5/5 fields correct, confidence 50% (underconfident)

---

## Scoring Summary

### Per Test Case
```javascript
function scoreTestCase(extracted, groundTruth) {
  const evals = [
    { name: 'Date', pass: eval1_dateExtraction(extracted, groundTruth) },
    { name: 'Amount Gross', pass: eval2_amountGross(extracted, groundTruth) },
    { name: 'Amount Net', pass: eval3_amountNet(extracted, groundTruth) },
    { name: 'Vendor', pass: eval4_vendorIdentification(extracted, groundTruth) },
    { name: 'Tax Rate', pass: eval5_taxRateDetection(extracted, groundTruth) }
  ];
  
  // Confidence eval depends on other evals
  evals.push({
    name: 'Confidence',
    pass: eval6_confidenceCalibration(extracted, groundTruth, evals)
  });
  
  const score = evals.filter(e => e.pass).reduce((sum, e) => sum + e.pass, 0);
  return { score, maxScore: 6, evals };
}
```

### Per Scenario
```javascript
function scoreScenario(scenarioResults) {
  const totalScore = scenarioResults.reduce((sum, r) => sum + r.score, 0);
  const maxScore = scenarioResults.length * 6;
  return { totalScore, maxScore, percentage: (totalScore / maxScore * 100).toFixed(1) };
}
```

### Overall
```javascript
function scoreOverall(allResults) {
  const totalScore = allResults.reduce((sum, r) => sum + r.totalScore, 0);
  const maxScore = 150;  // 25 tests × 6 evals
  const percentage = (totalScore / maxScore * 100).toFixed(1);
  
  return {
    totalScore,
    maxScore,
    percentage,
    passed: totalScore >= 142  // 95% threshold
  };
}
```

---

## Output Format

```
===========================================
OCR AUTORESEARCH EVALUATION RESULTS
===========================================

SCENARIO 1: AWS Invoices (Clean PDF)
-------------------------------------
Test 1: aws-invoice-50.pdf      [6/6] ✅
Test 2: aws-invoice-100.pdf     [6/6] ✅
Test 3: aws-invoice-250.pdf     [6/6] ✅
Test 4: aws-invoice-500.pdf     [5/6] ⚠️  (Tax Rate failed)
Test 5: aws-invoice-1000.pdf    [6/6] ✅
-------------------------------------
Scenario Score: 29/30 (96.7%)

SCENARIO 2: REWE Receipts (Kassenbon)
-------------------------------------
[... similar format ...]

[... continue for all scenarios ...]

===========================================
OVERALL SCORE: 142/150 (94.7%)
STATUS: ⚠️ BELOW THRESHOLD (Need 95%)
===========================================

FAILED EVALS:
- Scenario 4, Test 2: Date extraction (OCR read 16 instead of 15)
- Scenario 5, Test 4: Vendor identification (Too faded, returned null)
[... etc ...]

NEXT STEPS:
1. Improve date OCR (add more regex patterns)
2. Boost preprocessing for faded receipts
3. Re-run autoresearch
```
