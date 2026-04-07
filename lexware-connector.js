#!/usr/bin/env node

/**
 * Lexware Office API Integration Module
 * 
 * Features:
 * - Authentication & connection verification
 * - List vouchers (bookkeeping entries) with pagination
 * - Download voucher files (scanned receipts)
 * - Sync all vouchers + files to local folder
 * - Rate limiting (token bucket, max 2 req/s)
 * - Incremental sync (track last sync date)
 * - Auto-registration with receipt-tracking.js
 * 
 * API Documentation: https://developers.lexware.io/docs/
 * Base URL: https://api.lexware.io
 * Rate Limit: 2 requests/second
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { registerReceipt } = require('./receipt-tracking.js');

// Configuration
const CONFIG_FILE = path.join(__dirname, '.env');
const SYNC_DIR = path.join(__dirname, 'lexware-sync');
const METADATA_FILE = path.join(SYNC_DIR, 'metadata.json');
const BASE_URL = 'api.lexware.io';

// Token bucket for rate limiting
class TokenBucket {
  constructor(capacity = 2, refillRate = 2) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillRate = refillRate; // tokens per second
    this.lastRefill = Date.now();
  }
  
  async consume(tokens = 1) {
    // Refill bucket based on elapsed time
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
    
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    
    // Wait until we have enough tokens
    const waitTime = ((tokens - this.tokens) / this.refillRate) * 1000;
    await new Promise(resolve => setTimeout(resolve, waitTime));
    this.tokens = 0;
    this.lastRefill = Date.now();
    return true;
  }
}

const rateLimiter = new TokenBucket();

/**
 * Load API key from .env file
 */
function loadApiKey() {
  if (!fs.existsSync(CONFIG_FILE)) {
    throw new Error('.env file not found. Please create it with: LEXWARE_API_KEY=your_key');
  }
  
  const envContent = fs.readFileSync(CONFIG_FILE, 'utf8');
  const match = envContent.match(/LEXWARE_API_KEY=(.+)/);
  
  if (!match) {
    throw new Error('LEXWARE_API_KEY not found in .env file');
  }
  
  return match[1].trim();
}

/**
 * Save API key to .env file
 */
function saveApiKey(apiKey) {
  let envContent = '';
  
  if (fs.existsSync(CONFIG_FILE)) {
    envContent = fs.readFileSync(CONFIG_FILE, 'utf8');
    if (envContent.includes('LEXWARE_API_KEY=')) {
      envContent = envContent.replace(/LEXWARE_API_KEY=.+/, `LEXWARE_API_KEY=${apiKey}`);
    } else {
      envContent += `\nLEXWARE_API_KEY=${apiKey}`;
    }
  } else {
    envContent = `LEXWARE_API_KEY=${apiKey}`;
  }
  
  fs.writeFileSync(CONFIG_FILE, envContent);
  console.log('✅ API key saved to .env');
}

/**
 * Make HTTP request with rate limiting and retry logic
 */
async function makeRequest(endpoint, method = 'GET', data = null, retries = 3) {
  await rateLimiter.consume();
  
  const apiKey = loadApiKey();
  
  const options = {
    hostname: BASE_URL,
    path: endpoint,
    method: method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', async () => {
        // Handle rate limiting (429)
        if (res.statusCode === 429) {
          if (retries > 0) {
            const waitTime = Math.pow(2, 4 - retries) * 1000; // Exponential backoff
            console.log(`⚠️  Rate limited. Waiting ${waitTime}ms before retry...`);
            await new Promise(r => setTimeout(r, waitTime));
            const result = await makeRequest(endpoint, method, data, retries - 1);
            resolve(result);
          } else {
            reject(new Error('Rate limit exceeded after all retries'));
          }
          return;
        }
        
        // Handle auth errors
        if (res.statusCode === 401 || res.statusCode === 403) {
          reject(new Error('Authentication failed. Please check your API key.'));
          return;
        }
        
        // Handle other errors
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
          return;
        }
        
        // Success
        try {
          const parsed = responseData ? JSON.parse(responseData) : null;
          resolve({
            statusCode: res.statusCode,
            data: parsed
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: responseData
          });
        }
      });
    });
    
    req.on('error', (e) => {
      reject(new Error(`Network error: ${e.message}`));
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

/**
 * Download binary file (receipt image/PDF)
 */
async function downloadFile(fileId, outputPath, retries = 3) {
  await rateLimiter.consume();

  const apiKey = loadApiKey();

  const options = {
    hostname: BASE_URL,
    path: `/v1/files/${fileId}`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, async (res) => {
      if (res.statusCode === 404) {
        res.resume(); // drain
        resolve(null); // File not found (no receipt attached)
        return;
      }

      if (res.statusCode === 429) {
        res.resume(); // drain
        if (retries > 0) {
          const waitTime = Math.pow(2, 4 - retries) * 1000;
          console.log(`   Rate limited on download. Waiting ${waitTime}ms...`);
          await new Promise(r => setTimeout(r, waitTime));
          try {
            resolve(await downloadFile(fileId, outputPath, retries - 1));
          } catch (e) {
            reject(e);
          }
        } else {
          reject(new Error('Rate limit exceeded downloading file'));
        }
        return;
      }

      if (res.statusCode !== 200) {
        res.resume(); // drain
        reject(new Error(`Download failed: HTTP ${res.statusCode}`));
        return;
      }

      // Ensure directory exists
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const fileStream = fs.createWriteStream(outputPath);
      res.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve(outputPath);
      });

      fileStream.on('error', (e) => reject(new Error(`File write error: ${e.message}`)));
    });

    req.on('error', (e) => {
      reject(new Error(`Download error: ${e.message}`));
    });

    req.end();
  });
}

