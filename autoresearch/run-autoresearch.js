#!/usr/bin/env node

/**
 * OCR Autoresearch Runner
 * 
 * Based on fitness-screenshot-analysis autoresearch methodology:
 * 1. Baseline: Run current ocr-processor.js against test suite
 * 2. Mutate: Apply targeted improvements (from config.mutation_prompts)
 * 3. Evaluate: Score against 6 binary evals × 25 test cases = 150 points
 * 4. Keep: If improvement, save; else revert
 * 5. Repeat: Until 95% threshold (142/150) or budget exhausted
 */

const fs = require('fs').promises;
const path = require('path');
const OCRProcessor = require('../ocr-processor.js');
const config = require('./config.json');

// Eval functions (from evals.md)
const levenshtein = require('fast-levenshtein');

function eval1_dateExtraction(extracted, groundTruth) {
  if (!extracted.date) return 0;
  if (extracted.date !== groundTruth.date) return 0;
  return 1;
}

function eval2_amountGross(extracted, groundTruth) {
  if (!extracted.amount_gross) return 0;
  const diff = Math.abs(extracted.amount_gross - groundTruth.amount_gross);
  if (diff > 0.01) return 0;
  return 1;
}

function eval3_amountNet(extracted, groundTruth) {
  if (extracted.amount_net === null && groundTruth.amount_net === null) return 1;
  if (!extracted.amount_net) return 0;
  const diff = Math.abs(extracted.amount_net - groundTruth.amount_net);
  if (diff > 0.01) return 0;
  return 1;
}

function eval4_vendorIdentification(extracted, groundTruth) {
  if (!extracted.vendor) return 0;
  
  const extractedLower = extracted.vendor.toLowerCase();
  const truthLower = groundTruth.vendor.toLowerCase();
  
  if (extractedLower === truthLower) return 1;
  if (extractedLower.includes(truthLower) || truthLower.includes(extractedLower)) return 1;
  
  const distance = levenshtein.get(extractedLower, truthLower);
  if (distance <= 3) return 1;
  
  return 0;
}

function eval5_taxRateDetection(extracted, groundTruth) {
  if (extracted.tax_rate === null && groundTruth.tax_rate === null) return 1;
  if (!extracted.tax_rate && extracted.tax_rate !== 0) return 0;
  if (extracted.tax_rate !== groundTruth.tax_rate) return 0;
  return 1;
}

function eval6_confidenceCalibration(extracted, groundTruth, evalResults) {
  const correctFields = evalResults.filter(e => e.pass).length;
  const totalFields = evalResults.length - 1;
  const accuracy = correctFields / totalFields;
  const confidence = extracted.confidence;
  
  if (accuracy <= 0.5 && confidence >= 0.7) return 0;
  if (accuracy >= 0.8 && confidence < 0.7) return 0;
  return 1;
}

async function scoreTestCase(filePath, groundTruth, processor) {
  try {
    const extracted = await processor.extractText(filePath);
    const parsed = processor.parseReceiptData(extracted.text, path.basename(filePath));
    
    const evals = [
      { name: 'Date', pass: eval1_dateExtraction(parsed, groundTruth) },
      { name: 'Amount Gross', pass: eval2_amountGross(parsed, groundTruth) },
      { name: 'Amount Net', pass: eval3_amountNet(parsed, groundTruth) },
      { name: 'Vendor', pass: eval4_vendorIdentification(parsed, groundTruth) },
      { name: 'Tax Rate', pass: eval5_taxRateDetection(parsed, groundTruth) }
    ];
    
    evals.push({
      name: 'Confidence',
      pass: eval6_confidenceCalibration(parsed, groundTruth, evals)
    });
    
    const score = evals.filter(e => e.pass).length;
    return { score, maxScore: 6, evals, extracted: parsed };
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return { score: 0, maxScore: 6, evals: [], error: error.message };
  }
}

async function runBaseline() {
  console.log('='.repeat(50));
  console.log('RUNNING BASELINE (Current ocr-processor.js)');
  console.log('='.repeat(50));
  
  const processor = new OCRProcessor('tesseract');
  const results = [];
  
  // Load test cases (would need actual test data)
  // For now, placeholder structure
  const scenarios = [
    { name: 'AWS Invoices', count: 5, groundTruth: {} },
    { name: 'REWE Receipts', count: 5, groundTruth: {} },
    { name: 'Handwritten Quittungen', count: 5, groundTruth: {} },
    { name: 'Bank Statements', count: 5, groundTruth: {} },
    { name: 'Faded Receipts', count: 5, groundTruth: {} }
  ];
  
  for (const scenario of scenarios) {
    console.log(`\nScenario: ${scenario.name}`);
    let scenarioScore = 0;
    
    for (let i = 1; i <= scenario.count; i++) {
      // Placeholder: would iterate over actual test files
      // const result = await scoreTestCase(testFile, groundTruth, processor);
      // scenarioScore += result.score;
      // results.push(result);
    }
    
    console.log(`  Score: ${scenarioScore}/${scenario.count * 6}`);
  }
  
  const totalScore = results.reduce((sum, r) => sum + r.score, 0);
  const maxScore = 150;
  const percentage = (totalScore / maxScore * 100).toFixed(1);
  
  console.log('\n' + '='.repeat(50));
  console.log(`BASELINE SCORE: ${totalScore}/${maxScore} (${percentage}%)`);
  console.log('='.repeat(50));
  
  return { totalScore, results, percentage };
}

