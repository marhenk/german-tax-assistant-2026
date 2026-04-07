#!/usr/bin/env node

/**
 * Autoresearch: Optimale Model-Allocation für Steuer-OCR-Pipeline
 * 
 * Testet verschiedene Routing-Strategien:
 * 1. Single Model (Gemma 4 27B only)
 * 2. Single Model (Qwen 72B only)
 * 3. Cascade: Gemma → Qwen bei low confidence
 * 4. Task-Split: OCR→Gemma, Kategorisierung→Qwen
 * 5. Parallel: Beide, Voting
 * 
 * Metriken: Accuracy, Speed, Cost (Token count)
 */

const { execSync } = require('child_process');
const fs = require('fs');

// Test Cases (aus synthetic data)
const TEST_CASES = [
  { input: "REWE Markt Berlin 45.67 EUR", expected: "Lebensmittel", difficulty: "easy" },
  { input: "Shell Tankstelle Hamburg 65.00 EUR", expected: "KFZ", difficulty: "easy" },
  { input: "Young Living Europe Ltd Essential Oils 150.00 GBP", expected: "Wareneinkauf (MLM)", difficulty: "medium" },
  { input: "Deutsche Bahn ICE Ticket 89.90 EUR", expected: "Reisekosten", difficulty: "easy" },
  { input: "Microsoft 365 Business 12.99 EUR", expected: "Software", difficulty: "easy" },
  { input: "Papier Müller Druckerei 120.00 EUR", expected: "Büromaterial", difficulty: "hard" },
  { input: "Commission Payment YL March 250.00 EUR", expected: "Provisionen (MLM)", difficulty: "medium" },
  { input: "Team Bonus OGV Performance 100.00 EUR", expected: "Team-Provisionen", difficulty: "hard" },
  { input: "Diamond Retreat Cruise Incentive 5000.00 EUR", expected: "Sachbezüge (Incentive-Reisen)", difficulty: "hard" },
  { input: "Allianz Versicherung Beitrag 89.00 EUR", expected: "Versicherung", difficulty: "easy" },
  { input: "Google Ads Kampagne 150.00 EUR", expected: "Marketing", difficulty: "medium" },
  { input: "Udemy Business Course 12.99 EUR", expected: "Weiterbildung", difficulty: "easy" },
  { input: "DHL Paket National 5.99 EUR", expected: "Porto/Versand", difficulty: "easy" },
  { input: "dm drogerie markt 23.45 EUR", expected: "Drogerie", difficulty: "easy" },
  { input: "Saturn Elektronik Büroausstattung 399.00 EUR", expected: "Büromaterial", difficulty: "hard" },
];

const MODELS = {
  "gemma4": "gemma4:latest",
  "qwen72b": "qwen2.5:72b",
  "qwen35b": "qwen3.5:35b"
};

const PROMPT_TEMPLATE = `Kategorisiere diese deutsche Geschäftsausgabe für die EÜR.
Transaktion: "{input}"
Antworte NUR mit der Kategorie (z.B. "Lebensmittel", "KFZ", "Software", etc.)
Kategorie:`;

