/**
 * Google Drive Auto-Filer
 * Automatically organize receipts into month folders
 */

const GDriveReceiptScanner = require('./gdrive-receipts');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

class GDriveFiler {
  constructor() {
    this.gdrive = new GDriveReceiptScanner();
    this.targetRoot = process.env.GOOGLE_DRIVE_TARGET_ROOT || 'Steuern';
    this.uncategorized = process.env.GOOGLE_DRIVE_UNCATEGORIZED || 'Steuern/Uncategorized';
    this.cacheDir = process.env.CACHE_DIR || './receipt-cache';
    this.filingDb = path.join(this.cacheDir, 'filing.json');
  }

  /**
   * Load OCR results cache
   */
  async loadOcrCache() {
    const cachePath = path.join(this.cacheDir, 'ocr-results.json');
    try {
      const data = await fs.readFile(cachePath, 'utf-8');
      return JSON.parse(data);
    } catch (err) {
      return {};
    }
  }

  /**
   * Load categorization cache
   */
  async loadCategorizationCache() {
    const cachePath = path.join(this.cacheDir, 'categorization.json');
    try {
      const data = await fs.readFile(cachePath, 'utf-8');
      return JSON.parse(data);
    } catch (err) {
      return {};
    }
  }

  /**
   * Load filing database
   */
  async loadFilingDb() {
    try {
      const data = await fs.readFile(this.filingDb, 'utf-8');
      return JSON.parse(data);
    } catch (err) {
      return { filed: [], failed: [] };
    }
  }

  /**
   * Save filing database
   */
  async saveFilingDb(db) {
    await fs.writeFile(this.filingDb, JSON.stringify(db, null, 2));
  }

  /**
   * Extract date from OCR result
   */
  extractDate(ocrResult) {
    if (!ocrResult || !ocrResult.date) return null;

    try {
      const date = new Date(ocrResult.date);
      if (isNaN(date.getTime())) return null;
      return date;
    } catch (err) {
      return null;
    }
  }

  /**
   * Generate month folder name
   */
  getMonthFolderName(date) {
    const months = [
      'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
      'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
    ];
    
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    return `${month} ${year}`;
  }

  /**
   * Generate new filename
   */
  generateFilename(ocrResult, originalName) {
    const date = this.extractDate(ocrResult);
    if (!date) return originalName;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    const vendor = ocrResult.vendor || 'Unknown';
    const cleanVendor = vendor.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, '_');

    const amount = ocrResult.total || '0.00';
    const cleanAmount = String(amount).replace('.', ',');

    const ext = path.extname(originalName);
    
