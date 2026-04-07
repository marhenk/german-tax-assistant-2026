# Quittung Pattern (Handwritten Receipt)

## Layout Structure
```
                QUITTUNG

Empfangen von: Max Mustermann

Betrag: 150,00 € (Einhundertfünfzig Euro)

für: Beratungsleistung Website-Design

am: 15.03.2024

_____________________
Unterschrift
```

## Recognition Indicators
- "Quittung" keyword at top
- Handwritten or typed (Word/PDF)
- Minimal structure
- Often includes written-out amount

## Common Use Cases
- Freelancer payments (before formal invoicing)
- Cash transactions <250€
- Kleinunternehmer (small business) receipts
- Event tickets, parking fees

## Extraction Strategy
1. **Date**: Look for "am:", "Datum:", or standalone date
2. **Amount**: "Betrag:", often with written form
3. **Description**: "für:", "Leistung:", "Verwendungszweck:"
4. **Vendor**: "Empfangen von:" or signature line
5. **Invoice Number**: Usually missing

## OCR Confidence
- Expected: **40-80%** (handwriting varies wildly)
- Tesseract.js struggles with handwriting
- Consider Google Vision API for production

## Challenges
- **Handwriting recognition**: Tesseract not optimized for script
- **No standardized format**: Every Quittung is different
- **Missing tax info**: Often no MwSt breakdown
- **Signature illegible**: Vendor identification hard

## Preprocessing Pipeline
```javascript
// For handwritten Quittungen
await sharp(imagePath)
  .greyscale()
  .normalize()
  .medianFilter(3)  // Remove noise
  .sharpen(1.5)
  .png()
  .toFile(processedPath);
```

## Fallback Strategy
If OCR confidence <60%:
1. **Manual review required**
2. Consider using Google Vision API handwriting model
3. For tax audit: Physical receipt is authoritative (keep original)

## Legal Note
Quittungen are valid for expenses <250€. For amounts ≥250€, a proper invoice with tax ID is required (§33 UStDV).
