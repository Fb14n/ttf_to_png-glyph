// Global variables
let loadedFont = null;
let glyphCards = [];

// Constants
const DOWNLOAD_DELAY_MS = 100; // Delay between batch downloads to avoid browser blocking

/**
 * Load the selected font file using opentype.js
 */
function loadFont() {
    const fileInput = document.getElementById('fontInput');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Please select a font file first.');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const arrayBuffer = e.target.result;
        
        try {
            // Parse the font using opentype.js
            loadedFont = opentype.parse(arrayBuffer);
            
            // Extract all glyphs that have unicode values
            const chars = [];
            for (let i = 0; i < loadedFont.glyphs.length; i++) {
                const glyph = loadedFont.glyphs.get(i);
                if (glyph.unicode !== undefined) {
                    const char = String.fromCharCode(glyph.unicode);
                    // Only add printable characters
                    if (glyph.unicode >= 32) {
                        chars.push(char);
                    }
                }
            }
            
            // Populate the glyph input textarea
            document.getElementById('glyphInput').value = chars.join('');
            
            alert(`Font loaded successfully!\nFont name: ${loadedFont.names.fullName.en}\nGlyphs found: ${chars.length}`);
        } catch (error) {
            alert('Error parsing font: ' + error.message);
            console.error(error);
        }
    };
    
    reader.onerror = function() {
        alert('Error reading file');
    };
    
    reader.readAsArrayBuffer(file);
}

/**
 * Render all glyphs from the filter input
 */
function renderAllPreviews() {
    if (!loadedFont) {
        alert('Please load a font first.');
        return;
    }
    
    const glyphInput = document.getElementById('glyphInput').value;
    
    if (!glyphInput) {
        alert('No glyphs to render. Please enter characters in the filter box.');
        return;
    }
    
    // Clear previous previews
    const previewContainer = document.getElementById('preview');
    previewContainer.innerHTML = '';
    glyphCards = [];
    
    // Get global settings
    const width = parseInt(document.getElementById('globalWidth').value);
    const height = parseInt(document.getElementById('globalHeight').value);
    const margin = parseInt(document.getElementById('globalMargin').value);
    const scale = parseFloat(document.getElementById('globalScale').value);
    const color = document.getElementById('globalColor').value;
    const transparent = document.getElementById('globalTransparent').checked;
    const bgColor = document.getElementById('globalBgColor').value;
    
    // Render each character
    const chars = Array.from(glyphInput);
    
    chars.forEach((char, index) => {
        const charCode = char.charCodeAt(0);
        const glyph = loadedFont.charToGlyph(char);
        
        // Skip if glyph not found
        if (!glyph || glyph.index === 0) {
            return;
        }
        
        // Create a card for this glyph
        const card = createGlyphCard(char, charCode, glyph, {
            width,
            height,
            margin,
            scale,
            color,
            transparent,
            bgColor
        });
        
        previewContainer.appendChild(card.element);
        glyphCards.push(card);
    });
    
    if (glyphCards.length === 0) {
        alert('No valid glyphs found to render.');
    }
}

/**
 * Create a glyph card with canvas and controls
 */
function createGlyphCard(char, charCode, glyph, settings) {
    const card = document.createElement('div');
    card.className = 'glyph-card';
    
    // Header with character info
    const header = document.createElement('div');
    header.className = 'glyph-header';
    header.innerHTML = `<span>Char: "${char}"</span><span>U+${charCode.toString(16).toUpperCase().padStart(4, '0')}</span>`;
    card.appendChild(header);
    
    // Canvas for rendering
    const canvas = document.createElement('canvas');
    canvas.width = settings.width;
    canvas.height = settings.height;
    card.appendChild(canvas);
    
    // Controls for individual glyph settings
    const controls = document.createElement('div');
    controls.className = 'glyph-controls';
    
    controls.innerHTML = `
        <input type="number" class="glyph-width" value="${settings.width}" placeholder="Width" />
        <input type="number" class="glyph-height" value="${settings.height}" placeholder="Height" />
        <input type="number" class="glyph-margin" value="${settings.margin}" placeholder="Margin" />
        <input type="number" class="glyph-scale" value="${settings.scale}" step="0.1" placeholder="Scale" />
        <input type="color" class="glyph-color" value="${settings.color}" />
        <button onclick="downloadGlyph(this)" style="grid-column: span 2;">Download</button>
    `;
    
    card.appendChild(controls);
    
    // Store glyph data
    const glyphData = {
        element: card,
        canvas: canvas,
        char: char,
        charCode: charCode,
        glyph: glyph,
        settings: { ...settings }
    };
    
    // Render the glyph
    renderGlyph(glyphData);
    
    // Add event listeners for controls
    const inputs = controls.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('change', () => {
            // Update settings from controls
            glyphData.settings.width = parseInt(controls.querySelector('.glyph-width').value);
            glyphData.settings.height = parseInt(controls.querySelector('.glyph-height').value);
            glyphData.settings.margin = parseInt(controls.querySelector('.glyph-margin').value);
            glyphData.settings.scale = parseFloat(controls.querySelector('.glyph-scale').value);
            glyphData.settings.color = controls.querySelector('.glyph-color').value;
            
            // Update canvas size
            canvas.width = glyphData.settings.width;
            canvas.height = glyphData.settings.height;
            
            // Re-render
            renderGlyph(glyphData);
        });
    });
    
    return glyphData;
}

