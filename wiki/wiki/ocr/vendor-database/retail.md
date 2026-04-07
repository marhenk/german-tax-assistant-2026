# Retail Vendors

## REWE

### Receipt Pattern
```
    REWE Markt GmbH
   Hauptstr. 123
  12345 Berlin

  Filiale 1234

2024-03-15    14:32

Milch 1,5%        1,89
Brot Vollkorn     2,49
Äpfel 1kg         3,29
--------------------------
SUMME EUR         7,67
  davon 7% MwSt   0,50
Bar               10,00
Rückgeld           2,33

www.rewe.de
Vielen Dank!
```

### Recognition Indicators
- "REWE" (often centered, large font)
- "Filiale" number
- ISO date format (YYYY-MM-DD)
- "SUMME EUR" keyword
- Often 7% MwSt (food products)

### Extraction Rules
```javascript
{
  vendor: 'REWE',
  vendor_normalized: 'REWE Markt GmbH',
  tax_rate: 7,  // Usually, but can be mixed (19% for non-food)
  currency: 'EUR',
  country: 'DE',
  category: 'einzelhandel',
  receipt_type: 'kassenbon'
}
```

## dm (Drogerie Markt)

### Receipt Pattern
```
dm-drogerie markt GmbH + Co. KG
Karlsruhe

Markt 5678

15.03.2024  15:45

Shampoo               2,95 €  B
Zahnpasta             1,45 €  A
Taschentücher         0,95 €  A

Summe                 5,35 €
  7% MwSt             0,24 €
 19% MwSt             0,56 €

EC-Karte              5,35 €
```

### Recognition Indicators
- "dm-drogerie markt"
- "Markt" number (not "Filiale")
- Tax indicators: A=19%, B=7%, C=0%
- Mixed tax rates common (cosmetics=19%, food=7%)

### Extraction Rules
```javascript
{
  vendor: 'dm',
  vendor_normalized: 'dm-drogerie markt GmbH + Co. KG',
  tax_rate: null,  // Mixed rates - extract both
  currency: 'EUR',
  country: 'DE',
  category: 'einzelhandel',
  receipt_type: 'kassenbon',
  tax_breakdown: true  // Parse A/B/C codes
}
```

## EDEKA

### Receipt Pattern
```
EDEKA Müller
Inh. Hans Müller
Bahnhofstr. 45
12345 Berlin

Bon-Nr: 1234
Datum: 15.03.2024 16:20

Butter                2,49
Eier 10er             2,99
Wasser 6x1,5L         3,99

SUMME EUR             9,47
enth. 7% MwSt         0,62

Gegeben:             10,00
Zurück:               0,53
```

### Recognition Indicators
- "EDEKA" + owner name (franchises)
- "Bon-Nr" (not "Filiale")
- German date format (DD.MM.YYYY HH:MM)
- "enth. MwSt" (contained tax)

### Extraction Rules
```javascript
{
  vendor: 'EDEKA',
  vendor_normalized: 'EDEKA [Owner Name]',  // Extract owner
  tax_rate: 7,
  currency: 'EUR',
  country: 'DE',
  category: 'einzelhandel',
  receipt_type: 'kassenbon',
  franchise: true
}
```

## Aldi / Lidl (Discounters)

### Receipt Pattern (ALDI SÜD)
```
ALDI SÜD
Sagt Danke.

Filiale 123
15.03.24    12:34

Brot                  0,99 A
Milch                 0,89 A
Schokolade            1,29 B

Summe EUR             3,17
  MwSt  7%            0,14
  MwSt 19%            0,21

Bar                   5,00
Rückgeld              1,83
```

### Recognition Indicators
- "ALDI" (SÜD or NORD)
- Minimal branding
- Very compact layout
- Short date (DD.MM.YY)
- Tax codes A/B

### Extraction Rules
```javascript
{
  vendor: 'ALDI',
  vendor_normalized: 'ALDI SÜD Dienstleistungs-SE & Co. oHG',
  tax_rate: null,  // Mixed
  currency: 'EUR',
  country: 'DE',
  category: 'einzelhandel',
  receipt_type: 'kassenbon',
  minimal_branding: true
}
```

## Common Challenges

### Mixed Tax Rates
- Food: 7% (A)
- Non-food: 19% (B)
- Books/Newspapers: 7% (C)
- Medicine: 0% or 7%

**Solution:** Extract total amount only (tax breakdown not critical for expense tracking)

### Thermal Paper Fading
All retail receipts use thermal paper → **Scan within 1 week**

### No Invoice Number
Kassenbon typically have:
- Bon-Nr (receipt number, not tax-relevant)
- Filiale/Markt number
- Date + time

**Unique ID:** `{vendor}_{date}_{amount}` (e.g., `REWE_2024-03-15_7.67`)

### Line Items Not Needed
For tax purposes, only total amount matters:
- Exception: Mixed business/private purchases → Manual split
