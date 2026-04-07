/**
 * Auto-Categorization Engine for EÜR (Einnahmen-Überschuss-Rechnung)
 * Uses vendor-based rules, keyword matching, and amount heuristics
 */

class EUERCategorizer {
  constructor() {
    this.categories = this.loadCategories();
  }

  loadCategories() {
    return {
      // Betriebseinnahmen
      'einnahmen_beratung': {
        name: 'Betriebseinnahmen (Beratung/Dienstleistung)',
        patterns: [],
        vendors: [],
        confidence_boost: 0
      },

      // Betriebsausgaben
      'fremdleistungen': {
        name: 'Fremdleistungen',
        patterns: ['hosting', 'server', 'cloud', 'aws', 'saas', 'software', 'lizenz', 'subscription', 'api'],
        vendors: ['AWS', 'Amazon Web Services', 'Hetzner', 'DigitalOcean', 'Google Cloud', 'Microsoft Azure', 'Vercel', 'Netlify', 'GitHub'],
        min_amount: null,
        max_amount: null
      },

      'raumkosten': {
        name: 'Raumkosten',
        patterns: ['miete', 'coworking', 'büro', 'office', 'telekom', 'vodafone', 'internet', 'telefon', 'kommunikation'],
        vendors: ['Vodafone', 'Telekom', 'O2', '1&1', 'Regus', 'WeWork'],
        min_amount: null,
        max_amount: null
      },

      'reisekosten': {
        name: 'Reisekosten',
        patterns: ['bahn', 'flug', 'hotel', 'zug', 'ticket', 'reise', 'airbnb', 'booking'],
        vendors: ['Deutsche Bahn', 'DB', 'Lufthansa', 'Ryanair', 'FlixBus', 'Uber', 'Booking.com', 'Hotels.com'],
        min_amount: null,
        max_amount: null
      },

      'kfz_kosten': {
        name: 'KFZ-Kosten',
        patterns: ['benzin', 'diesel', 'tankstelle', 'tanken', 'parkhaus', 'parken', 'autowäsche'],
        vendors: ['Shell', 'Aral', 'Esso', 'Total', 'Jet'],
        min_amount: null,
        max_amount: null
      },

      'bewirtung': {
        name: 'Bewirtungskosten',
        patterns: ['restaurant', 'café', 'business lunch', 'meeting'],
        vendors: ['Rewe', 'Edeka', 'Lidl'], // Only if plausible
        min_amount: 10,
        max_amount: 200
      },

      'fortbildung': {
        name: 'Fortbildungskosten',
        patterns: ['schulung', 'kurs', 'seminar', 'workshop', 'konferenz', 'udemy', 'coursera', 'training'],
        vendors: ['Udemy', 'Coursera', 'LinkedIn Learning'],
        min_amount: null,
        max_amount: null
      },

      'bürobedarf': {
        name: 'Bürobedarf',
        patterns: ['büro', 'office', 'papier', 'stift', 'schreibwaren', 'toner', 'drucker'],
        vendors: ['Staples', 'Office Depot', 'Amazon Business'],
        min_amount: null,
        max_amount: 500
      },

      'büromöbel_gering': {
        name: 'Geringwertige Wirtschaftsgüter (GWG) <1000€',
        patterns: ['stuhl', 'tisch', 'schreibtisch', 'monitor', 'tastatur', 'maus', 'lampe', 'regal'],
        vendors: ['IKEA', 'Otto', 'Amazon'],
        min_amount: 100,
        max_amount: 999
      },

      'afa_anlagevermögen': {
        name: 'Abschreibungsfähiges Anlagevermögen (AfA) ≥1000€',
        patterns: ['laptop', 'computer', 'macbook', 'notebook', 'workstation', 'server'],
        vendors: ['Apple', 'Dell', 'Lenovo', 'HP'],
        min_amount: 1000,
        max_amount: null
      },

      'versicherungen': {
        name: 'Versicherungen',
        patterns: ['versicherung', 'haftpflicht', 'berufshaftpflicht', 'rechtsschutz'],
        vendors: ['Allianz', 'AXA', 'Hiscox', 'exali'],
        min_amount: null,
        max_amount: null
      },

      'sonstige_kosten': {
        name: 'Sonstige betriebliche Aufwendungen',
        patterns: [],
        vendors: [],
        min_amount: null,
        max_amount: null
      }
    };
  }

