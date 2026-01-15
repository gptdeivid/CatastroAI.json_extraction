/**
 * Table Viewer Module - Display extracted data in structured table format
 */

class JSONViewer {
    constructor(options = {}) {
        this.resultContent = document.getElementById('resultContent');
        this.jsonOutput = document.getElementById('jsonOutput');
        this.placeholder = this.resultContent.querySelector('.result-placeholder');
        this.copyButton = document.getElementById('copyResult');
        this.downloadButton = document.getElementById('downloadResult');

        this.currentData = null;
        this.currentFilename = null;

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
        this.jsonOutput.classList.add('active');

        // Generate table HTML
        const tableHTML = this.generateTableHTML(data);
        this.jsonOutput.innerHTML = tableHTML;

        // Enable buttons
        this.copyButton.disabled = false;
        this.downloadButton.disabled = false;
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
                const title = item.CONTRACT_TYPE || item.tipo || `Documento ${index + 1}`;
                return `
                    <div class="data-section">
                        <h3 class="section-title">${this.escapeHtml(title)}</h3>
                        ${this.renderObject(item)}
                    </div>
                `;
            }).join('');
        }

        // Handle single object
        return `<div class="data-section">${this.renderObject(data)}</div>`;
    }

    /**
     * Render an object as a table
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
            // Skip technical fields
            if (key === 'Campos Extraídos' || key === 'Confianza OCR') continue;

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
        this.jsonOutput.innerHTML = '';

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
