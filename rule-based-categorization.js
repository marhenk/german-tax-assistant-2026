#!/usr/bin/env node

/**
 * Rule-Based Categorization Enhancer
 * Fallback patterns for edge cases the ML model misses
 * Target: +2-3% accuracy boost
 */

const fs = require('fs');
const path = require('path');

// Load vendor database
const vendorDB = require('./vendor-database-v2.json');

/**
 * Rule-based categorization patterns
 * Applied BEFORE ML model as pre-filter
 * ORDER MATTERS: More specific patterns first!
 */
const CATEGORY_RULES = [
  // Weiterbildung (BEFORE Marketing to catch LinkedIn Learning)
  {
    pattern: /linkedin learning|udemy|coursera|vhs|ihk|weiterbildung|schulung|seminar|kurs/i,
    category: 'Weiterbildung',
    eur_account: '4945',
    confidence: 0.95
  },
  
  // Marketing (BEFORE Software to catch Google Ads)
  {
    pattern: /google ads|facebook ads|linkedin ads|meta ads|werbung|adwords|kampagne/i,
    category: 'Marketing',
    eur_account: '4945',
    confidence: 0.98
  },
  {
    pattern: /fiverr|upwork|99designs|freelancer/i,
    category: 'Marketing',
    eur_account: '4945',
    confidence: 0.90
  },
  {
    pattern: /vistaprint|flyeralarm|cewe|werbedruck|flyer|visitenkarten/i,
    category: 'Marketing',
    eur_account: '4945',
    confidence: 0.95
  },

  // Büromaterial / Office (BEFORE Drogerie to catch "Papier Müller")
  {
    pattern: /staples|office depot|lyreco|bürobedarf|viking|ikea|mediamarkt|media markt|saturn elektronik|papier.*druck|druckerei/i,
    category: 'Büromaterial',
    eur_account: '4940',
    confidence: 0.95
  },

  // Drogerie (AFTER Büromaterial)
  {
    pattern: /dm drogerie|rossmann|müller drogerie|douglas|budni|parfümerie/i,
    category: 'Drogerie',
    eur_account: '4930',
    confidence: 0.95
  },

  // Software (BEFORE KFZ to prevent JetBrains matching JET)
  {
    pattern: /microsoft|office 365|azure|google workspace|google cloud/i,
    category: 'Software',
    eur_account: '4935',
    confidence: 0.98
  },
  {
    pattern: /adobe|salesforce|zoom|slack|github|gitlab|notion|jetbrains|intellij|pycharm/i,
    category: 'Software',
    eur_account: '4935',
    confidence: 0.95
  },
  {
    pattern: /dropbox|asana|trello|jira|confluence/i,
    category: 'Software',
    eur_account: '4935',
    confidence: 0.95
  },

  // KFZ / Automotive
  {
    pattern: /tankstelle|shell station|aral tankstelle|esso station|total energies|benzin|diesel|kraftstoff/i,
    category: 'KFZ',
    eur_account: '4650',
    confidence: 0.95
  },
  {
    pattern: /parkhaus|parkplatz|park-and-ride|parken|q-park/i,
    category: 'KFZ',
    eur_account: '4650',
    confidence: 0.90
  },
  {
    pattern: /adac|atu|tüv|tuev|hauptuntersuchung|werkstatt|inspektion/i,
    category: 'KFZ',
    eur_account: '4650',
    confidence: 0.95
  },
  
  // Reisekosten / Travel
  {
    pattern: /hotel|airbnb|booking|hrs|hotel\.de|unterkunft|marriott/i,
    category: 'Reisekosten',
    eur_account: '4671',
    confidence: 0.95
  },
  {
    pattern: /deutsche bahn|db vertrieb|bahn\.de|flixbus|fernbus/i,
    category: 'Reisekosten',
    eur_account: '4670',
    confidence: 0.98
  },
  {
    pattern: /lufthansa|eurowings|ryanair|easyjet|wizz air|flight|flug/i,
    category: 'Reisekosten',
    eur_account: '4671',
    confidence: 0.95
  },
  
  // Büromaterial / Office (BEFORE generic patterns)
  {
    pattern: /staples|office depot|lyreco|papier|bürobedarf|viking|ikea|mediamarkt|media markt|saturn/i,
    category: 'Büromaterial',
    eur_account: '4940',
    confidence: 0.95
  },
  {
    pattern: /amazon|ebay|otto\.de/i,
    category: 'Büromaterial',
    eur_account: '4940',
    confidence: 0.70,
    note: 'Check invoice for actual category!'
  },
  {
    pattern: /staples|office depot|lyreco|papier|bürobedarf/i,
    category: 'Büromaterial',
    eur_account: '4940',
    confidence: 0.95
  },
  
  // Software & IT
  {
    pattern: /microsoft|office 365|azure|google workspace|google cloud/i,
    category: 'Software',
    eur_account: '4935',
    confidence: 0.98
  },
  {
    pattern: /adobe|salesforce|zoom|slack|github|gitlab|notion/i,
    category: 'Software',
    eur_account: '4935',
    confidence: 0.95
  },
  
  // Marketing & Werbung
  {
    pattern: /google ads|facebook ads|linkedin ads|meta ads|werbung/i,
    category: 'Marketing',
    eur_account: '4945',
    confidence: 0.98
  },
  {
    pattern: /fiverr|upwork|99designs|freelancer/i,
    category: 'Marketing',
    eur_account: '4945',
    confidence: 0.90
  },
  {
    pattern: /vistaprint|flyeralarm|cewe|werbedruck|flyer|visitenkarten/i,
    category: 'Marketing',
    eur_account: '4945',
    confidence: 0.95
  },
  
  // Telekommunikation
  {
    pattern: /telekom|vodafone|o2|telefonica|1&1|1und1|mobilfunk|internet/i,
    category: 'Telekommunikation',
    eur_account: '4920',
    confidence: 0.95
  },
  
  // Porto / Versand
  {
    pattern: /dhl|hermes|dpd|ups|fedex|gls|versand|porto|paket/i,
    category: 'Porto/Versand',
    eur_account: '4910',
    confidence: 0.95
  },
  
  // Versicherung
  {
    pattern: /allianz|axa|huk|ergo|generali|versicherung/i,
    category: 'Versicherung',
    eur_account: '4360',
    confidence: 0.95
  },
  
  // MLM Incentive-Reisen (BEFORE generic MLM patterns - most specific first!)
  {
    pattern: /kreuzfahrt|cruise|incentive.*reise|diamond.*(trip|retreat)|gold.*retreat|silver.*retreat|platinum.*(trip|retreat)|convention|leadership.*(cruise|trip|event)|retreat.*(diamond|gold|silver|platinum)|recognition.*trip|achievers.*trip|founders.*club/i,
    category: 'Sachbezüge (Incentive-Reisen)',
    eur_account: '8400',
    confidence: 0.98,
    note: 'ACHTUNG: Geldwerter Vorteil! Prüfen ob YL §37b Pauschalversteuerung anwendet. Wenn nicht: Marktwert als Einnahme versteuern!'
  },
  
  // MLM Income (specific patterns BEFORE generic "commission")
  {
    pattern: /team bonus|downline|ogv bonus|team.*provision/i,
    category: 'Team-Provisionen',
    eur_account: '4601',
    confidence: 0.95
  },
  {
    pattern: /(?<!retreat|trip|cruise|reise).*incentive(?!.*reise)|reward(?!.*trip)|yl incentive|young living.*bonus/i,
    category: 'Boni & Incentives',
    eur_account: '4602',
    confidence: 0.95
  },
  
  // Young Living MLM-Specific (products)
  {
    pattern: /young living|youngliving|yl marketplace|essential oils|ätherische öle/i,
    category: 'Wareneinkauf (MLM)',
    eur_account: '4930',
    confidence: 0.98,
    note: 'UK supplier - Reverse Charge! Check Eigenverbrauch!'
  },
  {
    pattern: /commission|provision|bonus|incentive/i,
    category: 'Provisionen (MLM)',
    eur_account: '4600',
    confidence: 0.85,
    note: 'MLM income - verify source'
  },
  
  // Weiterbildung
  {
    pattern: /udemy|coursera|linkedin learning|vhs|ihk|weiterbildung|schulung/i,
    category: 'Weiterbildung',
    eur_account: '4945',
    confidence: 0.95
  },
  
  // Lebensmittel (only for clear cases)
  {
    pattern: /rewe|edeka|aldi|lidl|penny|netto|kaufland|supermarkt/i,
    category: 'Lebensmittel',
    eur_account: '4930',
    confidence: 0.90,
    note: 'Usually NOT business expense unless business event'
  }
];

