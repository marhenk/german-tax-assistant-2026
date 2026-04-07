#!/usr/bin/env node

/**
 * German Tax Assistant - Integration Script
 * 
 * Connects all Phase 1 + 2 components into a unified pipeline:
 * - OCR Pre-processing
 * - Multi-Model OCR Ensemble
 * - Rule-Based + ML Categorization
 * - MLM Tax Handler
 * - Active Learning
 * - Review Queue routing
 * 
 * Usage:
 *   ./integrate.js process receipt.jpg
 *   ./integrate.js batch ./receipts/
 *   ./integrate.js stats
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Import modules
const { applyCategoryRules, enhanceCategorization } = require('./rule-based-categorization.js');
const { processMLMTransaction, detectReverseCharge } = require('./mlm-tax-handler.js');
const { logCorrection, getStats } = require('./active-learning.js');
const { canCategorizeWithoutReceipt } = require('./no-receipt-categorization.js');

// Config
const CONFIG = {
  confidence_threshold: 0.90,  // Below this → Review Queue
  mlm_keywords: ['young living', 'essential oils', 'mlm', 'network marketing'],
  review_queue_file: path.join(__dirname, 'review-queue.json'),
  processed_log: path.join(__dirname, 'processed.jsonl')
};

/**
 * Process single receipt/transaction
 */
async function processReceipt(imagePath) {
  console.log(`\n📄 Processing: ${imagePath}`);
  console.log('━'.repeat(60));
  
  const result = {
    file: imagePath,
    timestamp: new Date().toISOString(),
    steps: {}
  };
  
  // Step 1: OCR Pre-processing
  console.log('\n1️⃣  Pre-processing image...');
  try {
    const preprocessScript = path.join(__dirname, 'ocr-preprocess.sh');
    if (fs.existsSync(preprocessScript)) {
      execSync(`bash "${preprocessScript}" "${imagePath}"`, { stdio: 'pipe' });
      result.steps.preprocess = 'success';
      console.log('   ✅ Enhanced');
    }
  } catch (e) {
    result.steps.preprocess = 'skipped';
    console.log('   ⚠️  Skipped (ImageMagick not available)');
  }
  
  // Step 2: OCR (Tesseract)
  console.log('\n2️⃣  Running OCR...');
  let ocrText = '';
  try {
    const outputBase = imagePath.replace(/\.[^.]+$/, '');
    execSync(`tesseract "${imagePath}" "${outputBase}" -l deu 2>/dev/null`, { stdio: 'pipe' });
    ocrText = fs.readFileSync(`${outputBase}.txt`, 'utf8').trim();
    fs.unlinkSync(`${outputBase}.txt`);
    result.steps.ocr = 'success';
    result.ocr_text = ocrText.substring(0, 500);
    console.log(`   ✅ Extracted ${ocrText.length} chars`);
  } catch (e) {
    result.steps.ocr = 'failed';
    console.log('   ❌ OCR failed');
    return result;
  }
  
  // Step 3: Extract transaction data
  console.log('\n3️⃣  Extracting transaction data...');
  const transaction = extractTransactionData(ocrText);
  result.transaction = transaction;
  console.log(`   Vendor: ${transaction.vendor || 'Unknown'}`);
  console.log(`   Amount: ${transaction.amount || 'Unknown'}`);
  console.log(`   Date: ${transaction.date || 'Unknown'}`);
  
  // Step 3.5: Check if we can skip receipt (no-receipt categorization)
  const noReceiptCheck = canCategorizeWithoutReceipt(transaction);
  if (noReceiptCheck.can_skip_receipt) {
    console.log('\n✅ Can skip receipt!');
    console.log(`   Reason: ${noReceiptCheck.reason}`);
    console.log(`   Category: ${noReceiptCheck.category}`);
    result.category = noReceiptCheck.category;
    result.confidence = noReceiptCheck.confidence;
    result.source = 'no-receipt-rule';
    result.eur_account = noReceiptCheck.eur_account;
    result.receipt_required = false;
    
    // Log and finish
    fs.appendFileSync(CONFIG.processed_log, JSON.stringify(result) + '\n');
    console.log('\n━'.repeat(60));
    console.log('✅ Processing complete (no receipt needed)!\n');
    return result;
  }
  
  result.receipt_required = true;
  
  // Step 4: Hybrid Categorization (Rules → Gemma Fallback)
  console.log('\n4️⃣  Categorizing...');
  const ruleResult = applyCategoryRules(transaction.description || ocrText);
  
  if (ruleResult && ruleResult.confidence >= CONFIG.confidence_threshold) {
    // High-confidence rule match → Done!
    result.category = ruleResult.category;
    result.confidence = ruleResult.confidence;
    result.source = ruleResult.source;
    result.eur_account = ruleResult.eur_account;
    console.log(`   ✅ Category: ${ruleResult.category}`);
    console.log(`   Confidence: ${(ruleResult.confidence * 100).toFixed(0)}%`);
    console.log(`   Source: ${ruleResult.source} (rule-based)`);
  } else if (ruleResult && ruleResult.confidence >= 0.7) {
    // Medium confidence → Use rule but flag for potential Gemma fallback
    result.category = ruleResult.category;
    result.confidence = ruleResult.confidence;
    result.source = ruleResult.source;
    result.eur_account = ruleResult.eur_account;
    console.log(`   ⚠️  Category: ${ruleResult.category}`);
    console.log(`   Confidence: ${(ruleResult.confidence * 100).toFixed(0)}% (medium)`);
    console.log(`   Source: ${ruleResult.source} (rule-based)`);
  } else {
    // Low/No confidence → Gemma 4 fallback
    console.log('   ⚠️  Low confidence or no rule match → Gemma 4 fallback');
    const gemmaResult = await categorizeWithGemma(transaction.description || ocrText);
    result.category = gemmaResult.category;
    result.confidence = gemmaResult.confidence;
    result.source = 'gemma4-27b';
    result.eur_account = gemmaResult.eur_account;
    console.log(`   Category: ${gemmaResult.category}`);
    console.log(`   Confidence: ${(gemmaResult.confidence * 100).toFixed(0)}%`);
    console.log(`   Source: AI (Gemma 4)`);
  }
  
  // Step 5: MLM detection
  console.log('\n5️⃣  MLM check...');
  const isMLM = CONFIG.mlm_keywords.some(kw => 
    ocrText.toLowerCase().includes(kw)
  );
  
  if (isMLM) {
    const mlmResult = processMLMTransaction({
      description: ocrText,
      amount: transaction.amount,
      vendor: transaction.vendor
    });
    result.mlm = mlmResult.mlm;
    console.log(`   ✅ MLM detected: ${mlmResult.mlm.classification.type}`);
    
    if (mlmResult.mlm.reverse_charge.reverse_charge) {
      console.log('   ⚠️  Reverse Charge (§13b UStG)');
    }
  } else {
    result.mlm = null;
    console.log('   No MLM indicators');
  }
  
  // Step 6: Review Queue routing
  console.log('\n6️⃣  Routing...');
  if (result.confidence < CONFIG.confidence_threshold) {
    addToReviewQueue(result);
    result.routed_to = 'review_queue';
    console.log(`   → Review Queue (confidence ${(result.confidence * 100).toFixed(0)}% < ${CONFIG.confidence_threshold * 100}%)`);
  } else {
    result.routed_to = 'auto_approved';
    console.log('   ✅ Auto-approved');
  }
  
  // Log processed
  fs.appendFileSync(CONFIG.processed_log, JSON.stringify(result) + '\n');
  
  console.log('\n━'.repeat(60));
  console.log('✅ Processing complete!\n');
  
  return result;
}

