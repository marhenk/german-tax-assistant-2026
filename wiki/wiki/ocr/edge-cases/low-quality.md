# Low-Quality Image Recognition

## Problem Description
Common causes of poor OCR accuracy:
1. **Blurry photos**: Out-of-focus camera, hand shake
2. **Low resolution**: <300 DPI for scans, <2MP for photos
3. **Poor lighting**: Shadows, glare, underexposure
4. **Skewed/rotated**: Receipt not aligned with camera
5. **Crumpled/folded**: Physical damage to receipt

## Quality Assessment

### Image Quality Metrics
```javascript
async function assessImageQuality(imagePath) {
  const stats = await sharp(imagePath).stats();
  const metadata = await sharp(imagePath).metadata();
  
  const quality = {
    resolution: metadata.width * metadata.height,
    brightness: stats.channels[0].mean,
    contrast: stats.channels[0].stdev,
    sharpness: await detectBlur(imagePath)
  };
  
  if (quality.resolution < 800 * 600) return 'low';
  if (quality.sharpness < 0.3) return 'blurry';
  if (quality.contrast < 30) return 'low_contrast';
  
  return 'acceptable';
}
```

### Blur Detection (Laplacian Variance)
```javascript
const cv = require('opencv4nodejs');

async function detectBlur(imagePath) {
  const img = await cv.imreadAsync(imagePath);
  const gray = img.cvtColor(cv.COLOR_BGR2GRAY);
  const laplacian = gray.laplacian(cv.CV_64F);
  const variance = laplacian.variance();
  
  // Variance <100: Blurry, >200: Sharp
  return variance;
}
```

## Preprocessing Pipelines

### Blurry Image
```javascript
await sharp(imagePath)
  .greyscale()
  .sharpen(3)              // Aggressive sharpening
  .normalize()
  .png()
  .toFile(processedPath);
```

### Low Contrast
```javascript
await sharp(imagePath)
  .greyscale()
  .normalize()
  .linear(1.5, -(128 * 0.5))  // Boost contrast
  .sharpen(2)
  .png()
  .toFile(processedPath);
```

### Skewed/Rotated
```javascript
const cv = require('opencv4nodejs');

async function deskewImage(imagePath) {
  const img = await cv.imreadAsync(imagePath);
  const gray = img.cvtColor(cv.COLOR_BGR2GRAY);
  
  // Detect edges
  const edges = gray.canny(50, 150);
  
  // Find lines using Hough transform
  const lines = edges.houghLinesP(1, Math.PI / 180, 100, 100, 10);
  
  // Calculate median angle
  const angles = lines.map(line => {
    const [[x1, y1, x2, y2]] = line;
    return Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
  });
  
  const medianAngle = median(angles);
  
  // Rotate image
  const rotated = img.rotate(medianAngle, { 
    background: new cv.Vec(255, 255, 255) 
  });
  
  await cv.imwriteAsync(processedPath, rotated);
}
```

### Shadows/Glare
```javascript
await sharp(imagePath)
  .greyscale()
  .clahe({                 // Adaptive histogram equalization
    width: 8,
    height: 8,
    maxSlope: 3
  })
  .normalize()
  .sharpen()
  .png()
  .toFile(processedPath);
```

## Multi-Pass OCR Strategy

When initial OCR confidence is low (<70%), try multiple preprocessing variants:

```javascript
async function multiPassOCR(imagePath) {
  const variants = [
    { name: 'standard', process: standardPreprocess },
    { name: 'high_contrast', process: contrastPreprocess },
    { name: 'deblur', process: deblurPreprocess },
    { name: 'adaptive', process: adaptivePreprocess }
  ];
  
  const results = [];
  
  for (const variant of variants) {
    const processed = await variant.process(imagePath);
    const ocrResult = await tesseractOCR(processed);
    results.push({ ...ocrResult, variant: variant.name });
  }
  
  // Return result with highest confidence
  return results.sort((a, b) => b.confidence - a.confidence)[0];
}
```

## User Feedback Loop

### Real-Time Quality Check
```javascript
// Before OCR, warn user if image quality is poor
const quality = await assessImageQuality(imagePath);

if (quality === 'low') {
  return {
    error: 'Image quality too low',
    suggestion: 'Please retake photo with better lighting',
    current_resolution: metadata.width + 'x' + metadata.height,
    minimum_required: '800x600'
  };
}

if (quality === 'blurry') {
  return {
    warning: 'Image appears blurry',
    suggestion: 'Hold camera steady and ensure focus',
    proceed: true  // Allow user to continue
  };
}
```

### Guided Capture (Mobile App)
1. **Real-time preview**: Show camera feed with quality overlay
2. **Auto-capture**: Trigger when receipt in frame + sharp + well-lit
3. **Edge detection**: Highlight receipt boundaries
4. **Best practices**: "Hold 20cm from receipt", "Ensure even lighting"

## Minimum Requirements

### Scanned Documents
- **Resolution**: ≥300 DPI
- **Color depth**: 8-bit grayscale or 24-bit RGB
- **Format**: PDF (digital) or high-quality PNG/JPEG

### Mobile Photos
- **Resolution**: ≥2 MP (1600x1200)
- **Focus**: Sharp (Laplacian variance >150)
- **Lighting**: Even (no harsh shadows or glare)
- **Alignment**: Receipt fills 60-80% of frame

## Fallback Strategy

If OCR confidence <60% after multi-pass:
1. **Request re-scan**: "Please retake photo with better quality"
2. **Highlight issues**: "Image is blurry" / "Receipt is rotated"
3. **Offer manual entry**: Pre-fill detected fields, user corrects
4. **Accept original**: Store original image for manual review later
