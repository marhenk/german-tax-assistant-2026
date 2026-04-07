# Wareneinkauf (Cost of Goods Sold)

*Updated: 2025-05-27 | Tax Year: 2023-2026 | Reliability: ⭐⭐⭐⭐⭐*

## Summary
Cost of purchasing goods for resale. EÜR category for inventory purchases (not services).

## Legal Basis
- § 4 Abs. 3 EStG (Abflussprinzip — cash-basis for expenses)
- Effective: Ongoing
- Applies to: Businesses selling physical products

## Rules
- **Recognition timing**: Cash basis (when paid, not when received)
- **Net amounts**: Record net cost (exclude Vorsteuer if eligible for deduction)
- **Vorsteuer**: Deduct separately (see [[calculations/vorsteuer]])
- **Kleinunternehmer**: Record gross cost (no Vorsteuer deduction)

## Edge Cases
- **Inventory not yet sold**: Still deductible when purchased (cash-basis)
- **Mixed-use purchases**: Only business portion deductible
- **Prepayments**: Recognized when paid, not when goods delivered
- **Returns/refunds**: Reduce Wareneinkauf in period received

## Counter-Arguments
- **Accrual accounting argument**: Some argue inventory should only be expensed when sold — NOT applicable for EÜR (cash-basis)

## Examples
```
Purchase invoice: €1,190 (net: €1,000, USt 19%: €190)
→ Category: Wareneinkauf
→ Amount recorded: €1,000 (net)
→ Separate Vorsteuer: -€190 (see [[calculations/vorsteuer]])
```

```
Kleinunternehmer purchase: €1,190
→ Category: Wareneinkauf
→ Amount recorded: €1,190 (gross, no Vorsteuer deduction)
```

```
Return/refund: €595 (net: €500, USt 19%: €95)
→ Category: Wareneinkauf (negative entry)
→ Amount recorded: -€500 (net)
→ Separate Vorsteuer: +€95 (reversal)
```

## Sources
- BMF: EÜR Anleitung (Anlage EÜR, Zeile 3)
- § 4 Abs. 3 EStG

## Related
- [[calculations/vorsteuer]] (input tax deduction)
- [[categories/fremdleistungen]] (services, not goods)
- [[edge-cases/missing-ust]] (non-deductible USt scenarios)

## Confidence
⭐⭐⭐⭐⭐ EStG § 4 Abs. 3 + BMF EÜR guidelines
