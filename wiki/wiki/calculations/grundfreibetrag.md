# Grundfreibetrag (Personal Tax Allowance)

*Updated: 2025-05-27 | Tax Year: 2023-2026 | Reliability: ⭐⭐⭐⭐⭐*

## Summary
Tax-free income threshold (Existenzminimum). Income below this amount is not subject to income tax (Einkommensteuer).

## Legal Basis
- § 32a Abs. 1 EStG (income tax brackets)
- Effective: Annual adjustment (inflation-indexed)
- Applies to: All taxpayers (individuals, not corporations)

## Rules
### Thresholds (Historical)
- **2023**: €10,908 (single), €21,816 (married/joint filing)
- **2024**: €11,604 (single), €23,208 (married/joint filing)
- **2025**: €11,784 (single), €23,568 (married/joint filing)
- **2026**: €12,084 (single), €24,168 (married/joint filing) — **preliminary, subject to change**

### Application
- **Taxable income calculation**:
  1. EÜR result: Revenue - Expenses = Profit
  2. Deduct: Sonderausgaben, außergewöhnliche Belastungen
  3. Result: Zu versteuerndes Einkommen (taxable income)
  4. If < Grundfreibetrag → no income tax (ESt)

## Edge Cases
- **Multiple income sources**: Grundfreibetrag applies to total income (employment + business + investment)
- **Negative EÜR**: Loss can offset other income (employment, capital gains)
- **Married couples**: Can choose individual or joint filing (Ehegattensplitting) — joint usually more favorable

## Counter-Arguments
- **Inflation adjustment insufficient**: Critics argue Grundfreibetrag increases lag behind inflation — but legally binding

## Examples
### Single Taxpayer (2024)
```
EÜR profit: €10,000
Sonderausgaben: €0
Taxable income: €10,000
Grundfreibetrag: €11,604

→ Income tax: €0 (below threshold)
```

### Single Taxpayer (2024, above threshold)
```
EÜR profit: €25,000
Sonderausgaben: €2,000
Taxable income: €23,000
Grundfreibetrag: €11,604

→ Taxable: €23,000 - €11,604 = €11,396
→ Income tax: ~€1,200 (14% entry rate, progressive)
```

### Married (Joint Filing, 2024)
```
Spouse 1 EÜR profit: €20,000
Spouse 2 employment: €30,000
Total income: €50,000
Grundfreibetrag: €23,208 (joint)

→ Taxable: €50,000 - €23,208 = €26,792
→ Splitting advantage: Tax calculated on €13,396 per person → lower bracket
```

## Formulas
```
Taxable income = (Revenue - Expenses) - Sonderausgaben - außergewöhnliche Belastungen
If Taxable income ≤ Grundfreibetrag → ESt = €0
Else → ESt = f(Taxable income) (progressive brackets)
```

## Progressive Tax Brackets (2024, single)
```
€0 - €11,604: 0%
€11,605 - €17,005: 14% - 23.97% (linear progression)
€17,006 - €66,760: 23.97% - 42% (linear progression)
€66,761 - €277,825: 42% (Spitzensteuersatz)
€277,826+: 45% (Reichensteuer)
```

## Sources
- § 32a EStG (tax brackets)
- BMF: Existenzminimumbericht 2024 (official calculation basis)
- Bundestag: Steueränderungsgesetz 2024

## Related
- [[categories/betriebseinnahmen]] (revenue)
- [[compliance/tax-law-2026]] (2026 threshold updates)
- [[best-practices/validation-checks]] (income tax estimation)

## Confidence
⭐⭐⭐⭐⭐ EStG § 32a (2023-2025 confirmed, 2026 preliminary)