    return `${year}-${month}-${day}_${cleanVendor}_${cleanAmount}${ext}`;
  }

  /**
   * Handle duplicate filenames
   */
  async getUniqueFilename(folderId, baseName) {
    const ext = path.extname(baseName);
    const nameWithoutExt = baseName.slice(0, -ext.length);

    let counter = 1;
    let testName = baseName;

    while (true) {
      const exists = await this.gdrive.checkFolderExists(folderId, testName);
      if (!exists) return testName;

      testName = `${nameWithoutExt}_${String(counter).padStart(3, '0')}${ext}`;
      counter++;

      if (counter > 999) {
        throw new Error(`Too many duplicates for: ${baseName}`);
      }
    }
  }

  /**
   * Ensure month folder exists
   */
  async ensureMonthFolder(year, monthName) {
    await this.gdrive.authenticate();

    // Get target root folder ID
    const rootId = await this.gdrive.getFolderIdByPath([this.targetRoot]);

    // Check/create year folder
    let yearFolderId = await this.gdrive.checkFolderExists(rootId, String(year));
    if (!yearFolderId) {
      yearFolderId = await this.gdrive.createFolder(rootId, String(year));
    }

    // Check/create month folder
    let monthFolderId = await this.gdrive.checkFolderExists(yearFolderId, monthName);
    if (!monthFolderId) {
      monthFolderId = await this.gdrive.createFolder(yearFolderId, monthName);
    }

    return monthFolderId;
  }

  /**
   * Ensure uncategorized folder exists
   */
  async ensureUncategorizedFolder() {
    await this.gdrive.authenticate();

    const segments = this.uncategorized.split('/').filter(s => s);
    const rootId = 'root';

    let currentId = rootId;
    for (const segment of segments) {
      let folderId = await this.gdrive.checkFolderExists(currentId, segment);
      if (!folderId) {
        folderId = await this.gdrive.createFolder(currentId, segment);
      }
      currentId = folderId;
    }

    return currentId;
  }

  /**
   * File single receipt
   */
  async fileReceipt(fileId, fileName, ocrResult, categorization, dryRun = false) {
    const date = this.extractDate(ocrResult);
    
    let targetFolderId;
    let targetPath;

    if (!date) {
      // No valid date → Uncategorized
      console.log(`⚠️  No date found for ${fileName} → Uncategorized`);
      targetFolderId = await this.ensureUncategorizedFolder();
      targetPath = this.uncategorized;
    } else {
      // Valid date → Month folder
      const year = date.getFullYear();
      const monthName = this.getMonthFolderName(date);
      targetFolderId = await this.ensureMonthFolder(year, monthName);
      targetPath = `${this.targetRoot}/${year}/${monthName}`;
    }

    // Generate new filename
    const newFilename = this.generateFilename(ocrResult, fileName);
    const uniqueFilename = await this.getUniqueFilename(targetFolderId, newFilename);

    console.log(`📁 ${fileName} → ${targetPath}/${uniqueFilename}`);

    if (dryRun) {
      return { success: true, path: `${targetPath}/${uniqueFilename}`, dryRun: true };
    }

    try {
      // Rename file
      await this.gdrive.renameFile(fileId, uniqueFilename);

      // Move to target folder
      await this.gdrive.moveFile(fileId, targetFolderId);

      return {
        success: true,
        fileId: fileId,
        originalName: fileName,
        newName: uniqueFilename,
        path: targetPath,
        date: date ? date.toISOString() : null
      };
    } catch (err) {
      console.error(`❌ Failed to file ${fileName}:`, err.message);
      return {
        success: false,
        fileId: fileId,
        originalName: fileName,
        error: err.message
      };
    }
  }

  /**
   * File all approved receipts
   */
  async fileAll(options = {}) {
    const { dryRun = false, year = null, force = false } = options;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Google Drive Auto-Filing ${dryRun ? '(DRY RUN)' : ''}`);
    console.log(`${'='.repeat(60)}\n`);

    // Load caches
    const ocrCache = await this.loadOcrCache();
    const categorizationCache = await this.loadCategorizationCache();
    const filingDb = await this.loadFilingDb();

    // Get all receipts from categorization cache
    const receipts = Object.keys(categorizationCache)
      .map(fileName => ({
        fileName: fileName,
        ...categorizationCache[fileName],
        ocr: ocrCache[fileName]
      }))
      .filter(r => {
        // Filter by year if specified
        if (year) {
          const date = this.extractDate(r.ocr);
          if (!date || date.getFullYear() !== year) return false;
        }

        // Filter by approval status
        if (!r.approved && r.confidence < 0.9) return false;

        // Skip already filed unless force
        if (!force && filingDb.filed.includes(r.fileName)) return false;

        return true;
      });

    if (receipts.length === 0) {
      console.log('No receipts to file.');
      return;
    }

    console.log(`Found ${receipts.length} receipts to file\n`);

    const results = {
      success: [],
      failed: [],
      total: receipts.length
    };

    for (const receipt of receipts) {
      const result = await this.fileReceipt(
        receipt.fileId,
        receipt.fileName,
        receipt.ocr || {},
        receipt,
        dryRun
      );

      if (result.success) {
        results.success.push(result);
        if (!dryRun) {
          filingDb.filed.push(receipt.fileName);
        }
      } else {
        results.failed.push(result);
        if (!dryRun) {
          filingDb.failed.push({
            fileName: receipt.fileName,
            error: result.error,
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    // Save filing database
    if (!dryRun) {
      await this.saveFilingDb(filingDb);
    }

    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Filing Summary`);
    console.log(`${'='.repeat(60)}`);
    console.log(`✅ Success: ${results.success.length}`);
    console.log(`❌ Failed:  ${results.failed.length}`);
    console.log(`📊 Total:   ${results.total}`);
    
    if (results.failed.length > 0) {
      console.log(`\nFailed receipts:`);
      results.failed.forEach(f => {
        console.log(`  - ${f.originalName}: ${f.error}`);
      });
    }

    return results;
  }
}

module.exports = GDriveFiler;
