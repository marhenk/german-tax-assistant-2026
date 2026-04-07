# Betriebseinnahmen (Revenue)

*Updated: 2025-05-27 | Tax Year: 2023-2026 | Reliability: ⭐⭐⭐⭐⭐*

## Summary
Revenue from business activities. Main EÜR category for all income subject to income tax (Einkommensteuer).

## Legal Basis
- § 4 Abs. 3 EStG (Cash-basis accounting for EÜR)
- Effective: Ongoing
- Applies to: All businesses using EÜR (Einnahmen-Überschuss-Rechnung)

## Rules
- **Recognition timing**: Cash basis (Zuflussprinzip) — when payment received
- **Gross or net**: Depends on USt status (see [[calculations/ust]])
- **Kleinunternehmer (§19 UStG)**: Record gross amounts (no USt separation)
- **USt-pflichtig**: Record net revenue + separate USt (see [[calculations/vorsteuer]])

## Edge Cases
- **Prepayments**: Recognized when received, not when service delivered
- **Partial payments**: Each payment recognized separately
- **Foreign currency**: Convert at ECB rate on payment date
- **Digital services (EU B2C)**: May require destination country USt rates (see [[compliance/tax-law-2026]])

## Counter-Arguments
- Some tax advisors recommend splitting by revenue stream (consulting vs. products) — not required for EÜR but useful for analytics

## Examples
```
Invoice: €1,190 (net: €1,000, USt 19%: €190)
→ Category: Betriebseinnahmen
→ Amount recorded: €1,000 (net)
→ Separate USt entry: +€190 (see [[calculations/ust]])
```

```
Kleinunternehmer invoice: €1,000
→ Category: Betriebseinnahmen
→ Amount recorded: €1,000 (gross, no USt separation)
```

## Sources
- [[raw/steuergesetz-2026/estg-par-4]] (not yet ingested)
- BMF: EÜR Anleitung (official guide)

## Related
- [[calculations/ust]] (USt handling)
- [[calculations/kleinunternehmer]] (§19 UStG exemption)
- [[edge-cases/mixed-revenue]] (multiple revenue streams)

## Confidence
⭐⭐⭐⭐⭐ EStG § 4 Abs. 3 (cash-basis principle)
