# Kassenbon Pattern (Cash Register Receipt)

## Layout Structure
```
    REWE Markt GmbH
   Hauptstr. 123
  12345 Berlin

2024-03-15    14:32

Milch 1,5%        1,89
Brot Vollkorn     2,49
Äpfel 1kg         3,29
--------------------------
SUMME EUR         7,67
  davon 7% MwSt   0,50
Bar               10,00
Rückgeld           2,33

Vielen Dank!
```

## Recognition Indicators
- Vendor name at top (often centered)
- Date + time (ISO or DD.MM.YYYY format)
- Line items without table structure
- "SUMME" or "GESAMT" keyword
- Often thermal paper (fading risk)

## Common Vendors
- Supermarkets: Rewe, Edeka, Aldi, Lidl
- Drugstores: dm, Rossmann, Müller
- Retail: MediaMarkt, Saturn, H&M

## Extraction Strategy
1. **Date**: Look for ISO date (YYYY-MM-DD) or DD.MM.YYYY near top
2. **Vendor**: First non-whitespace line
3. **Amount Gross**: "SUMME", "GESAMT", "TOTAL" keyword
4. **Tax Rate**: "MwSt" with percentage (often 7% or 19%)
5. **Invoice Number**: Usually missing (use date + vendor as identifier)

## OCR Confidence
- Expected: **75-90%** (thermal paper, small font, wrinkles)
- Preprocessing: **Critical** (contrast boost, denoise, deskew)

## Challenges
- **Thermal paper fading**: Receipts >6 months may be illegible
- **Wrinkles/folds**: Common in wallet storage
- **Small font**: 6-8pt typical
- **Centered text**: Harder to parse than left-aligned
- **No line items needed**: For tax purposes, only total matters

## Preprocessing Pipeline
```javascript
await sharp(imagePath)
  .greyscale()
  .normalize()      // Contrast boost
  .sharpen(2)       // Enhance edges
  .threshold(128)   // Binarize (if very faded)
  .png()
  .toFile(processedPath);
```

## Fallback Strategy
If OCR confidence <70%:
1. Try different threshold values (110, 128, 140)
2. Apply adaptive histogram equalization
3. Manual review required
