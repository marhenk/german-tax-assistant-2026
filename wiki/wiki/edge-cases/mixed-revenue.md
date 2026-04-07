# Mixed Revenue (Multiple Revenue Streams)

*Updated: 2025-05-27 | Tax Year: 2023-2026 | Reliability: ⭐⭐⭐⭐*

## Summary
Handling multiple revenue types in one business. Common scenarios: consulting + product sales, different USt rates, B2B + B2C mix.

## Legal Basis
- § 4 Abs. 3 EStG (EÜR requirement: single profit figure)
- § 12 UStG (different tax rates)
- § 19 UStG (Kleinunternehmer threshold applies to total revenue)

## Rules
### Single EÜR, Multiple Streams
- **All revenue combined**: EÜR reports one net profit (Betriebseinnahmen - Betriebsausgaben)
- **Separate tracking recommended**: For business analytics, not legally required
- **Kleinunternehmer threshold**: Applies to **total** revenue (all streams combined)

### Different USt Rates
- **19% + 7% + 0%**: Valid in one business (e.g., restaurant: meals 7%, drinks 19%)
- **Separate line items**: Invoice must show each rate separately
- **UStVA reporting**: Aggregate by rate (Zeile 8: 19%, Zeile 9: 7%, Zeile 10: 0%)

## Edge Cases
- **Consulting (19%) + book sales (7%)**: Both valid, separate line items
- **Domestic (19%) + EU export (0%)**: Valid, different tax treatments
- **B2B (net invoicing) + B2C (gross invoicing)**: Both valid, customer preference
- **Photovoltaic (0% since 2023) + other services (19%)**: Valid mix
- **Digital services (EU B2C)**: If >€10k/year → destination country USt rates (separate from main business)

## Counter-Arguments
- **Separate businesses?** If revenue streams unrelated (e.g., consulting + rental property) → separate tax entities may be clearer, consult tax advisor
- **Trade vs. service**: Some argue different treatment for Gewerbesteuer — not applicable for EÜR filers unless GmbH

## Examples
### Consulting + Product Sales
```
Invoice 1 (Consulting): €1,000 + €190 USt (19%) = €1,190
Invoice 2 (Book): €100 + €7 USt (7%) = €107

→ Betriebseinnahmen: €1,100 (€1,000 + €100)
→ USt 19%: +€190
→ USt 7%: +€7
→ UStVA: Zeile 8 (19%): €1,000, Zeile 9 (7%): €100
```

### Domestic + EU Export
```
Invoice 1 (DE customer): €1,000 + €190 USt (19%) = €1,190
Invoice 2 (FR customer, B2B): €1,000 + €0 USt (Innergemeinschaftliche Lieferung) = €1,000

→ Betriebseinnahmen: €2,000
→ USt 19%: +€190
→ USt 0%: €0 (but Zusammenfassende Meldung required for EU)
```

### B2B + B2C
```
Invoice 1 (B2B, net): Net €1,000, USt €190, Gross €1,190
Invoice 2 (B2C, gross): Gross €1,190 (contains net €1,000 + USt €190)

→ Both valid
→ Betriebseinnahmen: €2,000 (net amounts)
→ USt: +€380 (€190 + €190)
```

### Kleinunternehmer Threshold Monitoring
```
Stream 1 (Consulting): €15,000/year
Stream 2 (Book sales): €8,000/year
Total: €23,000/year

→ Exceeds €22,000 Kleinunternehmer threshold
→ Must charge USt from next year (all streams)
```

### Digital Services (OSS)
```
Main business (DE): €30,000/year
Digital services (EU B2C): €12,000/year

→ Digital services >€10k/year → OSS/IOSS registration required
→ Charge destination country USt (e.g., 21% for NL, 20% for AT)
→ Separate declaration (not part of main UStVA)
```

## Validation Checklist
1. ☐ Total revenue (all streams) for Kleinunternehmer threshold
2. ☐ Correct USt rate per stream (19% vs. 7% vs. 0%)
3. ☐ Separate line items for different rates on invoices
4. ☐ EU B2C digital services >€10k → OSS registration
5. ☐ Zusammenfassende Meldung (ZM) for EU B2B sales

## Automation Hints (for lexoffice-steuer skill)
```python
# Aggregate revenue by stream for analytics
revenue_by_stream = {
    "consulting": sum(invoices.filter(category="consulting")),
    "product_sales": sum(invoices.filter(category="product")),
    "digital_services_eu": sum(invoices.filter(category="digital_eu"))
}

# Check Kleinunternehmer threshold
total_revenue = sum(revenue_by_stream.values())
if total_revenue > 22000:
    warn("Kleinunternehmer threshold exceeded, must charge USt next year")

# Check OSS threshold (digital services only)
if revenue_by_stream["digital_services_eu"] > 10000:
    warn("OSS threshold exceeded, register for destination country USt")
```

## Sources
- § 4 Abs. 3 EStG (EÜR structure)
- § 12 UStG (tax rates)
- § 19 UStG (Kleinunternehmer threshold)
- EU OSS Directive (€10k threshold for digital services)

## Related
- [[calculations/ust]] (tax rates)
- [[calculations/kleinunternehmer]] (threshold monitoring)
- [[categories/betriebseinnahmen]] (revenue recognition)
- [[compliance/tax-law-2026]] (2026 rate/threshold changes)
- [[best-practices/categorization-keywords]] (stream classification)

## Confidence
⭐⭐⭐⭐ EStG + UStG (well-established, but OSS rules complex)
