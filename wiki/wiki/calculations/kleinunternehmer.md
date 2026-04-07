# Kleinunternehmer (Small Business Exemption, §19 UStG)

*Updated: 2025-05-27 | Tax Year: 2023-2026 | Reliability: ⭐⭐⭐⭐⭐*

## Summary
USt exemption for small businesses. No USt on invoices, no Vorsteuer deduction. Simplifies accounting.

## Legal Basis
- § 19 UStG (Kleinunternehmerregelung)
- Effective: Ongoing
- Applies to: Businesses meeting revenue thresholds

## Rules
### Eligibility Thresholds
- **Previous year revenue**: ≤€22,000
- **Current year (estimated) revenue**: ≤€50,000
- **Both conditions must be met**

### Obligations
- **No USt on invoices**: Cannot charge USt (customer pays gross = net)
- **Invoice text required**: "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet" (or similar)
- **No Vorsteuer deduction**: Cannot deduct input tax on purchases (pay gross)
- **No USt declarations**: No monthly/quarterly UStVA (Umsatzsteuervoranmeldung)
- **Annual declaration**: Still required (§ 19 UStG declaration on Umsatzsteuererklärung)

### Opt-Out
- **Voluntary USt registration**: Can opt out of §19 (e.g., if high Vorsteuer from investments)
- **Binding period**: 5 years (cannot switch back to Kleinunternehmer before then)

## Edge Cases
- **Exceeding €22,000 in year 1**: Lose Kleinunternehmer status in year 2 (must charge USt retroactively from Jan 1)
- **Exceeding €50,000 in current year**: Lose status immediately (must charge USt from next invoice)
- **EU sales**: Kleinunternehmer cannot use intracommunity supply (Innergemeinschaftliche Lieferung) — must charge USt
- **Digital services (EU B2C)**: Threshold €10,000/year (separate from §19) — if exceeded, must charge destination country USt

## Counter-Arguments
- **Opt-out for investment-heavy businesses**: If purchasing expensive equipment (high Vorsteuer), voluntary USt registration may be better — consult tax advisor
- **B2B customers**: Many prefer invoices with USt (can deduct Vorsteuer) — Kleinunternehmer may be disadvantage

## Examples
### Eligible Kleinunternehmer (Year 1)
```
Previous year revenue: €0 (new business)
Current year (estimated): €18,000

→ Kleinunternehmer status: Yes
→ Invoice: €1,000 (no USt, gross = net)
→ Customer pays: €1,000
→ Betriebseinnahmen: €1,000
```

### Invoice Text Example
```
Rechnungsbetrag: €1,000
Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.

→ No USt line item
→ Customer pays €1,000
```

### Exceeding Threshold (Year 2)
```
Year 1 revenue: €25,000 (exceeded €22,000)
Year 2: Must charge USt from Jan 1

→ Invoice (Jan 5, Year 2): €1,000 + €190 USt = €1,190
→ Customer pays: €1,190
→ Betriebseinnahmen: €1,000
→ USt: +€190 (pay to Finanzamt)
```

### Kleinunternehmer Purchase
```
Supplier invoice: €1,190 (net: €1,000, USt 19%: €190)
→ Wareneinkauf: €1,190 (gross, no Vorsteuer deduction)
→ Net cost: €1,190 (cannot deduct €190)
```

### Voluntary Opt-Out (High Vorsteuer)
```
Year 1: Kleinunternehmer
Year 2: Purchase €20,000 equipment (net: €16,806, USt 19%: €3,194)

→ Opt out of §19 UStG (voluntary registration)
→ Can deduct €3,194 Vorsteuer
→ Must charge USt for 5 years (binding period)
```

## Decision Matrix
| Scenario | Recommendation |
|----------|---------------|
| Low revenue (<€22k), mostly B2C | Kleinunternehmer (simpler) |
| Low revenue, high initial investment | Opt out (recover Vorsteuer) |
| B2B customers expect USt invoices | Opt out (customer preference) |
| Revenue growing toward €22k | Opt out proactively (avoid retroactive USt) |

## Sources
- § 19 UStG
- BMF: Umsatzsteuer-Anwendungserlass (UStAE), § 19 guidance
- EU: VAT threshold directive (€22k Germany, varies by country)

## Related
- [[calculations/ust]] (sales tax)
- [[calculations/vorsteuer]] (no deduction for Kleinunternehmer)
- [[categories/betriebseinnahmen]] (revenue recognition)
- [[edge-cases/mixed-revenue]] (threshold monitoring)
- [[compliance/tax-law-2026]] (2026 threshold changes, if any)

## Confidence
⭐⭐⭐⭐⭐ UStG § 19 (€22k/€50k thresholds confirmed for 2023-2026)
