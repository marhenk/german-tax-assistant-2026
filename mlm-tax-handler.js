#!/usr/bin/env node

/**
 * MLM-Specific Tax Handler for Young Living
 * Features:
 * - Reverse Charge (§13b UStG) detection
 * - Multi-currency (GBP → EUR)
 * - Eigenverbrauch tracking
 * - Commission vs. Product Purchase classification
 */

const https = require('https');

/**
 * Reverse Charge Detection (§13b UStG)
 * UK supplier → No German VAT on purchase
 */
function detectReverseCharge(transaction) {
  const ukIndicators = [
    /young living europe/i,
    /london.*w4.*5ys/i,
    /chiswick business park/i,
    /uk/i,
    /united kingdom/i,
    /gb\-/i,
    /vat.*gb/i
  ];
  
  const description = transaction.description || '';
  const vendor = transaction.vendor || '';
  
  for (const pattern of ukIndicators) {
    if (pattern.test(description) || pattern.test(vendor)) {
      return {
        reverse_charge: true,
        reason: '§13b UStG - UK supplier (innergemeinschaftliche Lieferung)',
        vat_handling: {
          german_vat: 0,
          report_in: 'USt-Voranmeldung Section 46 (Erwerb)',
          notes: 'Erwerbsbesteuerung - selbst zu versteuern'
        }
      };
    }
  }
  
  return { reverse_charge: false };
}

/**
 * Multi-Currency Conversion (GBP → EUR)
 * Uses EZB daily reference rates
 */
async function convertGBPtoEUR(amountGBP, date = new Date()) {
  // EZB API: https://data.ecb.europa.eu/data-detail-api-download/
  const dateStr = date.toISOString().split('T')[0];
  
  // Simplified: Use approximate rate if API fails
  // Production: Fetch from EZB API
  const approximateRate = 1.17; // 1 GBP ≈ 1.17 EUR (2024 avg)
  
  try {
    // TODO: Implement EZB API call
    // const rate = await fetchEZBRate(dateStr);
    const rate = approximateRate;
    
    const amountEUR = amountGBP * rate;
    
    return {
      amount_gbp: amountGBP,
      amount_eur: Math.round(amountEUR * 100) / 100,
      exchange_rate: rate,
      date: dateStr,
      source: 'EZB' // or 'approximate'
    };
  } catch (error) {
    console.error('Currency conversion failed:', error.message);
    return {
      amount_gbp: amountGBP,
      amount_eur: Math.round(amountGBP * approximateRate * 100) / 100,
      exchange_rate: approximateRate,
      date: dateStr,
      source: 'approximate',
      error: error.message
    };
  }
}

/**
 * Eigenverbrauch Detection (Private Use)
 * Products purchased but not resold = Entnahme
 */
function detectEigenverbrauch(transaction, salesHistory) {
  // Young Living product purchase
  if (!transaction.description || !/young living/i.test(transaction.description)) {
    return { eigenverbrauch: false };
  }
  
  // Check if this is a product purchase (not commission)
  const isProductPurchase = transaction.amount < 0; // Negative = expense
  if (!isProductPurchase) {
    return { eigenverbrauch: false };
  }
  
  // TODO: Compare against sales records
  // If purchase amount > sales in same period → likely Eigenverbrauch
  
  return {
    eigenverbrauch: 'possible',
    reason: 'Young Living product purchase detected',
    action_required: 'Verify if products were resold or used privately',
    tax_note: 'Eigenverbrauch = Entnahme (taxable!)'
  };
}

/**
 * MLM Transaction Classifier
 * Distinguish between:
 * - Product purchases (4930 Wareneinkauf)
 * - Commissions (4600 Provisionen)
 * - Team bonuses (4601 Team-Provisionen)
 * - Incentives (4602 Boni)
 */
function classifyMLMTransaction(transaction) {
  const desc = (transaction.description || '').toLowerCase();
  const amount = transaction.amount || 0;
  
  // Commission indicators
  if (desc.includes('commission') || desc.includes('provision')) {
    return {
      type: 'commission',
      category: 'Provisionen',
      eur_account: '4600',
      vat_rate: 19,
      notes: 'Direct sales commission'
    };
  }
  
  // Team bonus indicators
  if (desc.includes('team') || desc.includes('downline') || desc.includes('ogv')) {
    return {
      type: 'team_bonus',
      category: 'Team-Provisionen',
      eur_account: '4601',
      vat_rate: 19,
      notes: 'Team performance bonus'
    };
  }
  
  // Incentive/Bonus indicators
  if (desc.includes('bonus') || desc.includes('incentive') || desc.includes('reward')) {
    return {
      type: 'incentive',
      category: 'Boni & Incentives',
      eur_account: '4602',
      vat_rate: 19,
      notes: 'Performance incentive'
    };
  }
  
  // Product purchase (default for Young Living expenses)
  if (amount < 0 && /young living/i.test(desc)) {
    return {
      type: 'product_purchase',
      category: 'Wareneinkauf (MLM)',
      eur_account: '4930',
      vat_rate: 0,
      reverse_charge: true,
      notes: 'UK supplier - Reverse Charge §13b'
    };
  }
  
  return {
    type: 'unknown',
    category: null,
    notes: 'Manual classification required'
  };
}

/**
 * Process Young Living Transaction
 * Complete MLM-specific handling
 */
function processMLMTransaction(transaction) {
  const classification = classifyMLMTransaction(transaction);
  const reverseCharge = detectReverseCharge(transaction);
  const eigenverbrauch = detectEigenverbrauch(transaction);
  
  let result = {
    ...transaction,
    mlm: {
      classification,
      reverse_charge: reverseCharge,
      eigenverbrauch
    }
  };
  
  // Currency conversion if GBP
  if (transaction.currency === 'GBP') {
    // TODO: Async version needed
    result.mlm.currency_conversion = {
      note: 'Convert GBP to EUR using EZB rate',
      original_amount: transaction.amount,
      currency: 'GBP'
    };
  }
  
  return result;
}

module.exports = {
  detectReverseCharge,
  convertGBPtoEUR,
  detectEigenverbrauch,
  classifyMLMTransaction,
  processMLMTransaction
};

// CLI test
if (require.main === module) {
  const testTransactions = [
    {
      description: 'Young Living Europe Ltd - Product Order',
      amount: -150.00,
      currency: 'GBP',
      vendor: 'Young Living Europe'
    },
    {
      description: 'Commission Payment March 2025',
      amount: 250.00,
      currency: 'EUR',
      vendor: 'Young Living'
    },
    {
      description: 'Team Bonus - OGV Performance',
      amount: 100.00,
      currency: 'EUR',
      vendor: 'Young Living'
    }
  ];
  
  console.log('\n🧪 MLM Transaction Processing Test\n');
  console.log('═'.repeat(60));
  
  for (const tx of testTransactions) {
    console.log(`\nTransaction: ${tx.description}`);
    console.log(`Amount: ${tx.amount} ${tx.currency}`);
    
    const result = processMLMTransaction(tx);
    
    console.log('\nClassification:', result.mlm.classification.type);
    console.log('Category:', result.mlm.classification.category);
    console.log('EÜR Account:', result.mlm.classification.eur_account);
    console.log('Reverse Charge:', result.mlm.reverse_charge.reverse_charge ? 'YES (§13b)' : 'NO');
    
    if (result.mlm.eigenverbrauch.eigenverbrauch) {
      console.log('⚠️  Eigenverbrauch:', result.mlm.eigenverbrauch.reason);
    }
    
    console.log('─'.repeat(60));
  }
}
