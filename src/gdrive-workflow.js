#!/usr/bin/env node
/**
 * Google Drive Receipt Workflow Orchestrator
 * Full pipeline: Scan → OCR → Categorize → Match → Review → Export
 */

const GDriveReceiptScanner = require('./gdrive-receipts');
const OCRProcessor = require('./ocr-processor');
const EUERCategorizer = require('./euer-categorizer');
const BankStatementParser = require('./bank-statement-parser');
const GDriveFiler = require('./gdrive-filer');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

class GDriveWorkflow {
  constructor() {
    this.scanner = new GDriveReceiptScanner();
    this.ocr = new OCRProcessor(process.env.OCR_PROVIDER || 'tesseract');
    this.categorizer = new EUERCategorizer();
    this.filer = new GDriveFiler();
    this.cacheDir = process.env.CACHE_DIR || './receipt-cache';
    this.resultsFile = path.join(this.cacheDir, 'results.json');
  }

  async scan() {
    console.log('📂 Scanning Google Drive folder...');
    const allFiles = await this.scanner.scanFolder();
    const unprocessed = await this.scanner.getUnprocessedFiles(allFiles);
    
    console.log(`\n📊 Status:`);
    console.log(`  Total files: ${allFiles.length}`);
    console.log(`  Unprocessed: ${unprocessed.length}`);

    if (unprocessed.length === 0) {
      console.log('\n✅ All receipts processed!');
      return;
    }

    console.log(`\n🔄 Processing ${unprocessed.length} receipts...`);
    
    const results = await this.loadResults();

    for (let i = 0; i < unprocessed.length; i++) {
      const file = unprocessed[i];
      console.log(`\n[${i + 1}/${unprocessed.length}] ${file.name}`);
      
      try {
        // Download
        const localPath = await this.scanner.downloadFile(file.id, file.name);
        
        // OCR
        console.log('  🔍 Extracting text...');
        const { text, confidence: ocrConfidence } = await this.ocr.extractText(localPath);
        
        // Parse
        const receiptData = this.ocr.parseReceiptData(text, file.name);
        console.log(`  📄 Date: ${receiptData.date || 'N/A'}`);
        console.log(`  💰 Amount: €${receiptData.amount_gross || 'N/A'}`);
        console.log(`  🏢 Vendor: ${receiptData.vendor || 'N/A'}`);
        console.log(`  ✓ OCR Confidence: ${Math.round(receiptData.confidence * 100)}%`);
        
        // Categorize
        const categorization = this.categorizer.categorize(receiptData);
        console.log(`  📊 Category: ${categorization.category_name}`);
        console.log(`  ✓ Category Confidence: ${Math.round(categorization.confidence * 100)}%`);
        
        // Validate
        const validation = this.categorizer.validate(receiptData, categorization);
        if (!validation.valid) {
          console.log(`  ⚠️  Warnings: ${validation.warnings.join(', ')}`);
        }

        // Save result
        results.receipts.push({
          file_id: file.id,
          file_name: file.name,
          local_path: localPath,
          ocr: receiptData,
          category: categorization,
          validation: validation,
          status: categorization.confidence >= parseFloat(process.env.AUTO_APPROVE_THRESHOLD || 0.9) 
            ? 'approved' 
            : 'review',
          processed_at: new Date().toISOString()
        });

        await this.scanner.markProcessed(file.id, 'processed');
        
      } catch (err) {
        console.error(`  ❌ Error: ${err.message}`);
        await this.scanner.markProcessed(file.id, 'failed');
      }
    }

    await this.saveResults(results);
    console.log(`\n✅ Processing complete. Results saved to ${this.resultsFile}`);
    
    this.printSummary(results);
  }

  async review() {
    const results = await this.loadResults();
    const reviewNeeded = results.receipts.filter(r => r.status === 'review');
    
    if (reviewNeeded.length === 0) {
      console.log('✅ No receipts need review.');
      return;
    }

    console.log(`\n📋 ${reviewNeeded.length} receipts need review:\n`);
    
    reviewNeeded.forEach((receipt, index) => {
      console.log(`[${index + 1}] ${receipt.file_name}`);
      console.log(`    Date: ${receipt.ocr.date || 'N/A'}`);
      console.log(`    Vendor: ${receipt.ocr.vendor || 'N/A'}`);
      console.log(`    Amount: €${receipt.ocr.amount_gross || 'N/A'}`);
      console.log(`    Category: ${receipt.category.category_name} (${Math.round(receipt.category.confidence * 100)}% confidence)`);
      
      if (receipt.validation.warnings.length > 0) {
        console.log(`    ⚠️  ${receipt.validation.warnings.join(', ')}`);
      }
      
      if (receipt.category.alternatives.length > 0) {
        console.log(`    Alternatives:`);
        receipt.category.alternatives.forEach(alt => {
          console.log(`      - ${alt.category_name} (${Math.round(alt.confidence * 100)}%)`);
        });
      }
      console.log();
    });

    console.log(`\n💡 To approve/edit categories, use the web UI:`);
    console.log(`   npm run ui`);
    console.log(`   Then open http://localhost:3000`);
  }

  async approve(options = {}) {
    const threshold = options.threshold || parseFloat(process.env.AUTO_APPROVE_THRESHOLD || 0.9);
    const results = await this.loadResults();
    
    let approvedCount = 0;
    results.receipts.forEach(receipt => {
      if (receipt.status === 'review' && receipt.category.confidence >= threshold) {
        receipt.status = 'approved';
        approvedCount++;
      }
    });

    await this.saveResults(results);
    console.log(`✅ Auto-approved ${approvedCount} receipts (confidence ≥${Math.round(threshold * 100)}%)`);
  }

