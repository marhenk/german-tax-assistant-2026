# Vorsteuer (Input Tax / VAT Deduction)

*Updated: 2025-05-27 | Tax Year: 2023-2026 | Reliability: ⭐⭐⭐⭐⭐*

## Summary
Input tax (USt paid to vendors) that can be deducted from USt liability. Key mechanism for VAT neutrality.

## Legal Basis
- § 15 UStG (Vorsteuerabzug)
- § 15a UStG (partial deduction for mixed use)
- § 19 UStG (no deduction for Kleinunternehmer)
- Effective: Ongoing
- Applies to: All USt-registered businesses (not Kleinunternehmer)

## Rules
### Eligible for Deduction
- **Business expenses**: Goods/services used for business
- **Proper invoice**: Must contain all § 14 UStG elements (vendor USt-ID, line items, USt breakdown)
- **Paid to EU/German USt-registered vendor**: No deduction for non-EU or private sellers

### NOT Eligible
- **Kleinunternehmer**: No Vorsteuer deduction (see [[calculations/kleinunternehmer]])
- **Private use items**: No deduction for personal expenses
- **Mixed use**: Only business % deductible (see § 15a UStG)
- **Exempt services**: Medical, educational services (§ 4 UStG) → no Vorsteuer

## Edge Cases
- **Reverse charge (§13b)**: Deduct USt you calculated yourself (net zero with USt liability)
- **Partial business use**: Deduct business % (e.g., 50% KFZ, 20% home office)
- **Invoice received after payment**: Deductible in year invoice received (not payment year)
- **Credit notes**: Reverse Vorsteuer in period credit note received
- **EU purchases (B2B)**: No vendor USt → reverse charge → both +USt and -Vorsteuer

## Counter-Arguments
- **Mixed-use asset**: § 15a UStG allows adjustment over 5 years (movable) or 10 years (real estate) if use % changes — complex, consult tax advisor

## Examples
### Standard Purchase (19%)
```
Invoice: €1,190 (net: €1,000, USt 19%: €190)
→ Wareneinkauf: €1,000
→ Vorsteuer: -€190 (deduct from USt liability)
```

### Reverse Charge (EU freelancer)
```
Invoice: €1,000 (no USt shown, §13b reverse charge)
→ Fremdleistungen: €1,000
→ USt 19%: +€190 (you calculate)
→ Vorsteuer 19%: -€190 (you deduct)
→ Net USt impact: €0
```

### Kleinunternehmer Purchase
```
Invoice: €1,190 (net: €1,000, USt 19%: €190)
→ Wareneinkauf: €1,190 (gross, no Vorsteuer deduction)
→ Vorsteuer: €0 (not eligible)
```

### Mixed-Use Vehicle (50% business)
```
Fuel invoice: €119 (net: €100, USt 19%: €19)
→ KFZ-Kosten: €50 (50% of net)
→ Vorsteuer: -€9.50 (50% of USt)
```

### Credit Note (Return)
```
Return: €595 (net: €500, USt 19%: €95)
→ Wareneinkauf: -€500 (reverse expense)
→ Vorsteuer: +€95 (reverse deduction)
```

## Formulas
```
Vorsteuer = Gross - Net
Vorsteuer = Net × USt%
```

**Example (19%)**:
```
Vorsteuer = €1,190 - €1,000 = €190
Vorsteuer = €1,000 × 0.19 = €190
```

## Monthly/Quarterly Calculation
```
USt liability = (USt from revenue) - (Vorsteuer from expenses)
```

**Example**:
```
Revenue: €10,000 net → USt: €1,900
Expenses: €5,000 net → Vorsteuer: €950
Net USt liability: €1,900 - €950 = €950 (pay to Finanzamt)
```

## Sources
- § 15 UStG (deduction rules)
- § 15a UStG (mixed use)
- BMF: Umsatzsteuer-Anwendungserlass (UStAE)
- [[raw/lexoffice-api/lexware-api-docs]] (taxRatePercentage field)

## Related
- [[calculations/ust]] (sales tax)
- [[calculations/kleinunternehmer]] (exemption = no deduction)
- [[categories/wareneinkauf]] (goods purchases)
- [[categories/fremdleistungen]] (services with §13b)
- [[edge-cases/missing-ust]] (reverse charge scenarios)

## Confidence
⭐⭐⭐⭐⭐ UStG § 15 (current law)
