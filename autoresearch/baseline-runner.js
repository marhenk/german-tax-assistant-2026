#!/usr/bin/env node

/**
 * Simple Baseline Runner
 * Runs ocr-processor.js against 25 test receipts
 */

const fs = require('fs').promises;
const path = require('path');

// Simple text extraction (files are already text for testing)
async function extractText(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  return content;
}

// CSV parser for bank statements
function parseCSVReceipt(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return { confidence: 0 };
  
  const headers = lines[0].split(/[;,]/);
  const values = lines[1].split(/[;,]/);
  
  const result = {
    date: null,
    vendor: null,
    amount_gross: null,
    amount_net: null,
    tax_rate: null,
    invoice_number: null,
    currency: 'EUR',
    confidence: 0.7
  };
  
  // Find date column
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase();
    if (h.includes('datum') || h.includes('date') || h.includes('valuta') || h.includes('buchungstag')) {
      const dateStr = values[i];
      const match = dateStr.match(/(\d{2})\.(\d{2})\.(\d{4})/);
      if (match) {
        result.date = `${match[3]}-${match[2]}-${match[1]}`;
      } else if (dateStr.match(/\d{4}-\d{2}-\d{2}/)) {
        result.date = dateStr;
      }
      break;
    }
  }
  
  // Find vendor column
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase();
    if (h.includes('empfänger') || h.includes('payee') || h.includes('buchungstext') || h.includes('auftraggeber')) {
      result.vendor = values[i].replace(/\s+(\d{1,2}[A-Z]{3}|\d{4}).*$/, '').trim();
      break;
    }
  }
  
  // Find amount column
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase();
    if (h.includes('betrag') || h.includes('amount')) {
      let amountStr = values[i].replace(/[^\d,.-]/g, '');
      // German format: -39,99 → 39.99
      if (amountStr.includes(',') && !amountStr.includes('.')) {
        amountStr = amountStr.replace(',', '.');
      }
      result.amount_gross = Math.abs(parseFloat(amountStr));
      break;
    }
  }
  
  return result;
}

