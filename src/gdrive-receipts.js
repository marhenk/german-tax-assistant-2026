/**
 * Google Drive Receipt Scanner
 * Scans a folder for PDFs and images, downloads them for processing
 */

const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');
const { createWriteStream } = require('fs');
require('dotenv').config();

class GDriveReceiptScanner {
  constructor() {
    this.cacheDir = process.env.CACHE_DIR || './receipt-cache';
    this.folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    this.drive = null;
    this.processedDb = path.join(this.cacheDir, 'processed.json');
  }

  async authenticate() {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Load saved credentials
    const tokenPath = path.join(this.cacheDir, 'gdrive-token.json');
    try {
      const token = await fs.readFile(tokenPath, 'utf-8');
      oauth2Client.setCredentials(JSON.parse(token));
    } catch (err) {
      throw new Error('No credentials found. Run authentication flow first.');
    }

    this.drive = google.drive({ version: 'v3', auth: oauth2Client });
  }

  /**
   * Scan Google Drive folder for receipts
   */
  async scanFolder(recursive = true) {
    if (!this.drive) await this.authenticate();
    if (!this.folderId) throw new Error('GOOGLE_DRIVE_FOLDER_ID not set');

    await fs.mkdir(this.cacheDir, { recursive: true });

    const receipts = [];
    await this._scanRecursive(this.folderId, receipts, recursive);

    console.log(`Found ${receipts.length} receipt files`);
    return receipts;
  }

  async _scanRecursive(folderId, receipts, recursive) {
    const mimeTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp'
    ];

    const query = `'${folderId}' in parents and trashed=false`;
    
    let pageToken = null;
    do {
      const response = await this.drive.files.list({
        q: query,
        fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime)',
        pageSize: 100,
        pageToken: pageToken
      });

      for (const file of response.data.files) {
        if (mimeTypes.includes(file.mimeType)) {
          receipts.push({
            id: file.id,
            name: file.name,
            mimeType: file.mimeType,
            size: parseInt(file.size),
            created: file.createdTime,
            modified: file.modifiedTime,
            path: file.name
          });
        } else if (recursive && file.mimeType === 'application/vnd.google-apps.folder') {
          await this._scanRecursive(file.id, receipts, recursive);
        }
      }

      pageToken = response.data.nextPageToken;
    } while (pageToken);
  }

  /**
   * Download receipt file
   */
  async downloadFile(fileId, fileName) {
    if (!this.drive) await this.authenticate();

    const destPath = path.join(this.cacheDir, fileName);
    
    // Check if already downloaded
    try {
      await fs.access(destPath);
      console.log(`Already cached: ${fileName}`);
      return destPath;
    } catch (err) {
      // File doesn't exist, download it
    }

    const dest = createWriteStream(destPath);
    
    const response = await this.drive.files.get(
      { fileId: fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    return new Promise((resolve, reject) => {
      response.data
        .on('end', () => {
          console.log(`Downloaded: ${fileName}`);
          resolve(destPath);
        })
        .on('error', err => {
          reject(err);
        })
        .pipe(dest);
    });
  }

  /**
   * Track processed files
   */
  async loadProcessedDb() {
    try {
      const data = await fs.readFile(this.processedDb, 'utf-8');
      return JSON.parse(data);
    } catch (err) {
      return { processed: [], pending: [], failed: [] };
    }
  }

  async saveProcessedDb(db) {
    await fs.writeFile(this.processedDb, JSON.stringify(db, null, 2));
  }

  async markProcessed(fileId, status = 'processed') {
    const db = await this.loadProcessedDb();
    
    // Remove from all lists
    db.processed = db.processed.filter(id => id !== fileId);
    db.pending = db.pending.filter(id => id !== fileId);
    db.failed = db.failed.filter(id => id !== fileId);

    // Add to appropriate list
    db[status].push(fileId);

    await this.saveProcessedDb(db);
  }

  async getUnprocessedFiles(allFiles) {
    const db = await this.loadProcessedDb();
    return allFiles.filter(file => 
      !db.processed.includes(file.id) && !db.failed.includes(file.id)
    );
  }

  /**
   * Create folder in Google Drive
   */
  async createFolder(parentId, folderName) {
    if (!this.drive) await this.authenticate();

    const fileMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId]
    };

    const response = await this.drive.files.create({
      resource: fileMetadata,
      fields: 'id, name'
    });

    console.log(`✓ Created folder: ${folderName} (${response.data.id})`);
    return response.data.id;
  }

  /**
   * Check if folder exists
   */
  async checkFolderExists(parentId, folderName) {
    if (!this.drive) await this.authenticate();

    const query = `name='${folderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    
    const response = await this.drive.files.list({
      q: query,
      fields: 'files(id, name)',
      pageSize: 1
    });

    if (response.data.files.length > 0) {
      return response.data.files[0].id;
    }
    return null;
  }

  /**
   * Upload file to Google Drive
   */
  async uploadFile(folderId, filePath, metadata = {}) {
    if (!this.drive) await this.authenticate();

    const fileName = metadata.name || path.basename(filePath);
    const mimeType = metadata.mimeType || 'application/pdf';

    const fileMetadata = {
      name: fileName,
      parents: [folderId]
    };

    const media = {
      mimeType: mimeType,
      body: require('fs').createReadStream(filePath)
    };

    const response = await this.drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, name'
    });

    console.log(`✓ Uploaded: ${fileName}`);
    return response.data.id;
  }

  /**
   * Move file to target folder
   */
  async moveFile(fileId, targetFolderId) {
    if (!this.drive) await this.authenticate();

    // Get current parents
    const file = await this.drive.files.get({
      fileId: fileId,
      fields: 'parents'
    });

    const previousParents = file.data.parents.join(',');

    // Move to new folder (remove from old, add to new)
    await this.drive.files.update({
      fileId: fileId,
      addParents: targetFolderId,
      removeParents: previousParents,
      fields: 'id, parents'
    });

    console.log(`✓ Moved file ${fileId} to folder ${targetFolderId}`);
  }

  /**
   * Rename file
   */
  async renameFile(fileId, newName) {
    if (!this.drive) await this.authenticate();

    await this.drive.files.update({
      fileId: fileId,
      resource: { name: newName },
      fields: 'id, name'
    });

    console.log(`✓ Renamed to: ${newName}`);
  }

  /**
   * Get folder ID by path
   */
  async getFolderIdByPath(pathSegments, rootId = 'root') {
    if (!this.drive) await this.authenticate();

    let currentId = rootId;

    for (const segment of pathSegments) {
      const folderId = await this.checkFolderExists(currentId, segment);
      
      if (!folderId) {
        throw new Error(`Folder not found: ${segment}`);
      }

      currentId = folderId;
    }

    return currentId;
  }
}

module.exports = GDriveReceiptScanner;
