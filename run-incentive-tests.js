#!/usr/bin/env node

/**
 * Test Runner für Incentive-Reisen Kategorisierung
 * Lädt Test-Cases und prüft gegen rule-based-categorization.js
 */

const fs = require('fs');
const path = require('path');
const { applyCategoryRules } = require('./rule-based-categorization.js');

// Load test cases
const testFile = path.join(__dirname, 'tests', 'incentive-reisen-test-cases.json');
const testData = JSON.parse(fs.readFileSync(testFile, 'utf8'));

console.log('═══════════════════════════════════════════════════════════════');
console.log('  INCENTIVE-REISEN KATEGORISIERUNG - TEST SUITE');
console.log('═══════════════════════════════════════════════════════════════\n');

let passed = 0;
let failed = 0;
const failures = [];

// Run main test cases
console.log('📋 HAUPTTESTS (Incentive-Reisen Erkennung)\n');

for (const test of testData.testCases) {
  const result = applyCategoryRules(test.input);
  
  const categoryMatch = result && result.category === test.expectedCategory;
  const accountMatch = result && result.eur_account === test.expectedAccount;
  
  if (categoryMatch && accountMatch) {
    console.log(`  ✅ ${test.id}: ${test.description}`);
    console.log(`     Input: "${test.input}"`);
    console.log(`     → ${result.category} (${result.eur_account})\n`);
    passed++;
  } else {
    console.log(`  ❌ ${test.id}: ${test.description}`);
    console.log(`     Input: "${test.input}"`);
    console.log(`     Expected: ${test.expectedCategory} (${test.expectedAccount})`);
    console.log(`     Got: ${result ? result.category : 'NO MATCH'} (${result ? result.eur_account : 'N/A'})\n`);
    failed++;
    failures.push({
      id: test.id,
      input: test.input,
      expected: test.expectedCategory,
      got: result ? result.category : 'NO MATCH'
    });
  }
}

// Run edge cases
console.log('\n📋 EDGE CASES (Abgrenzung zu anderen Kategorien)\n');

for (const test of testData.edgeCases) {
  const result = applyCategoryRules(test.input);
  
  const categoryMatch = result 
    ? result.category === test.expectedCategory 
    : test.expectedCategory === 'Privat' || test.expectedAccount === null;
  
  if (categoryMatch) {
    console.log(`  ✅ ${test.id}: ${test.description}`);
    console.log(`     Input: "${test.input}"`);
    console.log(`     → ${result ? result.category : 'NO MATCH (expected)'}\n`);
    passed++;
  } else {
    console.log(`  ⚠️  ${test.id}: ${test.description}`);
    console.log(`     Input: "${test.input}"`);
    console.log(`     Expected: ${test.expectedCategory}`);
    console.log(`     Got: ${result ? result.category : 'NO MATCH'}`);
    console.log(`     Note: ${test.notes}\n`);
    // Edge cases are warnings, not failures
  }
}

// Summary
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  ERGEBNIS');
console.log('═══════════════════════════════════════════════════════════════\n');

const total = testData.testCases.length;
const accuracy = ((passed / total) * 100).toFixed(1);

console.log(`  Haupttests:  ${passed}/${total} bestanden (${accuracy}%)`);
console.log(`  Edge Cases:  ${testData.edgeCases.length} geprüft\n`);

if (failures.length > 0) {
  console.log('  ⚠️  FEHLGESCHLAGENE TESTS:');
  for (const f of failures) {
    console.log(`     - ${f.id}: "${f.input}" → ${f.got} (erwartet: ${f.expected})`);
  }
  console.log();
}

if (accuracy >= 90) {
  console.log('  ✅ Kategorisierung funktioniert gut!\n');
} else if (accuracy >= 70) {
  console.log('  ⚠️  Kategorisierung braucht Verbesserung.\n');
} else {
  console.log('  ❌ Kategorisierung hat kritische Probleme!\n');
}

// Exit with error code if tests failed
process.exit(failed > 0 ? 1 : 0);
