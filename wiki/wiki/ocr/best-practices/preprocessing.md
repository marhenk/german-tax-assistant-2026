# OCR Preprocessing Best Practices

## Why Preprocessing Matters

Raw images often have issues that reduce OCR accuracy:
- **Low contrast**: Gray text on gray background
- **Noise**: Scanner artifacts, compression artifacts
- **Skew**: Rotated or tilted documents
- **Blur**: Camera shake, out-of-focus
- **Shadows/glare**: Uneven lighting

**Preprocessing can improve accuracy from 60% → 90%+**

## Standard Pipeline

### For Digital PDFs
```javascript
// Minimal preprocessing (text already clean)
const text = await pdfParse(buffer);
// No image processing needed
```

### For Scanned Documents
```javascript
await sharp(imagePath)
  .greyscale()           // Convert to grayscale (reduces noise)
  .normalize()           // Auto-adjust contrast
  .sharpen()             // Enhance edges
  .png()                 // Lossless format
  .toFile(processedPath);
```

### For Mobile Photos
```javascript
await sharp(imagePath)
  .greyscale()
  .normalize()
  .rotate(0, {           // Auto-deskew
    background: '#ffffff'
  })
  .sharpen(1.5)
  .threshold(140)        // Binarize (black/white only)
  .png()
  .toFile(processedPath);
```

### For Thermal Receipts (Faded)
```javascript
await sharp(imagePath)
  .greyscale()
  .linear(1.8, -(128 * 0.8))  // Aggressive contrast boost
  .sharpen(2)
  .threshold(120)              // Lower threshold for faded text
  .medianFilter(2)             // Denoise
  .png()
  .toFile(processedPath);
```

## Technique Breakdown

### 1. Grayscale Conversion
**Why:** OCR engines work better with grayscale (1 channel vs 3)
```javascript
.greyscale()
```

### 2. Normalization (Auto-Contrast)
**Why:** Adjusts brightness/contrast to use full 0-255 range
```javascript
.normalize()
```

### 3. Linear Contrast Adjustment
**Why:** More control than normalize
```javascript
// Formula: output = input * multiplier + offset
.linear(1.5, -(128 * 0.5))  // Boost contrast by 50%
```

### 4. Sharpening
**Why:** Enhances edges, makes text crisper
```javascript
.sharpen()       // Default
.sharpen(2)      // More aggressive
.sharpen(0.5)    // Subtle
```

### 5. Thresholding (Binarization)
**Why:** Convert to pure black/white (best for low-quality images)
```javascript
.threshold(128)   // Standard (0-127=black, 128-255=white)
.threshold(140)   // Higher = more black
.threshold(110)   // Lower = more white
```

**Adaptive threshold** (better for uneven lighting):
```javascript
const cv = require('opencv4nodejs');
const img = await cv.imreadAsync(imagePath);
const gray = img.cvtColor(cv.COLOR_BGR2GRAY);
const binary = gray.adaptiveThreshold(
  255,
  cv.ADAPTIVE_THRESH_GAUSSIAN_C,
  cv.THRESH_BINARY,
  11,   // Block size
  2     // Constant
);
```

### 6. Denoising
**Why:** Remove salt-and-pepper noise
```javascript
.medianFilter(3)  // Smooth noise while preserving edges
```

### 7. Deskewing (Rotation Correction)
**Why:** Tesseract works best with horizontal text
```javascript
// Sharp auto-rotate (simple)
.rotate(0, { background: '#ffffff' })

// OpenCV Hough line detection (advanced)
async function deskew(imagePath) {
  const img = await cv.imreadAsync(imagePath);
  const gray = img.cvtColor(cv.COLOR_BGR2GRAY);
  const edges = gray.canny(50, 150);
  const lines = edges.houghLinesP(1, Math.PI / 180, 100, 100, 10);
  
  const angles = lines.map(line => {
    const [[x1, y1, x2, y2]] = line;
    return Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
  });
  
  const medianAngle = median(angles);
  const rotated = img.rotate(medianAngle, {
    background: new cv.Vec(255, 255, 255)
  });
  
  return rotated;
}
```

