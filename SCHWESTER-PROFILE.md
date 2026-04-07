# Schwester Tax Profile

**Date:** 2026-04-07  
**Status:** Self-employed / Freiberufler

---

## Business Details

**Tätigkeit:** Selbständige Vertriebspartnerin (Independent Distributor)

**Firma:**
- Young Living Europe Ltd
- Building 11 Chiswick Business Park
- 566 Chiswick High Road
- London, W4 5YS
- Großbritannien

**Business Model:**
- Multi-Level Marketing / Network Marketing
- Verkauf: Ätherische Öle, Wellness-Produkte
- Provisionsbasiert

---

## Tax Implications (Deutschland)

### **1. Einkommensteuer**
- **Status:** Freiberufler (vermutlich §18 EStG)
- **EÜR-Pflicht:** Ja (Einnahmen-Überschuss-Rechnung)
- **Steuererklärung:** Anlage S (selbständige Arbeit)

### **2. Umsatzsteuer**
- **Regelbesteuerung:** 19% USt (Standard)
- **Kleinunternehmerregelung:** Möglich wenn Umsatz < €22.000/Jahr (2024+)
- **USt-Voranmeldung:** Quartalsweise (wenn > €1.000 Zahllast/Jahr)

### **3. Besonderheiten Network Marketing**

**Einnahmen-Kategorien:**
1. **Provisionen** (Verkauf eigener Produkte)
   - Betriebseinnahmen
   - 19% USt (wenn nicht Kleinunternehmer)

2. **Team-Provisionen** (Downline)
   - Betriebseinnahmen
   - 19% USt

3. **Boni & Incentives**
   - Sachzuwendungen → Bewertung zum üblichen Endpreis
   - Geldwerte Vorteile → Betriebseinnahmen

**Betriebsausgaben (typisch):**
- Produkteinkäufe (Eigenverbrauch = Entnahme!)
- Marketing (Flyer, Visitenkarten, Website)
- Events & Schulungen
- Reisekosten (Konferenzen, Team-Treffen)
- Home Office Pauschale (€6/Tag, max €1.260/Jahr)
- KFZ-Kosten (1%-Regelung oder Fahrtenbuch)
- Telefon/Internet (anteilig)
- Versandkosten
- Software/Tools (CRM, Buchhaltung)

**Eigenverbrauch-Problem:**
- Produkte für Eigenverbrauch = **Entnahme**
- Muss als Privatentnahme versteuert werden
- USt auf Eigenverbrauch fällig!

---

## Lexoffice Setup Recommendations

### **Kategorien (EÜR-Konten):**

**Einnahmen:**
- `4600` - Provisionen Produktverkauf
- `4601` - Team-Provisionen (Downline)
- `4602` - Boni & Incentives

**Ausgaben:**
- `4930` - Wareneinkauf (Young Living Produkte)
- `4940` - Marketing & Werbung
- `4945` - Events & Schulungen
- `4670` - Reisekosten Inland
- `4671` - Reisekosten Ausland
- `4910` - Porto/Versand
- `4920` - Telefon/Internet
- `6825` - Home Office Pauschale
- `4930` - Entnahmen (Eigenverbrauch)

### **Lexoffice API Integration:**

**Auto-Categorization Rules:**
```javascript
const mlmRules = {
  'YOUNG LIVING': {
    expense: 'Wareneinkauf',
    vat: 19,
    notes: 'Check for Eigenverbrauch!'
  },
  'DHL|HERMES|DPD': {
    expense: 'Porto/Versand',
    vat: 19
  },
  'EVENTBRITE|MEETUP': {
    expense: 'Events & Schulungen',
    vat: 19
  }
};
```

---

## OCR Special Cases

**Young Living Invoices:**
- Format: UK company → English invoices
- Currency: Likely £ (GBP) → EUR conversion needed
- VAT: Reverse Charge (innergemeinschaftliche Lieferung)
- Special field: Distributor ID

**OCR Keywords:**
- "Young Living"
- "Distributor"
- "Commission"
- "PV" (Point Value)
- "OGV" (Organization Group Volume)

---

## Tax Automation Enhancements Needed

### **1. Multi-Currency Support**
- GBP → EUR conversion (EZB Tageskurs)
- Automatic conversion logging

