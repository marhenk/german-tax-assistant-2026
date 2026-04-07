# Tax Wiki - Index

*Created: 2025-05-27 | Status: Bootstrap*

## Overview

Comprehensive knowledge base for German tax compliance, EÜR categorization, and Lexoffice API integration. Supports the `lexoffice-steuer` skill with authoritative, cited tax knowledge.

## Structure

### 📂 Categories (`wiki/categories/`)
EÜR category definitions with keywords, legal basis, and examples.

- `betriebseinnahmen.md` - Revenue categorization
- `wareneinkauf.md` - Cost of goods sold
- `fremdleistungen.md` - External services
- `kfz-kosten.md` - Vehicle expenses
- `raumkosten.md` - Office/rent costs
- `versicherungen.md` - Business insurance
- `werbung.md` - Marketing & advertising
- `reisekosten.md` - Travel expenses
- `fortbildung.md` - Training & education
- `abschreibungen.md` - Depreciation
- *(More to be added)*

### 🧮 Calculations (`wiki/calculations/`)
Tax formulas, rates, and thresholds.

- `ust.md` - Umsatzsteuer (19%, 7%, 0%)
- `vorsteuer.md` - Input tax (Vorsteuerabzug)
- `grundfreibetrag.md` - Personal allowance
- `kleinunternehmer.md` - Small business exemption (§19 UStG)

### ⚖️ Compliance (`wiki/compliance/`)
Year-specific rules and legal changes.

- `tax-law-2026.md` - 2026 tax law changes
- `elster-format.md` - ELSTER submission requirements

### 🔧 Edge Cases (`wiki/edge-cases/`)
Common validation scenarios and ambiguous situations.

- `missing-ust.md` - Handling transactions without USt
- `mixed-revenue.md` - Multiple revenue streams
- `duplicate-detection.md` - Identifying duplicate transactions

### ✅ Best Practices (`wiki/best-practices/`)
Categorization patterns and API integration.

- `categorization-keywords.md` - Keyword-based auto-categorization
- `validation-checks.md` - Pre-submission validation
- `lexoffice-api-patterns.md` - API best practices

## Raw Sources (`raw/`)

### `steuergesetz-2026/`
Official BMF documents, EStG/UStG excerpts, ELSTER specs.

### `lexoffice-api/`
API documentation, community GitHub repos, integration guides.

### `euer-guides/`
Official EÜR guides from BMF, ELSTER, tax authorities.

## Usage

**For skill developers:**
```markdown
Query wiki before categorizing:
1. Check `categories/[transaction-type].md` for keywords
2. Verify `compliance/tax-law-2026.md` for current rules
3. Cross-reference `edge-cases/` if ambiguous
```

**For autoresearch:**
```markdown
Link test cases to wiki pages:
- Test case 1 (Kleinunternehmer) → `calculations/kleinunternehmer.md`
- EVAL 1 (categorization) → `categories/*.md`
```

## Maintenance

- **Ingest log:** `log.md` (all updates timestamped)
- **Schema:** `SCHEMA.md` (Karpathy pattern rules)
- **Monthly lint:** Check for outdated compliance, broken links, missing examples

## Status

**Bootstrap Complete (2025-05-27):**
- ✅ Directory structure created
- ✅ SCHEMA.md defined
- ✅ 20 initial wiki pages created
  - 5 category pages (Betriebseinnahmen, Wareneinkauf, Fremdleistungen, KFZ-Kosten, Raumkosten)
  - 4 calculation pages (USt, Vorsteuer, Grundfreibetrag, Kleinunternehmer)
  - 2 compliance pages (tax-law-2026 placeholder, ELSTER format)
  - 3 edge-case pages (missing USt, mixed revenue, duplicate detection)
  - 3 best-practice pages (categorization keywords, validation checks, Lexoffice API patterns)
- ✅ 2 raw sources ingested (Lexoffice API docs, VBA community guide)
- ✅ Skill integration complete (`lexoffice-steuer/SKILL.md` updated)
- ✅ Bootstrap script ready (`~/.openclaw/scripts/bootstrap-tax-wiki.sh`)

**Pending:**
- ⏳ Awaiting Step 2 sub-agent: `references/tax-law-2026.md` → `wiki/compliance/tax-law-2026.md`
- 📄 Additional categories to create (5 more): Versicherungen, Werbung, Reisekosten, Fortbildung, Abschreibungen

**Next Steps:**
1. 🔄 Step 2 sub-agent completes research → update `tax-law-2026.md`
2. 📚 Ingest official sources (BMF, ELSTER) when available
3. 🤖 Run autoresearch with wiki-linked evals
4. 📦 Expand category coverage (add remaining 5 categories)