  async export(options = {}) {
    const year = options.year || new Date().getFullYear();
    const results = await this.loadResults();
    
    const approved = results.receipts.filter(r => r.status === 'approved');
    const exportData = {
      year: year,
      export_date: new Date().toISOString(),
      receipts: approved.map(r => ({
        date: r.ocr.date,
        vendor: r.ocr.vendor,
        amount_gross: r.ocr.amount_gross,
        amount_net: r.ocr.amount_net,
        tax_rate: r.ocr.tax_rate,
        tax_amount: r.ocr.tax_amount,
        category: r.category.category,
        category_name: r.category.category_name,
        description: r.ocr.description,
        invoice_number: r.ocr.invoice_number,
        file_name: r.file_name
      }))
    };

    const exportPath = path.join(this.cacheDir, `export_${year}.json`);
    await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2));
    
    console.log(`📤 Exported ${approved.length} receipts to ${exportPath}`);
    
    // Generate EÜR summary
    this.generateEUERSummary(exportData);
  }

  generateEUERSummary(exportData) {
    const summary = {};
    
    exportData.receipts.forEach(receipt => {
      const category = receipt.category_name;
      if (!summary[category]) {
        summary[category] = {
          count: 0,
          total_gross: 0,
          total_net: 0,
          total_tax: 0
        };
      }
      
      summary[category].count++;
      summary[category].total_gross += receipt.amount_gross || 0;
      summary[category].total_net += receipt.amount_net || 0;
      summary[category].total_tax += receipt.tax_amount || 0;
    });

    console.log(`\n📊 EÜR Summary ${exportData.year}:`);
    console.log('═'.repeat(80));
    
    let totalGross = 0;
    Object.entries(summary).forEach(([category, data]) => {
      console.log(`${category}`);
      console.log(`  ${data.count} Belege | Gesamt: €${data.total_gross.toFixed(2)} | Netto: €${data.total_net.toFixed(2)} | MwSt: €${data.total_tax.toFixed(2)}`);
      totalGross += data.total_gross;
    });
    
    console.log('═'.repeat(80));
    console.log(`GESAMT: €${totalGross.toFixed(2)}`);
  }

  printSummary(results) {
    const statusCounts = {
      approved: 0,
      review: 0,
      failed: 0
    };

    results.receipts.forEach(r => {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    });

    console.log(`\n📊 Summary:`);
    console.log(`  ✅ Auto-approved: ${statusCounts.approved || 0}`);
    console.log(`  ⏳ Needs review: ${statusCounts.review || 0}`);
    console.log(`  ❌ Failed: ${statusCounts.failed || 0}`);
  }

  async loadResults() {
    try {
      const data = await fs.readFile(this.resultsFile, 'utf-8');
      return JSON.parse(data);
    } catch (err) {
      return { receipts: [], bank_matches: [] };
    }
  }

  async saveResults(results) {
    await fs.mkdir(this.cacheDir, { recursive: true });
    await fs.writeFile(this.resultsFile, JSON.stringify(results, null, 2));
  }
}

// CLI
if (require.main === module) {
  const command = process.argv[2] || 'help';
  const workflow = new GDriveWorkflow();

  (async () => {
    try {
      switch (command) {
        case 'scan':
          await workflow.scan();
          break;
        
        case 'review':
          await workflow.review();
          break;
        
        case 'approve':
          const threshold = parseFloat(process.argv[3]) || 0.9;
          await workflow.approve({ threshold });
          break;
        
        case 'export':
          const year = parseInt(process.argv[3]) || new Date().getFullYear();
          await workflow.export({ year });
          break;
        
        case 'file':
          const fileOptions = {
            dryRun: process.argv.includes('--dry-run'),
            year: null,
            force: process.argv.includes('--force')
          };
          const yearIndex = process.argv.indexOf('--year');
          if (yearIndex !== -1 && process.argv[yearIndex + 1]) {
            fileOptions.year = parseInt(process.argv[yearIndex + 1]);
          }
          await workflow.filer.fileAll(fileOptions);
          break;
        
        default:
          console.log(`
Google Drive Receipt Workflow

Usage:
  node gdrive-workflow.js <command> [options]

Commands:
  scan              Scan Drive folder, OCR, and categorize new receipts
  review            List receipts that need manual review
  approve [0-1]     Auto-approve receipts above confidence threshold (default: 0.9)
  export [year]     Export approved receipts to JSON (default: current year)
  file              Auto-file approved receipts to Google Drive month folders

File Options:
  --dry-run         Preview filing without making changes
  --year YYYY       Only file receipts from specific year
  --force           Re-file already processed receipts

Examples:
  node gdrive-workflow.js scan
  node gdrive-workflow.js review
  node gdrive-workflow.js approve 0.85
  node gdrive-workflow.js export 2024
  node gdrive-workflow.js file
  node gdrive-workflow.js file --dry-run
  node gdrive-workflow.js file --year 2024
  node gdrive-workflow.js file --force
          `);
      }
    } catch (err) {
      console.error(`\n❌ Error: ${err.message}`);
      process.exit(1);
    }
  })();
}

module.exports = GDriveWorkflow;
