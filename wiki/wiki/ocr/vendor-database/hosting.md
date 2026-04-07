# Hosting Providers

## AWS (Amazon Web Services)

### Invoice Pattern
```
Amazon Web Services EMEA SARL
38 Avenue John F. Kennedy
L-1855 Luxembourg

Invoice Number: 123-4567890-1234567
Invoice Date: March 15, 2024

Description                  Amount (EUR)
EC2 Instance Usage              45.67
S3 Storage                      12.34
Data Transfer                    8.90
-------------------------------------------
Subtotal:                       66.91
VAT (0%):                        0.00
Total:                          66.91 EUR
```

### Recognition Indicators
- "Amazon Web Services" or "AWS"
- Luxembourg address
- Invoice number format: XXX-XXXXXXX-XXXXXXX
- Usually 0% VAT (B2B reverse charge)
- English language

### Extraction Rules
```javascript
{
  vendor: 'AWS',
  vendor_normalized: 'Amazon Web Services EMEA SARL',
  tax_rate: 0,  // Reverse charge
  currency: 'EUR',
  invoice_pattern: /\d{3}-\d{7}-\d{7}/,
  reverse_charge: true  // §13b UStG
}
```

## Hetzner Online

### Invoice Pattern
```
Hetzner Online GmbH
Industriestr. 25
91710 Gunzenhausen
Deutschland

Rechnungsnr.: 12345678
Datum: 15.03.2024

EX42 Dedicated Server          39,00 €
  (01.03.2024 - 31.03.2024)

Zwischensumme (netto):         39,00 €
19% MwSt:                       7,41 €
Gesamtbetrag:                  46,41 €
```

### Recognition Indicators
- "Hetzner Online GmbH"
- Gunzenhausen address
- German language
- 19% VAT (domestic B2B/B2C)

### Extraction Rules
```javascript
{
  vendor: 'Hetzner',
  vendor_normalized: 'Hetzner Online GmbH',
  tax_rate: 19,
  currency: 'EUR',
  country: 'DE',
  category: 'hosting'
}
```

## DigitalOcean

### Invoice Pattern
```
DigitalOcean, LLC
101 Avenue of the Americas
New York, NY 10013
USA

Invoice: DO-123456789
Date: March 15, 2024

Droplet - Basic (1vCPU, 1GB)   $6.00
Block Storage (50GB)           $5.00
-----------------------------------------
Subtotal:                     $11.00
Tax:                           $0.00
Total:                        $11.00 USD
```

### Recognition Indicators
- "DigitalOcean"
- US address
- USD currency
- 0% VAT (outside EU)

### Extraction Rules
```javascript
{
  vendor: 'DigitalOcean',
  vendor_normalized: 'DigitalOcean, LLC',
  tax_rate: 0,
  currency: 'USD',
  country: 'US',
  category: 'hosting',
  exchange_rate_needed: true  // Convert USD → EUR
}
```

## Netcup

### Invoice Pattern
```
netcup GmbH
Daimlerstraße 25
76185 Karlsruhe

Rechnungsnummer: NC-2024-123456
Rechnungsdatum: 15.03.2024

VPS 200 G10s                   2,99 €
Domain .de                     0,46 €

Nettobetrag:                   3,45 €
MwSt (19%):                    0,66 €
Bruttobetrag:                  4,11 €
```

### Recognition Indicators
- "netcup GmbH"
- Karlsruhe address
- Very low prices (budget hosting)
- 19% VAT

### Extraction Rules
```javascript
{
  vendor: 'Netcup',
  vendor_normalized: 'netcup GmbH',
  tax_rate: 19,
  currency: 'EUR',
  country: 'DE',
  category: 'hosting'
}
```

## Common Challenges

### Currency Conversion
For non-EUR invoices (AWS USD, DigitalOcean):
1. Use exchange rate from invoice date
2. ECB reference rates: https://www.ecb.europa.eu/stats/policy_and_exchange_rates/
3. Store both original and converted amounts

### Reverse Charge (§13b UStG)
- AWS, Google Cloud, Azure: Usually 0% VAT
- Freelancer must self-account for VAT
- Note in description: "Reverse Charge gemäß §13b UStG"

### Subscription Billing
- Monthly recurring → One receipt per month
- Annual upfront → One receipt, pro-rata deduction
- Usage-based → Variable amounts each month
