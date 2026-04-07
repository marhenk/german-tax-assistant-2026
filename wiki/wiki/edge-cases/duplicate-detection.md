# Duplicate Detection

*Updated: 2025-05-27 | Tax Year: 2023-2026 | Reliability: ⭐⭐⭐*

## Summary
Strategies for detecting duplicate transactions when importing from multiple sources (bank feeds, email receipts, manual entry).

## Legal Basis
- § 146 AO (GoBD — proper bookkeeping)
- Effective: Ongoing
- Applies to: All businesses (double-counting = tax fraud risk)

## Rules
### What Constitutes a Duplicate?
- **Same amount, date, vendor**: Likely duplicate (99% confidence)
- **Same invoice number, vendor**: Definite duplicate (100% confidence)
- **Same amount, vendor, ±3 days**: Probable duplicate (80% confidence) — may be partial payments

### Common Causes
1. **Bank feed + manual entry**: User enters invoice, then bank import adds same transaction
2. **Email receipt + bank feed**: Lexoffice email import + bank sync
3. **Prepayment + final invoice**: Two legitimate transactions (NOT duplicate)
4. **Partial payments**: Multiple legitimate transactions (NOT duplicate, unless invoice already paid)

## Edge Cases
- **Recurring subscriptions**: Same amount, same vendor, monthly → NOT duplicate (legitimate recurring)
- **Split payments**: Invoice €1,000 → Payment 1: €500, Payment 2: €500 → NOT duplicate
- **Refund + recharge**: Return €100, then new purchase €100 → NOT duplicate (but net zero)
- **Foreign currency**: €1,000 vs. $1,087 (ECB rate variation) → May appear as duplicate

## Counter-Arguments
- **Fuzzy matching too aggressive**: May flag legitimate transactions (e.g., weekly grocery purchases same amount) → Use invoice number as primary key

## Detection Strategies
### High-Confidence (100%)
- Invoice number match (same vendor)
- Transaction ID match (bank feed)
- Lexoffice `id` match (same resource already imported)

### Medium-Confidence (80-99%)
- Amount + vendor + date (exact match)
- Amount + vendor + description (±3 days)

### Low-Confidence (50-79%)
- Amount + date (different vendor description, may be typo)
- Amount + vendor (different month, may be recurring)

## Examples
### Definite Duplicate
```
Transaction 1: €1,190 | 2024-03-15 | Vendor: ACME Corp | Invoice: RE-2024-001
Transaction 2: €1,190 | 2024-03-15 | Vendor: ACME Corp | Invoice: RE-2024-001

→ Duplicate detected (invoice number match)
→ Action: Keep first, reject second
```

### Probable Duplicate (No Invoice Number)
```
Transaction 1: €1,190 | 2024-03-15 | Vendor: ACME Corp | Bank feed
Transaction 2: €1,190 | 2024-03-15 | Vendor: ACME Corp | Manual entry

→ Probable duplicate (amount + vendor + date match)
→ Action: Flag for review, ask user to confirm
```

### NOT Duplicate (Partial Payments)
```
Invoice: €1,000 (due)
Transaction 1: €500 | 2024-03-15 | Partial payment
Transaction 2: €500 | 2024-04-01 | Final payment

→ NOT duplicate (legitimate partial payments)
→ Action: Link both to same invoice (if Lexoffice supports)
```

### NOT Duplicate (Recurring)
```
Transaction 1: €50 | 2024-03-01 | Vendor: Webhosting Inc | Monthly subscription
Transaction 2: €50 | 2024-04-01 | Vendor: Webhosting Inc | Monthly subscription

→ NOT duplicate (legitimate recurring)
→ Action: Auto-categorize (pattern recognition)
```

### Edge Case (Foreign Currency)
```
Transaction 1: €1,000 | 2024-03-15 | Vendor: AWS | EUR account
Transaction 2: $1,087 | 2024-03-15 | Vendor: AWS | USD account (ECB rate: 1.087)

→ Probable duplicate (same vendor, date, amount after conversion)
→ Action: Flag for review (user may have dual-currency accounts)
```

## Prevention Strategies
### Lexoffice ID Mapping
- Store lexoffice `id` in local DB when importing
- Before importing, check if `id` already exists
- **Caveat**: Lexoffice doesn't return `id` for bank feed imports (use transaction ID)

### Invoice Number Registry
- Maintain table: `InvoiceNumber | Vendor | LexofficeID | Imported`
- Before importing, check if invoice number already imported
- **Caveat**: Not all transactions have invoice numbers (bank fees, subscriptions)

### Transaction Fingerprint
```python
def fingerprint(txn):
    return hashlib.sha256(f"{txn.amount}{txn.date}{txn.vendor}{txn.description}".encode()).hexdigest()

# Before import:
if fingerprint(new_txn) in imported_fingerprints:
    flag_as_duplicate(new_txn)
```

## Automation Hints (for lexoffice-steuer skill)
```python
def detect_duplicate(new_txn, existing_txns):
    for existing in existing_txns:
        # High-confidence: Invoice number match
        if new_txn.invoice_number and new_txn.invoice_number == existing.invoice_number:
            if new_txn.vendor == existing.vendor:
                return ("DUPLICATE", 100, existing)
        
        # Medium-confidence: Amount + vendor + date
        if (new_txn.amount == existing.amount and
            new_txn.vendor == existing.vendor and
            abs((new_txn.date - existing.date).days) <= 0):
            return ("PROBABLE_DUPLICATE", 90, existing)
        
        # Low-confidence: Amount + date (different vendor)
        if (new_txn.amount == existing.amount and
            new_txn.date == existing.date):
            return ("POSSIBLE_DUPLICATE", 60, existing)
    
    return ("UNIQUE", 0, None)
```

## Recovery (If Already Imported)
1. **Identify duplicates**: Run detection script on existing transactions
2. **Manual review**: Flag probable matches (80-99% confidence)
3. **Delete younger duplicate**: Keep first import, delete second (preserves audit trail)
4. **Adjust tax declarations**: If already submitted UStVA/EÜR → file correction (Berichtigungserklärung)

## Sources
- § 146 AO (GoBD — no duplicate bookings)
- [[raw/lexoffice-api/vba-community-guide]] (ID mapping strategy)

## Related
- [[best-practices/validation-checks]] (pre-import validation)
- [[edge-cases/missing-ust]] (invoice validation)
- [[raw/lexoffice-api/lexware-api-docs]] (API `id` field)

## Confidence
⭐⭐⭐ GoBD principles (detection logic is heuristic, not legally specified)