/**
 * Test authentication
 */
async function testAuth(apiKey) {
  if (apiKey) {
    saveApiKey(apiKey);
  }
  
  try {
    console.log('🔐 Testing connection to Lexware API...');
    
    // Test with profile endpoint (always available)
    const result = await makeRequest('/v1/profile');
    
    if (result.statusCode === 200) {
      console.log('✅ Authentication successful!');
      console.log(`   Organization: ${result.data.organizationId || 'N/A'}`);
      return true;
    }
    
    return false;
  } catch (e) {
    console.error(`❌ Authentication failed: ${e.message}`);
    return false;
  }
}

/**
 * List all vouchers with pagination
 */
async function listVouchers(options = {}) {
  const vouchers = [];
  let page = 0;
  let hasMore = true;
  
  const filters = [];
  if (options.since) {
    filters.push(`updatedDate=${options.since}`);
  }
  
  const filterQuery = filters.length > 0 ? '&' + filters.join('&') : '';
  
  console.log('📋 Fetching vouchers...');
  
  while (hasMore) {
    const endpoint = `/v1/vouchers?page=${page}&size=25${filterQuery}`;
    
    try {
      const result = await makeRequest(endpoint);
      
      if (result.data && result.data.content) {
        vouchers.push(...result.data.content);
        hasMore = !result.data.last;
        page++;
        
        console.log(`   Fetched page ${page} (${vouchers.length} total)`);
      } else {
        hasMore = false;
      }
    } catch (e) {
      console.error(`⚠️  Error fetching page ${page}: ${e.message}`);
      hasMore = false;
    }
  }
  
  console.log(`✅ Retrieved ${vouchers.length} vouchers`);
  return vouchers;
}

/**
 * Download single voucher + files
 */
async function downloadVoucher(voucherId, targetDir) {
  console.log(`📥 Downloading voucher ${voucherId}...`);
  
  try {
    // Get voucher details
    const result = await makeRequest(`/v1/vouchers/${voucherId}`);
    const voucher = result.data;
    
    if (!voucher) {
      console.error('❌ Voucher not found');
      return null;
    }
    
    // Create month folder (YYYY-MM)
    const voucherDate = new Date(voucher.voucherDate || voucher.createdDate);
    const yearMonth = `${voucherDate.getFullYear()}-${String(voucherDate.getMonth() + 1).padStart(2, '0')}`;
    const monthDir = path.join(targetDir, yearMonth);
    
    if (!fs.existsSync(monthDir)) {
      fs.mkdirSync(monthDir, { recursive: true });
    }
    
    // Save voucher metadata
    const voucherFile = path.join(monthDir, `${voucher.voucherNumber || voucherId}.json`);
    fs.writeFileSync(voucherFile, JSON.stringify(voucher, null, 2));
    
    // Download attached files (if any)
    const files = [];
    if (voucher.files && voucher.files.documentFileId) {
      const fileId = voucher.files.documentFileId;
      const ext = voucher.documentFileType || 'pdf';
      const filePath = path.join(monthDir, `${voucher.voucherNumber || voucherId}.${ext}`);
      
      const downloaded = await downloadFile(fileId, filePath);
      if (downloaded) {
        files.push(downloaded);
        console.log(`   ✅ Downloaded file: ${path.basename(filePath)}`);
      }
    }
    
    return {
      voucher,
      files
    };
  } catch (e) {
    console.error(`❌ Error downloading voucher: ${e.message}`);
    return null;
  }
}

