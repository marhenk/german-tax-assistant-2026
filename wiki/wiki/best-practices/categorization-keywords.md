# Categorization Keywords

*Updated: 2025-05-27 | Tax Year: 2023-2026 | Reliability: ⭐⭐⭐*

## Summary
Keyword-based auto-categorization for EÜR categories. Pattern-matching for vendor names, descriptions, transaction types.

## Legal Basis
- No specific legal requirement (internal automation best practice)
- Must comply with § 146 AO (GoBD — proper categorization)

## Rules
### Pattern Matching Priority
1. **Invoice metadata**: If Lexoffice invoice exists → use category from invoice
2. **Vendor whitelist**: Known vendors → pre-assigned category
3. **Keyword matching**: Description/purpose → category lookup
4. **Fallback**: Flag for manual review

### Keyword Sources
- Vendor name (e.g., "Amazon Web Services" → Fremdleistungen/IT)
- Transaction description (e.g., "Rechnung RE-001" → match invoice number)
- Bank category (e.g., "Fuel" → KFZ-Kosten)

## Category Keywords
### Betriebseinnahmen (Revenue)
- **Keywords**: Rechnung, Invoice, Payment, Zahlung, Eingang, Gutschrift (incoming credit)
- **Vendors**: Customers (from Lexoffice contacts with role `customer`)
- **Patterns**: Positive amounts (incoming)

### Wareneinkauf (Cost of Goods)
- **Keywords**: Wareneingang, Einkauf, Purchase, Lieferung, Inventory
- **Vendors**: Alibaba, AliExpress, Großhändler, Supplier
- **Patterns**: Negative amounts (outgoing) + physical goods indicators

### Fremdleistungen (External Services)
- **Keywords**: Freelancer, Consultant, Subcontractor, Dienstleistung, Service
- **Vendors**: Upwork, Fiverr, Freelancer.com, AWS, Google Cloud, Heroku
- **Patterns**: Negative amounts + service indicators

### KFZ-Kosten (Vehicle)
- **Keywords**: Tanken, Fuel, Benzin, Diesel, Shell, Aral, Reparatur, Werkstatt, Leasing, Versicherung (if vehicle)
- **Vendors**: Shell, Aral, BP, Esso, ADAC, Allianz (KFZ)
- **Patterns**: Negative amounts + vehicle-related

### Raumkosten (Office/Rent)
- **Keywords**: Miete, Rent, Büro, Office, Coworking, WeWork, Regus
- **Vendors**: Landlord names, Coworking spaces
- **Patterns**: Recurring monthly charges (fixed amount)

### Versicherungen (Insurance)
- **Keywords**: Versicherung, Insurance, Allianz, AXA, ERGO
- **Vendors**: Insurance providers
- **Patterns**: Recurring monthly/annual charges

### Werbung (Marketing)
- **Keywords**: Ad, Werbung, Marketing, Google Ads, Facebook Ads, Meta, LinkedIn
- **Vendors**: Google Ireland, Meta Ireland, LinkedIn
- **Patterns**: Negative amounts + advertising platforms

### Reisekosten (Travel)
- **Keywords**: Hotel, Flight, Bahn, Train, Lufthansa, Booking, Airbnb
- **Vendors**: Lufthansa, Deutsche Bahn, Booking.com, Airbnb, Uber
- **Patterns**: Negative amounts + travel-related

### Fortbildung (Training/Education)
- **Keywords**: Kurs, Course, Training, Udemy, Coursera, Seminar, Weiterbildung
- **Vendors**: Udemy, Coursera, LinkedIn Learning, O'Reilly
- **Patterns**: Negative amounts + education platforms

## Edge Cases
- **Amazon**: Could be Wareneinkauf (goods) OR Fremdleistungen (AWS) → check description for "AWS" or "Web Services"
- **PayPal**: Payment processor, not category → extract underlying vendor
- **Recurring charges**: May be rent, insurance, subscriptions → check vendor whitelist
- **Mixed descriptions**: "Server + Consulting" → split line items (if possible) or flag for review

## Counter-Arguments
- **Keyword ambiguity**: "Rechnung" could be incoming (revenue) or outgoing (expense) → combine with amount sign
- **Vendor name changes**: "Meta" vs. "Facebook" → maintain alias list