/**
 * Apply rule-based categorization
 * @param {String} description - Transaction description
 * @param {Number} amount - Transaction amount
 * @returns {Object|null} - Category result or null
 */
function applyCategoryRules(description, amount = 0) {
  if (!description) return null;
  
  const descLower = description.toLowerCase();
  
  // 1. Apply regex rules FIRST (more specific patterns)
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(description)) {
      return {
        category: rule.category,
        eur_account: rule.eur_account,
        confidence: rule.confidence,
        source: 'rule_based',
        rule: rule.pattern.source,
        note: rule.note || null
      };
    }
  }
  
  // 2. Fallback to vendor database (keyword match)
  for (const [vendor, data] of Object.entries(vendorDB)) {
    for (const keyword of data.keywords) {
      if (descLower.includes(keyword.toLowerCase())) {
        return {
          category: data.category,
          eur_account: data.eur_account,
          vat_rate: data.vat_rate,
          confidence: 0.98,
          source: 'vendor_db',
          vendor: vendor,
          note: data.notes || null
        };
      }
    }
  }
  
  return null;
}

/**
 * Enhance ML predictions with rule-based fallback
 * @param {String} description
 * @param {String} mlCategory - ML model prediction
 * @param {Number} mlConfidence - ML confidence score
 * @returns {Object} - Final category decision
 */
function enhanceCategorization(description, mlCategory, mlConfidence) {
  const ruleResult = applyCategoryRules(description);
  
  // If no rule match, use ML
  if (!ruleResult) {
    return {
      category: mlCategory,
      confidence: mlConfidence,
      source: 'ml_model'
    };
  }
  
  // If rule has higher confidence, use it
  if (ruleResult.confidence > mlConfidence) {
    return ruleResult;
  }
  
  // If ML has higher confidence, use ML but flag rule match
  return {
    category: mlCategory,
    confidence: mlConfidence,
    source: 'ml_model',
    rule_suggestion: ruleResult.category,
    rule_confidence: ruleResult.confidence
  };
}

module.exports = {
  applyCategoryRules,
  enhanceCategorization,
  CATEGORY_RULES,
  vendorDB
};

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: ./rule-based-categorization.js "transaction description"');
    console.log('\nExample:');
    console.log('  ./rule-based-categorization.js "Shell Tankstelle"');
    process.exit(1);
  }
  
  const description = args.join(' ');
  const result = applyCategoryRules(description);
  
  if (result) {
    console.log('\n✅ Rule Match Found:\n');
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('\n⚠️  No rule match - would fall back to ML model');
  }
}
