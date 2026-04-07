#!/usr/bin/env node

/**
 * Multi-Model OCR Ensemble
 * 
 * Combines 3 OCR engines for maximum accuracy:
 * 1. Tesseract (free, local, good for German)
 * 2. Google Vision API (best overall, 1000/month free)
 * 3. Azure Computer Vision (best for handwriting, paid)
 * 
 * Confidence-weighted consensus merge
 * Target: 97% → 99%+ accuracy
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * OCR Engine: Tesseract (Local, Free)
 */
async function tesseractOCR(imagePath) {
  try {
    const outputBase = imagePath.replace(/\.[^.]+$/, '');
    const outputFile = `${outputBase}_tesseract`;
    
    execSync(`tesseract "${imagePath}" "${outputFile}" -l deu`, { stdio: 'pipe' });
    
    const text = fs.readFileSync(`${outputFile}.txt`, 'utf8');
    fs.unlinkSync(`${outputFile}.txt`); // Cleanup
    
    return {
      engine: 'tesseract',
      text: text.trim(),
      confidence: 0.85, // Tesseract doesn't provide confidence, use default
      success: true
    };
  } catch (error) {
    return {
      engine: 'tesseract',
      text: '',
      confidence: 0,
      success: false,
      error: error.message
    };
  }
}

/**
 * OCR Engine: Google Vision API
 * Requires: GOOGLE_APPLICATION_CREDENTIALS env var
 */
async function googleVisionOCR(imagePath) {
  try {
    // Check if Google Cloud credentials are set
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      return {
        engine: 'google_vision',
        text: '',
        confidence: 0,
        success: false,
        error: 'GOOGLE_APPLICATION_CREDENTIALS not set'
      };
    }
    
    // Google Vision API call (requires @google-cloud/vision npm package)
    // For now: Stub implementation
    // const vision = require('@google-cloud/vision');
    // const client = new vision.ImageAnnotatorClient();
    // const [result] = await client.textDetection(imagePath);
    // const text = result.fullTextAnnotation?.text || '';
    // const confidence = result.textAnnotations?.[0]?.confidence || 0.9;
    
    return {
      engine: 'google_vision',
      text: '', // Placeholder
      confidence: 0.95,
      success: false,
      error: 'Not implemented - install @google-cloud/vision'
    };
  } catch (error) {
    return {
      engine: 'google_vision',
      text: '',
      confidence: 0,
      success: false,
      error: error.message
    };
  }
}

/**
 * OCR Engine: Azure Computer Vision API
 * Requires: AZURE_CV_ENDPOINT and AZURE_CV_KEY env vars
 */
async function azureOCR(imagePath) {
  try {
    if (!process.env.AZURE_CV_ENDPOINT || !process.env.AZURE_CV_KEY) {
      return {
        engine: 'azure_cv',
        text: '',
        confidence: 0,
        success: false,
        error: 'Azure credentials not set'
      };
    }
    
    // Azure OCR call (requires axios + Azure SDK)
    // For now: Stub implementation
    
    return {
      engine: 'azure_cv',
      text: '',
      confidence: 0.90,
      success: false,
      error: 'Not implemented - install Azure SDK'
    };
  } catch (error) {
    return {
      engine: 'azure_cv',
      text: '',
      confidence: 0,
      success: false,
      error: error.message
    };
  }
}

/**
 * Merge OCR results with confidence weighting
 */
function mergeOCRResults(results) {
  const successful = results.filter(r => r.success);
  
  if (successful.length === 0) {
    return {
      text: '',
      confidence: 0,
      engines_used: results.map(r => r.engine),
      engines_succeeded: 0,
      method: 'none'
    };
  }
  
  if (successful.length === 1) {
    return {
      text: successful[0].text,
      confidence: successful[0].confidence,
      engines_used: [successful[0].engine],
      engines_succeeded: 1,
      method: 'single'
    };
  }
  
  // Multiple successful results → consensus merge
  // Strategy: Use highest-confidence result as base,
  // then fill gaps from other results
  
  successful.sort((a, b) => b.confidence - a.confidence);
  const primary = successful[0];
  const secondary = successful.slice(1);
  
  let mergedText = primary.text;
  let totalConfidence = primary.confidence;
  
  // Simple merge: Use primary, note alternatives
  const alternatives = secondary.map(r => ({
    engine: r.engine,
    text: r.text,
    confidence: r.confidence
  }));
  
  return {
    text: mergedText,
    confidence: totalConfidence,
    engines_used: successful.map(r => r.engine),
    engines_succeeded: successful.length,
    method: 'consensus',
    primary_engine: primary.engine,
    alternatives: alternatives
  };
}

