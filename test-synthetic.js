#!/usr/bin/env node

/**
 * Synthetic Test Data Generator + Full System Test
 * Tests all components with realistic German tax scenarios
 */

const fs = require('fs');
const path = require('path');

// Import modules
const { applyCategoryRules } = require('./rule-based-categorization.js');
const { processMLMTransaction } = require('./mlm-tax-handler.js');
const { logCorrection, getStats } = require('./active-learning.js');

// Synthetic test transactions (100 realistic German business expenses)
const SYNTHETIC_DATA = [
  // Lebensmittel (10)
  { desc: "REWE Markt 1234 Berlin", amount: -45.67, expected: "Lebensmittel" },
  { desc: "EDEKA Neukauf München", amount: -32.50, expected: "Lebensmittel" },
  { desc: "ALDI SÜD Filiale 567", amount: -28.99, expected: "Lebensmittel" },
  { desc: "LIDL Vertriebs GmbH", amount: -41.20, expected: "Lebensmittel" },
  { desc: "Kaufland Warenhaus", amount: -67.80, expected: "Lebensmittel" },
  { desc: "PENNY Markt Hamburg", amount: -19.45, expected: "Lebensmittel" },
  { desc: "Netto Marken-Discount", amount: -22.30, expected: "Lebensmittel" },
  { desc: "REWE City Berlin Mitte", amount: -15.90, expected: "Lebensmittel" },
  { desc: "EDEKA Center Köln", amount: -89.00, expected: "Lebensmittel" },
  { desc: "Aldi Nord Flensburg", amount: -34.50, expected: "Lebensmittel" },
  
  // KFZ (10)
  { desc: "Shell Station Hamburg", amount: -65.00, expected: "KFZ" },
  { desc: "ARAL Tankstelle A7", amount: -72.50, expected: "KFZ" },
  { desc: "ESSO Station München", amount: -58.30, expected: "KFZ" },
  { desc: "Total Energies Berlin", amount: -45.00, expected: "KFZ" },
  { desc: "JET Tankstelle Köln", amount: -52.80, expected: "KFZ" },
  { desc: "Parkhaus Hauptbahnhof", amount: -12.00, expected: "KFZ" },
  { desc: "Q-Park Alexanderplatz", amount: -8.50, expected: "KFZ" },
  { desc: "ADAC Mitgliedsbeitrag", amount: -89.00, expected: "KFZ" },
  { desc: "ATU Werkstatt Inspektion", amount: -350.00, expected: "KFZ" },
  { desc: "TÜV Hauptuntersuchung", amount: -120.00, expected: "KFZ" },
  
  // Reisekosten (10)
  { desc: "Deutsche Bahn AG ICE", amount: -89.90, expected: "Reisekosten" },
  { desc: "DB Vertrieb GmbH Ticket", amount: -45.00, expected: "Reisekosten" },
  { desc: "Lufthansa AG Flug", amount: -289.00, expected: "Reisekosten" },
  { desc: "Eurowings Economy", amount: -149.00, expected: "Reisekosten" },
  { desc: "FlixBus München-Berlin", amount: -29.99, expected: "Reisekosten" },
  { desc: "Hotel Marriott Berlin", amount: -189.00, expected: "Reisekosten" },
  { desc: "Booking.com Unterkunft", amount: -120.00, expected: "Reisekosten" },
  { desc: "Airbnb Apartment Wien", amount: -95.00, expected: "Reisekosten" },
  { desc: "HRS Hotel Hamburg", amount: -145.00, expected: "Reisekosten" },
  { desc: "Ryanair Flight STR-BCN", amount: -49.99, expected: "Reisekosten" },
  
  // Software (10)
  { desc: "Microsoft 365 Business", amount: -12.99, expected: "Software" },
  { desc: "Google Workspace", amount: -10.40, expected: "Software" },
  { desc: "Adobe Creative Cloud", amount: -59.99, expected: "Software" },
  { desc: "Zoom Video Pro", amount: -15.99, expected: "Software" },
  { desc: "Slack Technologies", amount: -7.25, expected: "Software" },
  { desc: "GitHub Team License", amount: -4.00, expected: "Software" },
  { desc: "Notion Plus Plan", amount: -8.00, expected: "Software" },
  { desc: "Dropbox Business", amount: -12.50, expected: "Software" },
  { desc: "Salesforce CRM", amount: -150.00, expected: "Software" },
  { desc: "JetBrains IntelliJ", amount: -14.90, expected: "Software" },
  
  // Telekommunikation (8)
  { desc: "Telekom Deutschland GmbH", amount: -49.99, expected: "Telekommunikation" },
  { desc: "Vodafone GmbH Mobilfunk", amount: -39.99, expected: "Telekommunikation" },
  { desc: "O2 Telefonica Business", amount: -29.99, expected: "Telekommunikation" },
  { desc: "1&1 Internet SE", amount: -19.99, expected: "Telekommunikation" },
  { desc: "Congstar Prepaid", amount: -15.00, expected: "Telekommunikation" },
  { desc: "Unitymedia Kabel", amount: -44.99, expected: "Telekommunikation" },
  { desc: "Telekom Magenta Mobil", amount: -59.95, expected: "Telekommunikation" },
  { desc: "Vodafone Red Business", amount: -79.99, expected: "Telekommunikation" },
  
  // Büromaterial (8)
  { desc: "Amazon Business Büro", amount: -45.99, expected: "Büromaterial" },
  { desc: "Staples Deutschland", amount: -89.00, expected: "Büromaterial" },
  { desc: "Office Depot GmbH", amount: -34.50, expected: "Büromaterial" },
  { desc: "Viking Direkt", amount: -67.80, expected: "Büromaterial" },
  { desc: "Papier Müller Druck", amount: -120.00, expected: "Büromaterial" },
  { desc: "IKEA Büromöbel", amount: -249.00, expected: "Büromaterial" },
  { desc: "MediaMarkt Technik", amount: -399.00, expected: "Büromaterial" },
  { desc: "Saturn Elektronik", amount: -199.00, expected: "Büromaterial" },
  
  // Drogerie (8)
  { desc: "dm drogerie markt", amount: -23.45, expected: "Drogerie" },
  { desc: "ROSSMANN GmbH", amount: -18.90, expected: "Drogerie" },
  { desc: "Müller Drogerie", amount: -34.50, expected: "Drogerie" },
  { desc: "Douglas Parfümerie", amount: -89.00, expected: "Drogerie" },
  { desc: "dm Berlin Mitte", amount: -15.60, expected: "Drogerie" },
  { desc: "Rossmann Filiale 234", amount: -27.80, expected: "Drogerie" },
  { desc: "Budni Drogerie Hamburg", amount: -12.30, expected: "Drogerie" },
  { desc: "dm Express Köln", amount: -8.99, expected: "Drogerie" },
  
  // Porto/Versand (6)
  { desc: "DHL Paket National", amount: -5.99, expected: "Porto/Versand" },
  { desc: "Deutsche Post Brief", amount: -0.85, expected: "Porto/Versand" },
  { desc: "Hermes Versand", amount: -4.99, expected: "Porto/Versand" },
  { desc: "DPD Deutschland", amount: -6.99, expected: "Porto/Versand" },
  { desc: "UPS Express Saver", amount: -15.99, expected: "Porto/Versand" },
  { desc: "GLS Paketdienst", amount: -5.49, expected: "Porto/Versand" },
  
  // Marketing (6)
  { desc: "Google Ads Kampagne", amount: -150.00, expected: "Marketing" },
  { desc: "Facebook Ads Meta", amount: -89.00, expected: "Marketing" },
  { desc: "LinkedIn Ads Campaign", amount: -200.00, expected: "Marketing" },
  { desc: "Flyeralarm Druck", amount: -120.00, expected: "Marketing" },
  { desc: "Vistaprint Visitenkarten", amount: -45.00, expected: "Marketing" },
  { desc: "99designs Logo", amount: -299.00, expected: "Marketing" },
  
  // Versicherung (6)
  { desc: "Allianz Versicherung", amount: -89.00, expected: "Versicherung" },
  { desc: "AXA Betriebshaftpflicht", amount: -120.00, expected: "Versicherung" },
  { desc: "HUK-COBURG Gewerbe", amount: -150.00, expected: "Versicherung" },
  { desc: "ERGO Rechtsschutz", amount: -180.00, expected: "Versicherung" },
  { desc: "Generali Deutschland", amount: -95.00, expected: "Versicherung" },
  { desc: "R+V Versicherung", amount: -110.00, expected: "Versicherung" },
  
  // MLM / Young Living (8)
  { desc: "Young Living Europe Ltd", amount: -150.00, expected: "Wareneinkauf (MLM)", mlm: true },
  { desc: "YL Essential Oils Order", amount: -89.00, expected: "Wareneinkauf (MLM)", mlm: true },
  { desc: "Young Living Starter Kit", amount: -165.00, expected: "Wareneinkauf (MLM)", mlm: true },
  { desc: "Commission Payment YL", amount: 250.00, expected: "Provisionen (MLM)", mlm: true },
  { desc: "Team Bonus March", amount: 120.00, expected: "Team-Provisionen", mlm: true },
  { desc: "YL Incentive Reward", amount: 80.00, expected: "Boni & Incentives", mlm: true },
  { desc: "Young Living UK Order", amount: -200.00, expected: "Wareneinkauf (MLM)", mlm: true },
  { desc: "YL Ätherische Öle Set", amount: -95.00, expected: "Wareneinkauf (MLM)", mlm: true },
  
  // Weiterbildung (6)
  { desc: "Udemy Business Course", amount: -12.99, expected: "Weiterbildung" },
  { desc: "Coursera Certificate", amount: -49.00, expected: "Weiterbildung" },
  { desc: "LinkedIn Learning", amount: -29.99, expected: "Weiterbildung" },
  { desc: "IHK Seminar Berlin", amount: -350.00, expected: "Weiterbildung" },
  { desc: "VHS Kurs Buchhaltung", amount: -89.00, expected: "Weiterbildung" },
  { desc: "Haufe Akademie Webinar", amount: -199.00, expected: "Weiterbildung" },
  
  // Edge Cases (4)
  { desc: "Random Unknown Vendor", amount: -50.00, expected: null },
  { desc: "XYZ GmbH Zahlung", amount: -100.00, expected: null },
  { desc: "Überweisung 12345", amount: -75.00, expected: null },
  { desc: "Lastschrift unbekannt", amount: -30.00, expected: null }
];

