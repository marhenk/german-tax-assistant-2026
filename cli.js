#!/usr/bin/env node

// German Tax Assistant CLI

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const command = args[0];

// Load configuration
function loadConfig() {
  const configPath = path.join(__dirname, 'config', 'config.json');
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }
  console.warn('⚠️  No config found. Copy config/config.json.example to config/config.json');
  return null;
}

function showHelp() {
  console.log(`
German Tax Assistant CLI 🇩🇪

Usage: node cli.js <command> [options]

Commands:
  ocr-scan           Scan Google Drive for unsorted receipts
  ocr-process        Process a single receipt file
  bank-parse         Parse bank statement CSV
  bank-match         Match receipts to transactions
  eur-calculate      Calculate EÜR (Einnahmenüberschussrechnung)
  ust-calculate      Calculate USt (Umsatzsteuer)
  export             Export data to JSON/CSV/Markdown
  help               Show this help message

Options:
  --input <path>     Input file or folder
  --file <path>      Specific file to process
  --csv <path>       Bank statement CSV file
  --year <YYYY>      Tax year (default: current year)
  --format <type>    Export format (json, csv, markdown)
  --tolerance <n>    Fuzzy match tolerance percent (default: 5)

Examples:
  node cli.js ocr-scan --input "Belege Unsortiert/"
  node cli.js bank-parse --csv sparkasse-export.csv
  node cli.js eur-calculate --year 2025
  node cli.js export --format json --year 2025

Configuration:
  Copy config/config.json.example to config/config.json
  Add your Google Drive credentials and Lexoffice API key

Documentation:
  README.md        — Quick start guide
  wiki/            — 19 pages of German tax documentation
  autoresearch/    — Test results & accuracy reports
  `);
}

// Command dispatcher
switch (command) {
  case 'ocr-scan':
    console.log('📄 OCR Scan: Not yet implemented in CLI wrapper');
    console.log('Use: node src/gdrive-workflow.js');
    break;
    
  case 'ocr-process':
    console.log('📄 OCR Process: Not yet implemented in CLI wrapper');
    console.log('Use: node src/ocr-processor.js <file>');
    break;
    
  case 'bank-parse':
    console.log('🏦 Bank Parse: Not yet implemented in CLI wrapper');
    console.log('Use: node src/bank-statement-parser.js <csv>');
    break;
    
  case 'bank-match':
    console.log('🔍 Bank Match: Not yet implemented in CLI wrapper');
    console.log('Use: node src/gdrive-workflow.js');
    break;
    
  case 'eur-calculate':
    console.log('💶 EÜR Calculate: Not yet implemented in CLI wrapper');
    console.log('Use: node src/euer-categorizer.js');
    break;
    
  case 'ust-calculate':
    console.log('💶 USt Calculate: Not yet implemented in CLI wrapper');
    console.log('Use: node src/euer-categorizer.js');
    break;
    
  case 'export':
    console.log('📤 Export: Not yet implemented in CLI wrapper');
    console.log('See: exports/ folder for examples');
    break;
    
  case 'help':
  case undefined:
    showHelp();
    break;
    
  default:
    console.error(`❌ Unknown command: ${command}`);
    console.log('Run "node cli.js help" for usage');
    process.exit(1);
}