## Examples
### Vendor Whitelist (High Confidence)
```python
VENDOR_CATEGORIES = {
    "AWS": "Fremdleistungen",
    "Google Cloud": "Fremdleistungen",
    "Shell": "KFZ-Kosten",
    "Aral": "KFZ-Kosten",
    "Allianz": "Versicherungen",  # Unless description contains "KFZ" → KFZ-Kosten
    "WeWork": "Raumkosten",
    "Lufthansa": "Reisekosten",
    "Udemy": "Fortbildung"
}
```

### Keyword Matching (Medium Confidence)
```python
KEYWORD_CATEGORIES = {
    "Betriebseinnahmen": ["Zahlung", "Payment", "Invoice", "Rechnung"],  # + positive amount
    "Wareneinkauf": ["Wareneingang", "Purchase", "Lieferung", "Inventory"],
    "Fremdleistungen": ["Freelancer", "Consultant", "Service", "Dienstleistung"],
    "KFZ-Kosten": ["Tanken", "Fuel", "Benzin", "Werkstatt", "Leasing"],
    "Raumkosten": ["Miete", "Rent", "Büro", "Coworking"],
    "Werbung": ["Ad", "Werbung", "Marketing", "Google Ads"],
    "Reisekosten": ["Hotel", "Flight", "Bahn", "Train"],
    "Fortbildung": ["Kurs", "Training", "Seminar", "Weiterbildung"]
}
```

### Pattern Matching (Low Confidence)
```python
def categorize(txn):
    # 1. Check vendor whitelist
    if txn.vendor in VENDOR_CATEGORIES:
        # Edge case: Allianz + "KFZ" → KFZ-Kosten, else Versicherungen
        if txn.vendor == "Allianz" and "KFZ" in txn.description:
            return ("KFZ-Kosten", 90)
        return (VENDOR_CATEGORIES[txn.vendor], 95)
    
    # 2. Check keywords
    for category, keywords in KEYWORD_CATEGORIES.items():
        if any(kw.lower() in txn.description.lower() for kw in keywords):
            # Betriebseinnahmen: only if positive amount
            if category == "Betriebseinnahmen" and txn.amount > 0:
                return (category, 80)
            elif category != "Betriebseinnahmen" and txn.amount < 0:
                return (category, 75)
    
    # 3. Fallback: Flag for review
    return ("UNCATEGORIZED", 0)
```

### Real Examples
```
Transaction: "AWS Invoice 2024-03" | -€150 | Amazon Web Services
→ Vendor whitelist match: "AWS" → Fremdleistungen (95% confidence)
```

```
Transaction: "Shell Tankstelle Duisburg" | -€60 | Shell
→ Vendor whitelist match: "Shell" → KFZ-Kosten (95% confidence)
```

```
Transaction: "Zahlung Rechnung RE-001" | +€1,190 | Customer X
→ Keyword match: "Zahlung", "Rechnung" + positive amount → Betriebseinnahmen (80% confidence)
```

```
Transaction: "Freelance Development" | -€1,000 | John Doe Consulting
→ Keyword match: "Freelance" → Fremdleistungen (75% confidence)
```

```
Transaction: "Amazon Order 123-456" | -€100 | Amazon
→ No "AWS" in description → Wareneinkauf (70% confidence, flag for review)
```

## Maintenance
- **Monthly review**: Check uncategorized transactions → add to whitelist/keywords
- **Vendor alias updates**: "Facebook" → "Meta" (2021), maintain historical mapping
- **Keyword expansion**: Learn from manual categorizations

## Automation Hints (for lexoffice-steuer skill)
```python
# Learn from manual categorizations
def learn_pattern(txn, manual_category):
    # Extract keywords from description
    keywords = extract_keywords(txn.description)
    
    # Add to keyword database
    for keyword in keywords:
        KEYWORD_DB[keyword] = manual_category
    
    # Add vendor to whitelist (if confidence > 3 occurrences)
    if count_vendor_category(txn.vendor, manual_category) >= 3:
        VENDOR_CATEGORIES[txn.vendor] = manual_category
```

## Sources
- § 146 AO (GoBD — proper categorization required, method not specified)
- [[categories/*]] (EÜR category definitions)

## Related
- [[best-practices/validation-checks]] (post-categorization validation)
- [[edge-cases/mixed-revenue]] (multiple categories per invoice)
- [[edge-cases/duplicate-detection]] (prevent double-categorization)

## Confidence
⭐⭐⭐ Internal best practice (keyword accuracy depends on training data)
