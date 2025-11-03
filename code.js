// Register the UI first
penpot.registerUI({
    html: `<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'worksans', sans-serif; padding: 16px; color: var(--text-color); }
        .wrapper { display: flex; flex-direction: column; gap: 16px; }
        textarea { 
            width: 100%; 
            min-height: 200px; 
            border: 1px solid var(--border-color);
            border-radius: 4px;
            padding: 8px;
            background: var(--surface-color);
            color: var(--text-color);
        }
        button { 
            background-color: var(--primary-color);
            color: white; 
            border: none; 
            padding: 8px 16px; 
            border-radius: 4px; 
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <h3>Bootstrap HTML Generator</h3>
        <button id="generate-btn">Generate Bootstrap Code</button>
        <textarea id="output-code" readonly placeholder="Select elements and click Generate..."></textarea>
    </div>
    <script>
        document.getElementById('generate-btn').onclick = () => {
            penpot.postMessage({ type: 'generate-code' });
        };

        penpot.on('message', (msg) => {
            if (msg.type === 'code-output') {
                document.getElementById('output-code').value = msg.code;
            }
        });
    </script>
</body>
</html>`
});

// Bootstrap class mapping helper
const bootstrapClassMap = {
    text: (element) => {
        const styles = [];
        if (element.fontWeight >= 700) styles.push('fw-bold');
        if (element.fontSize >= 40) styles.push('display-4');
        else if (element.fontSize >= 32) styles.push('display-6');
        else if (element.fontSize >= 24) styles.push('h1');
        else if (element.fontSize >= 20) styles.push('h3');
        else styles.push('p');
        return styles;
    },
    frame: (element) => {
        const styles = ['container'];
        if (element.layout === 'flex') {
            styles.push('d-flex');
            if (element.flexDirection === 'column') styles.push('flex-column');
        }
        return styles;
    },
    button: () => ['btn', 'btn-primary'],
    rectangle: (element) => {
        const styles = ['card'];
        if (element.fill) styles.push('bg-light');
        return styles;
    }
};

// Process element function
async function processElement(element) {
    let html = '';
    const type = element.type.toLowerCase();
    
    // Get bootstrap classes based on element type
    const classes = bootstrapClassMap[type] ? bootstrapClassMap[type](element) : [];
    
    // Handle different element types
    switch(type) {
        case 'text':
            html = `<p class="${classes.join(' ')}">${element.content || 'Text'}</p>`;
            break;
        case 'frame':
            html = `<div class="${classes.join(' ')}">\n`;
            if (element.children) {
                for (const child of element.children) {
                    html += await processElement(child);
                }
            }
            html += '</div>\n';
            break;
        case 'button':
            html = `<button class="${classes.join(' ')}">${element.content || 'Button'}</button>`;
            break;
        default:
            html = `<div class="${classes.join(' ')}"></div>`;
    }
    return html;
}

// Main message handler
penpot.on('message', async (msg) => {
    if (msg.type === 'generate-code') {
        // Get design tokens
        const tokens = await penpot.api.getDesignTokens();
        let cssVariables = ':root {\n';
        
        // Process color tokens
        if (tokens.color) {
            for (const token of tokens.color) {
                const varName = `--pp-color-${token.name.toLowerCase().replace(/\s/g, '-')}`;
                cssVariables += `  ${varName}: ${token.value};\n`;
            }
        }
        
        // Process typography tokens
        if (tokens.typography) {
            for (const token of tokens.typography) {
                const varName = `--pp-font-${token.name.toLowerCase().replace(/\s/g, '-')}`;
                cssVariables += `  ${varName}: ${token.value};\n`;
            }
        }
        cssVariables += '}\n';

        // Get selection
        const selection = await penpot.api.getSelection();
        let contentHtml = '';

        // Process selected elements
        if (selection.length > 0) {
            for (const element of selection) {
                contentHtml += await processElement(element);
            }
        } else {
            contentHtml = '<div class="container p-4"><p class="text-muted">No elements selected</p></div>';
        }

        // Generate final HTML
        const finalCode = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Penpot to Bootstrap</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
${cssVariables}
    </style>
</head>
<body>
${contentHtml}
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>`;

        penpot.ui.postMessage({ type: 'code-output', code: finalCode });
    }
});
