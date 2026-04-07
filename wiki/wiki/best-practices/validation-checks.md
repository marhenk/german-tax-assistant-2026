# Validation Checks (Pre-Submission)

*Updated: 2025-05-27 | Tax Year: 2023-2026 | Reliability: ⭐⭐⭐⭐*

## Summary
Pre-flight checks before submitting EÜR or UStVA. Catch errors before Finanzamt rejection.

## Legal Basis
- § 146 AO (GoBD — proper bookkeeping)
- § 149 AO (Finanzamt audit rights)
- § 370 AO (tax evasion penalties for false declarations)

## Rules
### Mandatory Checks (Will Cause Rejection)
1. **USt balance**: Sum of USt (revenue) - Vorsteuer (expenses) = declared amount
2. **Kleinunternehmer consistency**: If § 19 UStG → no USt/Vorsteuer entries
3. **Date range**: All transactions within declaration period (monthly/quarterly/annual)
4. **Missing invoices**: All revenue transactions have supporting documents
5. **Negative Betriebseinnahmen**: Invalid (unless credit note)
6. **Positive Betriebsausgaben**: Invalid (unless refund/return)

### Recommended Checks (May Indicate Error)
1. **Unusual amounts**: >€10,000 single transaction (flag for review)
2. **Round numbers**: €1,000.00 (may be estimate, not invoice) → verify
3. **Missing Vorsteuer**: High expenses with 0% Vorsteuer → check Kleinunternehmer status
4. **Excessive KFZ costs**: >50% of revenue (Finanzamt red flag)
5. **Home office >€1,260/year**: Requires Arbeitszimmer documentation (post-2023)
6. **§13b reverse charge**: Both +USt and -Vorsteuer must be present (net zero)

## Edge Cases
- **Partial year (new business)**: Kleinunternehmer threshold pro-rated (€22k annual → €11k for 6 months)
- **Vorauszahlung (advance payment)**: Recognized when paid, not when service delivered → may create timing mismatch
- **Foreign currency**: Convert at ECB rate on transaction date, not declaration date

## Counter-Arguments
- **"I'll fix it later"**: Finanzamt rejects declaration → automatic penalty + interest → fix NOW before submission

## Validation Checklists
### Pre-UStVA (Monthly/Quarterly)
```
☐ USt from revenue (Zeile 8, 9, 10) = sum of invoice USt
☐ Vorsteuer from expenses (Zeile 61) = sum of purchase USt
☐ §13b reverse charge: USt (Zeile 48) = Vorsteuer (Zeile 61 portion)
☐ Net USt liability (Zeile 83) = USt - Vorsteuer
☐ No USt entries if Kleinunternehmer (§19 UStG)
☐ All transactions in declaration period (e.g., Q1 = Jan-Mar)
☐ No missing invoices for revenue >€250
```

### Pre-EÜR (Annual)
```
☐ Betriebseinnahmen ≥ 0 (unless special case)
☐ Betriebsausgaben ≤ 0 (unless refund)
☐ Profit = Betriebseinnahmen - Betriebsausgaben (matches calculation)
☐ KFZ costs <50% of revenue (if exceeded, have Fahrtenbuch ready)
☐ Home office ≤€1,260 (if >€1,260, have Arbeitszimmer docs)
☐ Kleinunternehmer threshold: revenue ≤€22k (previous year) AND ≤€50k (current year)
☐ All transactions have category (no "UNCATEGORIZED")
☐ No duplicate transactions (see [[edge-cases/duplicate-detection]])
☐ Foreign transactions converted at ECB rate on transaction date
☐ §13b reverse charge: net zero cash impact (both entries present)
```

### Pre-Submission (Final)
```
☐ Bank reconciliation: EÜR revenue matches bank deposits (within timing differences)
☐ Invoice registry: All revenue invoices exported to PDF (GoBD requirement)
☐ Expense receipts: All >€250 have PDF/photo stored
☐ Zusammenfassende Meldung (ZM): EU B2B sales reported (if applicable)
☐ Digital signatures: ELSTER certificate valid (not expired)
☐ Backup: EÜR + invoices + receipts backed up (10-year retention)
```

## Automated Validation (for lexoffice-steuer skill)
```python
def validate_ustva(transactions, period):
    errors = []
    warnings = []
    
    # 1. Date range
    for txn in transactions:
        if txn.date < period.start or txn.date > period.end:
            errors.append(f"Transaction {txn.id} outside period {period}")
    
    # 2. USt balance
    ust_revenue = sum(t.ust for t in transactions if t.ust > 0)
    vorsteuer = sum(t.ust for t in transactions if t.ust < 0)
    net_ust = ust_revenue + vorsteuer  # vorsteuer is negative
    declared_ust = get_ustva_line_83(period)
    if abs(net_ust - declared_ust) > 0.01:  # Allow 1 cent rounding
        errors.append(f"USt mismatch: calculated {net_ust}, declared {declared_ust}")
    
    # 3. Kleinunternehmer consistency
    if is_kleinunternehmer(period):
        if ust_revenue != 0 or vorsteuer != 0:
            errors.append("Kleinunternehmer cannot have USt/Vorsteuer entries")
    
    # 4. §13b reverse charge (net zero)
    reverse_charge_ust = sum(t.ust for t in transactions if t.tax_type == "externalService13b")
    reverse_charge_vorsteuer = sum(t.ust for t in transactions if t.tax_type == "externalService13b" and t.ust < 0)
    if abs(reverse_charge_ust + reverse_charge_vorsteuer) > 0.01:
        warnings.append(f"§13b not net zero: USt {reverse_charge_ust}, Vorsteuer {reverse_charge_vorsteuer}")
    
    # 5. Missing invoices
    for txn in transactions:
        if txn.amount > 250 and txn.type == "revenue" and not txn.invoice_pdf:
            warnings.append(f"Missing invoice for revenue {txn.id} (€{txn.amount})")
    
    # 6. Unusual amounts
    for txn in transactions:
        if abs(txn.amount) > 10000:
            warnings.append(f"Large transaction {txn.id}: €{txn.amount}")
    
    return errors, warnings
```

## Recovery (If Already Submitted)
1. **Berichtigungserklärung**: File correction declaration (ELSTER)
2. **Contact Finanzamt**: Proactive notification (better than audit discovery)
3. **Penalty mitigation**: Self-reported errors → reduced penalties (§371 AO)
4. **Back-pay**: Interest charged on unpaid USt (§233a AO, 0.15%/month)

## Sources
- § 146 AO (GoBD — proper bookkeeping)
- § 370 AO (tax evasion penalties)
- § 371 AO (self-reporting mitigation)
- [[categories/*]] (category validation rules)
- [[calculations/ust]], [[calculations/vorsteuer]] (USt balance)

## Related
- [[edge-cases/duplicate-detection]] (prevent double-counting)
- [[edge-cases/missing-ust]] (reverse charge validation)
- [[best-practices/categorization-keywords]] (category validation)

## Confidence
⭐⭐⭐⭐ AO §§ 146, 370, 371 (well-established audit triggers)