// Run tests
function runTests() {
  console.log('\n🧪 SYNTHETIC DATA TEST');
  console.log('═'.repeat(70));
  console.log(`Testing ${SYNTHETIC_DATA.length} transactions...\n`);
  
  const results = {
    total: SYNTHETIC_DATA.length,
    correct: 0,
    incorrect: 0,
    no_match: 0,
    expected_no_match: 0,
    mlm_tested: 0,
    mlm_correct: 0,
    by_category: {}
  };
  
  const errors = [];
  
  for (const tx of SYNTHETIC_DATA) {
    const ruleResult = applyCategoryRules(tx.desc);
    const predicted = ruleResult ? ruleResult.category : null;
    const expected = tx.expected;
    
    // Track by category
    if (expected) {
      if (!results.by_category[expected]) {
        results.by_category[expected] = { total: 0, correct: 0 };
      }
      results.by_category[expected].total++;
    }
    
    // Check result
    if (expected === null && predicted === null) {
      results.expected_no_match++;
      results.correct++;
    } else if (predicted === expected) {
      results.correct++;
      if (expected) results.by_category[expected].correct++;
    } else if (predicted === null) {
      results.no_match++;
      errors.push({ tx, predicted, expected, error: 'NO_MATCH' });
    } else {
      results.incorrect++;
      errors.push({ tx, predicted, expected, error: 'WRONG_CATEGORY' });
    }
    
    // MLM specific test
    if (tx.mlm) {
      results.mlm_tested++;
      const mlmResult = processMLMTransaction({
        description: tx.desc,
        amount: tx.amount
      });
      
      if (mlmResult.mlm.classification.category) {
        results.mlm_correct++;
      }
    }
  }
  
  // Calculate accuracy
  const accuracy = (results.correct / results.total * 100).toFixed(1);
  const categorizedTotal = results.total - 4; // Exclude expected no-match
  const categorizedCorrect = results.correct - results.expected_no_match;
  const categorizedAccuracy = (categorizedCorrect / categorizedTotal * 100).toFixed(1);
  
  // Print results
  console.log('📊 RESULTS');
  console.log('─'.repeat(70));
  console.log(`Total Transactions:     ${results.total}`);
  console.log(`Correct:                ${results.correct} (${accuracy}%)`);
  console.log(`Incorrect:              ${results.incorrect}`);
  console.log(`No Match (unexpected):  ${results.no_match}`);
  console.log(`No Match (expected):    ${results.expected_no_match}`);
  console.log('');
  console.log(`Categorized Accuracy:   ${categorizedAccuracy}% (${categorizedCorrect}/${categorizedTotal})`);
  console.log('');
  
  // MLM Results
  console.log('🏷️  MLM PROCESSING');
  console.log('─'.repeat(70));
  console.log(`MLM Transactions:       ${results.mlm_tested}`);
  console.log(`MLM Correct:            ${results.mlm_correct}`);
  console.log(`MLM Accuracy:           ${(results.mlm_correct / results.mlm_tested * 100).toFixed(0)}%`);
  console.log('');
  
  // By Category
  console.log('📁 BY CATEGORY');
  console.log('─'.repeat(70));
  for (const [cat, stats] of Object.entries(results.by_category)) {
    const catAcc = (stats.correct / stats.total * 100).toFixed(0);
    const bar = '█'.repeat(Math.round(catAcc / 5)) + '░'.repeat(20 - Math.round(catAcc / 5));
    console.log(`${cat.padEnd(25)} ${bar} ${catAcc}% (${stats.correct}/${stats.total})`);
  }
  console.log('');
  
  // Errors
  if (errors.length > 0) {
    console.log('❌ ERRORS');
    console.log('─'.repeat(70));
    for (const err of errors.slice(0, 10)) {
      console.log(`  ${err.tx.desc.substring(0, 35).padEnd(35)} → ${(err.predicted || 'NULL').padEnd(20)} (expected: ${err.expected})`);
    }
    if (errors.length > 10) {
      console.log(`  ... and ${errors.length - 10} more`);
    }
    console.log('');
  }
  
  // Summary
  console.log('═'.repeat(70));
  if (parseFloat(categorizedAccuracy) >= 95) {
    console.log(`✅ TEST PASSED: ${categorizedAccuracy}% accuracy (target: 95%+)`);
  } else {
    console.log(`⚠️  TEST NEEDS IMPROVEMENT: ${categorizedAccuracy}% accuracy (target: 95%+)`);
  }
  console.log('═'.repeat(70));
  
  return results;
}

// Run
runTests();