### **2. Reverse Charge Detection**
- UK supplier → Reverse Charge §13b UStG
- No German VAT on purchase
- USt in Voranmeldung Section 46 (Erwerb)

### **3. Eigenverbrauch Tracker**
- Separate category for private use
- Automatic Entnahme calculation

### **4. MLM-Specific Reports**
- Provisions by month
- Team vs. direct sales split
- Event ROI tracking

---

## Next Steps for German Tax System

1. **Add MLM-specific categorization** (~30 Min)
   - Young Living vendor patterns
   - Commission vs. bonus detection
   
2. **Multi-currency support** (~1h)
   - GBP conversion
   - EZB API integration

3. **Reverse Charge handling** (~1h)
   - §13b detection
   - USt-Voranmeldung Section 46

4. **Eigenverbrauch calculator** (~30 Min)
   - Track product purchases vs. sales
   - Flag private use

5. **Test with real 2023-2025 data** (~1h)
   - Validate against ELSTER Steuerbescheid
   - Check all edge cases

---

## Compliance Notes

**WICHTIG:**
- MLM/Network Marketing = erlaubt in Deutschland
- ABER: Snowball/Pyramid schemes = illegal
- Young Living = legal MLM (Produktverkauf im Vordergrund)

**Finanzamt Red Flags:**
- Hohe Verluste mehrere Jahre → Liebhaberei-Prüfung
- Eigenverbrauch > Verkauf → Private Nutzung dominiert
- Keine ordentliche Buchführung → Schätzung durch FA

**Best Practices:**
- Eigenverbrauch sauber trennen
- Alle Belege aufbewahren (10 Jahre!)
- EÜR + USt fristgerecht abgeben
- Bei Unsicherheit: Steuerberater konsultieren

---

## Schwester Contact Info

**Name:** Stefanie Maier  
**Email:** sjmaier@gmx.de  
**Business:** Young Living Independent Distributor  
**Brand Partner ID:** 29009583  
**Phone:** (TBD)  
**Start Date:** (TBD)

**Enroller:** STEFANIE MAIER (ID: 29009583) - Self-Enrollment  
**Sponsor:** STEFFI FÜSSEL

## MLM Struktur

**Enroller (Direkte Upline):**
- Name: STEFANIE MAIER
- Brand Partner ID: 29009583
- Role: Enroller

**Sponsor (Zweite Ebene):**
- Name: STEFFI FÜSSEL
- Brand Partner ID: ?
- Role: Sponsor

**Weitere Upline:**
- STEFANIE MAIER - Gold
- Flow Academy LLC - Gold
- NINA DISTELMANN - Gold
- SUSANNE BECK - Diamond

**MLM Hierarchie:**
```
SUSANNE BECK (Diamond)
  └─ NINA DISTELMANN (Gold)
      └─ Flow Academy LLC (Gold)
          └─ STEFANIE MAIER (Gold) ← UPLINE
              └─ STEFFI FÜSSEL (Sponsor)
                  └─ STEFANIE MAIER (Enroller) ← DEINE SCHWESTER!
```

**WICHTIG:** Deine Schwester = STEFANIE MAIER (ID: 29009583)
- Sie erscheint 2x in der Hierarchie!
- Oben: Als UPLINE (Gold Rank) - ihre Mentoren
- Unten: Als SIE SELBST (Enroller) - ihr eigenes Geschäft

**Bedeutet:**
- Sie ist unter STEFFI FÜSSEL eingeschrieben (Sponsor)
- Ihr "Enroller" ist sie selbst (Self-Enrollment)
- Ihre Upline: STEFFI FÜSSEL → STEFANIE MAIER (Gold) → Flow Academy → etc.

**Provisionsfluss:**
- Schwester verkauft → Schwester bekommt direkte Provision
- STEFANIE MAIER bekommt Enroller-Bonus
- STEFFI FÜSSEL bekommt Sponsor-Bonus
- Alle Upline-Ebenen bekommen kleinere Team-Boni (bis Diamond)

**Young Living Ranks:**
- Gold = Mid-level (3+ aktive Legs)
- Diamond = High-level (6+ aktive Legs)
- Schwester = Starter (noch kein Rank)

---

**System:** German Tax Assistant ready for MLM-specific enhancements! ✅
