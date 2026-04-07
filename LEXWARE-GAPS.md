# Lexware-Kompatibilität - Feature Gaps

## ✅ Bereits implementiert

| Feature | Status |
|---------|--------|
| 1 Beleg → 1 Bankumsatz | ✅ Done |
| Fuzzy Matching (±3 Tage, ±5%) | ✅ Done |
| OCR → Auto-Kategorisierung | ✅ Done |
| Rule-Based + AI Fallback | ✅ Done |
| MLM-spezifisch (§13b, §37b) | ✅ Done |
| Review Queue | ✅ Done |

---

## ❌ Noch fehlend (Lexware Standard-Features)

### 🔥 High Priority

#### 1. Bankumsatz ohne Beleg kategorisieren
**Use Case:** Büromiete, Versicherung, Privatentnahmen
```javascript
{
  bank_tx: { amount: -500, description: "Miete Büro" },
  receipt: null,  // ← Kein Beleg!
  category: "Raumkosten",
  eur_account: "4210"
}
```
**Aufwand:** 2-3h  
**Wichtigkeit:** ⭐⭐⭐⭐⭐

---

#### 2. Wiederkehrende Umsätze (Recurring)
**Use Case:** Monatliche Miete automatisch kategorisieren
```javascript
{
  pattern: "Vermieter XYZ",
  category: "Raumkosten",
  recurring: "monthly",
  auto_approve: true
}
```
**Aufwand:** 2h  
**Wichtigkeit:** ⭐⭐⭐⭐

---

### 📋 Medium Priority

#### 3. 1 Bankumsatz → mehrere Belege
**Use Case:** Sammelbestellung (YL: 50€ + 75€ = 125€)
```javascript
{
  bank_tx: { amount: -125 },
  receipts: [
    { id: 42, amount: 50 },
    { id: 43, amount: 75 }
  ]
}
```
**Aufwand:** 4-6h  
**Wichtigkeit:** ⭐⭐⭐

---

#### 4. Bankumsatz in mehrere Kategorien splitten
**Use Case:** Amazon: Bücher (20€) + Büromaterial (25€)
```javascript
{
  bank_tx: { amount: -45 },
  splits: [
    { category: "Weiterbildung", amount: 20 },
    { category: "Büromaterial", amount: 25 }
  ]
}
```
**Aufwand:** 3-4h  
**Wichtigkeit:** ⭐⭐⭐

---

#### 5. Doppelzahlungen (Durchlaufende Posten)
**Use Case:** Versehentlich 2x gezahlt → Rückerstattung
```javascript
{
  bank_tx_1: { amount: -100, category: "Durchlaufende Posten" },
  bank_tx_2: { amount: +100, category: "Durchlaufende Posten" },
  note: "Doppelzahlung Rechnung #123, am 15.03. erstattet"
}
```
**Aufwand:** 1-2h  
**Wichtigkeit:** ⭐⭐

---

### 🔮 Low Priority

#### 6. Einnahme + Ausgabe verrechnet
**Use Case:** +100€ Rückerstattung - 50€ neue Rechnung = +50€
```javascript
{
  bank_tx: { amount: +50 },
  components: [
    { type: "income", amount: 100 },
    { type: "expense", amount: -50 }
  ]
}
```
**Aufwand:** 3h  
**Wichtigkeit:** ⭐

---

#### 7. Skonto-Handling
**Use Case:** Rechnung 100€, gezahlt 98€ (2% Skonto)
```javascript
{
  receipt: { amount: 100 },
  bank_tx: { amount: -98 },
  skonto: { amount: 2, percent: 2, category: "Sonstige Erträge" }
}
```
**Aufwand:** 2-3h  
**Wichtigkeit:** ⭐

---

#### 8. 1 Beleg → mehrere Bankumsätze
**Use Case:** Rechnung 1000€, gezahlt in 2 Raten
```javascript
{
  receipt: { amount: 1000 },
  bank_txs: [
    { amount: -500, date: "2025-01-15" },
    { amount: -500, date: "2025-02-15" }
  ]
}
```
**Aufwand:** 3h  
**Wichtigkeit:** ⭐

---

## Implementierungs-Roadmap

### Phase 1 (MVP - vor Stefanie Test)
- ✅ 1:1 Matching
- ✅ Rule-Based + AI Fallback
- ✅ Review Queue

### Phase 2 (Essential - nächste 2 Wochen)
1. Ohne Beleg kategorisieren (2-3h)
2. Wiederkehrende Umsätze (2h)
3. Doppelzahlungen (1-2h)

### Phase 3 (Advanced - on demand)
4. Multi-Receipt Matching (4-6h)
5. Split-Kategorisierung (3-4h)
6. Skonto (2-3h)

### Phase 4 (Nice to have)
7. Einnahme/Ausgabe verrechnet (3h)
8. 1 Beleg → N Banks (3h)

---

## Decision

**Jetzt bauen:**
1. ✅ Ohne Beleg kategorisieren
2. ✅ Wiederkehrende Umsätze

**Später (nach Feedback):**
3. Multi-Receipt (wenn Stefanie das oft braucht)
4. Splits (wenn Amazon/Multi-Kategorie oft vorkommt)

**Vielleicht nie:**
- Skonto (nur 2% Kleinunternehmer nutzen das)
- Einnahme/Ausgabe-Verrechnung (sehr selten)
