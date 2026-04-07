# Telecommunications Vendors

## Vodafone

### Invoice Pattern
```
Vodafone GmbH
Ferdinand-Braun-Platz 1
40549 Düsseldorf

Kundennummer: 123456789
Rechnungsnummer: 202403-12345678
Rechnungsdatum: 15.03.2024

Red Internet & Phone 50 Cable    44,99 €
Einmalige Kosten                   0,00 €

Netto:                            37,81 €
19% MwSt:                          7,18 €
Brutto:                           44,99 €
```

### Recognition Indicators
- "Vodafone GmbH"
- Düsseldorf address
- "Kundennummer" + "Rechnungsnummer"
- Product names: "Red", "GigaKombi"

### Extraction Rules
```javascript
{
  vendor: 'Vodafone',
  vendor_normalized: 'Vodafone GmbH',
  tax_rate: 19,
  currency: 'EUR',
  country: 'DE',
  category: 'telekom',
  recurring: 'monthly'
}
```

## Telekom (Deutsche Telekom)

### Invoice Pattern
```
Telekom Deutschland GmbH
Landgrabenweg 151
53227 Bonn

Rechnungsnummer: 9123456789012
Rechnungsdatum: 01.03.2024

MagentaMobil M                    39,95 €
StreamOn Music                     0,00 €

Summe netto:                      33,57 €
MwSt 19%:                          6,38 €
Rechnungsbetrag:                  39,95 €
```

### Recognition Indicators
- "Telekom Deutschland GmbH" or "Deutsche Telekom AG"
- Bonn address
- Product names: "Magenta", "StreamOn"
- Very long invoice numbers (13 digits)

### Extraction Rules
```javascript
{
  vendor: 'Telekom',
  vendor_normalized: 'Telekom Deutschland GmbH',
  tax_rate: 19,
  currency: 'EUR',
  country: 'DE',
  category: 'telekom',
  recurring: 'monthly'
}
```

## O2 (Telefónica)

### Invoice Pattern
```
Telefónica Germany GmbH & Co. OHG
Georg-Brauchle-Ring 50
80992 München

Kundennummer: 1234567890
Rechnungsnr.: 123456789012345
Datum: 15.03.2024

O2 Free M                         29,99 €
Einrichtungsgebühr                 0,00 €

Netto:                            25,20 €
MwSt:                              4,79 €
Gesamt:                           29,99 €
```

### Recognition Indicators
- "Telefónica" or "O2"
- München address
- Product names: "O2 Free", "O2 my"
- 15-digit invoice number

### Extraction Rules
```javascript
{
  vendor: 'O2',
  vendor_normalized: 'Telefónica Germany GmbH & Co. OHG',
  tax_rate: 19,
  currency: 'EUR',
  country: 'DE',
  category: 'telekom',
  recurring: 'monthly'
}
```

## 1&1 (United Internet)

### Invoice Pattern
```
1&1 Versatel Deutschland GmbH
Elgendorfer Straße 57
56410 Montabaur

Rechnung Nr. 123456789
Rechnungsdatum: 15.03.2024

1&1 DSL 100                       19,99 €
Router-Miete                       4,99 €

Nettobetrag:                      20,99 €
USt 19%:                           3,99 €
Bruttobetrag:                     24,98 €
```

### Recognition Indicators
- "1&1" (with &, not "1und1")
- Montabaur address
- Product names: "DSL", "HomeServer"

### Extraction Rules
```javascript
{
  vendor: '1&1',
  vendor_normalized: '1&1 Versatel Deutschland GmbH',
  tax_rate: 19,
  currency: 'EUR',
  country: 'DE',
  category: 'telekom',
  recurring: 'monthly'
}
```

## Common Patterns

### Date Format
All use DD.MM.YYYY (German standard)

### Tax Rate
Always 19% (telecommunications are standard VAT)

### Invoice Frequency
- Mobile/DSL: Monthly
- One-time fees: Setup, hardware

### Categorization
For tax purposes:
- **Betriebsausgabe** if business use ≥10%
- **Private Nutzung** if <10% business use
- Mixed use: Split proportionally (e.g., 50/50)

### Common Line Items
- Base tariff (recurring)
- Device installments (one-time or monthly)
- Roaming charges (variable)
- Setup fees (one-time)
