#!/usr/bin/env node

/**
 * Test Receipt Tracking & Payment Linking
 */

const { 
  generateReceiptNumber, 
  registerReceipt, 
  linkPayment, 
  autoMatchReceipts,
  getDashboard 
} = require('./receipt-tracking.js');
const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'receipt-registry.json');

// Clean start
if (fs.existsSync(CONFIG_FILE)) {
  fs.unlinkSync(CONFIG_FILE);
}

console.log('\n🧪 RECEIPT TRACKING TEST');
console.log('═'.repeat(60));

// Test 1: Receipt numbering
console.log('\n1️⃣  Testing receipt numbering...\n');

const r1 = generateReceiptNumber(new Date('2025-03-15'));
const r2 = generateReceiptNumber(new Date('2025-03-16'));
const r3 = generateReceiptNumber(new Date('2025-04-01')); // New month

console.log(`   First receipt:  ${r1} (expected: 2025-03-00001)`);
console.log(`   Second receipt: ${r2} (expected: 2025-03-00002)`);
console.log(`   April receipt:  ${r3} (expected: 2025-04-00001)`);

const test1 = r1 === '2025-03-00001' && 
              r2 === '2025-03-00002' && 
              r3 === '2025-04-00001';

console.log(`   ${test1 ? '✅' : '❌'} Numbering ${test1 ? 'correct' : 'FAILED'}`);

// Test 2: Register receipts
console.log('\n2️⃣  Registering receipts...\n');

registerReceipt({
  vendor: 'Young Living',
  amount: 150.00,
  category: 'Wareneinkauf',
  eur_account: '4930',
  date: '2025-03-15'
});

registerReceipt({
  vendor: 'REWE',
  amount: 45.67,
  category: 'Lebensmittel',
  eur_account: '4970',
  date: '2025-03-16'
});

registerReceipt({
  vendor: 'Shell',
  amount: 65.00,
  category: 'KFZ',
  eur_account: '4520',
  date: '2025-03-17'
});

// Test 3: Link payment
console.log('\n3️⃣  Linking payment...\n');

linkPayment('2025-03-00003', {
  id: 'TX-12345',
  amount: -150.00,
  date: '2025-03-20',
  description: 'Young Living UK'
});

// Test 4: Auto-match
console.log('\n4️⃣  Auto-matching receipts...\n');

const bankTransactions = [
  { id: 'TX-67890', amount: -45.67, date: '2025-03-18', description: 'REWE Supermarkt' },
  { id: 'TX-11111', amount: -65.00, date: '2025-03-19', description: 'Shell Tankstelle' }
];

const matches = autoMatchReceipts(bankTransactions);
console.log(`   Matched ${matches.length} transactions`);

matches.forEach(m => {
  console.log(`   ✅ ${m.receipt} ↔ ${m.transaction} (confidence: ${(m.confidence * 100).toFixed(0)}%)`);
});

// Test 5: Dashboard
console.log('\n5️⃣  Dashboard...\n');

const dashboard = getDashboard();

console.log(`   Total receipts: ${dashboard.count.total}`);
console.log(`   Paid:           ${dashboard.count.paid} (${dashboard.amount.paid.toFixed(2)} EUR)`);
console.log(`   Open:           ${dashboard.count.open} (${dashboard.amount.open.toFixed(2)} EUR)`);

const test5 = dashboard.count.total === 3 && 
              dashboard.count.paid === 3 && 
              dashboard.count.open === 0;

console.log(`   ${test5 ? '✅' : '❌'} Dashboard ${test5 ? 'correct' : 'FAILED'}`);

// Final check
console.log('\n═'.repeat(60));

if (test1 && test5) {
  console.log('✅ ALL TESTS PASSED!');
  console.log('\n📊 Final Dashboard:\n');
  console.log(`   ✅ Bezahlt:     ${dashboard.count.paid} (${dashboard.amount.paid.toFixed(2)} EUR)`);
  console.log(`   ⏳ Offen:       ${dashboard.count.open} (${dashboard.amount.open.toFixed(2)} EUR)`);
  console.log(`   ⚠️  Überfällig:  ${dashboard.count.overdue} (${dashboard.amount.overdue.toFixed(2)} EUR)`);
} else {
  console.log('❌ TESTS FAILED');
  process.exit(1);
}