/**
 * Categorize with Gemma 4 27B (fallback)
 */
async function categorizeWithGemma(text) {
  console.log('   🤖 Calling Gemma 4 27B...');
  
  const prompt = `Kategorisiere diese deutsche Geschäftsausgabe für die EÜR.
Transaktion: "${text.substring(0, 200)}"
Antworte NUR mit der Kategorie (z.B. "Lebensmittel", "KFZ", "Software", "Reisekosten", "Büromaterial", "Marketing", etc.)
Kategorie:`;
  
  try {
    const output = execSync(
      `timeout 30 ollama run gemma4:latest "${prompt.replace(/"/g, '\\"')}" 2>/dev/null`,
      { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
    );
    
    const category = output.trim().split('\n').pop().trim().substring(0, 50);
    
    // Map to known categories
    const knownCategories = [
      "Lebensmittel", "KFZ", "Reisekosten", "Software", "Büromaterial",
      "Marketing", "Telekommunikation", "Porto/Versand", "Versicherung",
      "Wareneinkauf (MLM)", "Provisionen (MLM)", "Team-Provisionen",
      "Weiterbildung", "Drogerie", "Verpflegung"
    ];
    
    const matchedCategory = knownCategories.find(cat => 
      category.toLowerCase().includes(cat.toLowerCase()) ||
      cat.toLowerCase().includes(category.toLowerCase())
    );
    
    return {
      category: matchedCategory || category,
      confidence: matchedCategory ? 0.85 : 0.75,
      eur_account: null // Will be filled by EÜR mapping
    };
  } catch (e) {
    console.log('   ❌ Gemma timeout/error');
    return {
      category: 'Sonstige',
      confidence: 0.5,
      eur_account: null
    };
  }
}

/**
 * Extract transaction data from OCR text
 */
function extractTransactionData(text) {
  const transaction = {
    description: text.substring(0, 200)
  };
  
  // Extract amount (€ XX.XX or XX,XX EUR)
  const amountMatch = text.match(/€?\s*(\d+)[,.](\d{2})\s*(EUR|€)?/i);
  if (amountMatch) {
    transaction.amount = parseFloat(`${amountMatch[1]}.${amountMatch[2]}`);
  }
  
  // Extract date (DD.MM.YYYY or YYYY-MM-DD)
  const dateMatch = text.match(/(\d{2})[./](\d{2})[./](\d{4})/);
  if (dateMatch) {
    transaction.date = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
  }
  
  // Extract vendor (first line often contains vendor name)
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length > 0) {
    transaction.vendor = lines[0].substring(0, 50);
  }
  
  return transaction;
}