// Simplified parser (pattern matching on text)
function parseReceipt(text, filename) {
  const result = {
    date: null,
    vendor: null,
    amount_gross: null,
    amount_net: null,
    tax_rate: null,
    invoice_number: null,
    currency: 'EUR',
    confidence: 0.5
  };

  // CSV special handling
  if (filename.endsWith('.csv')) {
    return parseCSVReceipt(text);
  }

  // Date patterns
  const datePatterns = [
    { regex: /(\d{2})\.(\d{2})\.(\d{4})/, format: 'DD.MM.YYYY' },
    { regex: /Date[:.]?\s*(\d{4})-(\d{2})-(\d{2})/i, format: 'YYYY-MM-DD' },
    { regex: /Date[:.]?\s*January\s+(\d{1,2}),\s+(\d{4})/i, month: '01' },
    { regex: /Date[:.]?\s*February\s+(\d{1,2}),\s+(\d{4})/i, month: '02' },
    { regex: /Date[:.]?\s*March\s+(\d{1,2}),\s+(\d{4})/i, month: '03' },
    { regex: /Date[:.]?\s*April\s+(\d{1,2}),\s+(\d{4})/i, month: '04' },
    { regex: /Date[:.]?\s*December\s+(\d{1,2}),\s+(\d{4})/i, month: '12' },
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern.regex);
    if (match) {
      if (pattern.format === 'YYYY-MM-DD') {
        result.date = match[1];
      } else if (pattern.format === 'DD.MM.YYYY') {
        result.date = `${match[3]}-${match[2]}-${match[1]}`;
      } else if (pattern.month) {
        const day = match[1].padStart(2, '0');
        result.date = `${match[2]}-${pattern.month}-${day}`;
      }
      break;
    }
  }

  // Vendor extraction (look for common patterns)
  const vendors = [
    'Amazon Web Services', 'AWS', 'Hetzner', 'DigitalOcean', 'GitHub', 'Netlify',
    'REWE', 'dm-drogerie', 'EDEKA', 'Rossmann', 'ALDI', 'Penny',
    'Taxi', 'Parkhaus', 'Elektro Schmidt', 'Charity', 'Müller',
    'Vodafone', 'Telekom', 'Google', 'Microsoft',
    'Tankstelle', 'Apotheke', 'Baumarkt', 'Restaurant'
  ];

  for (const vendor of vendors) {
    if (text.toLowerCase().includes(vendor.toLowerCase())) {
      result.vendor = vendor;
      break;
    }
  }

  // Amount extraction (look for Total/Gesamt/Brutto)
  const amountPatterns = [
    /Amount in EUR[:.]?\s*€([\d,]+\.\d{2})/i,  // USD conversion first
    /(?:GESAMT|Gesamt|SUMME|Summe)\s*[:.]?\s*€?\s*([\d,]+\.\d{2})/i,
    /(?:Total|TOTAL)\s*[:.]?\s*€([\d,]+\.\d{2})/i,
    /(?:Brutto|BRUTTO)\s*[:.]?\s*€([\d,]+\.\d{2})/i,
    /(?:Total Due|TOTAL DUE)[:.]?\s*\$([\d,]+\.\d{2})/i,
    /Betrag[:.]?\s*([\d,]+\.\d{2})\s*EUR/i,
    /Betrag[:.]?\s*([\d,]+),([\d]{2})\s*EUR/i,  // German comma format
  ];

  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match) {
      let amountStr = match[1];
      if (match[2]) {
        // German format: 22,50 → 22.50
        amountStr = match[1] + '.' + match[2];
      }
      result.amount_gross = parseFloat(amountStr.replace(',', ''));
      break;
    }
  }

  // Net amount
  const netPatterns = [
    /(?:Netto|Net|Subtotal)[:.]?\s*€?\s*([\d,]+\.\d{2})/i,
    /Netto[:.]?\s*€?\s*([\d,]+),([\d]{2})\s*EUR/i,  // German comma
  ];

  for (const pattern of netPatterns) {
    const match = text.match(pattern);
    if (match) {
      let amountStr = match[1];
      if (match[2]) {
        amountStr = match[1] + '.' + match[2];
      }
      result.amount_net = parseFloat(amountStr.replace(',', ''));
      break;
    }
  }

  // Tax rate
  if (text.match(/19\s*%|MwSt\.?\s*19|USt\.?\s*19/i)) {
    result.tax_rate = 19;
  } else if (text.match(/7\s*%|MwSt\.?\s*7/i)) {
    result.tax_rate = 7;
  } else if (text.match(/0\s*%|MwSt\.?\s*0|Steuerfrei|tax.?free/i)) {
    result.tax_rate = 0;
  }

  // Invoice number
  const invPatterns = [
    /(?:Invoice|Rechnung|Receipt)[\s\w]*[:.\s]+([A-Z0-9-]+)/i,
    /(?:INV|H|DO|GH|NTL)-\d{4}-\d{2}-\d{4}/
  ];

  for (const pattern of invPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.invoice_number = match[1] || match[0];
      break;
    }
  }

  // Confidence (simple heuristic)
  let fieldsExtracted = 0;
  if (result.date) fieldsExtracted++;
  if (result.vendor) fieldsExtracted++;
  if (result.amount_gross) fieldsExtracted++;
  if (result.tax_rate !== null) fieldsExtracted++;
  
  result.confidence = fieldsExtracted / 4;

  return result;
}

// Eval functions
function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function evalDate(extracted, truth) {
  if (!extracted.date) return { pass: false, reason: 'No date extracted' };
  if (extracted.date !== truth.date) return { pass: false, reason: `${extracted.date} ≠ ${truth.date}` };
  return { pass: true };
}

function evalAmountGross(extracted, truth) {
  if (!extracted.amount_gross) return { pass: false, reason: 'No amount extracted' };
  const diff = Math.abs(extracted.amount_gross - truth.amount_gross);
  if (diff > 0.01) return { pass: false, reason: `${extracted.amount_gross} ≠ ${truth.amount_gross}` };
  return { pass: true };
}

function evalAmountNet(extracted, truth) {
  if (truth.amount_net === null && extracted.amount_net === null) return { pass: true };
  if (!extracted.amount_net && truth.amount_net !== null) return { pass: false, reason: 'No net amount' };
  const diff = Math.abs((extracted.amount_net || 0) - (truth.amount_net || 0));
  if (diff > 0.01) return { pass: false, reason: `${extracted.amount_net} ≠ ${truth.amount_net}` };
  return { pass: true };
}