/**
 * Sync all vouchers to local folder
 */
async function syncVouchers(options = {}) {
  console.log('\n🔄 Starting Lexware sync...');
  console.log('═'.repeat(60));
  
  // Ensure sync directory exists
  if (!fs.existsSync(SYNC_DIR)) {
    fs.mkdirSync(SYNC_DIR, { recursive: true });
  }
  
  // Load metadata (last sync date)
  let metadata = { last_sync: null, vouchers: {} };
  if (fs.existsSync(METADATA_FILE)) {
    metadata = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8'));
  }
  
  // Determine sync window
  const since = options.since || metadata.last_sync;
  
  if (since) {
    console.log(`📅 Incremental sync since: ${since}`);
  } else {
    console.log('📅 Full sync (all vouchers)');
  }
  
  // Fetch vouchers
  const vouchers = await listVouchers({ since });
  
  if (vouchers.length === 0) {
    console.log('✅ No new vouchers to sync');
    return;
  }
  
  // Download each voucher
  let downloadedCount = 0;
  let registeredCount = 0;
  
  for (const voucher of vouchers) {
    const result = await downloadVoucher(voucher.id, SYNC_DIR);
    
    if (result) {
      downloadedCount++;
      
      // Register in receipt tracking
      try {
        const receiptData = {
          date: voucher.voucherDate || voucher.createdDate,
          vendor: voucher.address?.name || 'Unknown',
          amount: voucher.totalPrice?.totalGrossAmount || 0,
          category: voucher.category || 'Sonstige',
          eur_account: null, // Will be categorized later
          vat_rate: voucher.taxConditions?.taxType === 'net' ? 19 : 0,
          status: voucher.voucherStatus === 'paidoff' ? 'paid' : 'open',
          file_path: result.files[0] || null
        };
        
        registerReceipt(receiptData);
        registeredCount++;
      } catch (e) {
        console.log(`   ⚠️  Could not register in receipt-tracking: ${e.message}`);
      }
      
      // Update metadata
      metadata.vouchers[voucher.id] = {
        voucher_number: voucher.voucherNumber,
        date: voucher.voucherDate || voucher.createdDate,
        synced_at: new Date().toISOString()
      };
    }
  }
  
  // Update last sync timestamp
  metadata.last_sync = new Date().toISOString();
  fs.writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2));
  
  console.log('\n═'.repeat(60));
  console.log('✅ SYNC COMPLETE');
  console.log('═'.repeat(60));
  console.log(`   Vouchers fetched:    ${vouchers.length}`);
  console.log(`   Vouchers downloaded: ${downloadedCount}`);
  console.log(`   Registered in tracking: ${registeredCount}`);
  console.log(`   Sync directory: ${SYNC_DIR}`);
  console.log('═'.repeat(60));
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  (async () => {
    try {
      switch (command) {
        case 'auth':
          if (!args[1]) {
            console.log('Usage: node lexware-connector.js auth <api-key>');
            process.exit(1);
          }
          await testAuth(args[1]);
          break;
          
        case 'sync':
          const sinceIdx = args.indexOf('--since');
          const since = sinceIdx > 0 ? args[sinceIdx + 1] : null;
          await syncVouchers({ since });
          break;
          
        case 'list':
          const vouchers = await listVouchers();
          console.log(JSON.stringify(vouchers, null, 2));
          break;
          
        case 'download':
          if (!args[1]) {
            console.log('Usage: node lexware-connector.js download <voucher-id>');
            process.exit(1);
          }
          await downloadVoucher(args[1], SYNC_DIR);
          break;
          
        default:
          console.log(`
Lexware Office API Connector

Usage:
  node lexware-connector.js auth <api-key>        Test connection & save API key
  node lexware-connector.js sync                  Full sync
  node lexware-connector.js sync --since 2024-01-01  Incremental sync
  node lexware-connector.js list                  List all vouchers
  node lexware-connector.js download <voucher-id> Download single voucher

Examples:
  node lexware-connector.js auth abc123xyz...
  node lexware-connector.js sync
  node lexware-connector.js sync --since 2024-03-01
  node lexware-connector.js download e9066f04-8cc7-4616-93f8-ac9ecc8479c8

API Documentation: https://developers.lexware.io/docs/
          `);
      }
    } catch (e) {
      console.error(`\n❌ Error: ${e.message}\n`);
      process.exit(1);
    }
  })();
}

module.exports = {
  TokenBucket,
  testAuth,
  listVouchers,
  downloadVoucher,
  syncVouchers
};