/**
 * Run ensemble OCR on image
 */
async function ensembleOCR(imagePath, options = {}) {
  const {
    preprocess = true,
    engines = ['tesseract', 'google_vision', 'azure_cv']
  } = options;
  
  console.log(`\n🔬 Multi-Model OCR Ensemble`);
  console.log('━'.repeat(60));
  console.log(`Image: ${imagePath}`);
  console.log(`Engines: ${engines.join(', ')}`);
  console.log('');
  
  // 1. Pre-process if requested
  let processedImage = imagePath;
  if (preprocess) {
    console.log('📊 Pre-processing image...');
    const preprocessScript = path.join(__dirname, 'ocr-preprocess.sh');
    
    try {
      execSync(`${preprocessScript} "${imagePath}"`, { stdio: 'pipe' });
      processedImage = imagePath.replace(/\.[^.]+$/, '_enhanced.jpg');
      console.log(`✅ Enhanced: ${processedImage}\n`);
    } catch (error) {
      console.log(`⚠️  Pre-processing failed, using original\n`);
    }
  }
  
  // 2. Run all engines in parallel
  console.log('🔍 Running OCR engines...\n');
  
  const enginePromises = [];
  
  if (engines.includes('tesseract')) {
    enginePromises.push(tesseractOCR(processedImage));
  }
  
  if (engines.includes('google_vision')) {
    enginePromises.push(googleVisionOCR(processedImage));
  }
  
  if (engines.includes('azure_cv')) {
    enginePromises.push(azureOCR(processedImage));
  }
  
  const results = await Promise.all(enginePromises);
  
  // 3. Display individual results
  results.forEach(r => {
    const status = r.success ? '✅' : '❌';
    const conf = r.success ? `${(r.confidence * 100).toFixed(0)}%` : 'FAILED';
    console.log(`${status} ${r.engine.padEnd(15)} confidence: ${conf}`);
    if (!r.success) {
      console.log(`   Error: ${r.error}`);
    }
  });
  
  console.log('');
  
  // 4. Merge results
  console.log('🔀 Merging results...\n');
  const merged = mergeOCRResults(results);
  
  console.log(`Method: ${merged.method}`);
  console.log(`Engines succeeded: ${merged.engines_succeeded}/${results.length}`);
  console.log(`Final confidence: ${(merged.confidence * 100).toFixed(0)}%`);
  
  if (merged.primary_engine) {
    console.log(`Primary engine: ${merged.primary_engine}`);
  }
  
  console.log('');
  console.log('━'.repeat(60));
  console.log('📄 Extracted Text:');
  console.log('━'.repeat(60));
  console.log(merged.text || '(no text detected)');
  console.log('━'.repeat(60));
  
  return {
    ...merged,
    raw_results: results,
    processed_image: processedImage
  };
}

module.exports = {
  tesseractOCR,
  googleVisionOCR,
  azureOCR,
  mergeOCRResults,
  ensembleOCR
};

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Multi-Model OCR Ensemble');
    console.log('');
    console.log('Usage:');
    console.log('  ./multi-ocr.js <image.jpg> [--no-preprocess] [--engines tesseract,google]');
    console.log('');
    console.log('Options:');
    console.log('  --no-preprocess    Skip image enhancement');
    console.log('  --engines <list>   Comma-separated engine list');
    console.log('                     Available: tesseract, google_vision, azure_cv');
    console.log('');
    console.log('Environment:');
    console.log('  GOOGLE_APPLICATION_CREDENTIALS  Path to Google Cloud credentials JSON');
    console.log('  AZURE_CV_ENDPOINT               Azure Computer Vision endpoint');
    console.log('  AZURE_CV_KEY                    Azure Computer Vision API key');
    console.log('');
    console.log('Example:');
    console.log('  ./multi-ocr.js receipt.jpg');
    console.log('  ./multi-ocr.js receipt.jpg --engines tesseract,google_vision');
    process.exit(1);
  }
  
  const imagePath = args[0];
  const options = {
    preprocess: !args.includes('--no-preprocess'),
    engines: ['tesseract', 'google_vision', 'azure_cv']
  };
  
  const enginesIndex = args.indexOf('--engines');
  if (enginesIndex !== -1 && args[enginesIndex + 1]) {
    options.engines = args[enginesIndex + 1].split(',');
  }
  
  if (!fs.existsSync(imagePath)) {
    console.error(`❌ File not found: ${imagePath}`);
    process.exit(1);
  }
  
  ensembleOCR(imagePath, options)
    .then(result => {
      process.exit(result.engines_succeeded > 0 ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Error:', error.message);
      process.exit(1);
    });
}
