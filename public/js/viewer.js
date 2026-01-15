/**
 * Table Viewer Module - Display extracted data in structured table format or raw
 */

class JSONViewer {
    constructor(options = {}) {
        this.resultContent = document.getElementById('resultContent');
        this.jsonOutput = document.getElementById('jsonOutput');
        this.rawOutput = document.getElementById('rawOutput');
        this.placeholder = this.resultContent.querySelector('.result-placeholder');
        this.copyButton = document.getElementById('copyResult');
        this.downloadButton = document.getElementById('downloadResult');
        this.viewModeSwitch = document.getElementById('viewModeSwitch');

        this.currentData = null;
        this.currentFilename = null;
        this.currentMode = 'raw'; // 'raw' or 'table'

        this.init();
    }

    init() {
        // Copy button handler
        this.copyButton.addEventListener('click', () => {
            this.copyToClipboard();
        });

        // Download button handler
        this.downloadButton.addEventListener('click', () => {
            this.downloadJSON();
        });

        // View mode switch handlers
        if (this.viewModeSwitch) {
            this.viewModeSwitch.querySelectorAll('.view-mode-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const mode = btn.dataset.mode;
                    this.setViewMode(mode);
                });
            });
        }
    }

    /**
     * Set the current view mode
     * @param {string} mode - 'raw' or 'table'
     */
    setViewMode(mode) {
        this.currentMode = mode;

        // Update button states
        this.viewModeSwitch.querySelectorAll('.view-mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        // Toggle visibility based on mode
        if (mode === 'raw') {
            this.jsonOutput.classList.remove('active');
            this.rawOutput.classList.add('active');
        } else {
            this.jsonOutput.classList.add('active');
            this.rawOutput.classList.remove('active');
        }
    }

    /**
     * Display data in table format
     * @param {object|array} data - The JSON data to display
     * @param {string} filename - Original filename (for download)
     */
    display(data, filename) {
        this.currentData = data;
        this.currentFilename = filename;

        // Hide placeholder, show content
        this.placeholder.classList.add('hidden');

        // Prepare data for display
        let tableData = data;
        let rawContent = '';

        // Check if data has rawResponse field (markdown text from API)
        if (data && typeof data === 'object' && data.rawResponse) {
            rawContent = data.rawResponse;
            // Parse markdown to structured data for table
            tableData = this.parseMarkdownToData(rawContent);
        } else if (Array.isArray(data)) {
            // Already structured JSON array
            rawContent = JSON.stringify(data, null, 2);
            tableData = data;
        } else if (typeof data === 'object') {
            // Already structured JSON object
            rawContent = JSON.stringify(data, null, 2);
            tableData = data;
        } else {
            rawContent = String(data);
            tableData = { content: data };
        }

        // Generate table HTML
        const tableHTML = this.generateTableHTML(tableData);
        this.jsonOutput.innerHTML = tableHTML;

        // Set raw content
        this.rawOutput.textContent = rawContent;

        // Apply current mode
        this.setViewMode(this.currentMode);

        // Enable buttons
        this.copyButton.disabled = false;
        this.downloadButton.disabled = false;
    }

    /**
     * Parse markdown text response to structured data
     * @param {string} markdown - Markdown formatted text
     * @returns {object} - Parsed structured data
     */
    parseMarkdownToData(markdown) {
        const result = {};
        const lines = markdown.split('\n');

        let currentSection = null;
        let currentSubSection = null;
        let reportTitle = '';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Skip empty lines
            if (!line) continue;

            // Match report title (### or **--- Title ---**)
            const titleMatch = line.match(/^(?:###\s*)?(?:\*\*)?---\s*(.+?)\s*---(?:\*\*)?$/);
            if (titleMatch) {
                reportTitle = titleMatch[1].trim();
                result['Tipo de Documento'] = reportTitle;
                continue;
            }

            // Match main bullet point with bold key (*   **Key:** Value or *   **Key:**)
            const mainBulletMatch = line.match(/^\*\s+\*\*(.+?):\*\*\s*(.*)$/);
            if (mainBulletMatch) {
                const key = mainBulletMatch[1].trim();
                const value = mainBulletMatch[2].trim();

                // Special handling for Campos Técnicos - add document type
                if (key === 'Campos Técnicos') {
                    currentSection = key;
                    result[currentSection] = {
                        'Tipo de Documento': reportTitle || 'No especificado'
                    };
                    currentSubSection = null;
                    continue;
                }

                // Check if this is a section header (value is empty or next lines are indented)
                if (!value && i + 1 < lines.length && lines[i + 1].trim().startsWith('*')) {
                    currentSection = key;
                    result[currentSection] = {};
                    currentSubSection = null;
                } else {
                    currentSection = null;
                    currentSubSection = null;
                    result[key] = value || 'No se especifica';
                }
                continue;
            }

            // Match sub-bullet point (    *   **Key:** Value)
            const subBulletMatch = line.match(/^\s+\*\s+\*\*(.+?):\*\*\s*(.*)$/);
            if (subBulletMatch && currentSection) {
                const key = subBulletMatch[1].trim();
                const value = subBulletMatch[2].trim();

                if (typeof result[currentSection] === 'object') {
                    result[currentSection][key] = value || 'No se especifica';
                }
                continue;
            }

            // Match simple sub-items without bold (continuation lines)
            const simpleSubMatch = line.match(/^\s+\*\s+(.+)$/);
            if (simpleSubMatch && currentSection) {
                const value = simpleSubMatch[1].trim();
                if (typeof result[currentSection] === 'object') {
                    // Add as array if multiple items
                    if (!result[currentSection]['Items']) {
                        result[currentSection]['Items'] = [];
                    }
                    result[currentSection]['Items'].push(value);
                }
                continue;
            }
        }

        // If parsing found nothing useful, return as-is
        if (Object.keys(result).length === 0) {
            return { 'Contenido': markdown };
        }

        return result;
    }

    /**
     * Generate HTML table from JSON data
     * @param {object|array} data - The data to convert
     * @returns {string} - HTML table
     */
    generateTableHTML(data) {
        // Handle array of objects (like multiple documents)
        if (Array.isArray(data)) {
            return data.map((item, index) => {
                const title = item.CONTRACT_TYPE || item.tipo || item['Tipo de Documento'] || `Documento ${index + 1}`;
                return `
                    <div class="data-section">
                        <h3 class="section-title">${this.escapeHtml(title)}</h3>
                        ${this.renderObjectAsSections(item)}
                    </div>
                `;
            }).join('');
        }

        // Handle single object
        const title = data['Tipo de Documento'] || 'Datos Extraídos';
        return `
            <div class="data-section">
                <h3 class="section-title">${this.escapeHtml(title)}</h3>
                ${this.renderObject(data)}
            </div>
        `;
    }

    /**
     * Render an object as separate sections with individual tables
     * @param {object} obj - Object to render
     * @returns {string} - HTML sections
     */
    renderObjectAsSections(obj) {
        if (!obj || typeof obj !== 'object') {
            return `<span class="value">${this.escapeHtml(String(obj))}</span>`;
        }

        let html = '';
        const sections = [];
        const simpleFields = [];

        // Separate complex sections from simple fields
        for (const [key, value] of Object.entries(obj)) {
            if (key === 'Tipo de Documento') continue; // Already used as title

            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                sections.push({ key, value });
            } else {
                simpleFields.push({ key, value });
            }
        }

        // Render simple fields first if any
        if (simpleFields.length > 0) {
            html += '<div class="table-section">';
            html += '<table class="data-table">';
            for (const { key, value } of simpleFields) {
                html += this.renderTableRow(key, value);
            }
            html += '</table>';
            html += '</div>';
        }

        // Render each section as a separate table
        for (const { key, value } of sections) {
            html += '<div class="table-section">';
            html += `<h4 class="subsection-title">${this.formatKey(key)}</h4>`;
            html += '<table class="data-table">';

            if (typeof value === 'object' && !Array.isArray(value)) {
                for (const [subKey, subValue] of Object.entries(value)) {
                    html += this.renderTableRow(subKey, subValue);
                }
            }

            html += '</table>';
            html += '</div>';
        }

        return html;
    }

    /**
     * Render a single table row
     * @param {string} key - The key
     * @param {any} value - The value
     * @returns {string} - HTML table row
     */
    renderTableRow(key, value) {
        const displayKey = this.formatKey(key);
        let html = '<tr>';
        html += `<td class="key-cell">${displayKey}</td>`;
        html += '<td class="value-cell">';

        if (Array.isArray(value)) {
            if (value.length === 0) {
                html += '<span class="empty-value">—</span>';
            } else {
                html += '<ul class="value-list">';
                html += value.map(item => `<li>${this.escapeHtml(String(item))}</li>`).join('');
                html += '</ul>';
            }
        } else if (typeof value === 'object' && value !== null) {
            // Nested object - render inline
            html += '<div class="nested-data">';
            for (const [k, v] of Object.entries(value)) {
                html += `<div class="nested-item"><strong>${this.formatKey(k)}:</strong> ${this.escapeHtml(String(v))}</div>`;
            }
            html += '</div>';
        } else {
            const displayValue = value === null || value === undefined || value === '' || value === 'No se especifica'
                ? '<span class="empty-value">—</span>'
                : `<span class="value">${this.escapeHtml(String(value))}</span>`;
            html += displayValue;
        }

        html += '</td>';
        html += '</tr>';
        return html;
    }

    /**
     * Render an object as a table (legacy method for nested objects)
     * @param {object} obj - Object to render
     * @param {number} level - Nesting level
     * @returns {string} - HTML table
     */
    renderObject(obj, level = 0) {
        if (!obj || typeof obj !== 'object') {
            return `<span class="value">${this.escapeHtml(String(obj))}</span>`;
        }

        let html = '<table class="data-table">';

        for (const [key, value] of Object.entries(obj)) {
            // Skip technical fields and already used title
            if (key === 'Campos Extraídos' || key === 'Confianza OCR' || key === 'rawResponse' || key === 'Tipo de Documento') continue;

            const displayKey = this.formatKey(key);
            html += '<tr>';
            html += `<td class="key-cell">${displayKey}</td>`;
            html += '<td class="value-cell">';

            if (Array.isArray(value)) {
                // Handle arrays
                if (value.length === 0) {
                    html += '<span class="empty-value">—</span>';
                } else if (typeof value[0] === 'object') {
                    // Array of objects - render as nested tables
                    html += value.map(item => this.renderObject(item, level + 1)).join('');
                } else {
                    // Array of primitives - render as list
                    html += '<ul class="value-list">';
                    html += value.map(item => `<li>${this.escapeHtml(String(item))}</li>`).join('');
                    html += '</ul>';
                }
            } else if (typeof value === 'object' && value !== null) {
                // Nested object - render as nested table
                html += this.renderObject(value, level + 1);
            } else {
                // Primitive value
                const displayValue = value === null || value === undefined || value === ''
                    ? '<span class="empty-value">—</span>'
                    : `<span class="value">${this.escapeHtml(String(value))}</span>`;
                html += displayValue;
            }

            html += '</td>';
            html += '</tr>';
        }

        html += '</table>';
        return html;
    }

    /**
     * Format key names to be more readable
     * @param {string} key - The key to format
     * @returns {string} - Formatted key
     */
    formatKey(key) {
        // If already formatted (has spaces or proper case), return as-is
        if (key.includes(' ') && key !== key.toUpperCase()) {
            return key;
        }
        // Convert snake_case and SCREAMING_SNAKE_CASE to Title Case
        return key
            .replace(/_/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    /**
     * Escape HTML special characters
     * @param {string} text - Text to escape
     * @returns {string} - Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Clear the display and show placeholder
     */
    clear() {
        this.currentData = null;
        this.currentFilename = null;

        this.placeholder.classList.remove('hidden');
        this.jsonOutput.classList.remove('active');
        this.rawOutput.classList.remove('active');
        this.jsonOutput.innerHTML = '';
        this.rawOutput.textContent = '';

        this.copyButton.disabled = true;
        this.downloadButton.disabled = true;
    }

    /**
     * Copy JSON to clipboard
     */
    async copyToClipboard() {
        if (!this.currentData) return;

        try {
            const jsonString = JSON.stringify(this.currentData, null, 2);
            await navigator.clipboard.writeText(jsonString);

            // Visual feedback
            const originalText = this.copyButton.innerHTML;
            this.copyButton.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
                ¡Copiado!
            `;

            setTimeout(() => {
                this.copyButton.innerHTML = originalText;
            }, 2000);

            // Dispatch event for toast notification
            window.dispatchEvent(new CustomEvent('showToast', {
                detail: {
                    type: 'success',
                    message: 'JSON copiado al portapapeles'
                }
            }));

        } catch (error) {
            console.error('Failed to copy:', error);
            window.dispatchEvent(new CustomEvent('showToast', {
                detail: {
                    type: 'error',
                    message: 'Error al copiar al portapapeles'
                }
            }));
        }
    }

    /**
     * Download JSON as file
     */
    downloadJSON() {
        if (!this.currentData) return;

        const jsonString = JSON.stringify(this.currentData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        // Generate filename
        const downloadName = this.currentFilename
            ? this.currentFilename.replace(/\.pdf$/i, '.json')
            : 'extraction_result.json';

        // Create and trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = downloadName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Dispatch event for toast notification
        window.dispatchEvent(new CustomEvent('showToast', {
            detail: {
                type: 'success',
                message: `Archivo descargado: ${downloadName}`
            }
        }));
    }
}

// Export for use in app.js
window.JSONViewer = JSONViewer;