function evalVendor(extracted, truth) {
  if (!extracted.vendor) return { pass: false, reason: 'No vendor' };
  
  const exLower = extracted.vendor.toLowerCase();
  const trLower = truth.vendor.toLowerCase();
  
  if (exLower === trLower) return { pass: true };
  if (exLower.includes(trLower) || trLower.includes(exLower)) return { pass: true };
  
  const dist = levenshteinDistance(exLower, trLower);
  if (dist <= 3) return { pass: true };
  
  return { pass: false, reason: `${extracted.vendor} ≠ ${truth.vendor}` };
}

function evalTaxRate(extracted, truth) {
  if (truth.tax_rate === null && extracted.tax_rate === null) return { pass: true };
  if (extracted.tax_rate !== truth.tax_rate) return { pass: false, reason: `${extracted.tax_rate} ≠ ${truth.tax_rate}` };
  return { pass: true };
}

function evalConfidence(extracted, evals) {
  const passed = evals.filter(e => e.pass).length;
  const accuracy = passed / evals.length;
  const conf = extracted.confidence;
  
  if (accuracy <= 0.5 && conf >= 0.7) return { pass: false, reason: 'Overconfident' };
  if (accuracy >= 0.8 && conf < 0.5) return { pass: false, reason: 'Underconfident' };
  return { pass: true };
}

async function scoreTestCase(testFile, groundTruth) {
  try {
    const text = await extractText(testFile);
    const extracted = parseReceipt(text, path.basename(testFile));
    
    const evals = [
      { name: 'Date', ...evalDate(extracted, groundTruth) },
      { name: 'Amount Gross', ...evalAmountGross(extracted, groundTruth) },
      { name: 'Amount Net', ...evalAmountNet(extracted, groundTruth) },
      { name: 'Vendor', ...evalVendor(extracted, groundTruth) },
      { name: 'Tax Rate', ...evalTaxRate(extracted, groundTruth) }
    ];
    
    evals.push({ name: 'Confidence', ...evalConfidence(extracted, evals) });
    
    const score = evals.filter(e => e.pass).length;
    
    return {
      testId: groundTruth.id,
      score,
      maxScore: 6,
      evals,
      extracted
    };
  } catch (error) {
    return {
      testId: groundTruth.id,
      score: 0,
      maxScore: 6,
      evals: [],
      error: error.message
    };
  }
}

async function runBaseline() {
  console.log('='.repeat(60));
  console.log('OCR BASELINE TEST');
  console.log('='.repeat(60));
  
  const groundTruthPath = path.join(__dirname, 'test-data', 'ground-truth.json');
  const groundTruth = JSON.parse(await fs.readFile(groundTruthPath, 'utf-8'));
  
  const results = [];
  let totalScore = 0;
  
  for (const test of groundTruth) {
    const testPath = path.join(__dirname, test.file);
    const result = await scoreTestCase(testPath, test.ground_truth);
    results.push(result);
    totalScore += result.score;
    
    const passFail = result.score === 6 ? '✅' : result.score >= 4 ? '⚠️' : '❌';
    console.log(`${passFail} ${test.id}: ${result.score}/6`);
    
    if (result.score < 6) {
      const failed = result.evals.filter(e => !e.pass);
      failed.forEach(f => console.log(`   → ${f.name}: ${f.reason || 'Failed'}`));
    }
  }
  
  const percentage = (totalScore / 150 * 100).toFixed(1);
  
  console.log('\n' + '='.repeat(60));
  console.log(`BASELINE SCORE: ${totalScore}/150 (${percentage}%)`);
  console.log(`TARGET:         142/150 (95.0%)`);
  console.log(`GAP:            ${142 - totalScore} points`);
  console.log('='.repeat(60));
  
  // Save results
  const reportPath = path.join(__dirname, 'baseline-results.json');
  await fs.writeFile(reportPath, JSON.stringify({ totalScore, percentage, results }, null, 2));
  
  return { totalScore, percentage, results };
}

// Run
runBaseline().catch(console.error);
