# Lexware Office API Connector

Integration module for syncing bookkeeping vouchers from Lexware Office to the German Tax Assistant pipeline.

## Features

✅ **Authentication** — Bearer token auth with connection test  
✅ **Voucher Sync** — Download all bookkeeping entries + attached receipts  
✅ **Rate Limiting** — Token bucket algorithm (2 req/s) with exponential backoff  
✅ **Incremental Sync** — Track last sync, only fetch new/updated vouchers  
✅ **Auto-Registration** — Integrate with receipt-tracking.js  
✅ **Local Storage** — Files organized by YYYY-MM folders  
✅ **Pagination** — Handle large voucher collections  
✅ **Error Handling** — Graceful retry on 429, clear auth errors

## API Documentation

**Base URL:** https://api.lexware.io  
**Rate Limit:** 2 requests/second  
**Docs:** https://developers.lexware.io/docs/

## Setup

1. **Get API Key**
   - Log in to Lexware Office: https://app.lexware.de
   - Go to Settings → Addons → Public API
   - Generate new API key

2. **Save API Key**
   ```bash
   node lexware-connector.js auth YOUR_API_KEY_HERE
   ```
   
   This creates a `.env` file (already in .gitignore):
   ```
   LEXWARE_API_KEY=your_key_here
   ```

3. **Test Connection**
   ```bash
   node lexware-connector.js auth
   ```

## Usage

### Full Sync (All Vouchers)
```bash
node lexware-connector.js sync
```

Downloads:
- All bookkeeping vouchers (invoices, credit notes, etc.)
- Attached files (scanned receipts, PDFs)
- Organized into `./lexware-sync/YYYY-MM/` folders
- Metadata saved to `./lexware-sync/metadata.json`
- Auto-registered in `receipt-tracking.js`

### Incremental Sync (Since Date)
```bash
node lexware-connector.js sync --since 2024-01-01
```

Only fetches vouchers updated since the specified date.

### List All Vouchers (No Download)
```bash
node lexware-connector.js list
```

### Download Single Voucher
```bash
node lexware-connector.js download <voucher-id>
```

## File Structure

After sync, your directory looks like:

```
lexware-sync/
├── 2024-03/
│   ├── RE-001.json          # Voucher metadata
│   ├── RE-001.pdf           # Attached receipt
│   ├── RE-002.json
│   └── RE-002.pdf
├── 2024-04/
│   ├── RE-003.json
│   └── RE-003.pdf
└── metadata.json            # Sync tracking
```

**metadata.json:**
```json
{
  "last_sync": "2024-04-07T18:00:00.000Z",
  "vouchers": {
    "e9066f04-8cc7-4616-93f8-ac9ecc8479c8": {
      "voucher_number": "RE-001",
      "date": "2024-03-15",
      "synced_at": "2024-04-07T18:00:00.000Z"
    }
  }
}
```

## Integration with Pipeline

Each synced voucher is automatically registered in `receipt-tracking.js`:

```javascript
const receiptData = {
  date: '2024-03-15',
  vendor: 'Young Living GmbH',
  amount: 150.00,
  category: 'Wareneinkauf (MLM)',
  status: 'paid',
  file_path: './lexware-sync/2024-03/RE-001.pdf'
};

registerReceipt(receiptData);
```

This enables:
- Finanzamt-compliant receipt numbering (YYYY-MM-NNNNN)
- Payment tracking
- Automatic categorization via `integrate.js`

## Rate Limiting

**Token Bucket Algorithm:**
- Capacity: 2 tokens
- Refill: 2 tokens/second
- Consumes 1 token per request
- Waits when bucket empty

**429 Handling:**
- Exponential backoff: 2s, 4s, 8s
- Max 3 retries
- Respects Retry-After header (future enhancement)

## Error Handling

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Continue |
| 401/403 | Auth failed | Check API key |
| 404 | Not found | Skip |
| 429 | Rate limited | Retry with backoff |
| 5xx | Server error | Retry |

## Voucher Types

The connector handles all Lexware voucher types:
- Invoices (RE-*)
- Credit Notes (GS-*)
- Delivery Notes (LS-*)
- Quotations (AN-*)
- Bookkeeping entries

Each includes:
- Metadata (vendor, amount, date, tax info)
- Attached files (PDF, images)
- Line items (products/services)
- Payment status

## Testing

```bash
node test-lexware-connector.js
```

Tests:
- ✅ API key management
- ✅ Rate limiting (token bucket)
- ✅ Pagination handling
- ✅ File download
- ✅ Metadata tracking
- ✅ Integration with receipt-tracking
- ✅ Incremental sync
- ✅ Error handling (429, 401, 403)
- ✅ Exponential backoff

## Security

- **API Key:** Stored in `.env` (not committed to Git)
- **HTTPS Only:** All requests over TLS
- **Bearer Token:** Industry-standard OAuth2-style auth
- **No External Dependencies:** Only Node.js built-ins

## Development

**No external npm packages required.**  
Uses only Node.js built-in modules:
- `https` — API requests
- `fs` — File I/O
- `path` — Path manipulation

**Why?**
- Zero supply-chain risk
- Fast startup (no node_modules)
- Easy to audit

## Troubleshooting

### "API key not found"
Create `.env` file:
```bash
echo "LEXWARE_API_KEY=your_key" > .env
```

### "Authentication failed"
1. Check API key is valid
2. Test in Lexware web UI
3. Regenerate if needed

### "Rate limited"
- Normal behavior
- Connector auto-retries
- Wait 30s if persistent

### "No vouchers synced"
- Check date range (`--since`)
- Verify vouchers exist in Lexware
- Check API key permissions

## Roadmap

- [ ] Webhook support (real-time sync)
- [ ] Multi-organization support
- [ ] Custom field mapping
- [ ] Advanced filters (by category, contact)
- [ ] Export to EÜR format
- [ ] Two-way sync (create vouchers via API)

## API Reference

**Endpoints Used:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/profile` | GET | Auth test |
| `/v1/vouchers` | GET | List vouchers |
| `/v1/vouchers/{id}` | GET | Get single voucher |
| `/v1/files/{id}` | GET | Download file |

**Full API Docs:** https://developers.lexware.io/docs/

## License

MIT (same as parent project)

## Support

Issues? Open a GitHub issue or check:
- Lexware API Docs: https://developers.lexware.io/docs/
- Lexware Support: https://support.lexware.de/
