# Test Cases

## Overview

This folder contains test cases and evaluation scripts for the German Tax Assistant.

## Test Coverage

**Categories:**
- OCR Processing (150 receipts)
- Bank Statement Parsing (CSV, MT940)
- Transaction Matching (fuzzy logic)
- EÜR Categorization (19 categories)
- Private/Business Classification
- USt Calculation (19%, 7%, 0% rates)

## Autoresearch Results

See `../autoresearch/FINAL_REPORT.md` for comprehensive test results.

**Summary:**
- Overall Accuracy: 93.3% (28/30 score)
- OCR Accuracy: 94.7% (142/150 receipts)
- Classification: 100% (private/business split)

## Running Tests

```bash
npm test
# or
node test/run-tests.js
```

## Test Data

Test data is stored in `autoresearch/test-data/` to avoid duplication.

**Anonymization:** All personal data has been removed or replaced with synthetic examples.
