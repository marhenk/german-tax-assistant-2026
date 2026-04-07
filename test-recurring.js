#!/usr/bin/env node

/**
 * Test Recurring Transactions
 */

const { matchRecurringPattern, learnPattern } = require('./recurring-transactions.js');
const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'recurring-patterns.json');

// Clean start
if (fs.existsSync(CONFIG_FILE)) {
  fs.unlinkSync(CONFIG_FILE);
}

console.log('\n🧪 RECURRING TRANSACTIONS TEST');
console.log('═'.repeat(60));

// Learn patterns
console.log('\n📚 Learning patterns...\n');

learnPattern(
  { description: "Miete Büro Januar 500 EUR", amount: 500 },
  "Raumkosten",
  "4210",
  { frequency: 'monthly', auto_approve: true }
);

learnPattern(
  { description: "Allianz Versicherung 89.00 EUR", amount: 89 },
  "Versicherung",
  "4360",
  { frequency: 'monthly', auto_approve: true }
);

learnPattern(
  { description: "Telekom Rechnung 39.99 EUR", amount: 39.99 },
  "Telekommunikation",
  "4910",
  { frequency: 'monthly', auto_approve: true }
);

console.log('\n🧪 Testing matches...\n');

const TEST_CASES = [
  // Should match
  { 
    tx: { description: "Miete Büro Februar 500 EUR", amount: 500 },
    should_match: true,
    expected_category: "Raumkosten"
  },
  { 
    tx: { description: "Miete Büro März 505 EUR", amount: 505 }, // 5 EUR tolerance
    should_match: true,
    expected_category: "Raumkosten"
  },
  { 
    tx: { description: "Allianz Versicherung April", amount: 89 },
    should_match: true,
    expected_category: "Versicherung"
  },
  { 
    tx: { description: "Telekom Internet Mai 39.99", amount: 39.99 },
    should_match: true,
    expected_category: "Telekommunikation"
  },
  
  // Should NOT match
  { 
    tx: { description: "Miete Büro 700 EUR", amount: 700 }, // Amount too different
    should_match: false
  },
  { 
    tx: { description: "REWE Supermarkt 45 EUR", amount: 45 }, // Unknown pattern
    should_match: false
  },
  { 
    tx: { description: "Shell Tankstelle", amount: 65 },
    should_match: false
  }
];

let passed = 0;
let failed = 0;

for (const tc of TEST_CASES) {
  const result = matchRecurringPattern(tc.tx);
  
  if (tc.should_match && result.matched) {
    if (result.category === tc.expected_category) {
      console.log(`✅ ${tc.tx.description.substring(0, 40).padEnd(40)} → ${result.category} (${(result.confidence * 100).toFixed(0)}%)`);
      passed++;
    } else {
      console.log(`❌ ${tc.tx.description.substring(0, 40).padEnd(40)} → ${result.category} (expected: ${tc.expected_category})`);
      failed++;
    }
  } else if (!tc.should_match && !result.matched) {
    console.log(`✅ ${tc.tx.description.substring(0, 40).padEnd(40)} → No match (correct)`);
    passed++;
  } else {
    console.log(`❌ ${tc.tx.description.substring(0, 40).padEnd(40)} → Match=${result.matched} (expected: ${tc.should_match})`);
    failed++;
  }
}

console.log('═'.repeat(60));
console.log(`📊 Results: ${passed}/${TEST_CASES.length} passed`);

if (failed === 0) {
  console.log('✅ ALL TESTS PASSED!');
  console.log('\n📋 Learned Patterns:\n');
  const patterns = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  patterns.learned.forEach(p => {
    console.log(`  • ${p.description_pattern} → ${p.category} (${p.frequency}, auto: ${p.auto_approve})`);
  });
} else {
  console.log(`❌ ${failed} tests failed`);
  process.exit(1);
}
