# Date Parsing Rules

## German Date Formats

### Standard Formats
1. **DD.MM.YYYY** (most common): `15.03.2024`
2. **DD/MM/YYYY**: `15/03/2024`
3. **DD-MM-YYYY**: `15-03-2024`
4. **ISO (YYYY-MM-DD)**: `2024-03-15` (bank statements, digital receipts)
5. **Short year**: `15.03.24` (Kassenbon)

### With Text
- **Spelled out**: `15. März 2024`
- **Abbreviated month**: `15. Mär 2024`, `15.Mrz.2024`
- **With day name**: `Freitag, 15.03.2024`

### Contextual Keywords
- `Datum:`, `Rechnungsdatum:`, `Buchungstag:` (invoice date)
- `Fälligkeit:`, `Zahlbar bis:` (due date - ignore for expense tracking)
- `Lieferdatum:` (delivery date - use if invoice date missing)

## Extraction Strategy

### Regex Patterns (Priority Order)
```javascript
const datePatterns = [
  // ISO format (highest confidence)
  {
    regex: /\b(\d{4})-(\d{2})-(\d{2})\b/,
    parse: (m) => `${m[1]}-${m[2]}-${m[3]}`
  },
  
  // DD.MM.YYYY (with context)
  {
    regex: /(?:Datum|Rechnungsdatum|Buchungstag)[:\s]+(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/i,
    parse: (m) => `${m[3]}-${pad(m[2])}-${pad(m[1])}`
  },
  
  // DD.MM.YYYY (standalone)
  {
    regex: /\b(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})\b/,
    parse: (m) => `${m[3]}-${pad(m[2])}-${pad(m[1])}`
  },
  
  // DD.MM.YY (short year)
  {
    regex: /\b(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2})\b/,
    parse: (m) => {
      const year = parseInt(m[3]);
      const fullYear = year < 50 ? 2000 + year : 1900 + year;
      return `${fullYear}-${pad(m[2])}-${pad(m[1])}`;
    }
  },
  
  // Spelled out month
  {
    regex: /(\d{1,2})\.\s*(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s*(\d{4})/i,
    parse: (m) => {
      const months = {
        januar: '01', februar: '02', märz: '03', april: '04',
        mai: '05', juni: '06', juli: '07', august: '08',
        september: '09', oktober: '10', november: '11', dezember: '12'
      };
      return `${m[3]}-${months[m[2].toLowerCase()]}-${pad(m[1])}`;
    }
  }
];

function extractDate(text) {
  for (const pattern of datePatterns) {
    const match = text.match(pattern.regex);
    if (match) {
      const date = pattern.parse(match);
      if (isValidDate(date)) return date;
    }
  }
  return null;
}
```

## Validation

### Date Range Checks
```javascript
function isValidDate(dateStr) {
  const date = new Date(dateStr);
  
  // Check if valid date object
  if (isNaN(date.getTime())) return false;
  
  // Reasonable range: Not in future, not >10 years old
  const now = new Date();
  const tenYearsAgo = new Date(now.getFullYear() - 10, now.getMonth(), now.getDate());
  
  if (date > now) return false;  // Future date
  if (date < tenYearsAgo) return false;  // Too old
  
  return true;
}
```

### Ambiguity Resolution
For dates like `03.05.2024`:
- **DD.MM.YYYY** (German) → May 3rd
- **MM.DD.YYYY** (US) → March 5th

**Rule:** Assume DD.MM.YYYY unless:
1. Day value >12 (then must be DD)
2. Context indicates US vendor (AWS, DigitalOcean)
3. Currency is USD

```javascript
function parseAmbiguousDate(d1, d2, year, context) {
  // If day >12, format is unambiguous
  if (d1 > 12) return `${year}-${pad(d2)}-${pad(d1)}`;  // DD.MM
  if (d2 > 12) return `${year}-${pad(d1)}-${pad(d2)}`;  // MM.DD
  
  // Check context
  if (context.vendor_country === 'US') {
    return `${year}-${pad(d1)}-${pad(d2)}`;  // MM.DD
  }
  
  // Default: German format
  return `${year}-${pad(d2)}-${pad(d1)}`;  // DD.MM
}
```

## Edge Cases

### Multiple Dates on Receipt
```
Bestelldatum: 10.03.2024
Rechnungsdatum: 15.03.2024
Lieferdatum: 12.03.2024
Fällig: 14.04.2024
```

**Priority:**
1. Rechnungsdatum (invoice date) → **Use this**
2. Buchungstag (booking date)
3. Lieferdatum (delivery date)
4. Ignore: Fälligkeit (due date), Bestelldatum (order date)

### Timestamp Included
`15.03.2024 14:32:17` → Extract date only: `2024-03-15`

### Partial Dates
- `März 2024` (no day) → Use 1st: `2024-03-01`
- `2024` only → Invalid, request manual entry

### OCR Errors
- `15 03 2024` (missing dots) → Auto-fix: `15.03.2024`
- `15.O3.2024` (O instead of 0) → Auto-fix: `15.03.2024`
- `l5.03.2024` (l instead of 1) → Auto-fix: `15.03.2024`

## Output Format

**Always return ISO 8601:** `YYYY-MM-DD`

This ensures:
- Sortable
- Unambiguous
- Database-friendly
- Compatible with lexoffice API
