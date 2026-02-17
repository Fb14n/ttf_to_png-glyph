let currentFont = null;
let activeGlyphRenderers = []; // Functions to re-render specific glyphs

async function loadFont() {
    const fileInput = document.getElementById('fontInput');
    if (!fileInput.files || fileInput.files.length === 0) {
        alert('Please select a font file first.');
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const buffer = e.target.result;
            currentFont = opentype.parse(buffer);
            console.log('Font loaded:', currentFont);
            
            // Extract all renderable characters
            const chars = getAvailableCharacters(currentFont);
            document.getElementById('glyphInput').value = chars.join('');
            
            alert(`Font loaded! Found ${chars.length} characters.`);
            renderAllPreviews();
        } catch (err) {
            console.error(err);
            alert('Could not parse font. ' + err.toString());
        }
    };

    reader.readAsArrayBuffer(file);
}

function getAvailableCharacters(font) {
    const chars = [];
    const cmap = font.tables.cmap.glyphIndexMap;
    
    // cmap maps unicode decimal value to glyph index
    for (let unicode in cmap) {
        // Skip control characters and non-printable stuff usually
        const code = parseInt(unicode);
        if (code < 32) continue; 
        
        // Some fonts map multiple codes to same glyph, we just want the chars
        try {
            const char = String.fromCodePoint(code);
            chars.push(char);
        } catch (e) {
            // invalid codepoint
        }
    }
    // Sort logic could be added here, but default order is often fine or by unicode
    return chars.sort();
}

function getGlobalSettings() {
    return {
        width: parseInt(document.getElementById('globalWidth').value) || 256,
        height: parseInt(document.getElementById('globalHeight').value) || 256,
        margin: parseInt(document.getElementById('globalMargin').value) || 20,
        scale: parseFloat(document.getElementById('globalScale').value) || 0.7,
        color: document.getElementById('globalColor').value,
        bgColor: document.getElementById('globalBgColor').value,
        transparent: document.getElementById('globalTransparent').checked,
        format: document.getElementById('fileFormat').value
    };
}

function updateAllSettings() {
    // Optional: Auto-refresh all previews when globals change. 
    // For performance with many glyphs, might be better to wait for "Update Previews", 
    // but the prompt implies a responsive UI. Let's try to update existing if possible, 
    // or just let the user click "Update Previews" to reset everything.
    // Given the complexity of "individual overrides", blindly resetting everything 
    // would lose individual changes. 
    // So "updateAllSettings" roughly means "update the defaults for the NEXT render", 
    // OR we could have a "Apply to All" button.
    // For now, I'll leave this empty or log it, relying on "Update Previews" to regenerate.
    console.log("Global settings changed. Click 'Update Previews' to apply to list.");
}

function renderAllPreviews() {
    if (!currentFont) return alert("No font loaded.");
    
    const previewContainer = document.getElementById('preview');
    previewContainer.innerHTML = '';
    activeGlyphRenderers = [];

    const chars = document.getElementById('glyphInput').value.split('');
    const global = getGlobalSettings();

    // Limit to prevent crashing browser if too many chars
    if (chars.length > 500) {
        if (!confirm(`Warning: Attempting to render ${chars.length} glyphs. This might slow down your browser. Continue?`)) {
            return;
        }
    }

    chars.forEach(char => {
        createGlyphCard(char, global, previewContainer);
    });
}

