/**
 * Recurring Transactions Module
 * 
 * Auto-categorize recurring bank transactions:
 * - Monthly rent
 * - Insurance premiums
 * - Subscriptions (Netflix, Spotify, etc.)
 * - Utilities (electricity, internet)
 * 
 * Learns from past categorizations and suggests patterns
 */

const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'recurring-patterns.json');

/**
 * Detect if transaction matches a recurring pattern
 */
function matchRecurringPattern(transaction) {
  const patterns = loadPatterns();
  
  const text = (transaction.description || '').toLowerCase();
  const amount = Math.abs(transaction.amount || 0);
  
  // Check learned patterns
  for (const pattern of patterns.learned) {
    if (!pattern.active) continue;
    
    // Match description
    const descMatch = matchDescription(text, pattern.description_pattern);
    if (!descMatch) continue;
    
    // Match amount (within tolerance)
    const amountMatch = matchAmount(amount, pattern.amount_pattern, pattern.amount_tolerance);
    if (!amountMatch) continue;
    
    // Check frequency (optional - only after 2+ occurrences)
    if (pattern.last_seen && pattern.occurrences > 1) {
      const daysSince = daysSinceLastSeen(pattern.last_seen);
      if (!matchesFrequency(daysSince, pattern.frequency)) {
        continue; // Too soon/late for this pattern
      }
    }
    
    return {
      matched: true,
      pattern_id: pattern.id,
      category: pattern.category,
      eur_account: pattern.eur_account,
      confidence: pattern.confidence,
      frequency: pattern.frequency,
      auto_approve: pattern.auto_approve,
      note: pattern.note
    };
  }
  
  return { matched: false };
}

/**
 * Learn new recurring pattern from transaction
 */
function learnPattern(transaction, category, eurAccount, options = {}) {
  const patterns = loadPatterns();
  
  // Check if similar pattern exists
  const existing = findSimilarPattern(patterns.learned, transaction);
  if (existing) {
    // Update existing pattern
    existing.occurrences++;
    existing.last_seen = new Date().toISOString();
    existing.confidence = Math.min(0.99, existing.confidence + 0.05);
    
    if (options.auto_approve !== undefined) {
      existing.auto_approve = options.auto_approve;
    }
    
    console.log(`✅ Updated existing pattern #${existing.id} (occurrences: ${existing.occurrences})`);
  } else {
    // Create new pattern
    const newPattern = {
      id: Date.now(),
      description_pattern: extractPattern(transaction.description),
      amount_pattern: Math.abs(transaction.amount),
      amount_tolerance: options.amount_tolerance || 0.05, // 5%
      category,
      eur_account: eurAccount,
      frequency: options.frequency || 'monthly',
      confidence: 0.85,
      auto_approve: options.auto_approve || false,
      active: true,
      created: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      occurrences: 1,
      note: options.note || ''
    };
    
    patterns.learned.push(newPattern);
    console.log(`✅ Created new pattern #${newPattern.id}: ${newPattern.description_pattern}`);
  }
  
  savePatterns(patterns);
}

/**
 * Extract pattern from description
 */
function extractPattern(description) {
  // Remove numbers, dates, variable parts
  let pattern = description
    .replace(/\d{2}\.\d{2}\.\d{4}/g, '') // dates
    .replace(/\d{4}-\d{2}-\d{2}/g, '')
    .replace(/januar|februar|märz|april|mai|juni|juli|august|september|oktober|november|dezember/gi, '') // months
    .replace(/\d+[,.]?\d*/g, '') // amounts
    .replace(/eur|usd|gbp|chf/gi, '') // currencies
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  
  // Extract key terms (first 2-3 words, minimum 3 chars each)
  const words = pattern.split(' ').filter(w => w.length > 2);
  return words.slice(0, 3).join(' ');
}

/**
 * Match description against pattern
 */
function matchDescription(text, pattern) {
  const patternWords = pattern.split(' ');
  // Require at least 50% of pattern words to match
  const matchedWords = patternWords.filter(word => text.includes(word));
  return matchedWords.length >= Math.ceil(patternWords.length * 0.5);
}

/**
 * Match amount with tolerance
 */
function matchAmount(amount, patternAmount, tolerance = 0.05) {
  const diff = Math.abs(amount - patternAmount);
  const threshold = patternAmount * tolerance;
  return diff <= threshold;
}

/**
 * Check if days since last match frequency
 */
function matchesFrequency(daysSince, frequency) {
  const ranges = {
    'weekly': [5, 9],       // 7 days ± 2
    'biweekly': [12, 16],   // 14 days ± 2
    'monthly': [25, 35],    // 30 days ± 5
    'quarterly': [85, 95],  // 90 days ± 5
    'yearly': [355, 375]    // 365 days ± 10
  };
  
  const range = ranges[frequency];
  if (!range) return true; // Unknown frequency, allow
  
  return daysSince >= range[0] && daysSince <= range[1];
}