## Quality-Based Pipeline Selection

```javascript
async function selectPipeline(imagePath) {
  const metadata = await sharp(imagePath).metadata();
  const stats = await sharp(imagePath).greyscale().stats();
  
  const brightness = stats.channels[0].mean;
  const contrast = stats.channels[0].stdev;
  
  // High quality (digital PDF, good scan)
  if (contrast > 60 && brightness > 100 && brightness < 200) {
    return 'minimal';  // Just greyscale + sharpen
  }
  
  // Low contrast (faded, thermal)
  if (contrast < 40) {
    return 'contrast_boost';
  }
  
  // Dark or washed out
  if (brightness < 80 || brightness > 220) {
    return 'normalize_aggressive';
  }
  
  // Default
  return 'standard';
}
```

## Tesseract Configuration

### Page Segmentation Modes (PSM)
```javascript
const PSM = {
  AUTO: 3,              // Default
  SINGLE_COLUMN: 4,     // Receipts (vertical text)
  SINGLE_BLOCK: 6,      // Invoices (structured text)
  SINGLE_LINE: 7,       // Short texts (amounts)
  SINGLE_WORD: 8,       // Vendor names
  SPARSE_TEXT: 11       // Sparse text (like forms)
};

// Usage
Tesseract.recognize(image, 'deu', {
  tessedit_pageseg_mode: PSM.SINGLE_COLUMN
});
```

### OCR Engine Mode (OEM)
```javascript
const OEM = {
  LEGACY: 0,         // Old Tesseract (faster, less accurate)
  LSTM: 1,           // Neural network (slower, more accurate)
  LEGACY_LSTM: 2,    // Both
  DEFAULT: 3         // Based on available data
};

// For handwriting, use LSTM
Tesseract.recognize(image, 'deu', {
  tessedit_ocr_engine_mode: OEM.LSTM
});
```

### Character Whitelist
**Why:** Restrict to expected characters (reduces errors)
```javascript
// For German receipts
{
  tessedit_char_whitelist: '0123456789.,€ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜßabcdefghijklmnopqrstuvwxyzäöü -:/()'
}

// For amounts only
{
  tessedit_char_whitelist: '0123456789.,€ '
}
```

## Performance Optimization

### Parallel Processing
```javascript
const Queue = require('bull');
const ocrQueue = new Queue('ocr-processing');

ocrQueue.process(5, async (job) => {  // 5 concurrent jobs
  const { imagePath } = job.data;
  return await processOCR(imagePath);
});
```

### Caching
```javascript
const cache = new Map();

async function extractTextCached(filePath) {
  const hash = await fileHash(filePath);
  
  if (cache.has(hash)) {
    return cache.get(hash);
  }
  
  const result = await extractText(filePath);
  cache.set(hash, result);
  return result;
}
```

### Progressive Enhancement
```javascript
// Start with fast, low-quality OCR
const quickResult = await tesseractOCR(imagePath, { fast: true });

if (quickResult.confidence < 0.8) {
  // Retry with better preprocessing
  const betterResult = await tesseractOCR(imagePath, { quality: 'high' });
  return betterResult;
}

return quickResult;
```

## Testing Preprocessing

### A/B Comparison
```javascript
const variants = ['original', 'standard', 'aggressive', 'adaptive'];
const results = [];

for (const variant of variants) {
  const processed = await preprocess(imagePath, variant);
  const ocr = await tesseractOCR(processed);
  results.push({ variant, confidence: ocr.confidence, text: ocr.text });
}

// Compare results
console.table(results);
```

## Best Practices Summary

1. **Always use grayscale** (unless color is needed for layout detection)
2. **Normalize first**, then fine-tune
3. **Sharpen carefully** (too much = noise amplification)
4. **Threshold for low-quality images**, not for good scans
5. **Deskew if angle >2°**
6. **Use PNG for intermediate files** (lossless)
7. **Test multiple variants** for edge cases
8. **Cache results** to avoid reprocessing