async function applyMutation(mutationPrompt) {
  console.log(`\nApplying mutation: ${mutationPrompt}`);
  
  // This would use Claude Code or similar to:
  // 1. Read ocr-processor.js
  // 2. Apply the mutation prompt
  // 3. Save to ocr-processor-experiment.js
  // 4. Run evals
  // 5. Compare to baseline
  
  // For now, placeholder
  return {
    success: true,
    scoreImprovement: 2,  // Placeholder
    newScore: 112
  };
}

async function runAutoresearch() {
  console.log('OCR AUTORESEARCH STARTING');
  console.log(`Target: ${config.target.score}`);
  console.log(`Budget: ${config.budget_cap} experiments\n`);
  
  // Step 1: Baseline
  const baseline = await runBaseline();
  
  let currentScore = baseline.totalScore;
  let bestScore = currentScore;
  let experiments = [];
  
  // Step 2: Iterate through mutations
  for (let i = 0; i < config.budget_cap && currentScore < 142; i++) {
    const mutation = config.mutation_prompts[i % config.mutation_prompts.length];
    const result = await applyMutation(mutation);
    
    experiments.push({
      iteration: i + 1,
      mutation,
      scoreBefore: currentScore,
      scoreAfter: result.newScore,
      improvement: result.newScore - currentScore,
      kept: result.newScore > currentScore
    });
    
    if (result.newScore > currentScore) {
      console.log(`✅ Improvement: ${currentScore} → ${result.newScore}`);
      currentScore = result.newScore;
      bestScore = Math.max(bestScore, currentScore);
    } else {
      console.log(`❌ No improvement: ${result.newScore} ≤ ${currentScore}`);
    }
    
    // Save checkpoint
    await saveCheckpoint(experiments, currentScore);
  }
  
  // Step 3: Generate report
  await generateFinalReport(baseline, experiments, currentScore);
  
  console.log('\n' + '='.repeat(50));
  console.log('AUTORESEARCH COMPLETE');
  console.log(`Final Score: ${currentScore}/150 (${(currentScore/150*100).toFixed(1)}%)`);
  console.log(`Target: 142/150 (95%)`);
  console.log(currentScore >= 142 ? '✅ TARGET ACHIEVED' : '⚠️ BELOW TARGET');
  console.log('='.repeat(50));
}

async function saveCheckpoint(experiments, currentScore) {
  const checkpoint = {
    timestamp: new Date().toISOString(),
    experiments,
    currentScore,
    lastMutation: experiments[experiments.length - 1]
  };
  
  await fs.writeFile(
    path.join(__dirname, 'checkpoint.json'),
    JSON.stringify(checkpoint, null, 2)
  );
}

async function generateFinalReport(baseline, experiments, finalScore) {
  const report = `
# OCR Autoresearch Final Report

## Summary
- **Baseline Score:** ${baseline.totalScore}/150 (${baseline.percentage}%)
- **Final Score:** ${finalScore}/150 (${(finalScore/150*100).toFixed(1)}%)
- **Improvement:** +${finalScore - baseline.totalScore} points
- **Target:** 142/150 (95%)
- **Status:** ${finalScore >= 142 ? '✅ ACHIEVED' : '⚠️ NOT ACHIEVED'}

## Experiments Run: ${experiments.length}

${experiments.map(exp => `
### Experiment ${exp.iteration}
- **Mutation:** ${exp.mutation}
- **Score:** ${exp.scoreBefore} → ${exp.scoreAfter} (${exp.improvement > 0 ? '+' : ''}${exp.improvement})
- **Kept:** ${exp.kept ? '✅' : '❌'}
`).join('\n')}

## Top Improvements
${experiments
  .filter(e => e.kept)
  .sort((a, b) => b.improvement - a.improvement)
  .slice(0, 5)
  .map((e, i) => `${i + 1}. ${e.mutation} (+${e.improvement} points)`)
  .join('\n')}

## Next Steps
${finalScore >= 142 
  ? '- Deploy optimized ocr-processor.js\n- Integrate with lexoffice-steuer workflow'
  : '- Continue autoresearch with new mutation prompts\n- Consider alternative OCR engines (Google Vision, Textract)\n- Add more training data'
}

---
**Generated:** ${new Date().toISOString()}
  `.trim();
  
  await fs.writeFile(
    path.join(__dirname, config.output.final_report),
    report
  );
}

// Run if called directly
if (require.main === module) {
  runAutoresearch().catch(console.error);
}

module.exports = { runAutoresearch, runBaseline, scoreTestCase };
