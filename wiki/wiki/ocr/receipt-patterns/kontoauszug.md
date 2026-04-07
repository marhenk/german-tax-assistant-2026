# Kontoauszug Pattern (Bank Statement)

## Layout Structure

### CSV Format
```csv
Buchungstag,Valutadatum,Auftraggeber/Empfänger,Verwendungszweck,Betrag,Saldo
15.03.2024,15.03.2024,AWS EMEA SARL,Invoice 123456789,-119.00,1234.56
```

### PDF Format
```
Sparkasse Berlin
Kontoauszug Nr. 03/2024

Datum      | Buchungstext           | Betrag     | Saldo
-----------|------------------------|------------|----------
15.03.2024 | AWS EMEA SARL          | -119,00 €  | 1.234,56 €
           | Rechnung 123456789     |            |
```

## Recognition Indicators
- "Kontoauszug" or "Account Statement" in header
- Tabular format with date columns
- Bank logo/name
- Account number (IBAN)

## Common Sources
- CSV export from online banking → **Best quality** (structured data)
- PDF statements → Good quality (digital text)
- Scanned paper statements → Lower quality (OCR needed)

## Extraction Strategy

### CSV (Preferred)
```javascript
const csv = require('csv-parse/sync');
const records = csv.parse(fileContent, {
  columns: true,
  delimiter: ',',
  skip_empty_lines: true
});

for (const record of records) {
  const transaction = {
    date: parseDate(record.Buchungstag),
    vendor: record['Auftraggeber/Empfänger'],
    description: record.Verwendungszweck,
    amount: parseAmount(record.Betrag),
    type: 'bank_statement'
  };
}
```

### PDF (OCR)
1. **Date**: First column (DD.MM.YYYY or ISO)
2. **Vendor**: "Auftraggeber/Empfänger" column
3. **Amount**: Look for negative values (expenses)
4. **Description**: "Verwendungszweck" or secondary line

## OCR Confidence
- **CSV**: 100% (structured data, no OCR)
- **PDF digital**: 95-100% (clean table extraction)
- **Scanned PDF**: 80-95% (table layout helps)

## Challenges
- **Multi-line transactions**: Description may span 2-3 rows
- **Foreign bank formats**: English/Swiss statements differ
- **Table boundary detection**: Separating header from data
- **Amount sign**: Negative for expenses, positive for income

## Preprocessing Pipeline
```javascript
// For scanned bank statements
await sharp(imagePath)
  .greyscale()
  .normalize()
  .rotate(0, { background: '#ffffff' })  // Auto-deskew
  .sharpen()
  .png()
  .toFile(processedPath);
```

## Swiss Bank Specifics (PostFinance, UBS, CS)
- Date format: DD.MM.YYYY (same as DE)
- Amounts: Swiss Franc (CHF) vs Euro (EUR)
- IBAN: CH prefix
- Tax category: Must distinguish CH vs EU expenses

## Fallback Strategy
If OCR fails on PDF:
1. Request CSV export from bank (always available)
2. Use bank API (FinAPI, SaltEdge) for automated import
3. Manual entry for <10 transactions
