/**
 * No-Receipt Categorization Module
 * 
 * Handles bank transactions without receipts:
 * - Rent (Büromiete)
 * - Insurance (Versicherungen)
 * - Bank fees (Kontogebühren)
 * - Private withdrawals (Privatentnahmen)
 * - Recurring payments (Lastschriften)
 */

const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'no-receipt-rules.json');

/**
 * Check if transaction can be categorized without receipt
 */
function canCategorizeWithoutReceipt(transaction) {
  const rules = loadRules();
  
  const text = (transaction.description || '').toLowerCase();
  
  // Check recurring patterns
  for (const rule of rules.recurring) {
    if (matchesPattern(text, rule.pattern)) {
      return {
        can_skip_receipt: true,
        category: rule.category,
        eur_account: rule.eur_account,
        reason: 'recurring_payment',
        rule: rule.pattern,
        confidence: rule.confidence || 0.95
      };
    }
  }
  
  // Check one-time patterns
  for (const rule of rules.one_time) {
    if (matchesPattern(text, rule.pattern)) {
      return {
        can_skip_receipt: true,
        category: rule.category,
        eur_account: rule.eur_account,
        reason: 'standard_expense',
        rule: rule.pattern,
        confidence: rule.confidence || 0.90
      };
    }
  }
  
  // Check private withdrawals
  if (isPrivateWithdrawal(transaction)) {
    return {
      can_skip_receipt: true,
      category: 'Privatentnahme',
      eur_account: '1800', // Privatentnahmen
      reason: 'private_withdrawal',
      confidence: 0.85
    };
  }
  
  return {
    can_skip_receipt: false,
    reason: 'needs_receipt'
  };
}

/**
 * Match transaction against pattern
 */
function matchesPattern(text, pattern) {
  if (typeof pattern === 'string') {
    return text.includes(pattern.toLowerCase());
  }
  if (pattern instanceof RegExp) {
    return pattern.test(text);
  }
  if (Array.isArray(pattern)) {
    return pattern.some(p => text.includes(p.toLowerCase()));
  }
  return false;
}

/**
 * Detect private withdrawal
 */
function isPrivateWithdrawal(transaction) {
  const text = (transaction.description || '').toLowerCase();
  const amount = Math.abs(transaction.amount || 0);
  
  // ATM withdrawals
  if (text.includes('geldautomat') || text.includes('atm') || text.includes('bargeld')) {
    return true;
  }
  
  // Round amounts (likely private)
  if (amount > 0 && amount % 50 === 0 && amount <= 500) {
    return true;
  }
  
  // Common private keywords
  const privateKeywords = ['privatentnahme', 'privat', 'eigenverbrauch'];
  return privateKeywords.some(kw => text.includes(kw));
}

/**
 * Load categorization rules
 */
function loadRules() {
  if (!fs.existsSync(CONFIG_FILE)) {
    const defaultRules = {
      recurring: [
        {
          pattern: ['miete', 'rent'],
          category: 'Raumkosten',
          eur_account: '4210',
          confidence: 0.98,
          note: 'Monatliche Büromiete'
        },
        {
          pattern: ['versicherung', 'insurance', 'allianz', 'ergo'],
          category: 'Versicherung',
          eur_account: '4360',
          confidence: 0.95,
          note: 'Versicherungsbeitrag'
        },
        {
          pattern: ['kontoführung', 'kontogebühr', 'account fee'],
          category: 'Bankgebühren',
          eur_account: '4910',
          confidence: 0.99,
          note: 'Kontoführungsgebühren'
        },
        {
          pattern: ['stromkosten', 'strom', 'electricity', 'stadtwerke'],
          category: 'Nebenkosten',
          eur_account: '4240',
          confidence: 0.95,
          note: 'Stromrechnung'
        },
        {
          pattern: ['internet', 'telekom', 'vodafone', '1&1'],
          category: 'Telekommunikation',
          eur_account: '4910',
          confidence: 0.95,
          note: 'Internet/Telefon'
        }
      ],
      one_time: [
        {
          pattern: ['finanzamt', 'tax office', 'umsatzsteuer', 'gewerbesteuer'],
          category: 'Steuern',
          eur_account: '1780',
          confidence: 0.99,
          note: 'Steuerzahlung'
        },
        {
          pattern: ['krankenkasse', 'health insurance', 'tk ', 'aok'],
          category: 'Versicherung',
          eur_account: '4360',
          confidence: 0.95,
          note: 'Krankenversicherung'
        }
      ]
    };
    
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultRules, null, 2));
    return defaultRules;
  }
  
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
}

/**
 * Add new rule
 */
function addRule(pattern, category, eurAccount, options = {}) {
  const rules = loadRules();
  
  const newRule = {
    pattern,
    category,
    eur_account: eurAccount,
    confidence: options.confidence || 0.90,
    note: options.note || ''
  };
  
  const ruleType = options.recurring ? 'recurring' : 'one_time';
  rules[ruleType].push(newRule);
  
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(rules, null, 2));
  console.log(`✅ Added ${ruleType} rule: ${pattern} → ${category}`);
}

/**
 * Get statistics
 */
function getStats() {
  const rules = loadRules();
  return {
    recurring_rules: rules.recurring.length,
    one_time_rules: rules.one_time.length,
    total_rules: rules.recurring.length + rules.one_time.length
  };
}

module.exports = {
  canCategorizeWithoutReceipt,
  addRule,
  getStats
};

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'test':
      const testTx = {
        description: args[1] || 'Miete Büro Januar',
        amount: -500
      };
      const result = canCategorizeWithoutReceipt(testTx);
      console.log(JSON.stringify(result, null, 2));
      break;
      
    case 'add':
      if (args.length < 4) {
        console.log('Usage: node no-receipt-categorization.js add <pattern> <category> <account> [--recurring]');
        process.exit(1);
      }
      addRule(args[1], args[2], args[3], {
        recurring: args.includes('--recurring')
      });
      break;
      
    case 'stats':
      console.log(getStats());
      break;
      
    default:
      console.log(`
No-Receipt Categorization Module

Usage:
  node no-receipt-categorization.js test "Miete Büro"
  node no-receipt-categorization.js add "miete" "Raumkosten" "4210" --recurring
  node no-receipt-categorization.js stats
      `);
  }
}
