#!/usr/bin/env node

/**
 * Test No-Receipt Categorization
 */

const { canCategorizeWithoutReceipt } = require('./no-receipt-categorization.js');

const TEST_CASES = [
  // Recurring
  { desc: "Miete Büro Januar 500 EUR", expected: "Raumkosten" },
  { desc: "Allianz Versicherung 89 EUR", expected: "Versicherung" },
  { desc: "Kontoführungsgebühr 5.90 EUR", expected: "Bankgebühren" },
  { desc: "Telekom Internet 39.99 EUR", expected: "Telekommunikation" },
  { desc: "Stadtwerke Strom 85 EUR", expected: "Nebenkosten" },
  
  // One-time
  { desc: "Finanzamt Umsatzsteuer 1500 EUR", expected: "Steuern" },
  { desc: "TK Krankenkasse 350 EUR", expected: "Versicherung" },
  
  // Private
  { desc: "Geldautomat 100 EUR", expected: "Privatentnahme" },
  { desc: "Bargeldauszahlung 200 EUR", expected: "Privatentnahme" },
  
  // Should NOT skip receipt
  { desc: "REWE Supermarkt 45.67 EUR", expected: null },
  { desc: "Shell Tankstelle 65 EUR", expected: null }
];

console.log('\n🧪 NO-RECEIPT CATEGORIZATION TEST');
console.log('═'.repeat(60));

let passed = 0;
let failed = 0;

for (const tc of TEST_CASES) {
  const result = canCategorizeWithoutReceipt({ description: tc.desc });
  
  const shouldSkip = tc.expected !== null;
  const didSkip = result.can_skip_receipt;
  
  if (shouldSkip === didSkip) {
    if (!shouldSkip) {
      console.log(`✅ ${tc.desc.substring(0, 40).padEnd(40)} → Receipt required`);
      passed++;
    } else if (result.category === tc.expected) {
      console.log(`✅ ${tc.desc.substring(0, 40).padEnd(40)} → ${result.category} (${(result.confidence * 100).toFixed(0)}%)`);
      passed++;
    } else {
      console.log(`❌ ${tc.desc.substring(0, 40).padEnd(40)} → ${result.category} (expected: ${tc.expected})`);
      failed++;
    }
  } else {
    console.log(`❌ ${tc.desc.substring(0, 40).padEnd(40)} → Skip=${didSkip} (expected: ${shouldSkip})`);
    failed++;
  }
}

console.log('═'.repeat(60));
console.log(`📊 Results: ${passed}/${TEST_CASES.length} passed`);

if (failed === 0) {
  console.log('✅ ALL TESTS PASSED!');
} else {
  console.log(`❌ ${failed} tests failed`);
  process.exit(1);
}
