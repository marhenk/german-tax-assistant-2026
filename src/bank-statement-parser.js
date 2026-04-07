/**
 * Bank Statement Parser
 * Supports CSV (German banks), MT940, and PDF statements
 */

const fs = require('fs').promises;
const { parse } = require('csv-parse/sync');
const levenshtein = require('fast-levenshtein');

class BankStatementParser {
  constructor() {
    this.transactions = [];
  }

  /**
   * Parse bank statement file
   */
  async parse(filePath) {
    const ext = filePath.toLowerCase().split('.').pop();
    
    if (ext === 'csv') {
      return await this.parseCSV(filePath);
    } else if (ext === 'mt940' || ext === 'sta') {
      return await this.parseMT940(filePath);
    } else if (ext === 'pdf') {
      return await this.parsePDF(filePath);
    } else {
      throw new Error(`Unsupported bank statement format: ${ext}`);
    }
  }

  async parseCSV(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Detect CSV dialect (German banks vary)
    const delimiter = content.includes(';') ? ';' : ',';
    
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      delimiter: delimiter,
      relax_quotes: true,
      trim: true
    });

    this.transactions = records.map(record => this.normalizeCSVRecord(record));
    return this.transactions;
  }

  normalizeCSVRecord(record) {
    // Common German bank CSV formats
    // Sparkasse: "Buchungstag";"Valutadatum";"Auftraggeber/Empfänger";"Buchungstext";"Verwendungszweck";"Betrag"
    // DKB: "Buchungstag";"Wertstellung";"Buchungstext";"Auftraggeber / Begünstigter";"Verwendungszweck";"Betrag (EUR)"
    // N26: "Date";"Payee";"Account number";"Transaction type";"Payment reference";"Amount (EUR)"

    const dateField = record['Buchungstag'] || record['Date'] || record['Datum'];
    const counterpartyField = record['Auftraggeber/Empfänger'] || 
                              record['Auftraggeber / Begünstigter'] || 
                              record['Empfänger'] ||
                              record['Payee'];
    const purposeField = record['Verwendungszweck'] || 
                         record['Payment reference'] || 
                         record['Buchungstext'];
    const amountField = record['Betrag'] || 
                        record['Betrag (EUR)'] || 
                        record['Amount (EUR)'] ||
                        record['Umsatz'];

    return {
      date: this.parseDate(dateField),
      counterparty: counterpartyField?.trim() || '',
      purpose: purposeField?.trim() || '',
      amount: this.parseAmount(amountField),
      raw: record
    };
  }

  async parseMT940(filePath) {
    // MT940/SWIFT format parser
    // Format: https://www.sepaforcorporates.com/swift-for-corporates/account-statement-mt940-file-format-overview/
    const content = await fs.readFile(filePath, 'utf-8');
    
    const transactions = [];
    const lines = content.split('\n');
    
    let currentTransaction = null;
    
    for (const line of lines) {
      if (line.startsWith(':61:')) {
        // Statement Line: :61:YYMMDD[MMDD]CD[Amount]...
        if (currentTransaction) transactions.push(currentTransaction);
        
        const dateStr = line.substring(4, 10); // YYMMDD
        const cdMark = line.substring(10, 11); // C (credit) or D (debit)
        const amountMatch = line.match(/:61:\d{6}[CD]([\d,]+)/);
        
        currentTransaction = {
          date: this.parseMT940Date(dateStr),
          amount: amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : 0,
          type: cdMark === 'C' ? 'credit' : 'debit',
          counterparty: '',
          purpose: ''
        };
      } else if (line.startsWith(':86:') && currentTransaction) {
        // Transaction Details
        currentTransaction.purpose += line.substring(4).trim() + ' ';
      }
    }
    
    if (currentTransaction) transactions.push(currentTransaction);
    
    this.transactions = transactions;
    return transactions;
  }

  async parsePDF(filePath) {
    // For PDF bank statements, use OCR + pattern matching
    // This is a placeholder - implement if needed
    throw new Error('PDF bank statement parsing not yet implemented. Convert to CSV or MT940.');
  }

  /**
   * Match transactions to receipts
   */
  matchReceipts(receipts, toleranceDays = 3, tolerancePercent = 0.05) {
    const matches = [];
    const unmatchedTransactions = [];
    const unmatchedReceipts = [];

    const receiptsCopy = [...receipts];
    
    for (const transaction of this.transactions) {
      if (transaction.amount <= 0) continue; // Skip income for now
      
      const transactionDate = new Date(transaction.date);
      
      let bestMatch = null;
      let bestScore = 0;
      let bestIndex = -1;

      receiptsCopy.forEach((receipt, index) => {
        const receiptDate = new Date(receipt.date);
        const daysDiff = Math.abs((transactionDate - receiptDate) / (1000 * 60 * 60 * 24));
        
        if (daysDiff > toleranceDays) return;
        
        const amountDiff = Math.abs(transaction.amount - receipt.amount_gross) / receipt.amount_gross;
        if (amountDiff > tolerancePercent) return;
        
        // Fuzzy match vendor name
        const vendorSimilarity = this.fuzzyMatch(
          transaction.counterparty.toLowerCase(),
          (receipt.vendor || '').toLowerCase()
        );
        
        const score = (1 - daysDiff / toleranceDays) * 0.3 +
                      (1 - amountDiff / tolerancePercent) * 0.4 +
                      vendorSimilarity * 0.3;
        
        if (score > bestScore) {
          bestScore = score;
          bestMatch = receipt;
          bestIndex = index;
        }
      });

      if (bestMatch && bestScore > 0.6) {
        matches.push({
          transaction,
          receipt: bestMatch,
          confidence: bestScore
        });
        receiptsCopy.splice(bestIndex, 1);
      } else {
        unmatchedTransactions.push(transaction);
      }
    }

    unmatchedReceipts.push(...receiptsCopy);

    return {
      matches,
      unmatchedTransactions,
      unmatchedReceipts
    };
  }

  fuzzyMatch(str1, str2) {
    if (!str1 || !str2) return 0;
    
    const distance = levenshtein.get(str1, str2);
    const maxLen = Math.max(str1.length, str2.length);
    return 1 - (distance / maxLen);
  }

  parseDate(dateStr) {
    if (!dateStr) return null;
    
    // Try DD.MM.YYYY
    let match = dateStr.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (match) {
      return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
    }
    
    // Try YYYY-MM-DD
    match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return dateStr;
    }
    
    return null;
  }

  parseMT940Date(yymmdd) {
    const yy = parseInt(yymmdd.substring(0, 2));
    const mm = yymmdd.substring(2, 4);
    const dd = yymmdd.substring(4, 6);
    
    const year = yy > 50 ? 1900 + yy : 2000 + yy;
    return `${year}-${mm}-${dd}`;
  }

  parseAmount(amountStr) {
    if (!amountStr) return 0;
    
    // Remove currency symbols and whitespace
    const cleaned = amountStr.replace(/[€$£\s]/g, '');
    
    // German format: 1.234,56 -> 1234.56
    const germanFormat = cleaned.replace(/\./g, '').replace(',', '.');
    
    const amount = parseFloat(germanFormat);
    return isNaN(amount) ? 0 : Math.abs(amount);
  }
}

module.exports = BankStatementParser;