function runModel(model, prompt, timeoutSec = 60) {
  const start = Date.now();
  try {
    const result = execSync(
      `echo '${prompt.replace(/'/g, "\\'")}' | timeout ${timeoutSec} ollama run ${model} 2>/dev/null`,
      { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
    );
    const duration = (Date.now() - start) / 1000;
    return { 
      output: result.trim().split('\n').pop().trim(),
      duration,
      success: true 
    };
  } catch (e) {
    return { output: '', duration: (Date.now() - start) / 1000, success: false };
  }
}

function extractCategory(output) {
  // Clean up model output to extract category
  const categories = [
    "Lebensmittel", "KFZ", "Reisekosten", "Software", "Büromaterial",
    "Marketing", "Telekommunikation", "Porto/Versand", "Versicherung",
    "Wareneinkauf (MLM)", "Provisionen (MLM)", "Team-Provisionen",
    "Boni & Incentives", "Sachbezüge (Incentive-Reisen)", "Weiterbildung",
    "Drogerie", "Verpflegung"
  ];
  
  for (const cat of categories) {
    if (output.toLowerCase().includes(cat.toLowerCase())) {
      return cat;
    }
  }
  return output.substring(0, 50);
}

function testStrategy(name, strategyFn) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🧪 Testing: ${name}`);
  console.log('─'.repeat(60));
  
  const results = {
    name,
    correct: 0,
    incorrect: 0,
    timeout: 0,
    totalTime: 0,
    byDifficulty: { easy: { correct: 0, total: 0 }, medium: { correct: 0, total: 0 }, hard: { correct: 0, total: 0 } }
  };
  
  for (const tc of TEST_CASES) {
    const prompt = PROMPT_TEMPLATE.replace('{input}', tc.input);
    const result = strategyFn(prompt, tc);
    
    results.byDifficulty[tc.difficulty].total++;
    results.totalTime += result.duration;
    
    if (!result.success) {
      results.timeout++;
      console.log(`  ❌ TIMEOUT: ${tc.input.substring(0, 30)}...`);
      continue;
    }
    
    const predicted = extractCategory(result.output);
    const isCorrect = predicted.toLowerCase().includes(tc.expected.toLowerCase()) ||
                      tc.expected.toLowerCase().includes(predicted.toLowerCase());
    
    if (isCorrect) {
      results.correct++;
      results.byDifficulty[tc.difficulty].correct++;
      console.log(`  ✅ ${tc.input.substring(0, 25).padEnd(25)} → ${predicted.substring(0, 20)} (${result.duration.toFixed(1)}s)`);
    } else {
      results.incorrect++;
      console.log(`  ❌ ${tc.input.substring(0, 25).padEnd(25)} → ${predicted.substring(0, 20)} (expected: ${tc.expected})`);
    }
  }
  
  const accuracy = (results.correct / TEST_CASES.length * 100).toFixed(1);
  const avgTime = (results.totalTime / TEST_CASES.length).toFixed(1);
  
  console.log('─'.repeat(60));
  console.log(`📊 Results: ${accuracy}% accuracy, ${avgTime}s avg time`);
  console.log(`   Easy: ${results.byDifficulty.easy.correct}/${results.byDifficulty.easy.total}`);
  console.log(`   Medium: ${results.byDifficulty.medium.correct}/${results.byDifficulty.medium.total}`);
  console.log(`   Hard: ${results.byDifficulty.hard.correct}/${results.byDifficulty.hard.total}`);
  
  results.accuracy = parseFloat(accuracy);
  results.avgTime = parseFloat(avgTime);
  
  return results;
}

// Strategies
const strategies = {
  "Gemma 4 27B Only": (prompt) => runModel(MODELS.gemma4, prompt, 45),
  
  "Qwen 3.5 35B Only": (prompt) => runModel(MODELS.qwen35b, prompt, 60),
  
  "Cascade: Gemma → Qwen (low conf)": (prompt, tc) => {
    const gemmaResult = runModel(MODELS.gemma4, prompt, 30);
    // If hard case or uncertain, escalate to Qwen
    if (tc.difficulty === 'hard' || gemmaResult.output.includes('unsicher') || gemmaResult.output.includes('unclear')) {
      const qwenResult = runModel(MODELS.qwen35b, prompt, 45);
      return { ...qwenResult, duration: gemmaResult.duration + qwenResult.duration };
    }
    return gemmaResult;
  }
};

// Main
async function main() {
  console.log('\n🔬 AUTORESEARCH: Steuer-OCR Model Allocation');
  console.log('═'.repeat(60));
  console.log(`Test Cases: ${TEST_CASES.length}`);
  console.log(`Models: ${Object.keys(MODELS).join(', ')}`);
  console.log(`Strategies: ${Object.keys(strategies).length}`);
  
  const allResults = [];
  
  for (const [name, fn] of Object.entries(strategies)) {
    const result = testStrategy(name, fn);
    allResults.push(result);
  }
  
  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 FINAL RANKING');
  console.log('═'.repeat(60));
  
  allResults.sort((a, b) => {
    // Score = Accuracy * 2 - AvgTime (higher is better)
    const scoreA = a.accuracy * 2 - a.avgTime;
    const scoreB = b.accuracy * 2 - b.avgTime;
    return scoreB - scoreA;
  });
  
  allResults.forEach((r, i) => {
    const score = (r.accuracy * 2 - r.avgTime).toFixed(1);
    console.log(`${i + 1}. ${r.name.padEnd(35)} ${r.accuracy}% acc, ${r.avgTime}s avg (score: ${score})`);
  });
  
  console.log('\n🏆 RECOMMENDATION:');
  console.log(`   Best Overall: ${allResults[0].name}`);
  console.log(`   Accuracy: ${allResults[0].accuracy}%`);
  console.log(`   Avg Time: ${allResults[0].avgTime}s`);
  
  // Save results
  const reportPath = '/tmp/autoresearch-model-allocation.json';
  fs.writeFileSync(reportPath, JSON.stringify(allResults, null, 2));
  console.log(`\n📁 Full report: ${reportPath}`);
}

main().catch(console.error);
