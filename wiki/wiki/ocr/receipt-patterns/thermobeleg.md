# Thermobeleg Pattern (Fading Thermal Paper)

## Problem Description
Thermal paper receipts (most supermarket/retail receipts) use heat-sensitive coating that **fades over time**:
- 6 months: Readable but lighter
- 12 months: Significant fading
- 18+ months: Often illegible

## Recognition Indicators
- Grayish/yellowish paper (not pure white)
- No ink texture (heat-printed)
- Fading from edges inward
- Low contrast text

## Legal Context
**Tax office accepts digital copies IF captured within 6 months** of receipt date.
→ **Scan immediately** upon receiving thermal receipts.

## Extraction Strategy

### Fresh Receipt (<6 months)
1. Standard preprocessing pipeline
2. Expected confidence: 85-95%

### Faded Receipt (6-18 months)
1. **Aggressive contrast enhancement**
2. **Adaptive thresholding** (multiple passes)
3. Expected confidence: 50-80%

### Severely Faded (>18 months)
1. May be unrecoverable
2. Consider UV light or infrared imaging (specialized hardware)
3. Fallback: Manual transcription if tax audit needed

## Preprocessing Pipeline
```javascript
async preprocessThermalReceipt(imagePath, fadingLevel = 'medium') {
  const pipeline = sharp(imagePath).greyscale();
  
  if (fadingLevel === 'low') {
    return pipeline
      .normalize()
      .sharpen()
      .png()
      .toFile(processedPath);
  } else if (fadingLevel === 'medium') {
    return pipeline
      .normalize()
      .linear(1.5, -(128 * 0.5))  // Contrast boost
      .sharpen(2)
      .threshold(120)              // Binarize
      .png()
      .toFile(processedPath);
  } else if (fadingLevel === 'high') {
    // Multi-pass processing
    const temp1 = imagePath + '.temp1.png';
    const temp2 = imagePath + '.temp2.png';
    
    await pipeline
      .normalize()
      .linear(2.0, -(128 * 1.0))   // Aggressive contrast
      .sharpen(3)
      .png()
      .toFile(temp1);
    
    await sharp(temp1)
      .threshold(110)               // Lower threshold
      .median(2)                    // Denoise
      .png()
      .toFile(temp2);
    
    return temp2;
  }
}
```

## Detection Algorithm
```javascript
function detectFading(imagePath) {
  // Analyze histogram
  const stats = await sharp(imagePath).greyscale().stats();
  const meanBrightness = stats.channels[0].mean;
  
  if (meanBrightness > 200) return 'high';  // Very washed out
  if (meanBrightness > 160) return 'medium';
  return 'low';
}
```

## Prevention Strategy
**For users:**
1. Scan receipts within 1 week of receipt
2. Store originals in dark, cool place (not wallet)
3. Use receipt scanner apps (automatic upload)

**For system:**
1. Warn user if receipt_date >6 months and no prior scan exists
2. Suggest re-scanning old receipts before they fade
3. Flag low-confidence extractions for manual review

## Alternative Storage
- BPA-free thermal paper (expensive, rare)
- Instant photo (Polaroid-style)
- High-resolution photo (12MP+) for zooming
- Store in envelope (not exposed to light)
