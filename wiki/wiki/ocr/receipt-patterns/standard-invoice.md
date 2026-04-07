# Standard Invoice Pattern

## Layout Structure
```
[Vendor Logo/Name]
[Address Block]
Rechnungsnummer: RE-YYYY-NNNNN
Datum: DD.MM.YYYY

[Customer Address]

Position | Beschreibung | Menge | Einzelpreis | Gesamt
---------|--------------|-------|-------------|-------
1        | Service X    | 1     | 100,00 €    | 100,00 €

Zwischensumme (Netto):  100,00 €
19% MwSt:                19,00 €
Gesamtbetrag:           119,00 €

Zahlbar bis: DD.MM.YYYY
```

## Recognition Indicators
- "Rechnung" or "Invoice" in header
- Structured table layout
- Clear line items
- Explicit tax breakdown

## Common Vendors
- Hosting: AWS, Hetzner, DigitalOcean
- Software: Adobe, Microsoft, JetBrains
- B2B Services: Consulting firms, agencies

## Extraction Strategy
1. **Date**: Look for "Rechnungsdatum:", "Datum:", or date near header
2. **Invoice Number**: "Rechnungsnr:", "RE-", "INV-" patterns
3. **Amount Net**: "Zwischensumme", "Netto"
4. **Amount Gross**: "Gesamtbetrag", "Gesamt", "Total"
5. **Tax Rate**: "MwSt" or "USt" with percentage
6. **Vendor**: First 2-3 lines (company name + legal form)

## OCR Confidence
- Expected: **95-100%** (clean PDF, digital text)
- Preprocessing: Minimal (deskew only if needed)

## Edge Cases
- Multi-page invoices → Extract from page 1
- English invoices from international vendors (AWS) → Adapt patterns
- No explicit "Netto" line → Calculate from Gross - Tax
