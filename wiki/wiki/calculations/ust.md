# Umsatzsteuer (USt / Sales Tax)

*Updated: 2025-05-27 | Tax Year: 2023-2026 | Reliability: ⭐⭐⭐⭐⭐*

## Summary
Value-added tax (Mehrwertsteuer/USt) collected from customers. Must be remitted to Finanzamt.

## Legal Basis
- § 12 UStG (tax rates)
- § 19 UStG (Kleinunternehmer exemption)
- § 13b UStG (reverse charge)
- Effective: Current rates since 2007 (19%), reduced rate since 1983 (7%)
- Applies to: All businesses exceeding €22,000 revenue (previous year) or €50,000 (current year)

## Rules
### Standard Rates (Germany)
- **19%**: Standard rate (most goods/services)
- **7%**: Reduced rate (food, books, public transport, cultural events)
- **0%**: Exports to non-EU countries, intracommunity supply (Innergemeinschaftliche Lieferung)

### Kleinunternehmer (§19 UStG)
- **Exemption**: No USt on invoices if revenue ≤€22,000 (previous year) AND ≤€50,000 (current year)
- **Invoice text required**: "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet"
- **No Vorsteuer deduction**: Cannot deduct input tax
- **See**: [[calculations/kleinunternehmer]]

### Reverse Charge (§13b UStG)
- **Customer owes USt** (not vendor):
  - Construction services (Bauleistungen)
  - Intracommunity services (EU B2B)
  - Metal/CO₂ trading
- **Both entries**: +USt (liability) and -Vorsteuer (deduction) → net zero cash impact
- **See**: [[categories/fremdleistungen]], [[edge-cases/missing-ust]]

## Edge Cases
- **Photovoltaic equipment (2023+)**: 0% USt for installations on residential buildings (§ 12 Abs. 3 UStG)
- **Digital services (EU B2C)**: Destination country USt rates if revenue >€10,000/year (OSS/IOSS)
- **Mixed rates in one invoice**: Split line items (19% vs. 7%)
- **Prepayments**: USt due when prepayment received (cash-basis)
- **Partial payments**: Calculate USt on each partial amount

## Counter-Arguments
- **Gross vs. net invoicing**: Legally equivalent (§14 Abs. 4 UStG), but net + USt clearer for B2B

## Examples
### Standard Invoice (19%)
```
Net: €1,000
USt 19%: €190
Gross: €1,190

→ Betriebseinnahmen: €1,000
→ USt: +€190 (liability to Finanzamt)
```

### Reduced Rate (7%)
```
Net: €100 (books)
USt 7%: €7
Gross: €107

→ Betriebseinnahmen: €100
→ USt: +€7
```

### Intracommunity Supply (0%)
```
Net: €1,000
USt: €0 (Innergemeinschaftliche Lieferung)

→ Betriebseinnahmen: €1,000
→ USt: €0
→ Zusammenfassende Meldung (ZM) required for EU B2B
```

### Reverse Charge (§13b, EU freelancer)
```
Invoice from EU freelancer: €1,000 (no USt shown)

→ Fremdleistungen: €1,000
→ USt 19%: +€190 (you owe to Finanzamt)
→ Vorsteuer: -€190 (you deduct from Finanzamt)
→ Net cash impact: €0 (but must declare both on UStVA)
```

## Formulas
```
Gross = Net × (1 + USt%)
Net = Gross / (1 + USt%)
USt = Gross - Net
```

**Example (19%)**:
```
Gross = €1,000 × 1.19 = €1,190
Net = €1,190 / 1.19 = €1,000
USt = €1,190 - €1,000 = €190
```

## Sources
- § 12 UStG (rates)
- § 13b UStG (reverse charge)
- BMF: Umsatzsteuer-Anwendungserlass (UStAE)
- [[raw/lexoffice-api/lexware-api-docs]] (tax types: net, gross, intraCommunitySupply, etc.)

## Related
- [[calculations/vorsteuer]] (input tax deduction)
- [[calculations/kleinunternehmer]] (exemption)
- [[categories/betriebseinnahmen]] (revenue)
- [[compliance/tax-law-2026]] (2026 rate changes, if any)
- [[edge-cases/missing-ust]] (§13b scenarios)

## Confidence
⭐⭐⭐⭐⭐ UStG § 12, § 13b (current law)
