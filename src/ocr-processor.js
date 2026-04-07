/**
 * OCR Pipeline for Receipt Processing
 * Supports: Tesseract.js (local, free), Google Vision API, AWS Textract
 */

const Tesseract = require('tesseract.js');
const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const pdfParse = require('pdf-parse');

class OCRProcessor {
  constructor(provider = 'tesseract') {
    this.provider = provider;
    this.cache = new Map();
  }

  /**
   * Extract text from PDF or image
   */
  async extractText(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.pdf') {
      return await this.extractFromPDF(filePath);
    } else if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
      return await this.extractFromImage(filePath);
    } else {
      throw new Error(`Unsupported file type: ${ext}`);
    }
  }

  async extractFromPDF(filePath) {
    const dataBuffer = await fs.readFile(filePath);
    
    try {
      // Try text extraction first (for digital PDFs)
      const data = await pdfParse(dataBuffer);
      if (data.text && data.text.trim().length > 50) {
        return { text: data.text, confidence: 1.0, method: 'pdf-text' };
      }
    } catch (err) {
      console.log('PDF text extraction failed, falling back to OCR');
    }

    // Convert first page to image for OCR
    // Note: For production, use pdf2image or similar
    return await this.extractFromImage(filePath);
  }

  async extractFromImage(filePath) {
    // Preprocess image for better OCR accuracy
    const processedPath = filePath + '.processed.png';
    await sharp(filePath)
      .greyscale()
      .normalize()
      .sharpen()
      .png()
      .toFile(processedPath);

    let result;
    switch (this.provider) {
      case 'tesseract':
        result = await this.tesseractOCR(processedPath);
        break;
      case 'google-vision':
        result = await this.googleVisionOCR(processedPath);
        break;
      case 'aws-textract':
        result = await this.awsTextractOCR(processedPath);
        break;
      default:
        throw new Error(`Unknown OCR provider: ${this.provider}`);
    }

    // Cleanup
    await fs.unlink(processedPath).catch(() => {});
    return result;
  }

  async tesseractOCR(imagePath) {
    const { data } = await Tesseract.recognize(imagePath, 'deu', {
      logger: m => {
        if (m.status === 'recognizing text') {
          process.stdout.write(`\rOCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });
    
    console.log(); // New line after progress
    return {
      text: data.text,
      confidence: data.confidence / 100,
      method: 'tesseract'
    };
  }

  async googleVisionOCR(imagePath) {
    // Placeholder for Google Vision API
    // Requires: npm install @google-cloud/vision
    throw new Error('Google Vision not implemented yet. Use tesseract or implement this.');
  }

  async awsTextractOCR(imagePath) {
    // Placeholder for AWS Textract
    // Requires: npm install @aws-sdk/client-textract
    throw new Error('AWS Textract not implemented yet. Use tesseract or implement this.');
  }

  /**
   * Extract structured data from OCR text
   */
  parseReceiptData(text, filename) {
    const data = {
      filename,
      raw_text: text,
      date: this.extractDate(text),
      vendor: this.extractVendor(text),
      amount_gross: this.extractAmount(text, 'gross'),
      amount_net: this.extractAmount(text, 'net'),
      tax_rate: this.extractTaxRate(text),
      tax_amount: this.extractTaxAmount(text),
      description: this.extractDescription(text),
      invoice_number: this.extractInvoiceNumber(text),
      confidence: 0.0
    };

    // Calculate confidence based on extracted fields
    data.confidence = this.calculateConfidence(data);
    
    // Auto-calculate missing values
    if (data.amount_gross && data.tax_rate && !data.amount_net) {
      data.amount_net = data.amount_gross / (1 + data.tax_rate / 100);
      data.tax_amount = data.amount_gross - data.amount_net;
    }

    return data;
  }

  extractDate(text) {
    // German date formats: DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY
    const patterns = [
      /\b(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})\b/,
      /\b(\d{4})-(\d{2})-(\d{2})\b/, // ISO format
      /Datum[:\s]+(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/i,
      /Rechnungsdatum[:\s]+(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        if (pattern === patterns[1]) {
          // ISO format YYYY-MM-DD
          return `${match[1]}-${match[2]}-${match[3]}`;
        } else {
          // Convert DD.MM.YYYY to YYYY-MM-DD
          const day = match[1].padStart(2, '0');
          const month = match[2].padStart(2, '0');
          const year = match[3];
          return `${year}-${month}-${day}`;
        }
      }
    }
    return null;
  }

  extractVendor(text) {
    // Look for common vendor indicators
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    // First non-empty line is often the vendor
    if (lines.length > 0) {
      return lines[0].substring(0, 100);
    }
    
    return null;
  }

  extractAmount(text, type = 'gross') {
    const patterns = {
      gross: [
        /Gesamt(?:betrag)?[:\s]+([€]?\s*[\d.,]+)/i,
        /Brutto[:\s]+([€]?\s*[\d.,]+)/i,
        /Total[:\s]+([€]?\s*[\d.,]+)/i,
        /Summe[:\s]+([€]?\s*[\d.,]+)/i,
        /Betrag[:\s]+([€]?\s*[\d.,]+)/i
      ],
      net: [
        /Netto[:\s]+([€]?\s*[\d.,]+)/i,
        /Zwischensumme[:\s]+([€]?\s*[\d.,]+)/i
      ]
    };

    for (const pattern of patterns[type]) {
      const match = text.match(pattern);
      if (match) {
        return this.parseGermanNumber(match[1]);
      }
    }

    // Fallback: find largest number that looks like money
    if (type === 'gross') {
      const allNumbers = text.match(/[\d]+[.,][\d]{2}\b/g) || [];
      const amounts = allNumbers.map(n => this.parseGermanNumber(n)).filter(n => n > 0);
      return amounts.length > 0 ? Math.max(...amounts) : null;
    }

    return null;
  }

  extractTaxRate(text) {
    const match = text.match(/(\d{1,2})\s*%\s*(?:MwSt|USt|VAT)/i);
    if (match) {
      return parseInt(match[1]);
    }
    
    // Common German VAT rates
    if (text.match(/19\s*%/)) return 19;
    if (text.match(/7\s*%/)) return 7;
    
    return null;
  }

  extractTaxAmount(text) {
    const patterns = [
      /(?:MwSt|USt|VAT)[:\s]+([€]?\s*[\d.,]+)/i,
      /Steuer[:\s]+([€]?\s*[\d.,]+)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return this.parseGermanNumber(match[1]);
      }
    }
    return null;
  }

  extractDescription(text) {
    // Extract meaningful description (line with keywords)
    const keywords = ['Leistung', 'Beschreibung', 'Position', 'Artikel', 'Service', 'Produkt'];
    const lines = text.split('\n').map(l => l.trim());
    
    for (const line of lines) {
      for (const keyword of keywords) {
        if (line.toLowerCase().includes(keyword.toLowerCase())) {
          return line.substring(0, 200);
        }
      }
    }
    
    // Fallback: 2nd or 3rd line
    return lines.slice(1, 3).join(' ').substring(0, 200) || null;
  }

  extractInvoiceNumber(text) {
    const patterns = [
      /Rechnungsnr[.:\s]+([A-Z0-9\-\/]+)/i,
      /Rechnung[:\s]+([A-Z0-9\-\/]+)/i,
      /Invoice[:\s]+([A-Z0-9\-\/]+)/i,
      /Nr[.:\s]+([A-Z0-9\-\/]+)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  parseGermanNumber(str) {
    // Convert German number format (1.234,56) to English (1234.56)
    const cleaned = str.replace(/[€\s]/g, '').replace(/\./g, '').replace(/,/, '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : Math.round(num * 100) / 100;
  }

  calculateConfidence(data) {
    let score = 0;
    let maxScore = 0;

    const checks = [
      { field: 'date', weight: 20 },
      { field: 'vendor', weight: 15 },
      { field: 'amount_gross', weight: 25 },
      { field: 'amount_net', weight: 10 },
      { field: 'tax_rate', weight: 10 },
      { field: 'tax_amount', weight: 10 },
      { field: 'invoice_number', weight: 10 }
    ];

    for (const check of checks) {
      maxScore += check.weight;
      if (data[check.field] !== null && data[check.field] !== undefined) {
        score += check.weight;
      }
    }

    return Math.round((score / maxScore) * 100) / 100;
  }
}

module.exports = OCRProcessor;