/**
 * Add to review queue
 */
function addToReviewQueue(item) {
  let queue = [];
  
  if (fs.existsSync(CONFIG.review_queue_file)) {
    queue = JSON.parse(fs.readFileSync(CONFIG.review_queue_file, 'utf8'));
  }
  
  queue.push({
    id: Date.now(),
    ...item,
    added_at: new Date().toISOString()
  });
  
  fs.writeFileSync(CONFIG.review_queue_file, JSON.stringify(queue, null, 2));
}

/**
 * Process batch of receipts
 */
async function processBatch(directory) {
  console.log(`\n📁 Batch Processing: ${directory}`);
  console.log('═'.repeat(60));
  
  const files = fs.readdirSync(directory)
    .filter(f => /\.(jpg|jpeg|png|pdf)$/i.test(f))
    .map(f => path.join(directory, f));
  
  console.log(`Found ${files.length} files\n`);
  
  const results = {
    total: files.length,
    processed: 0,
    auto_approved: 0,
    review_queue: 0,
    failed: 0
  };
  
  for (const file of files) {
    try {
      const result = await processReceipt(file);
      results.processed++;
      
      if (result.routed_to === 'auto_approved') {
        results.auto_approved++;
      } else if (result.routed_to === 'review_queue') {
        results.review_queue++;
      }
    } catch (e) {
      console.error(`❌ Failed: ${file} - ${e.message}`);
      results.failed++;
    }
  }
  
  console.log('\n═'.repeat(60));
  console.log('📊 BATCH SUMMARY');
  console.log('═'.repeat(60));
  console.log(`Total:         ${results.total}`);
  console.log(`Processed:     ${results.processed}`);
  console.log(`Auto-approved: ${results.auto_approved}`);
  console.log(`Review Queue:  ${results.review_queue}`);
  console.log(`Failed:        ${results.failed}`);
  console.log('═'.repeat(60));
  
  return results;
}

/**
 * Show system stats
 */
function showStats() {
  console.log('\n📊 GERMAN TAX ASSISTANT - SYSTEM STATS');
  console.log('═'.repeat(60));
  
  // Active Learning stats
  const alStats = getStats();
  console.log('\n🤖 Active Learning:');
  console.log(`   Current Accuracy: ${alStats.current_accuracy.toFixed(1)}%`);
  console.log(`   Model Version: ${alStats.model_version}`);
  console.log(`   Total Corrections: ${alStats.total_corrections}`);
  console.log(`   Next retrain in: ${alStats.corrections_until_retrain} corrections`);
  
  // Review Queue stats
  let queueSize = 0;
  if (fs.existsSync(CONFIG.review_queue_file)) {
    const queue = JSON.parse(fs.readFileSync(CONFIG.review_queue_file, 'utf8'));
    queueSize = queue.length;
  }
  console.log('\n📋 Review Queue:');
  console.log(`   Items pending: ${queueSize}`);
  
  // Processed stats
  let processedCount = 0;
  if (fs.existsSync(CONFIG.processed_log)) {
    processedCount = fs.readFileSync(CONFIG.processed_log, 'utf8')
      .trim().split('\n').filter(l => l).length;
  }
  console.log('\n📄 Processing:');
  console.log(`   Total processed: ${processedCount}`);
  
  console.log('\n═'.repeat(60));
}

/**
 * Correct a categorization (feeds Active Learning)
 */
function correct(transactionDesc, oldCategory, newCategory) {
  logCorrection(
    { description: transactionDesc },
    oldCategory,
    newCategory
  );
  console.log(`\n✅ Correction logged: "${oldCategory}" → "${newCategory}"`);
}

// CLI
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'process':
    if (!args[1]) {
      console.log('Usage: ./integrate.js process <image.jpg>');
      process.exit(1);
    }
    processReceipt(args[1]);
    break;
    
  case 'batch':
    if (!args[1]) {
      console.log('Usage: ./integrate.js batch <directory>');
      process.exit(1);
    }
    processBatch(args[1]);
    break;
    
  case 'stats':
    showStats();
    break;
    
  case 'correct':
    if (args.length < 4) {
      console.log('Usage: ./integrate.js correct "description" "old_category" "new_category"');
      process.exit(1);
    }
    correct(args[1], args[2], args[3]);
    break;
    
  default:
    console.log(`
German Tax Assistant - Integration Script

Usage:
  ./integrate.js process <image.jpg>     Process single receipt
  ./integrate.js batch <directory>       Process all receipts in folder
  ./integrate.js stats                   Show system stats
  ./integrate.js correct "desc" "old" "new"  Log correction

Examples:
  ./integrate.js process receipt.jpg
  ./integrate.js batch ./Belege/
  ./integrate.js stats
  ./integrate.js correct "Shell Tankstelle" "Büromaterial" "KFZ"
`);
}