/**
 * Days since last seen
 */
function daysSinceLastSeen(lastSeenISO) {
  const lastSeen = new Date(lastSeenISO);
  const now = new Date();
  const diff = now - lastSeen;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Find similar pattern
 */
function findSimilarPattern(patterns, transaction) {
  const text = extractPattern(transaction.description);
  const amount = Math.abs(transaction.amount);
  
  return patterns.find(p => 
    p.active &&
    matchDescription(text, p.description_pattern) &&
    matchAmount(amount, p.amount_pattern, p.amount_tolerance)
  );
}

/**
 * Load patterns
 */
function loadPatterns() {
  if (!fs.existsSync(CONFIG_FILE)) {
    const defaultPatterns = {
      learned: []
    };
    savePatterns(defaultPatterns);
    return defaultPatterns;
  }
  
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
}

/**
 * Save patterns
 */
function savePatterns(patterns) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(patterns, null, 2));
}

/**
 * Get statistics
 */
function getStats() {
  const patterns = loadPatterns();
  const active = patterns.learned.filter(p => p.active);
  
  return {
    total_patterns: patterns.learned.length,
    active_patterns: active.length,
    auto_approve_patterns: active.filter(p => p.auto_approve).length,
    frequencies: {
      weekly: active.filter(p => p.frequency === 'weekly').length,
      monthly: active.filter(p => p.frequency === 'monthly').length,
      quarterly: active.filter(p => p.frequency === 'quarterly').length,
      yearly: active.filter(p => p.frequency === 'yearly').length
    }
  };
}

/**
 * List all patterns
 */
function listPatterns() {
  const patterns = loadPatterns();
  return patterns.learned.filter(p => p.active);
}

/**
 * Delete pattern
 */
function deletePattern(patternId) {
  const patterns = loadPatterns();
  const pattern = patterns.learned.find(p => p.id === patternId);
  
  if (pattern) {
    pattern.active = false;
    savePatterns(patterns);
    console.log(`✅ Deactivated pattern #${patternId}`);
    return true;
  }
  
  console.log(`❌ Pattern #${patternId} not found`);
  return false;
}

module.exports = {
  matchRecurringPattern,
  learnPattern,
  getStats,
  listPatterns,
  deletePattern
};

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'match':
      if (!args[1]) {
        console.log('Usage: node recurring-transactions.js match "description" [amount]');
        process.exit(1);
      }
      const matchResult = matchRecurringPattern({
        description: args[1],
        amount: args[2] ? parseFloat(args[2]) : 0
      });
      console.log(JSON.stringify(matchResult, null, 2));
      break;
      
    case 'learn':
      if (args.length < 4) {
        console.log('Usage: node recurring-transactions.js learn "description" amount "category" "account" [--monthly] [--auto-approve]');
        process.exit(1);
      }
      learnPattern(
        { description: args[1], amount: parseFloat(args[2]) },
        args[3],
        args[4],
        {
          frequency: args.includes('--monthly') ? 'monthly' : 
                     args.includes('--weekly') ? 'weekly' : 
                     args.includes('--quarterly') ? 'quarterly' : 'monthly',
          auto_approve: args.includes('--auto-approve')
        }
      );
      break;
      
    case 'list':
      const patterns = listPatterns();
      console.log('\n📋 RECURRING PATTERNS\n');
      patterns.forEach(p => {
        console.log(`#${p.id} ${p.description_pattern}`);
        console.log(`   Category: ${p.category}`);
        console.log(`   Amount: ~${p.amount_pattern.toFixed(2)} EUR (±${(p.amount_tolerance * 100).toFixed(0)}%)`);
        console.log(`   Frequency: ${p.frequency}`);
        console.log(`   Occurrences: ${p.occurrences}`);
        console.log(`   Auto-approve: ${p.auto_approve ? 'Yes' : 'No'}`);
        console.log('');
      });
      break;
      
    case 'stats':
      console.log(JSON.stringify(getStats(), null, 2));
      break;
      
    case 'delete':
      if (!args[1]) {
        console.log('Usage: node recurring-transactions.js delete <pattern_id>');
        process.exit(1);
      }
      deletePattern(parseInt(args[1]));
      break;
      
    default:
      console.log(`
Recurring Transactions Module

Usage:
  node recurring-transactions.js match "Miete Büro" 500
  node recurring-transactions.js learn "Miete Büro Januar" 500 "Raumkosten" "4210" --monthly --auto-approve
  node recurring-transactions.js list
  node recurring-transactions.js stats
  node recurring-transactions.js delete <id>
      `);
  }
}
