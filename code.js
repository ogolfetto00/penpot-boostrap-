// This function runs in the main Penpot environment
penpot.on('message', async (msg) => {
    if (msg.type === 'generate-code') {
        
        // 1. READ DESIGN TOKENS
        const tokens = await penpot.api.getDesignTokens();
        
        // 2. PROCESS AND FORMAT TOKENS INTO CSS VARIABLES
        let cssVariables = ':root {\n';
        
        // Simple example: process only Color tokens
        if (tokens.color) {
            for (const token of tokens.color) {
                // Convert Penpot's token name (e.g., 'Primary Color') to a CSS variable name (e.g., '--pp-color-primary')
                const varName = `--pp-color-${token.name.toLowerCase().replace(/\s/g, '-')}`;
                cssVariables += `  ${varName}: ${token.value};\n`;
            }
        }
        cssVariables += '}';

        // 3. GET SELECTION (for a more complex plugin, this is where the translation happens)
        const selection = await penpot.api.getSelection();
        
        // --- SIMPLIFIED MAPPING LOGIC (Prototype) ---
        
        let elementHtml = '';
        let bootstrapClass = 'container my-5';
        
        if (selection.length > 0) {
            // In a real plugin, you would analyze selection[0] properties (fill, border, etc.)
            // to determine the correct Bootstrap classes (e.g., btn btn-primary, card, etc.)
            
            // For this prototype, we'll just generate a basic structure
            elementHtml = `
  <div class="${bootstrapClass}">
    <!-- Example of using a Penpot Token for a custom style -->
    <h1 style="color: var(--pp-color-primary, #212529);">
      Design Token Integrated Heading
    </h1>
    
    <!-- Example of a standard Bootstrap button -->
    <button class="btn btn-primary btn-lg mt-3">
      Bootstrap Button
    </button>
  </div>`;
            
        } else {
            elementHtml = `
  <div class="${bootstrapClass}">
    <p class="lead">No element selected. Showing default structure.</p>
  </div>`;
        }
        
        // 4. ASSEMBLE FINAL HTML CODE
        const finalCode = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Penpot to Bootstrap</title>
    <!-- Bootstrap CSS Link -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    
    <!-- Penpot Design Tokens as CSS Variables -->
    <style>
${cssVariables}
    </style>
</head>
<body>
${elementHtml}
    
    <!-- Bootstrap JS Bundle (optional) -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
`;

        // 5. SEND THE GENERATED CODE BACK TO THE UI
        penpot.ui.postMessage({ type: 'code-output', code: finalCode });
    }
});

// Register the UI
penpot.registerUI({
    html: `<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: sans-serif; padding: 10px; }
        textarea { width: 100%; height: 200px; margin-top: 10px; resize: none; }
        button { 
            background-color: #007bff; 
            color: white; 
            border: none; 
            padding: 8px 15px; 
            border-radius: 4px; 
            cursor: pointer;
            width: 100%;
        }
    </style>
</head>
<body>
    <h3>Bootstrap HTML Generator</h3>
    <p>Select a Frame or Element and click 'Generate'.</p>
    <button id="generate-btn">Generate Bootstrap Code</button>
    <textarea id="output-code" readonly placeholder="Generated HTML will appear here..."></textarea>

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
