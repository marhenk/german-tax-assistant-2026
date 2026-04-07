# Tax Wiki Schema

## Domain
German tax law (EStG, UStG), Lexoffice API patterns, EÜR categorization, 2026 compliance rules, edge cases

## Wiki Structure

### Core Pages
- `index.md` - Catalog of all tax knowledge
- `log.md` - Ingest history and updates
- `categories/` - EÜR category definitions and keywords
- `calculations/` - USt, Vorsteuer, Freibetrag formulas
- `compliance/` - Year-specific tax rules (2023-2026)
- `edge-cases/` - Common validation scenarios
- `best-practices/` - Categorization patterns and API handling

### Page Format

```markdown
# [Topic]
*Updated: YYYY-MM-DD | Tax Year: 2023/2024/2025/2026 | Reliability: ⭐⭐⭐⭐⭐*

## Summary
[What this covers]

## Legal Basis
- § [number] [EStG/UStG/AO]
- Effective: [date]
- Applies to: [taxpayer types]

## Rules
[How to apply it]

## Edge Cases
- When rule doesn't apply
- Regional differences (Bundesland-specific)
- Common misinterpretations

## Counter-Arguments
- Alternative interpretations (if ambiguous)
- Changed rulings (if updated)

## Examples
```
[Example transaction]
→ Category: [name]
→ Rationale: [why]
```

## Sources
- [[raw/steuergesetz-2026/bmf-schreiben-xyz]]
- https://... (official source)
- Community: [[raw/lexoffice-api/github-issue-123]]

## Related
- [[calculations/ust]] (if involves tax calc)
- [[categories/other-category]] (if similar)

## Confidence
⭐⭐⭐⭐⭐ Official BMF/ELSTER
⭐⭐⭐⭐ Lexoffice official docs
⭐⭐⭐ Tax advisor consensus
⭐⭐ Community validated
⭐ Blog post/unverified
```

## Source Classification

**Tier 1 (⭐⭐⭐⭐⭐):** BMF Schreiben, ELSTER specs, EStG/UStG text
**Tier 2 (⭐⭐⭐⭐):** Lexoffice official API docs, DATEV guidelines
**Tier 3 (⭐⭐⭐):** Tax advisor articles, Haufe-Lexware guides
**Tier 4 (⭐⭐):** Community code (validated edge cases)
**Tier 5 (⭐):** Blog posts, forum answers

## Ingest Protocol

**From raw/ → wiki/:**
1. BMF documents → Extract § references, effective dates → `compliance/`
2. Lexoffice API docs → Endpoint specs, rate limits → `best-practices/`
3. Tax guides → Categorization examples → `categories/`
4. Community code → Edge case patterns → `edge-cases/`

**Mandatory Metadata:**
- Tax year (2023/2024/2025/2026)
- Legal basis (§ EStG, § UStG)
- Effective date
- Source reliability (⭐-⭐⭐⭐⭐⭐)

**Rules:**
- Raw sources stay immutable (complete PDFs, API dumps)
- Wiki extracts actionable knowledge
- Every wiki page cites raw/ source
- Update log.md with ingest timestamp

## Query Protocol

**Triggers:**
- "How do I categorize [transaction type]?"
- "What's the USt rate for [item]?"
- "2026 rules for [scenario]"
- "Edge case: [description]"

**Process:**
1. Search categories/ or calculations/
2. Check compliance/ for year-specific rules
3. Return wiki page with legal basis
4. Log query if reveals knowledge gap

## Lint Protocol

**Run monthly:**
- Outdated compliance rules (check for 2026 updates)
- Categories not used in last 90 days
- Edge cases without examples
- Missing § references
- Broken raw/ links
- Conflicting interpretations (requires resolution)

## Integration Points

- **lexoffice-steuer skill** → categories/ + calculations/ + compliance/
- **Autoresearch evals** → edge-cases/ (learn from failures)
- **MEMORY.md** → Extract tax principles to wiki
- **Step 2 sub-agent** → tax-law-2026.md → `compliance/tax-law-2026.md`

## Validation Rules

**Before publishing wiki page:**
1. Legal basis cited (§ number)
2. Tax year specified
3. Source reliability rated
4. At least one example provided
5. Related pages linked
6. Counter-arguments documented (if ambiguous)

## Maintenance Triggers

**Update wiki when:**
- New BMF Schreiben published
- Lexoffice API changes
- Autoresearch reveals edge case
- User correction (Marcel flags error)
- Tax year rollover (Jan 1st)
