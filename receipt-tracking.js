/**
 * Receipt Numbering & Payment Tracking Module
 * 
 * Finanzamt-compliant receipt numbering:
 * - Format: YYYY-MM-NNNNN (e.g., 2025-03-00042)
 * - Chronological, gap-free within month
 * - Links receipts to bank transactions
 * - Tracks payment status
 */

const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'receipt-registry.json');

/**
 * Generate next receipt number
 */
function generateReceiptNumber(date = new Date()) {
  const registry = loadRegistry();
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const yearMonth = `${year}-${month}`;
  
  // Get next counter for this month
  if (!registry.counters[yearMonth]) {
    registry.counters[yearMonth] = 0;
  }
  
  registry.counters[yearMonth]++;
  const counter = registry.counters[yearMonth];
  
  const receiptNumber = `${yearMonth}-${String(counter).padStart(5, '0')}`;
  
  // Save immediately after incrementing
  saveRegistry(registry);
  
  return receiptNumber;
}

/**
 * Register new receipt
 */
function registerReceipt(receiptData) {
  const registry = loadRegistry();
  
  // Generate receipt number if not provided
  const receiptNumber = receiptData.receipt_number || 
                        generateReceiptNumber(new Date(receiptData.date));
  
  // Reload registry after generateReceiptNumber saved it
  const updatedRegistry = loadRegistry();
  
  const receipt = {
    receipt_number: receiptNumber,
    date: receiptData.date,
    vendor: receiptData.vendor,
    amount: receiptData.amount,
    category: receiptData.category,
    eur_account: receiptData.eur_account,
    vat_rate: receiptData.vat_rate,
    status: receiptData.status || 'open', // open, paid, partial, overdue
    file_path: receiptData.file_path,
    created_at: new Date().toISOString(),
    payment: null // Will be linked later
  };
  
  updatedRegistry.receipts[receiptNumber] = receipt;
  saveRegistry(updatedRegistry);
  
  console.log(`✅ Registered receipt ${receiptNumber}: ${receipt.vendor} - ${receipt.amount} EUR`);
  
  return receipt;
}

/**
 * Link payment to receipt
 */
function linkPayment(receiptNumber, bankTransaction) {
  const registry = loadRegistry();
  
  const receipt = registry.receipts[receiptNumber];
  if (!receipt) {
    throw new Error(`Receipt ${receiptNumber} not found`);
  }
  
  receipt.payment = {
    bank_tx_id: bankTransaction.id,
    date: bankTransaction.date,
    amount: bankTransaction.amount,
    description: bankTransaction.description,
    linked_at: new Date().toISOString()
  };
  
  // Update status
  const amountMatch = Math.abs(Math.abs(bankTransaction.amount) - receipt.amount);
  if (amountMatch < 0.01) {
    receipt.status = 'paid';
  } else if (Math.abs(bankTransaction.amount) > 0) {
    receipt.status = 'partial';
  }
  
  registry.receipts[receiptNumber] = receipt;
  saveRegistry(registry);
  
  console.log(`✅ Linked payment to receipt ${receiptNumber}`);
  
  return receipt;
}

/**
 * Auto-match receipts to bank transactions
 */
function autoMatchReceipts(bankTransactions) {
  const registry = loadRegistry();
  const matches = [];
  
  // Get unpaid receipts
  const openReceipts = Object.values(registry.receipts)
    .filter(r => r.status === 'open');
  
  for (const tx of bankTransactions) {
    const txAmount = Math.abs(tx.amount);
    const txDate = new Date(tx.date);
    
    // Find matching receipt
    const match = openReceipts.find(receipt => {
      const receiptAmount = Math.abs(receipt.amount);
      const receiptDate = new Date(receipt.date);
      
      // Match criteria:
      // 1. Amount matches (±1%)
      const amountMatch = Math.abs(txAmount - receiptAmount) / receiptAmount < 0.01;
      
      // 2. Date within ±14 days
      const daysDiff = Math.abs((txDate - receiptDate) / (1000 * 60 * 60 * 24));
      const dateMatch = daysDiff <= 14;
      
      // 3. Vendor name in transaction description (optional)
      const vendorMatch = receipt.vendor && 
                          tx.description.toLowerCase().includes(receipt.vendor.toLowerCase());
      
      return amountMatch && dateMatch;
    });
    
    if (match) {
      linkPayment(match.receipt_number, tx);
      matches.push({
        receipt: match.receipt_number,
        transaction: tx.id,
        confidence: match.vendor && tx.description.toLowerCase().includes(match.vendor.toLowerCase()) 
                    ? 0.95 : 0.85
      });
    }
  }
  
  return matches;
}

/**
 * Get receipt status
 */
