# Tax Wiki - Ingest Log

## 2025-05-27

**Bootstrap:**
- Created directory structure: `raw/`, `wiki/{categories,calculations,compliance,edge-cases,best-practices}`
- Defined `SCHEMA.md` (Karpathy pattern adapted for tax law)
- Created `index.md` (catalog)

**Ingested Sources:**

### Lexoffice API Documentation (Official)
- **Source:** https://developers.lexware.io/docs/
- **Reliability:** ⭐⭐⭐⭐ (official Lexware docs)
- **File:** `raw/lexoffice-api/lexware-api-docs.md`
- **Content:** Rate limits, endpoints (articles, contacts, credit-notes), authentication, optimistic locking
- **Extracted to:**
  - `wiki/best-practices/lexoffice-api-patterns.md` (rate limits, error handling, ID mapping)
  - `wiki/edge-cases/missing-ust.md` (tax type handling)

### Lexoffice VBA Integration Guide (Community)
- **Source:** https://access-im-unternehmen.de/Zugriff_auf_lexoffice_per_RESTAPI_und_VBA/
- **Reliability:** ⭐⭐ (community article, validated patterns)
- **File:** `raw/lexoffice-api/vba-community-guide.md`
- **Content:** VBA examples, ID mapping workaround (no custom customer numbers), version management
- **Extracted to:**
  - `wiki/best-practices/lexoffice-api-patterns.md` (optimistic locking, batch operations)

**Created Wiki Pages:**

### Categories (5/10+ planned)
- `wiki/categories/betriebseinnahmen.md` (revenue)
- `wiki/categories/wareneinkauf.md` (cost of goods)
- `wiki/categories/fremdleistungen.md` (external services, §13b)
- `wiki/categories/kfz-kosten.md` (vehicle expenses, 1% rule)
- `wiki/categories/raumkosten.md` (office/rent, home office rules)

### Calculations (4/4 core)
- `wiki/calculations/ust.md` (19%, 7%, 0% rates, reverse charge)
- `wiki/calculations/vorsteuer.md` (input tax deduction)
- `wiki/calculations/grundfreibetrag.md` (2023-2026 thresholds)
- `wiki/calculations/kleinunternehmer.md` (§19 UStG exemption, €22k/€50k)

### Compliance (2/2)
- `wiki/compliance/tax-law-2026.md` (placeholder for Step 2 sub-agent)
- `wiki/compliance/elster-format.md` (XML schema, mandatory fields)

### Edge Cases (3/3)
- `wiki/edge-cases/missing-ust.md` (Kleinunternehmer, §13b, exempt services)
- `wiki/edge-cases/mixed-revenue.md` (multiple streams, OSS threshold)
- `wiki/edge-cases/duplicate-detection.md` (fingerprinting, invoice number registry)

### Best Practices (3/3)
- `wiki/best-practices/categorization-keywords.md` (vendor whitelist, pattern matching)
- `wiki/best-practices/validation-checks.md` (pre-submission checks, ELSTERready)
- `wiki/best-practices/lexoffice-api-patterns.md` (rate limits, ID mapping, optimistic locking)

**Status:** Bootstrap complete (20 wiki pages created)

**Pending:**
- ⏳ Awaiting Step 2 sub-agent: `references/tax-law-2026.md` → `wiki/compliance/tax-law-2026.md`
- 📄 Additional categories to create: Versicherungen, Werbung, Reisekosten, Fortbildung, Abschreibungen (5 more)
- 🔗 Skill integration complete: `lexoffice-steuer/SKILL.md` updated with wiki references
- 📦 Bootstrap script ready: `~/.openclaw/scripts/bootstrap-tax-wiki.sh`

---

## Future Entries

Format:
```
## YYYY-MM-DD

**Source:** [BMF/Lexoffice/Community/Other]
**Action:** Ingested/Updated/Deprecated
**Files:** raw/path → wiki/path
**Reliability:** ⭐⭐⭐⭐⭐
**Notes:** [What changed, why]
```
