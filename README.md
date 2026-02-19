# TTF to PNG Glyph Converter

A web-based tool to extract and convert TrueType Font (TTF), OTF, and WOFF glyphs into individual images (PNG, JPG, WebP).

## Features

- **Font Support**: Loads local .ttf, .otf, and .woff files using `opentype.js`.
- **Glyph Selection**: Automatically detects all available characters in the font. You can filter them by editing the "Filter Glyphs" text area.
- **Customization**:
  - **Global Settings**: Set default width, height, margin, color, and background for all glyphs.
  - **Individual Overrides**: Tweak size, margin, and color for specific glyphs individually.
  - **Transparency**: Toggle transparent backgrounds (supported for PNG and WebP).
- **Debug Mode**: Visual overlays and console logging to understand glyph positioning and metrics (see [DEBUG_GUIDE.md](DEBUG_GUIDE.md))
- **Export**: Download individual glyphs or all valid glyphs at once.

## usage

1. Open `index.html` in a modern web browser.
2. Click "Choose File" to select a font file from your computer.
3. Click **"1. Load Font"**.
   - The tool will parse the font and list all detected characters in the text box.
4. Adjust **Global Settings** (Size, Margin, Color) as desired.
   - **Optional**: Enable **Debug Mode** to visualize glyph positioning with overlays and console logs
5. Click **"2. Update Previews"** to render the glyphs.
   - *Note: If the font has thousands of characters, this might take a moment.*
6. Review the grid of generated images.
   - You can adjust the Width, Height, Margin, and Color for **specific** glyphs using the inputs below each image.
   - In Debug Mode, open browser console (F12) to see detailed glyph metrics
7. Click **"3. Download All"** to save images.

## Debug Mode

Enable the "Debug Mode" checkbox to troubleshoot glyph positioning issues. This will:
- Display visual overlays showing margins (red), bounding boxes (green), baseline (blue), and center points
- Log detailed glyph metrics to the browser console
- Help understand TTF coordinate system and glyph positioning

See [DEBUG_GUIDE.md](DEBUG_GUIDE.md) for detailed information about TTF coordinate systems and how glyph positioning works.

## Structure

- `index.html`: Main interface.
- `style.css`: Styling.
- `script.js`: Logic for font parsing (via `opentype.js`), rendering, and exporting.

## Dependencies

- [opentype.js](https://opentype.js.org/) (loaded via CDN).