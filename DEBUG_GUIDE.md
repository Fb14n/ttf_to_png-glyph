# Debug Guide für Glyphen-Positionierung

## Problem
Glyphen werden nicht korrekt im Frame zentriert. Das liegt am TTF-Koordinatensystem.

## TTF Koordinatensystem verstehen

### Wichtige Konzepte:

1. **Y-Achse ist invertiert**: 
   - In TTF-Dateien: Y-Wert steigt nach OBEN
   - Im Canvas: Y-Wert steigt nach UNTEN

2. **Ursprung (0,0) liegt auf der Baseline**:
   - NICHT in der Mitte des Glyphen
   - NICHT oben links
   - Sondern auf der **Baseline** (die Linie, auf der Buchstaben "stehen")

3. **Bounding Box**:
   - `bbox.x1, bbox.y1`: Linke untere Ecke der Bounding Box
   - `bbox.x2, bbox.y2`: Rechte obere Ecke der Bounding Box
   - Diese Werte sind relativ zum Ursprung (Baseline)

### Beispiel Buchstabe "A":
```
      bbox.y2 ----→ ▲ (obere Ecke)
                    /\
                   /  \
                  /____\
      y=0 --------======-- (Baseline, Ursprung)
      bbox.x1 ←--|    |--→ bbox.x2
                     ↓
                  bbox.y1 (untere Ecke, oft = 0)
```

### Beispiel Buchstabe "g" (mit Unterlänge):
```
      bbox.y2 ----→  ___  ▲ (obere Ecke)
                    /   \
      y=0 ---------(====)--- (Baseline, Ursprung)
                     |  |
                     \__/ ↓
      bbox.y1 --------    (negative Y-Wert!)
```

## Debug-Modus Funktionen

### 1. Visuelle Overlays

Wenn Debug-Modus aktiviert ist, werden folgende Elemente angezeigt:

- **Rote Umrandung**: Zeigt den verfügbaren Bereich (Canvas minus Margins)
- **Roter Punkt**: Zentrum des verfügbaren Bereichs
- **Grüne Umrandung**: Bounding Box des Glyphen
- **Blaue horizontale Linie**: Baseline (Y=0 in TTF-Koordinaten)
- **Cyan vertikale Linie**: Vertikale Linie durch den X-Ursprung
- **Gelbe Labels**: Zeigen wichtige Metriken an

### 2. Console-Logging

Im Browser-Console (F12) werden folgende Informationen ausgegeben:

```
=== Glyph Debug Info ===
Glyph: A U+0041
Canvas size: 256 x 256
Margin: 20
Available space: 216 x 216
BBox: {"x1":0,"y1":0,"x2":1366,"y2":1466}
Glyph dimensions: 1366 x 1466
Font metrics: {"ascender":1900,"descender":-500,"unitsPerEm":2048}
Font scale: 0.103
Scaled dimensions: 140.5 x 150.8
Center point: 128, 128
Final position (x, y): 60.7, 52.6
```

## Wie die Positionierung funktioniert

### Algorithmus (script.js Zeile 191-277):

```javascript
// 1. Verfügbaren Platz berechnen
const availableWidth = canvas.width - (margin * 2);
const availableHeight = canvas.height - (margin * 2);

// 2. Glyph-Dimensionen ermitteln
const glyphWidth = bbox.x2 - bbox.x1;
const glyphHeight = bbox.y2 - bbox.y1;

// 3. Skalierung berechnen (damit Glyph in Bereich passt)
const fontScale = Math.min(
    availableWidth / glyphWidth,
    availableHeight / glyphHeight
) * settings.scale;

// 4. Zentrum des verfügbaren Bereichs
const centerX = margin + availableWidth / 2;
const centerY = margin + availableHeight / 2;

// 5. Position berechnen
// WICHTIG: Wir zentrieren die Bounding Box, nicht den Ursprung!
const scaledWidth = glyphWidth * fontScale;
const scaledHeight = glyphHeight * fontScale;

const x = centerX - scaledWidth / 2 - bbox.x1 * fontScale;
const y = centerY - scaledHeight / 2 - bbox.y1 * fontScale;

// 6. Glyph zeichnen
glyph.getPath(x, y, fontScale);
```

### Warum das funktioniert:

1. **Zentriere die Bounding Box**: `centerX - scaledWidth / 2`
2. **Verschiebe um bbox.x1**: `- bbox.x1 * fontScale` 
   - Dadurch wird der Glyph-Pfad korrekt positioniert
   - bbox.x1 ist der Abstand vom Ursprung zur linken Kante

## Verwendung

1. **Font laden**: Wähle eine TTF/OTF-Datei und klicke "1. Load Font"
2. **Debug aktivieren**: Aktiviere das "Debug Mode" Checkbox
3. **Previews rendern**: Klicke "2. Update Previews"
4. **Console öffnen**: Drücke F12 und wähle "Console"
5. **Analyse**: 
   - Schaue dir die visuellen Overlays an
   - Prüfe die Console-Logs
   - Vergleiche verschiedene Glyphen (A, g, y, etc.)

## Häufige Probleme und Lösungen

### Problem: Glyphen sind zu groß/klein
- **Lösung**: Passe "Font Size Scale" an (0.1 bis 1.0)

### Problem: Glyphen sind nicht zentriert
- **Ursache**: Wahrscheinlich falsche Margin-Berechnung
- **Debug**: Schaue ob die rote Umrandung korrekt ist
- **Lösung**: Überprüfe bbox-Werte im Console

### Problem: Glyphen mit Unterlängen (g, y, p) sind verschoben
- **Ursache**: bbox.y1 ist negativ (unter der Baseline)
- **Erwartetes Verhalten**: Der Algorithmus sollte das korrekt handhaben
- **Debug**: Prüfe bbox.y1 im Console-Log

### Problem: Glyphen sind abgeschnitten
- **Ursache**: Margin zu klein oder Scale zu groß
- **Lösung**: Erhöhe Margin oder reduziere Scale

## Technische Details

### OpenType.js API:
- `glyph.getBoundingBox()`: Gibt bbox in Font-Units zurück
- `glyph.getPath(x, y, fontSize)`: Erstellt Path-Objekt
  - `x, y`: Position des Ursprungs (Baseline) im Canvas
  - `fontSize`: Skalierungsfaktor von Font-Units zu Pixeln

### Font Metrics:
- `ascender`: Höhe über der Baseline
- `descender`: Tiefe unter der Baseline (negativer Wert)
- `unitsPerEm`: Auflösung des Fonts (meist 1000 oder 2048)

## Weitere Ressourcen

- [OpenType.js Dokumentation](https://opentype.js.org/)
- [TrueType Font Format Specification](https://developer.apple.com/fonts/TrueType-Reference-Manual/)
- [Understanding Font Metrics](https://iamvdo.me/en/blog/css-font-metrics-line-height-and-vertical-align)
