# Zusammenfassung der Änderungen

## Problem
Die Glyphen wurden nicht korrekt im Frame zentriert. Dies lag am TTF-Koordinatensystem, wo der Ursprung (0,0) auf der **Baseline** liegt (nicht in der Mitte oder oben links des Glyphen).

## Lösung

### 1. Debug-Modus hinzugefügt
- **UI-Kontrolle**: Neues Checkbox "Debug Mode" in index.html
- **Visuelle Overlays**: Zeigt wichtige Elemente beim Rendering:
  - Rote Umrandung: Verfügbarer Bereich (Canvas minus Margins)
  - Grüne Umrandung: Glyph Bounding Box
  - Blaue Linie: Baseline (Y=0 in TTF-Koordinaten)
  - Cyan Linie: Vertikale Mittellinie
  - Roter Punkt: Zentrum des verfügbaren Bereichs
  - Beschriftungen mit Metriken

- **Console-Logging**: Detaillierte Ausgabe aller Glyph-Metriken:
  - Canvas-Größe
  - Margin-Werte
  - Bounding Box Koordinaten
  - Skalierungsfaktor
  - Finale Position (x, y)
  - Font-Metriken (ascender, descender, unitsPerEm)

### 2. Positionierungs-Algorithmus verbessert
Der neue Algorithmus zentriert die **Bounding Box** des Glyphen, nicht den Ursprung:

```javascript
// Zentrum des verfügbaren Bereichs
const centerX = margin + availableWidth / 2;
const centerY = margin + availableHeight / 2;

// Bounding Box Dimensionen
const glyphWidth = bbox.x2 - bbox.x1;
const glyphHeight = bbox.y2 - bbox.y1;

// Skalierung berechnen
const fontScale = Math.min(
    availableWidth / glyphWidth,
    availableHeight / glyphHeight
) * settings.scale;

// Skalierte Dimensionen
const scaledWidth = glyphWidth * fontScale;
const scaledHeight = glyphHeight * fontScale;

// WICHTIG: Zentriere die Bounding Box, dann verschiebe um bbox-Ursprung
const x = centerX - scaledWidth / 2 - bbox.x1 * fontScale;
const y = centerY - scaledHeight / 2 - bbox.y1 * fontScale;
```

**Warum das funktioniert:**
- `centerX - scaledWidth / 2`: Positioniert die linke Kante der Bounding Box zentriert
- `- bbox.x1 * fontScale`: Verschiebt den Glyph-Pfad so, dass die Bounding Box an der richtigen Stelle ist
- Gleiche Logik für Y-Achse
- Funktioniert für alle Glyphen (mit Unterlängen wie g, y, p oder Überlängen wie h, l, b)

### 3. Dokumentation erstellt

#### DEBUG_GUIDE.md
Umfassende Anleitung auf Deutsch, die erklärt:
- TTF-Koordinatensystem (Y-Achse ist invertiert, Ursprung auf Baseline)
- Bounding Box Konzept
- Wie der Positionierungs-Algorithmus funktioniert
- Verwendung des Debug-Modus
- Häufige Probleme und Lösungen
- Technische Details zur OpenType.js API

#### visualization.html
Interaktive Demo-Seite die zeigt:
- Beispiel "A" (Buchstabe ohne Unterlänge)
- Beispiel "g" (Buchstabe mit Unterlänge)
- Visuelle Darstellung des Algorithmus
- Erklärung mit Code-Beispielen
- Funktioniert ohne Font-Upload (verwendet Mock-Daten)

#### README.md aktualisiert
- Debug-Modus Feature dokumentiert
- Verweis auf DEBUG_GUIDE.md
- Schritt-für-Schritt Anleitung zur Verwendung

## Getestete Szenarien

1. **Normale Buchstaben** (A, B, C): Korrekt zentriert
2. **Buchstaben mit Unterlängen** (g, y, p): bbox.y1 ist negativ, wird korrekt behandelt
3. **Buchstaben mit Überlängen** (h, l, b): Funktioniert einwandfrei
4. **Verschiedene Margins**: Debug-Visualisierung zeigt korrekte Bereiche
5. **Verschiedene Skalierungen**: Glyphen bleiben zentriert

## Technische Details

### Änderungen in script.js
- `renderGlyph()` Funktion komplett überarbeitet
- Debug-Visualisierung hinzugefügt
- Console-Logging implementiert
- fontMetrics nur bei Debug-Modus erstellt (Performance-Optimierung)
- Text-Overlays mit Outline für besseren Kontrast

### Änderungen in index.html
- Debug Mode Checkbox hinzugefügt

### Neue Dateien
- `DEBUG_GUIDE.md`: Umfassende Dokumentation (167 Zeilen)
- `visualization.html`: Interaktive Demo (273 Zeilen)

## Verwendung

1. `index.html` im Browser öffnen
2. TTF/OTF-Datei laden
3. "Debug Mode" Checkbox aktivieren
4. "Update Previews" klicken
5. Browser-Konsole öffnen (F12)
6. Glyphen inspizieren:
   - Visuelle Overlays im Canvas
   - Detaillierte Metriken in der Konsole
7. Bei Bedarf `visualization.html` öffnen für theoretische Erklärung

## Sicherheit

- CodeQL-Analyse durchgeführt: Keine Sicherheitsprobleme gefunden
- Keine neuen Dependencies hinzugefügt
- Keine externe API-Aufrufe
- Keine Sicherheitslücken eingeführt

## Qualitätssicherung

- Code-Review durchgeführt und alle Kommentare adressiert:
  - ✅ fontMetrics-Objekt nur bei Debug-Modus erstellt
  - ✅ Text-Kontrast verbessert (Gold mit schwarzem Outline)
  - ✅ Mock-Werte in visualization.html klargestellt
- Keine Sicherheitswarnungen
- Minimale Änderungen am bestehenden Code
- Vollständig rückwärtskompatibel (Debug-Modus ist opt-in)

## Ergebnis

Die Glyphen werden jetzt **korrekt im verfügbaren Bereich zentriert**, unabhängig von:
- Der Position des Glyph-Ursprungs
- Unterlängen (descenders)
- Überlängen (ascenders)
- Font-Metriken
- Canvas-Größe
- Margin-Einstellungen

Der Debug-Modus ermöglicht es, jederzeit zu überprüfen, ob die Positionierung korrekt funktioniert und alle relevanten Metriken zu inspizieren.
