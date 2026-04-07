# Fremdleistungen (External Services)

*Updated: 2025-05-27 | Tax Year: 2023-2026 | Reliability: ⭐⭐⭐⭐⭐*

## Summary
Cost of external services (consulting, freelance work, subcontractors). Distinct from goods (Wareneinkauf).

## Legal Basis
- § 4 Abs. 3 EStG (Abflussprinzip)
- § 13b UStG (reverse charge for specific services)
- Effective: Ongoing
- Applies to: All EÜR businesses purchasing services

## Rules
- **Recognition timing**: Cash basis (when paid)
- **Net amounts**: Record net cost (exclude Vorsteuer if deductible)
- **Reverse charge (§13b UStG)**: Recipient (you) owes USt, not vendor
  - Applies to: Construction services, intracommunity services
  - See [[compliance/tax-law-2026]] for 2026 specifics

## Edge Cases
- **EU freelancer invoices**: Often §13b reverse charge (no vendor USt, buyer calculates)
- **Mixed invoices**: Split goods (Wareneinkauf) vs. services (Fremdleistungen)
- **Kleinunternehmer receiving §13b invoices**: Must register for USt (no longer Kleinunternehmer if threshold exceeded)

## Counter-Arguments
- **Subcontractor vs. employee**: If provider is effectively an employee (Scheinselbständigkeit), social security contributions apply — consult tax advisor

## Examples
```
Freelance invoice (standard): €1,190 (net: €1,000, USt 19%: €190)
→ Category: Fremdleistungen
→ Amount recorded: €1,000 (net)
→ Separate Vorsteuer: -€190
```

```
EU freelancer (§13b reverse charge): €1,000 (no USt shown)
→ Category: Fremdleistungen
→ Amount recorded: €1,000 (net)
→ You calculate USt: €190 (both +USt and -Vorsteuer, net zero)
→ See [[calculations/ust]] for handling
```

```
Construction subcontractor (§13b): €5,000 (no USt shown)
→ Category: Fremdleistungen
→ Amount recorded: €5,000 (net)
→ Reverse charge applies (you owe USt to Finanzamt)
```

## Sources
- BMF: EÜR Anleitung (Anlage EÜR, Zeile 4)
- § 13b UStG (reverse charge)
- [[raw/lexoffice-api/lexware-api-docs]] (tax type: `externalService13b`)

## Related
- [[categories/wareneinkauf]] (goods vs. services)
- [[calculations/ust]] (reverse charge handling)
- [[edge-cases/missing-ust]] (§13b scenarios)
- [[compliance/tax-law-2026]] (2026 reverse charge rules)

## Confidence
⭐⭐⭐⭐⭐ EStG § 4 Abs. 3 + UStG § 13b
