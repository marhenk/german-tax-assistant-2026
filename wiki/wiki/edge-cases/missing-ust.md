# Missing USt (Transactions Without Sales Tax)

*Updated: 2025-05-27 | Tax Year: 2023-2026 | Reliability: ⭐⭐⭐⭐*

## Summary
Handling transactions where USt is not shown on invoices. Common with: Kleinunternehmer vendors, reverse charge (§13b), exempt services, private sellers.

## Legal Basis
- § 19 UStG (Kleinunternehmer no USt)
- § 13b UStG (reverse charge)
- § 4 UStG (exempt services)
- Effective: Ongoing

## Rules
### When USt is Legitimately Missing
1. **Kleinunternehmer vendor**: Invoice states "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet"
   - → Record gross amount, no Vorsteuer deduction
   
2. **Reverse charge (§13b)**: Invoice from EU vendor (B2B) or construction services
   - → You calculate USt (both +USt and -Vorsteuer)
   - → See [[categories/fremdleistungen]]

3. **Exempt services (§ 4 UStG)**: Medical, educational, insurance services
   - → No USt, no Vorsteuer deduction

4. **Private seller**: Non-business purchase (e.g., used equipment from individual)
   - → No USt, no Vorsteuer deduction

### When USt is Missing (Error)
- **Incomplete invoice**: Vendor forgot to add USt
  - → Request corrected invoice
  - → Cannot deduct Vorsteuer without proper invoice (§ 14 UStG)

## Edge Cases
- **EU vendor USt-ID missing**: Cannot apply reverse charge without valid USt-ID → request correction
- **Mixed invoice**: Some items with USt, some without (e.g., books 7%, consulting 19%) → split line items
- **Kleinunternehmer buys from Kleinunternehmer**: Both pay gross, no USt handling
- **First intracommunity purchase**: Triggers mandatory USt registration (no longer Kleinunternehmer)

## Counter-Arguments
- **§13b without USt-ID**: Some vendors claim §13b without showing USt-ID — illegal, reject invoice

## Examples
### Kleinunternehmer Vendor
```
Invoice: €1,000
Text: "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet"

→ Wareneinkauf: €1,000 (gross)
→ Vorsteuer: €0 (not eligible)
```

### Reverse Charge (EU Freelancer)
```
Invoice: €1,000 (no USt shown)
Vendor USt-ID: DE123456789 (verified)
Service: Software development

→ Fremdleistungen: €1,000 (net)
→ USt 19%: +€190 (you calculate and owe to Finanzamt)
→ Vorsteuer 19%: -€190 (you deduct)
→ Net cash impact: €0
→ Declare both on UStVA (Zeile 48 + 61)
```

### Private Seller (Used Equipment)
```
Invoice: €500 (used laptop from individual, no business)

→ Equipment: €500 (gross)
→ Vorsteuer: €0 (private seller, no USt)
→ Depreciation: Apply over useful life
```

### Exempt Service (Medical)
```
Invoice: €200 (doctor consultation, §4 Nr. 14 UStG)

→ Betriebsausgabe: €200 (gross)
→ Vorsteuer: €0 (exempt service)
```

### Incomplete Invoice (Error)
```
Invoice: €1,000 (no USt shown, vendor is USt-registered)

→ Request corrected invoice showing net + USt
→ Do NOT record until corrected (no Vorsteuer without proper invoice)
```

## Validation Checklist
When USt is missing, check:
1. ☐ Vendor Kleinunternehmer? (look for §19 UStG text)
2. ☐ Reverse charge applicable? (EU vendor, construction, etc.)
3. ☐ Exempt service? (§ 4 UStG)
4. ☐ Private seller? (no business USt-ID)
5. ☐ Invoice error? (request correction)

## Automation Hints (for lexoffice-steuer skill)
```python
if invoice.ust == 0:
    if "§19 UStG" in invoice.text:
        category = "Kleinunternehmer vendor"
        vorsteuer = 0
    elif invoice.vendor_country != "DE":
        category = "Reverse charge candidate"
        # Check vendor USt-ID validity
        if valid_ust_id(invoice.vendor_ust_id):
            ust = invoice.net * 0.19
            vorsteuer = -ust  # Net zero
        else:
            flag_for_review("Invalid USt-ID for reverse charge")
    elif invoice.service_type in EXEMPT_SERVICES:
        category = "Exempt service"
        vorsteuer = 0
    else:
        flag_for_review("USt missing, unclear reason")
```

## Sources
- § 13b UStG (reverse charge)
- § 19 UStG (Kleinunternehmer)
- § 4 UStG (exempt services)
- [[raw/lexoffice-api/lexware-api-docs]] (taxType: constructionService13b, externalService13b, etc.)

## Related
- [[calculations/ust]] (sales tax)
- [[calculations/vorsteuer]] (input tax deduction)
- [[calculations/kleinunternehmer]] (exemption)
- [[categories/fremdleistungen]] (§13b services)
- [[best-practices/validation-checks]] (invoice validation)

## Confidence
⭐⭐⭐⭐ UStG § 13b, § 19 (well-established rules, but vendor compliance varies)