function createGlyphCard(char, global, container) {
    const wrapper = document.createElement('div');
    wrapper.className = 'glyph-card';

    // Local State for this glyph
    const state = {
        char: char,
        width: global.width,
        height: global.height,
        margin: global.margin,
        scale: global.scale,
        color: global.color,
        bgColor: global.bgColor,
        transparent: global.transparent
    };

    // Header
    const header = document.createElement('div');
    header.className = 'glyph-header';
    header.innerHTML = `<span>'${char}' (${char.codePointAt(0)})</span>`;
    wrapper.appendChild(header);

    // Canvas
    const canvas = document.createElement('canvas');
    wrapper.appendChild(canvas);

    // Controls
    const controls = document.createElement('div');
    controls.className = 'glyph-controls';

    // Width
    const wInput = createInput('number', state.width, (v) => { state.width = parseInt(v); render(); });
    wInput.title = "Width";
    controls.appendChild(wInput);

    // Height
    const hInput = createInput('number', state.height, (v) => { state.height = parseInt(v); render(); });
    hInput.title = "Height";
    controls.appendChild(hInput);

    // Margin
    const mInput = createInput('number', state.margin, (v) => { state.margin = parseInt(v); render(); });
    mInput.title = "Margin";
    controls.appendChild(mInput);

    // Color
    const cInput = createInput('color', state.color, (v) => { state.color = v; render(); });
    cInput.title = "Color";
    controls.appendChild(cInput);
    
    wrapper.appendChild(controls);
    container.appendChild(wrapper);

    // Render Function
    const render = () => {
        canvas.width = state.width;
        canvas.height = state.height;
        const ctx = canvas.getContext('2d');

        // Background
        if (!state.transparent) {
            ctx.fillStyle = state.bgColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        // Draw Glyph
        // Calculate available space with margins
        const availableW = state.width - (state.margin * 2);
        const availableH = state.height - (state.margin * 2);
        
        // Start with a base font size
        let fontSize = 1000;
        let path = currentFont.getPath(state.char, 0, 0, fontSize);
        let bbox = path.getBoundingBox();
        
        // Calculate actual glyph dimensions at this size
        let glyphW = bbox.x2 - bbox.x1;
        let glyphH = bbox.y2 - bbox.y1;
        
        // Scale to fit within available space
        const scaleX = availableW / glyphW;
        const scaleY = availableH / glyphH;
        const scaleFactor = Math.min(scaleX, scaleY) * state.scale;
        
        // Apply the scale to get final font size
        fontSize = fontSize * scaleFactor;
        
        // Regenerate path with correct size
        path = currentFont.getPath(state.char, 0, 0, fontSize);
        bbox = path.getBoundingBox();
        glyphW = bbox.x2 - bbox.x1;
        glyphH = bbox.y2 - bbox.y1;
        
        // Center the glyph
        // X: center horizontally by offsetting from the bounding box x1
        const x = (state.width / 2) - (glyphW / 2) - bbox.x1;
        
        // Y: opentype draws relative to baseline
        // To center vertically, position baseline so glyph center aligns with canvas center
        const y = (state.height / 2) - (bbox.y1 + bbox.y2) / 2;

        // Draw
        path.fill = state.color;
        path.draw(ctx, x, y);
    };

    // Initial Render
    render();

    // Register for download
    activeGlyphRenderers.push({
        canvas: canvas,
        char: char,
        render: render // if needed later
    });
}

function createInput(type, value, onChange) {
    const input = document.createElement('input');
    input.type = type;
    input.value = value;
    input.oninput = (e) => onChange(e.target.value);
    return input;
}

function downloadAll() {
    if (activeGlyphRenderers.length === 0) return alert("Nothing to download");

    const format = document.getElementById('fileFormat').value;
    const ext = format.split('/')[1];

    activeGlyphRenderers.forEach((item, index) => {
        // Use timeout to prevent freezing UI on massive downloads, though loop is sync.
        // For real zip support we'd need JSZip, but individual downloads is what was requested/existing.
        // Browser might block multiple popups.
        
        const link = document.createElement('a');
        let filename = item.char;
        // sanitize filename
        filename = filename.replace(/[^a-z0-9]/gi, '_');
        if (filename === "" || filename === "_") filename = `glyph_${index}`;
        
        link.download = `${filename}.${ext}`;
        
        // JPG doesn't support transparency, default to black if transparent was selected
        // But the canvas dataURL handles this (transparent becomes black in JPG usually)
        link.href = item.canvas.toDataURL(format, 0.9);
        
        // Small delay to try and help browser handle multiple downloads
        setTimeout(() => link.click(), index * 100);
    });
}