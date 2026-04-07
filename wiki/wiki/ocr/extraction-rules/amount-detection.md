# Amount Detection Rules

## German Number Format

### Basic Format
- **Thousands separator**: `.` (dot) → `1.234,56` = 1234.56
- **Decimal separator**: `,` (comma)
- **Currency symbol**: `€` (before or after number)

### Variations
- `€ 1.234,56`
- `1.234,56 €`
- `1.234,56EUR`
- `EUR 1.234,56`
- `1234,56` (no thousands separator)

## Amount Types

### Gross Amount (Brutto)
Keywords to look for:
- `Gesamt`, `Gesamtbetrag`, `Brutto`
- `Total`, `Summe`, `Rechnungsbetrag`
- `Zu zahlen`, `Zahlbetrag`

**Priority:** Highest - this is the final amount user pays

### Net Amount (Netto)
Keywords:
- `Netto`, `Zwischensumme`
- `Subtotal`, `Nettobetrag`
- `Summe (netto)`

**Use:** For tax calculation verification

### Tax Amount
Keywords:
- `MwSt`, `USt`, `VAT`
- `Steuer`, `Mehrwertsteuer`
- `19% MwSt` (with percentage)

## Extraction Strategy

### Pattern Matching (Priority Order)
```javascript
const amountPatterns = {
  gross: [
    /Gesamt(?:betrag)?[:\s]+€?\s*([\d.,]+)\s*€?/i,
    /Brutto[:\s]+€?\s*([\d.,]+)\s*€?/i,
    /Total[:\s]+€?\s*([\d.,]+)\s*€?/i,
    /Summe[:\s]+€?\s*([\d.,]+)\s*€?/i,
    /Rechnungsbetrag[:\s]+€?\s*([\d.,]+)\s*€?/i,
    /Zu zahlen[:\s]+€?\s*([\d.,]+)\s*€?/i
  ],
  
  net: [
    /Netto[:\s]+€?\s*([\d.,]+)\s*€?/i,
    /Zwischensumme[:\s]+€?\s*([\d.,]+)\s*€?/i,
    /Subtotal[:\s]+€?\s*([\d.,]+)\s*€?/i
  ],
  
  tax: [
    /(\d{1,2})\s*%\s*(?:MwSt|USt|VAT)[:\s]+€?\s*([\d.,]+)\s*€?/i,
    /(?:MwSt|USt|VAT)[:\s]+€?\s*([\d.,]+)\s*€?/i,
    /Steuer[:\s]+€?\s*([\d.,]+)\s*€?/i
  ]
};

function extractAmount(text, type = 'gross') {
  for (const pattern of amountPatterns[type]) {
    const match = text.match(pattern);
    if (match) {
      const amountStr = match[match.length - 1];  // Last capture group
      return parseGermanNumber(amountStr);
    }
  }
  
  // Fallback for gross: Largest number
  if (type === 'gross') {
    return findLargestAmount(text);
  }
  
  return null;
}
```

### Number Parsing
```javascript
function parseGermanNumber(str) {
  // Remove currency symbols and whitespace
  let cleaned = str.replace(/[€\s]/g, '');
  
  // Detect format by counting separators
  const dotCount = (cleaned.match(/\./g) || []).length;
  const commaCount = (cleaned.match(/,/g) || []).length;
  
  if (commaCount === 0 && dotCount === 0) {
    // Plain number: 1234
    return parseFloat(cleaned);
  }
  
  if (commaCount === 1 && dotCount === 0) {
    // German format without thousands: 1234,56
    cleaned = cleaned.replace(',', '.');
  } else if (commaCount === 0 && dotCount === 1) {
    // Could be German (1.234) or English (1234.56)
    const parts = cleaned.split('.');
    if (parts[1].length === 2) {
      // Likely English: 1234.56
      // Keep as-is
    } else {
      // Likely German thousands: 1.234
      cleaned = cleaned.replace('.', '');
    }
  } else {
    // Mixed separators: 1.234,56 (German) or 1,234.56 (English)
    if (commaCount === 1) {
      // German: 1.234,56
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // English: 1,234.56
      cleaned = cleaned.replace(/,/g, '');
    }
  }
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : Math.round(num * 100) / 100;
}
```

### Fallback: Largest Amount
```javascript
function findLargestAmount(text) {
  // Find all numbers that look like money (e.g., 12,34 or 1.234,56)
  const moneyPattern = /\b\d{1,3}(?:[.,]\d{3})*[.,]\d{2}\b/g;
  const candidates = text.match(moneyPattern) || [];
  
  const amounts = candidates
    .map(parseGermanNumber)
    .filter(n => n !== null && n > 0);
  
  return amounts.length > 0 ? Math.max(...amounts) : null;
}
```

## Validation

### Sanity Checks
```javascript
function validateAmount(amount, context = {}) {
  // Must be positive
  if (amount <= 0) return false;
  
  // Reasonable range for receipts
  if (amount < 0.01) return false;  // Too small
  if (amount > 100000) return false;  // €100k+ needs manual review
  
  // Net should be < Gross
  if (context.net && context.gross && context.net >= context.gross) {
    return false;
  }
  
  // Gross = Net + Tax (within ±€0.02 rounding tolerance)
  if (context.net && context.tax && context.gross) {
    const calculated = context.net + context.tax;
    if (Math.abs(calculated - context.gross) > 0.02) {
      return false;
    }
  }
  
  return true;
}
```

### Auto-Calculation
```javascript
function autoCalculateMissing(data) {
  const { amount_gross, amount_net, tax_rate, tax_amount } = data;
  
  // If gross + tax rate known, calculate net
  if (amount_gross && tax_rate && !amount_net) {
    data.amount_net = amount_gross / (1 + tax_rate / 100);
    data.tax_amount = amount_gross - data.amount_net;
  }
  
  // If net + tax known, calculate gross
  if (amount_net && tax_amount && !amount_gross) {
    data.amount_gross = amount_net + tax_amount;
  }
  
  // If net + tax rate known, calculate gross
  if (amount_net && tax_rate && !amount_gross) {
    data.amount_gross = amount_net * (1 + tax_rate / 100);
    data.tax_amount = data.amount_gross - amount_net;
  }
  
  // Round all amounts to 2 decimals
  ['amount_gross', 'amount_net', 'tax_amount'].forEach(field => {
    if (data[field]) {
      data[field] = Math.round(data[field] * 100) / 100;
    }
  });
  
  return data;
}
```

## Edge Cases

### Negative Amounts (Credits/Refunds)
```
Rückerstattung: -15,99 €
```
→ Keep negative sign, flag as `type: 'refund'`

### Multiple Amounts (Line Items)
```
Artikel 1    12,99 €
Artikel 2     8,50 €
-----------------------
Gesamt       21,49 €
```
→ Extract only `Gesamt` (line items not needed for tax)

### Missing Gross Amount
If only net + tax found:
```javascript
if (!amount_gross && amount_net && tax_amount) {
  amount_gross = amount_net + tax_amount;
  confidence -= 0.1;  // Lower confidence (derived, not extracted)
}
```

### Currency Conversion
For non-EUR amounts (USD, CHF):
```javascript
if (currency !== 'EUR') {
  data.original_amount = amount;
  data.original_currency = currency;
  data.amount_eur = convertToEUR(amount, currency, date);
  data.exchange_rate_date = date;
}
```

## Output Format

Always return:
- `amount_gross`: Total amount (2 decimals)
- `amount_net`: Net amount or `null`
- `tax_amount`: Tax amount or `null`
- `currency`: ISO code (`EUR`, `USD`, `CHF`)
