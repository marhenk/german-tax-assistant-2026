# Multi-Receipt Matching - Feature Spec

## Problem
Stefanie zahlt mehrere Belege (z.B. Sammelbestellungen) mit einer Banküberweisung.

**Beispiel:**
- Bankumsatz: -125,00 EUR (Young Living, 15.03.2025)
- Belege:
  - Receipt A: 50,00 EUR (Essential Oils)
  - Receipt B: 75,00 EUR (Supplements)

## Current Behavior
- ❌ Matcher findet nur einen Beleg (50 EUR)
- ❌ 75 EUR Beleg bleibt unmatched
- ❌ Review Queue bekommt beide

## Required Changes

### 1. Fuzzy Matching Extension
```javascript
// Current: 1:1 matching
if (Math.abs(bankAmount - receiptAmount) < tolerance) {
  return { match: true, confidence: 0.95 };
}

// New: 1:N matching
function findCombinations(bankAmount, receipts, tolerance = 5) {
  // Try all combinations of 2-5 receipts
  for (let n = 2; n <= Math.min(5, receipts.length); n++) {
    const combos = getCombinations(receipts, n);
    for (const combo of combos) {
      const total = combo.reduce((sum, r) => sum + r.amount, 0);
      if (Math.abs(bankAmount - total) < tolerance) {
        return { 
          match: true, 
          receipts: combo, 
          confidence: 0.85,
          type: 'multi-receipt'
        };
      }
    }
  }
  return { match: false };
}
```

### 2. UI Changes (Review Queue)
```html
<!-- Current: Single receipt card -->
<div class="receipt">
  <p>Receipt A: 50 EUR</p>
  <button>Match to Bank: -125 EUR</button>
</div>

<!-- New: Multi-select -->
<div class="receipt-group">
  <input type="checkbox" data-amount="50">Receipt A: 50 EUR
  <input type="checkbox" data-amount="75">Receipt B: 75 EUR
  <p>Total Selected: <span id="total">125</span> EUR</p>
  <button onclick="matchSelected()">Match to Bank: -125 EUR</button>
</div>
```

### 3. Data Model
```javascript
// Current
{
  bank_tx: { id: 1, amount: -125, date: "2025-03-15" },
  receipt: { id: 42, amount: 50 }
}

// New
{
  bank_tx: { id: 1, amount: -125, date: "2025-03-15" },
  receipts: [
    { id: 42, amount: 50 },
    { id: 43, amount: 75 }
  ],
  match_type: "multi-receipt"
}
```

## Implementation Priority

### Phase 1 (MVP)
- ✅ Detect when bank amount > single receipt
- ✅ Flag as "potential multi-receipt" in Review Queue
- ✅ Manual grouping UI

### Phase 2 (Smart Matching)
- 🔄 Auto-suggest receipt combinations
- 🔄 Same vendor + same day grouping
- 🔄 Confidence scoring for combos

### Phase 3 (Advanced)
- ⏳ Split single receipt across multiple bank payments
- ⏳ Partial matching (e.g., 125 EUR receipt, 2x 62.50 EUR payments)

## Example Scenarios

### Scenario 1: Young Living Sammelbestellung
```
Bank: -250 EUR (YL Europe, 20.03.2025)
Receipts:
  - 100 EUR Essential Oils
  - 75 EUR Supplements
  - 75 EUR Promo Items
→ Auto-suggest combo: 100+75+75 = 250 ✅
```

### Scenario 2: Multiple Kleinbeträge
```
Bank: -45.67 EUR (Amazon, 10.04.2025)
Receipts:
  - 12.99 EUR Bücher
  - 19.99 EUR USB-Kabel
  - 12.69 EUR Verpackung
→ Auto-suggest: 12.99+19.99+12.69 = 45.67 ✅
```

### Scenario 3: False Positive
```
Bank: -100 EUR (Verschiedene, 05.04.2025)
Receipts:
  - 50 EUR REWE (Lebensmittel)
  - 50 EUR Shell (KFZ)
→ DON'T auto-match (different vendors)
→ Review Queue: Manual check
```

## Testing
```bash
node test-multi-receipt-matching.js
```

Test cases:
- ✅ Exact sum (50+75 = 125)
- ✅ Tolerance (50+75.50 ≈ 125 within 5%)
- ✅ Same vendor grouping
- ❌ Different vendors (should NOT auto-match)
- ❌ Different dates >7 days (should NOT auto-match)