function getReceiptStatus(receiptNumber) {
  const registry = loadRegistry();
  return registry.receipts[receiptNumber] || null;
}

/**
 * Get dashboard statistics
 */
function getDashboard() {
  const registry = loadRegistry();
  const receipts = Object.values(registry.receipts);
  
  const stats = {
    total: receipts.length,
    paid: receipts.filter(r => r.status === 'paid'),
    open: receipts.filter(r => r.status === 'open'),
    overdue: receipts.filter(r => {
      if (r.status !== 'open') return false;
      const receiptDate = new Date(r.date);
      const daysSince = (Date.now() - receiptDate) / (1000 * 60 * 60 * 24);
      return daysSince > 30; // 30 days overdue
    }),
    partial: receipts.filter(r => r.status === 'partial')
  };
  
  return {
    count: {
      total: stats.total,
      paid: stats.paid.length,
      open: stats.open.length,
      overdue: stats.overdue.length,
      partial: stats.partial.length
    },
    amount: {
      paid: stats.paid.reduce((sum, r) => sum + Math.abs(r.amount), 0),
      open: stats.open.reduce((sum, r) => sum + Math.abs(r.amount), 0),
      overdue: stats.overdue.reduce((sum, r) => sum + Math.abs(r.amount), 0)
    },
    receipts: {
      paid: stats.paid,
      open: stats.open,
      overdue: stats.overdue
    }
  };
}

/**
 * Load registry
 */
function loadRegistry() {
  if (!fs.existsSync(CONFIG_FILE)) {
    return {
      counters: {},
      receipts: {}
    };
  }
  
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
}

/**
 * Save registry
 */
function saveRegistry(registry) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(registry, null, 2));
}

module.exports = {
  generateReceiptNumber,
  registerReceipt,
  linkPayment,
  autoMatchReceipts,
  getReceiptStatus,
  getDashboard
};

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'generate':
      const date = args[1] ? new Date(args[1]) : new Date();
      console.log(generateReceiptNumber(date));
      break;
      
    case 'register':
      if (args.length < 5) {
        console.log('Usage: node receipt-tracking.js register <vendor> <amount> <category> <account> [--date YYYY-MM-DD]');
        process.exit(1);
      }
      const dateIdx = args.indexOf('--date');
      const receiptDate = dateIdx > 0 ? args[dateIdx + 1] : new Date().toISOString().split('T')[0];
      
      registerReceipt({
        vendor: args[1],
        amount: parseFloat(args[2]),
        category: args[3],
        eur_account: args[4],
        date: receiptDate
      });
      break;
      
    case 'link':
      if (args.length < 5) {
        console.log('Usage: node receipt-tracking.js link <receipt_number> <tx_id> <amount> <date>');
        process.exit(1);
      }
      linkPayment(args[1], {
        id: args[2],
        amount: parseFloat(args[3]),
        date: args[4],
        description: args[5] || ''
      });
      break;
      
    case 'status':
      if (!args[1]) {
        console.log('Usage: node receipt-tracking.js status <receipt_number>');
        process.exit(1);
      }
      const status = getReceiptStatus(args[1]);
      console.log(JSON.stringify(status, null, 2));
      break;
      
    case 'dashboard':
      const dashboard = getDashboard();
      console.log('\n📊 BELEGE DASHBOARD\n');
      console.log('═'.repeat(50));
      console.log(`✅ Bezahlt:     ${dashboard.count.paid.toString().padStart(3)} (${dashboard.amount.paid.toFixed(2)} EUR)`);
      console.log(`⏳ Offen:       ${dashboard.count.open.toString().padStart(3)} (${dashboard.amount.open.toFixed(2)} EUR)`);
      console.log(`⚠️  Überfällig:  ${dashboard.count.overdue.toString().padStart(3)} (${dashboard.amount.overdue.toFixed(2)} EUR)`);
      console.log(`📊 Teilzahlung: ${dashboard.count.partial.toString().padStart(3)}`);
      console.log('═'.repeat(50));
      
      if (args.includes('--verbose')) {
        console.log('\n📋 Offene Belege:\n');
        dashboard.receipts.open.forEach(r => {
          console.log(`  ${r.receipt_number} | ${r.vendor.padEnd(20)} | ${r.amount.toFixed(2)} EUR | ${r.date}`);
        });
      }
      break;
      
    default:
      console.log(`
Receipt Numbering & Payment Tracking

Usage:
  node receipt-tracking.js generate [YYYY-MM-DD]
  node receipt-tracking.js register "Young Living" 150.00 "Wareneinkauf" "4930" --date 2025-03-15
  node receipt-tracking.js link 2025-03-00042 TX-12345 -150.00 2025-03-20
  node receipt-tracking.js status 2025-03-00042
  node receipt-tracking.js dashboard [--verbose]
      `);
  }
}
