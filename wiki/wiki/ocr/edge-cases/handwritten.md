# Handwritten Receipt Recognition

## Problem Description
Tesseract.js is optimized for **printed text**, not handwriting. Accuracy drops from 85% (print) to **40-60% (handwriting)**.

## Common Scenarios
1. **Freelancer Quittungen**: Handwritten receipts for services <250€
2. **Market/Fair purchases**: Handwritten vendor receipts
3. **Signed invoices**: Signature may bleed into text area
4. **Notes on receipts**: User annotations ("business trip", "project X")

## Recognition Challenges

### Character Ambiguity
- l/1/I (lowercase L, digit one, uppercase I)
- 0/O (zero, letter O)
- 5/S, 8/B, 2/Z
- Cursive connections

### Variable Quality
- **Good:** Block letters, neat handwriting, black pen
- **Medium:** Cursive, fountain pen, slight slant
- **Poor:** Scribbled, faded ink, pencil

## Preprocessing Pipeline

### Standard Handwriting
```javascript
await sharp(imagePath)
  .greyscale()
  .normalize()           // Contrast boost
  .medianFilter(3)       // Remove noise (smooth edges)
  .sharpen(1.5)          // Enhance strokes
  .threshold(140)        // Binarize (higher threshold than print)
  .png()
  .toFile(processedPath);
```

### Poor Handwriting (Fallback)
```javascript
await sharp(imagePath)
  .greyscale()
  .clahe({              // Adaptive histogram equalization
    width: 8,
    height: 8,
    maxSlope: 3
  })
  .medianFilter(5)      // Aggressive denoising
  .sharpen(2)
  .png()
  .toFile(processedPath);
```

## OCR Strategy

### Tesseract Configuration
```javascript
const { data } = await Tesseract.recognize(imagePath, 'deu', {
  tessedit_char_whitelist: '0123456789.,€ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜß ',
  tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,  // Treat as single text block
  tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY    // Neural network mode
});
```

### Alternative: Google Vision API
For production systems handling handwriting:
```javascript
const vision = require('@google-cloud/vision');
const client = new vision.ImageAnnotatorClient();

const [result] = await client.documentTextDetection(imagePath);
const fullText = result.fullTextAnnotation.text;
const confidence = result.fullTextAnnotation.pages[0].confidence;
```
**Accuracy:** 75-85% (significantly better than Tesseract)

## Fallback Strategy

### Confidence Tiers
| Confidence | Action |
|------------|--------|
| >80% | Auto-accept |
| 60-80% | Flag for review (highlight uncertain fields) |
| <60% | Manual entry required |

### Partial Extraction
Even if full text fails, extract:
1. **Date**: Often printed/stamped
2. **Amount**: Usually clear (numbers easier than letters)
3. **Vendor**: May need manual entry

### User Assistance
```javascript
if (confidence < 60) {
  return {
    text: ocrText,
    confidence,
    suggestion: 'Manual review recommended',
    fields_to_verify: ['vendor', 'description'],
    auto_extracted: {
      date: extractDate(ocrText),  // More reliable
      amount: extractAmount(ocrText)
    }
  };
}
```

## Training Data Approach
For recurring handwritten receipts (e.g., same freelancer):
1. **User corrects** first 3-5 receipts
2. **System learns** vendor handwriting patterns
3. **Confidence improves** over time (vendor-specific model)

## Legal Note
**Tax office accepts handwritten Quittungen** for expenses <250€ IF:
- Date clearly visible
- Amount clearly visible
- Vendor signature/stamp present
- Purpose stated

**Illegible receipts:** Keep physical copy; provide manual transcription with note "Handschriftliche Quittung, siehe Original".

## Recommended Approach
1. **Try Tesseract** (free, local)
2. **If confidence <70%**: Offer Google Vision upgrade (costs ~$1.50 per 1000 images)
3. **If still poor**: Manual entry with OCR assist (user confirms pre-filled fields)
