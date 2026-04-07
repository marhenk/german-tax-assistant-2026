# ELSTER Format Requirements

*Updated: 2025-05-27 | Tax Year: 2023-2026 | Reliability: ⭐⭐⭐⭐*

## Summary
Technical requirements for submitting EÜR and UStVA via ELSTER (Elektronische Steuererklärung).

## Legal Basis
- § 87a AO (electronic submission requirement)
- ELSTER-Verordnung (ELStV)
- Effective: Mandatory since 2013 (EÜR), 2005 (UStVA)
- Applies to: All businesses (paper forms no longer accepted)

## Rules
### File Formats
- **EÜR**: XML (ELSTER schema, changes annually)
- **UStVA**: XML (ELSTER schema, changes quarterly)
- **Attachments**: PDF (invoices, receipts) — max 5 MB per file
- **Digital signature**: Soft-PIN (simple) or Zertifikatsdatei (advanced)

### Schema Validation
- **EÜR 2024**: `euer_2024_1.xsd` (version 1, released Dec 2023)
- **UStVA 2024**: `ustva_2024.xsd`
- **Breaking changes**: Field names, data types change annually → update export logic

### Mandatory Fields (EÜR)
- Steuernummer (tax number)
- Betriebseinnahmen (revenue)
- Betriebsausgaben (expenses)
- Gewinn (profit)
- Anlage EÜR: Category breakdown (Wareneinkauf, Fremdleistungen, etc.)

### Mandatory Fields (UStVA)
- USt-ID (if applicable)
- Bemessungsgrundlage (tax base, net amounts)
- Umsatzsteuer (output tax)
- Vorsteuer (input tax)
- Zahllast/Erstattung (net liability/refund)

## Edge Cases
- **Missing Steuernummer**: ELSTER rejects immediately (pre-validation)
- **Decimal places**: Max 2 decimals for currency (€1,190.50, not €1,190.505)
- **Date format**: `YYYY-MM-DD` (ISO 8601), not `DD.MM.YYYY`
- **Character encoding**: UTF-8 (ä, ö, ü allowed), not ISO-8859-1
- **Negative values**: Allowed for corrections (credit notes, returns)

## Counter-Arguments
- **"I'll use ELSTER web form"**: Valid for small businesses, but no automation, error-prone → API/XML better for >50 transactions/year

## Examples
### EÜR XML Excerpt (Simplified)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Elster xmlns="http://www.elster.de/elsterxml/schema/v11">
  <TransferHeader>
    <Verfahren>ElsterErklaerung</Verfahren>
    <DatenArt>EUer</DatenArt>
    <Vorgang>send-NoSig</Vorgang>
  </TransferHeader>
  <DatenTeil>
    <Nutzdatenblock>
      <EUer>
        <Allgemein>
          <Steuernummer>12345/12345</Steuernummer>
          <Jahr>2024</Jahr>
        </Allgemein>
        <Betriebseinnahmen>50000.00</Betriebseinnahmen>
        <Betriebsausgaben>30000.00</Betriebsausgaben>
        <Gewinn>20000.00</Gewinn>
        <AnlageEUer>
          <Wareneinkauf>10000.00</Wareneinkauf>
          <Fremdleistungen>5000.00</Fremdleistungen>
          <!-- ... -->
        </AnlageEUer>
      </EUer>
    </Nutzdatenblock>
  </DatenTeil>
</Elster>
```

### UStVA XML Excerpt (Simplified)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Elster xmlns="http://www.elster.de/elsterxml/schema/v11">
  <TransferHeader>
    <Verfahren>ElsterAnmeldung</Verfahren>
    <DatenArt>UStVA</DatenArt>
  </TransferHeader>
  <DatenTeil>
    <Nutzdatenblock>
      <UStVA>
        <Steuernummer>12345/12345</Steuernummer>
        <Jahr>2024</Jahr>
        <Zeitraum>03</Zeitraum> <!-- Q1 -->
        <Kz81>50000.00</Kz81> <!-- Bemessungsgrundlage 19% -->
        <Kz81>9500.00</Kz81> <!-- Umsatzsteuer 19% -->
        <Kz66>5000.00</Kz66> <!-- Vorsteuer -->
        <Kz83>4500.00</Kz83> <!-- Zahllast (USt - Vorsteuer) -->
      </UStVA>
    </Nutzdatenblock>
  </DatenTeil>
</Elster>
```

## Validation Tools
- **ELSTER Rich Client**: Official desktop app (validates XML before submission)
- **PyELSTER**: Python library (unofficial, community-maintained)
- **ERiC (ELSTER Rich Client)**: SDK for programmatic submission (requires license)

## Error Codes (Common)
- **610001001**: Invalid XML schema (field name/type wrong)
- **610101219**: Missing mandatory field (e.g., Steuernummer)
- **370201001**: Calculation error (Gewinn ≠ Einnahmen - Ausgaben)
- **490001001**: Digital signature invalid/expired

## Submission Workflow
1. **Generate XML** (from Lexoffice/local DB)
2. **Validate locally** (against XSD schema)
3. **Submit via ELSTER** (web form or API)
4. **Receive confirmation** (TransferTicket, save for audit)
5. **Check processing status** (may take 24-48h)
6. **Download assessment** (Steuerbescheid, PDF)

## Automation Hints (for lexoffice-steuer skill)
```python
from lxml import etree

def generate_euer_xml(transactions, year):
    # 1. Calculate totals
    revenue = sum(t.amount for t in transactions if t.category == "Betriebseinnahmen")
    expenses = sum(abs(t.amount) for t in transactions if t.category != "Betriebseinnahmen")
    profit = revenue - expenses
    
    # 2. Build XML
    root = etree.Element("Elster", xmlns="http://www.elster.de/elsterxml/schema/v11")
    # ... (full XML structure)
    
    # 3. Validate against XSD
    schema = etree.XMLSchema(file="euer_2024_1.xsd")
    if not schema.validate(root):
        raise ValidationError(schema.error_log)
    
    return etree.tostring(root, encoding="UTF-8", pretty_print=True)
```

## Sources
- ELSTER Developer Portal: https://www.elster.de/elsterweb/infoseite/entwickler
- § 87a AO (electronic submission)
- ELSTER-Verordnung (ELStV)

## Related
- [[best-practices/validation-checks]] (pre-submission validation)
- [[categories/*]] (EÜR category breakdown)
- [[calculations/ust]] (UStVA calculation)

## Confidence
⭐⭐⭐⭐ ELSTER specs (well-documented, but schema changes annually)
