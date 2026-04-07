# OCR Wiki Domain - Index

**Purpose:** Knowledge base for receipt OCR optimization, targeting 95% accuracy (142/150 points) for the lexoffice-steuer tax receipt processing system.

**Methodology:** Ported from [fitness-screenshot-analysis](~/.openclaw/skills/fitness-screenshot-analysis/) which achieved 95% accuracy through autoresearch.

---

## Quick Navigation

### By Receipt Type
- [Standard Invoice](receipt-patterns/standard-invoice.md) — PDF invoices (AWS, Hetzner) — 95-100% accuracy expected
- [Kassenbon](receipt-patterns/kassenbon.md) — Thermal paper receipts (REWE, dm) — 75-90% accuracy
- [Quittung](receipt-patterns/quittung.md) — Handwritten receipts — 40-80% accuracy
- [Kontoauszug](receipt-patterns/kontoauszug.md) — Bank statements — 100% accuracy (CSV)
- [Thermobeleg](receipt-patterns/thermobeleg.md) — Faded thermal paper — 50-70% accuracy

### By Vendor
- [Hosting](vendor-database/hosting.md) — AWS, Hetzner, DigitalOcean, Netcup
- [Telekom](vendor-database/telekom.md) — Vodafone, Telekom, O2, 1&1
- [Retail](vendor-database/retail.md) — REWE, dm, Edeka, Aldi, Lidl

### By Problem
- [Handwritten Text](edge-cases/handwritten.md) — Tesseract vs. Google Vision, confidence <60%
- [Low Quality Images](edge-cases/low-quality.md) — Blur, skew, low contrast, shadows

### By Extraction Rule
- [Date Parsing](extraction-rules/date-parsing.md) — DD.MM.YYYY, ISO, ambiguity resolution
- [Amount Detection](extraction-rules/amount-detection.md) — Netto/brutto, currency, validation

### Best Practices
- [Preprocessing](best-practices/preprocessing.md) — Grayscale, normalize, sharpen, threshold, deskew, CLAHE

---

## Usage Examples

### Query Pattern Before OCR
```javascript
const receiptType = detectReceiptType(imagePath);
// → 'kassenbon', 'standard-invoice', 'quittung', etc.

const wikiPage = await queryWiki(`ocr/receipt-patterns/${receiptType}.md`);
// Extract: expected accuracy, preprocessing strategy, extraction rules
```

### Query Vendor After OCR
```javascript
const vendor = extractVendorName(ocrText);
const vendorCategory = classifyVendor(vendor);
// → 'hosting', 'telekom', 'retail'

const vendorRules = await queryWiki(`ocr/vendor-database/${vendorCategory}.md`);
// Extract: normalization rules, tax rates, invoice patterns
```

### Query Edge Case on Low Confidence
```javascript
if (ocrConfidence < 0.7) {
  const issue = diagnoseIssue(imagePath);
  // → 'handwritten', 'low-quality', 'faded'
  
  const fallback = await queryWiki(`ocr/edge-cases/${issue}.md`);
  // Apply fallback strategy: retry with different preprocessing, use Google Vision, etc.
}
```

---

## Coverage Statistics

| Category | Pages | Coverage |
|----------|-------|----------|
| Receipt Patterns | 5 | Core patterns complete |
| Vendor Database | 3 | Top 3 categories (hosting, telekom, retail) |
| Edge Cases | 2 | Handwritten + low quality |
| Extraction Rules | 2 | Date + amount (core fields) |
| Best Practices | 1 | Preprocessing techniques |
| **TOTAL** | **13** | **65% of target (20-25 pages)** |

### Missing Coverage
- Transport vendors (Deutsche Bahn, FlixBus, Uber)
- Coworking spaces (WeWork, Rent24)
- Multi-column layouts
- Non-German invoices (English, French)
- Tax rate detection rules
- Invoice number pattern matching
- Confidence scoring best practices
- Fallback strategies (when to flag for manual review)

---

## Integration with Autoresearch

This wiki serves as the **knowledge base** for the [OCR Autoresearch](../../lexoffice-steuer/ocr-autoresearch/) framework:

1. **Test cases** reference wiki patterns for ground truth
2. **Mutation prompts** derive from wiki best practices
3. **Evaluation criteria** align with wiki accuracy targets
4. **Optimized processor** queries wiki at runtime for dynamic guidance

**Goal:** 95% accuracy (142/150 points) across all receipt types

---

## Maintenance

### When to Update
- New vendor types encountered → Add to `vendor-database/`
- OCR failures in production → Document in `edge-cases/`
- Preprocessing improvements → Update `best-practices/`
- New extraction patterns → Add to `extraction-rules/`

### Update Protocol
1. Identify failure pattern in production
2. Document in relevant wiki page
3. Add test case to autoresearch suite
4. Re-run autoresearch to optimize
5. Deploy improved processor

---

## Related Documentation

- [Lexoffice-Steuer SKILL.md](../../lexoffice-steuer/SKILL.md) — Main tax receipt processing workflow
- [OCR Processor](../../lexoffice-steuer/ocr-processor.js) — Implementation
- [Autoresearch Framework](../../lexoffice-steuer/ocr-autoresearch/) — Optimization methodology
- [Tax Wiki Categories](../categories/) — Tax category classification rules

---

**Version:** 1.0  
**Created:** 2025-01-XX  
**Last Updated:** 2025-01-XX  
**Status:** Foundation complete (13 pages), ready for expansion + autoresearch execution