/**
 * Render a glyph on its canvas
 */
function renderGlyph(glyphData) {
    const { canvas, glyph, settings } = glyphData;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background if not transparent
    if (!settings.transparent) {
        ctx.fillStyle = settings.bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Calculate available space (canvas minus margins)
    const availableWidth = canvas.width - (settings.margin * 2);
    const availableHeight = canvas.height - (settings.margin * 2);
    
    // Get glyph bounding box
    const bbox = glyph.getBoundingBox();
    const glyphWidth = bbox.x2 - bbox.x1;
    const glyphHeight = bbox.y2 - bbox.y1;
    
    // Calculate scale to fit glyph in available space
    let scaleX = availableWidth / glyphWidth;
    let scaleY = availableHeight / glyphHeight;
    let fontScale = Math.min(scaleX, scaleY) * settings.scale;
    
    // Calculate position to center the glyph
    const scaledWidth = glyphWidth * fontScale;
    const scaledHeight = glyphHeight * fontScale;
    
    // Position calculation: Start at margin, add centering offset, then subtract glyph origin
    // bbox.x1 and bbox.y1 represent the glyph's bounding box origin, which must be subtracted
    // after scaling to properly position the glyph path
    const x = settings.margin + (availableWidth - scaledWidth) / 2 - bbox.x1 * fontScale;
    const y = settings.margin + (availableHeight - scaledHeight) / 2 - bbox.y1 * fontScale;
    
    // Draw the glyph
    const path = glyph.getPath(x, y, fontScale);
    path.fill = settings.color;
    path.draw(ctx);
}

/**
 * Generate filename for a glyph export
 */
function generateGlyphFileName(charCode, format) {
    // Extract extension from MIME type (e.g., 'image/png' -> 'png')
    const parts = format.split('/');
    const extension = parts.length > 1 ? parts[1] : 'png'; // Default to 'png' if format is invalid
    return `glyph_U+${charCode.toString(16).toUpperCase().padStart(4, '0')}.${extension}`;
}

/**
 * Download a single glyph
 */
function downloadGlyph(buttonElement) {
    const card = buttonElement.closest('.glyph-card');
    const cardIndex = Array.from(document.querySelectorAll('.glyph-card')).indexOf(card);
    const glyphData = glyphCards[cardIndex];
    
    if (!glyphData) {
        alert('Error: Could not find glyph data');
        return;
    }
    
    const format = document.getElementById('fileFormat').value;
    const fileName = generateGlyphFileName(glyphData.charCode, format);
    
    glyphData.canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
    }, format);
}

/**
 * Download all glyphs
 */
function downloadAll() {
    if (glyphCards.length === 0) {
        alert('No glyphs to download. Please render previews first.');
        return;
    }
    
    const format = document.getElementById('fileFormat').value;
    
    // Download each glyph with a small delay to avoid browser blocking
    let index = 0;
    
    function downloadNextGlyph() {
        if (index >= glyphCards.length) {
            alert(`Downloaded ${glyphCards.length} glyphs successfully!`);
            return;
        }
        
        const glyphData = glyphCards[index];
        const fileName = generateGlyphFileName(glyphData.charCode, format);
        
        glyphData.canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
            
            index++;
            // Small delay between downloads
            setTimeout(downloadNextGlyph, DOWNLOAD_DELAY_MS);
        }, format);
    }
    
    downloadNextGlyph();
}

/**
 * Update all glyph previews with current global settings
 */
function updateAllSettings() {
    if (glyphCards.length === 0) {
        return;
    }
    
    // Get global settings
    const width = parseInt(document.getElementById('globalWidth').value);
    const height = parseInt(document.getElementById('globalHeight').value);
    const margin = parseInt(document.getElementById('globalMargin').value);
    const scale = parseFloat(document.getElementById('globalScale').value);
    const color = document.getElementById('globalColor').value;
    const transparent = document.getElementById('globalTransparent').checked;
    const bgColor = document.getElementById('globalBgColor').value;
    
    // Update each glyph card
    glyphCards.forEach(glyphData => {
        // Update settings
        glyphData.settings.width = width;
        glyphData.settings.height = height;
        glyphData.settings.margin = margin;
        glyphData.settings.scale = scale;
        glyphData.settings.color = color;
        glyphData.settings.transparent = transparent;
        glyphData.settings.bgColor = bgColor;
        
        // Update canvas size
        glyphData.canvas.width = width;
        glyphData.canvas.height = height;
        
        // Update control inputs
        const controls = glyphData.element.querySelector('.glyph-controls');
        controls.querySelector('.glyph-width').value = width;
        controls.querySelector('.glyph-height').value = height;
        controls.querySelector('.glyph-margin').value = margin;
        controls.querySelector('.glyph-scale').value = scale;
        controls.querySelector('.glyph-color').value = color;
        
        // Re-render
        renderGlyph(glyphData);
    });
}