  /**
   * Categorize a receipt based on extracted data
   */
  categorize(receiptData) {
    const { vendor, description, amount_gross, raw_text } = receiptData;
    const searchText = `${vendor || ''} ${description || ''} ${raw_text || ''}`.toLowerCase();

    const scores = {};
    
    for (const [categoryKey, categoryDef] of Object.entries(this.categories)) {
      let score = 0;

      // Vendor matching (high confidence)
      if (vendor && categoryDef.vendors.length > 0) {
        for (const vendorPattern of categoryDef.vendors) {
          if (vendor.toLowerCase().includes(vendorPattern.toLowerCase())) {
            score += 40;
            break;
          }
        }
      }

      // Keyword matching
      if (categoryDef.patterns.length > 0) {
        for (const pattern of categoryDef.patterns) {
          if (searchText.includes(pattern.toLowerCase())) {
            score += 20;
          }
        }
      }

      // Amount-based heuristics
      if (amount_gross) {
        if (categoryDef.min_amount !== null && amount_gross < categoryDef.min_amount) {
          score -= 30; // Penalty for amount mismatch
        }
        if (categoryDef.max_amount !== null && amount_gross > categoryDef.max_amount) {
          score -= 30;
        }
        
        // Amount range bonus
        if (categoryDef.min_amount !== null && categoryDef.max_amount !== null) {
          if (amount_gross >= categoryDef.min_amount && amount_gross <= categoryDef.max_amount) {
            score += 15;
          }
        }
      }

      scores[categoryKey] = Math.max(0, score);
    }

    // Find best match
    const sortedCategories = Object.entries(scores)
      .filter(([_, score]) => score > 0)
      .sort((a, b) => b[1] - a[1]);

    if (sortedCategories.length === 0) {
      return {
        category: 'sonstige_kosten',
        category_name: this.categories.sonstige_kosten.name,
        confidence: 0.3,
        alternatives: []
      };
    }

    const [bestCategory, bestScore] = sortedCategories[0];
    const maxScore = 75; // Max achievable score (vendor + keywords)
    const confidence = Math.min(1.0, bestScore / maxScore);

    return {
      category: bestCategory,
      category_name: this.categories[bestCategory].name,
      confidence: Math.round(confidence * 100) / 100,
      alternatives: sortedCategories.slice(1, 3).map(([cat, score]) => ({
        category: cat,
        category_name: this.categories[cat].name,
        confidence: Math.round((score / maxScore) * 100) / 100
      }))
    };
  }

  /**
   * Validate categorization against known rules
   */
  validate(receiptData, categorization) {
    const warnings = [];

    // AfA vs GWG validation
    if (receiptData.amount_gross >= 1000 && categorization.category === 'büromöbel_gering') {
      warnings.push('Betrag ≥1000€ sollte AfA-pflichtig sein, nicht GWG');
    }
    if (receiptData.amount_gross < 1000 && categorization.category === 'afa_anlagevermögen') {
      warnings.push('Betrag <1000€ kann als GWG sofort abgeschrieben werden');
    }

    // Bewirtung plausibility
    if (categorization.category === 'bewirtung') {
      if (!receiptData.description || !receiptData.description.toLowerCase().includes('meeting')) {
        warnings.push('Bewirtung ohne erkennbaren Geschäftsbezug - bitte prüfen');
      }
    }

    return {
      valid: warnings.length === 0,
      warnings
    };
  }
}

module.exports = EUERCategorizer;
