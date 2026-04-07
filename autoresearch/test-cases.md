# OCR Autoresearch Test Cases

## Test Scenario 1: Clean PDF Invoice

### Ground Truth: AWS Invoice
```json
{
  "vendor": "Amazon Web Services EMEA SARL",
  "date": "2024-03-15",
  "invoice_number": "123-4567890-1234567",
  "amount_gross": 66.91,
  "amount_net": 66.91,
  "tax_rate": 0,
  "tax_amount": 0.00,
  "currency": "EUR",
  "description": "EC2 Instance Usage, S3 Storage, Data Transfer",
  "type": "pdf_digital"
}
```

### Expected Accuracy
- **Confidence:** 95-100%
- **All fields:** Should extract correctly
- **Challenges:** English language, reverse charge (0% VAT)

---

## Test Scenario 2: Photo Kassenbon (Supermarket Receipt)

### Ground Truth: REWE Receipt
```json
{
  "vendor": "REWE Markt GmbH",
  "date": "2024-03-15",
  "invoice_number": null,
  "amount_gross": 7.67,
  "amount_net": 7.17,
  "tax_rate": 7,
  "tax_amount": 0.50,
  "currency": "EUR",
  "description": "Groceries",
  "type": "kassenbon_photo"
}
```

### Expected Accuracy
- **Confidence:** 80-95%
- **Critical fields:** Date, amount_gross, vendor
- **Acceptable failures:** Invoice number (often missing), line items
- **Challenges:** Thermal paper, small font, centered text

---

## Test Scenario 3: Handwritten Quittung

### Ground Truth: Freelancer Receipt
```json
{
  "vendor": "Freelancer Name",
  "date": "2024-03-15",
  "invoice_number": null,
  "amount_gross": 150.00,
  "amount_net": 150.00,
  "tax_rate": 0,
  "tax_amount": 0.00,
  "currency": "EUR",
  "description": "Beratungsleistung Website-Design",
  "type": "quittung_handwritten"
}
```

### Expected Accuracy
- **Confidence:** 50-70%
- **Critical fields:** Date, amount
- **Acceptable failures:** Vendor (handwriting varies), description
- **Challenges:** Handwriting recognition, no structured layout

---

## Test Scenario 4: Bank Statement CSV

### Ground Truth: Sparkasse CSV
```json
{
  "vendor": "AWS EMEA SARL",
  "date": "2024-03-15",
  "invoice_number": null,
  "amount_gross": 119.00,
  "amount_net": null,
  "tax_rate": null,
  "tax_amount": null,
  "currency": "EUR",
  "description": "Invoice 123456789",
  "type": "bank_statement_csv"
}
```

### Expected Accuracy
- **Confidence:** 100% (structured data)
- **All fields:** Perfect extraction (CSV parsing, not OCR)
- **Challenges:** None (structured data)

---

## Test Scenario 5: Low-Quality Scan (Faded Thermal)

### Ground Truth: DM Receipt (6 months old)
```json
{
  "vendor": "dm-drogerie markt GmbH + Co. KG",
  "date": "2023-09-15",
  "invoice_number": null,
  "amount_gross": 5.35,
  "amount_net": 4.59,
  "tax_rate": null,
  "tax_amount": 0.80,
  "currency": "EUR",
  "description": "Drugstore items",
  "type": "kassenbon_faded"
}
```

### Expected Accuracy
- **Confidence:** 50-70%
- **Critical fields:** Date, amount_gross
- **Acceptable failures:** Tax breakdown (may be illegible)
- **Challenges:** Faded text, low contrast, preprocessing critical

---

## Mock Data Generation

For each scenario, generate 5 sample receipts (25 total):

### AWS Invoices (5x)
- Varying amounts: €50, €100, €250, €500, €1000
- Different services: EC2, S3, Lambda, RDS
- All: English, 0% VAT, clean PDFs

### REWE Receipts (5x)
- Varying amounts: €5, €15, €30, €50, €100
- Different dates: 2024-01 to 2024-03
- Photos: good lighting, slight wrinkles, slight skew

### Handwritten Quittungen (5x)
- Varying handwriting: neat, cursive, scribbled
- Amounts: €50, €100, €150, €200, €250
- Ink: black pen, blue pen, pencil

### Bank Statements (5x)
- CSV format
- Vendors: AWS, Hetzner, Vodafone, REWE, Deutsche Bahn
- All: Perfect structure

### Faded Receipts (5x)
- Age simulation: 6mo, 9mo, 12mo, 15mo, 18mo
- Vendors: dm, Rossmann, Aldi, Lidl, Edeka
- Preprocessing: Aggressive contrast boost needed

---

## Test Data Directory Structure

```
ocr-autoresearch/test-cases/
├── scenario1-aws-invoices/
│   ├── aws-invoice-50.pdf
│   ├── aws-invoice-100.pdf
│   ├── aws-invoice-250.pdf
│   ├── aws-invoice-500.pdf
│   ├── aws-invoice-1000.pdf
│   └── ground-truth.json
├── scenario2-rewe-receipts/
│   ├── rewe-receipt-1.jpg
│   ├── rewe-receipt-2.jpg
│   ├── rewe-receipt-3.jpg
│   ├── rewe-receipt-4.jpg
│   ├── rewe-receipt-5.jpg
│   └── ground-truth.json
├── scenario3-handwritten/
│   ├── quittung-neat.jpg
│   ├── quittung-cursive.jpg
│   ├── quittung-scribbled.jpg
│   ├── quittung-pen.jpg
│   ├── quittung-pencil.jpg
│   └── ground-truth.json
├── scenario4-bank-statements/
│   ├── statement-1.csv
│   ├── statement-2.csv
│   ├── statement-3.csv
│   ├── statement-4.csv
│   ├── statement-5.csv
│   └── ground-truth.json
└── scenario5-faded-receipts/
    ├── faded-6mo.jpg
    ├── faded-9mo.jpg
    ├── faded-12mo.jpg
    ├── faded-15mo.jpg
    ├── faded-18mo.jpg
    └── ground-truth.json
```

---

## Using Test Cases

### Run Single Test
```bash
node test-ocr.js ocr-autoresearch/test-cases/scenario1-aws-invoices/aws-invoice-50.pdf
```

### Run Full Suite
```bash
for scenario in ocr-autoresearch/test-cases/*; do
  for file in $scenario/*.{pdf,jpg,csv}; do
    node test-ocr.js "$file"
  done
done
```

### Compare Against Ground Truth
```javascript
const groundTruth = require('./ground-truth.json');
const extracted = await ocrProcessor.extractText(filePath);
const parsed = ocrProcessor.parseReceiptData(extracted.text, filename);

const score = compareWithGroundTruth(parsed, groundTruth);
// Score: 0-6 based on 6 binary evals
```
