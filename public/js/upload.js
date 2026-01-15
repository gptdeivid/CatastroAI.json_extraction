/**
 * Upload Module - Handles file upload and drag-drop functionality
 */

class FileUploader {
    constructor(options = {}) {
        this.uploadZone = document.getElementById('uploadZone');
        this.fileInput = document.getElementById('fileInput');
        this.progressContainer = document.getElementById('progressContainer');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');

        this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB default
        this.allowedTypes = options.allowedTypes || ['application/pdf'];

        this.onFileSelected = options.onFileSelected || (() => { });
        this.onUploadStart = options.onUploadStart || (() => { });
        this.onUploadProgress = options.onUploadProgress || (() => { });
        this.onUploadComplete = options.onUploadComplete || (() => { });
        this.onUploadError = options.onUploadError || (() => { });

        this.init();
    }

    init() {
        // Click to upload
        this.uploadZone.addEventListener('click', () => {
            this.fileInput.click();
        });

        // File input change
        this.fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleFile(file);
            }
        });

        // Drag and drop events
        this.uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.uploadZone.classList.add('drag-over');
        });

        this.uploadZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.uploadZone.classList.remove('drag-over');
        });

        this.uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.uploadZone.classList.remove('drag-over');

            const file = e.dataTransfer.files[0];
            if (file) {
                this.handleFile(file);
            }
        });

        // Prevent default drag behavior on the window
        window.addEventListener('dragover', (e) => e.preventDefault());
        window.addEventListener('drop', (e) => e.preventDefault());
    }

    /**
     * Validate and process the selected file
     * @param {File} file - The file to process
     */
    async handleFile(file) {
        // Validate file type
        if (!this.allowedTypes.includes(file.type)) {
            this.onUploadError({
                type: 'invalid_type',
                message: 'Solo se permiten archivos PDF'
            });
            return;
        }

        // Validate file size
        if (file.size > this.maxFileSize) {
            const maxMB = this.maxFileSize / (1024 * 1024);
            this.onUploadError({
                type: 'file_too_large',
                message: `El archivo es demasiado grande. Máximo ${maxMB}MB`
            });
            return;
        }

        // Validate PDF magic bytes
        const isValidPDF = await this.validatePDFContent(file);
        if (!isValidPDF) {
            this.onUploadError({
                type: 'invalid_content',
                message: 'El archivo no es un PDF válido'
            });
            return;
        }

        this.onFileSelected(file);
    }

    /**
     * Validate that the file starts with PDF magic bytes
     * @param {File} file - The file to validate
     * @returns {Promise<boolean>} - True if valid PDF
     */
    async validatePDFContent(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const arr = new Uint8Array(e.target.result).subarray(0, 4);
                const header = String.fromCharCode.apply(null, arr);
                resolve(header === '%PDF');
            };
            reader.onerror = () => resolve(false);
            reader.readAsArrayBuffer(file.slice(0, 4));
        });
    }

    /**
     * Convert file to Base64 string
     * @param {File} file - The file to convert
     * @returns {Promise<string>} - Base64 encoded string
     */
    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                // Remove the data URL prefix to get just the base64 content
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(file);
        });
    }

    /**
     * Show progress indicator
     */
    showProgress() {
        this.progressContainer.classList.add('active');
        this.updateProgress(0, 'Iniciando procesamiento...');
    }

    /**
     * Hide progress indicator
     */
    hideProgress() {
        this.progressContainer.classList.remove('active');
    }

    /**
     * Update progress bar and text
     * @param {number} percent - Progress percentage (0-100)
     * @param {string} text - Progress text to display
     */
    updateProgress(percent, text) {
        this.progressFill.style.width = `${percent}%`;
        this.progressText.textContent = text;
    }

    /**
     * Send file to the extraction API
     * @param {File} file - The file to process
     * @returns {Promise<object>} - Extraction result
     */
    async sendToAPI(file) {
        this.onUploadStart(file);
        this.showProgress();
        this.updateProgress(10, 'Preparando documento...');

        try {
            // Convert to base64
            const base64 = await this.fileToBase64(file);
            this.updateProgress(30, 'Enviando a Gemini AI...');

            // Send to API
            const response = await fetch('/api/extract', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    pdfBase64: base64,
                    filename: file.name
                })
            });

            this.updateProgress(80, 'Procesando respuesta...');

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Error del servidor: ${response.status}`);
            }

            const result = await response.json();
            this.updateProgress(100, '¡Procesamiento completado!');

            // Small delay before hiding progress
            await new Promise(resolve => setTimeout(resolve, 500));
            this.hideProgress();

            this.onUploadComplete(result);
            return result;

        } catch (error) {
            this.hideProgress();
            this.onUploadError({
                type: 'api_error',
                message: error.message || 'Error al procesar el documento'
            });
            throw error;
        }
    }

    /**
     * Reset the file input for a new upload
     */
    reset() {
        this.fileInput.value = '';
        this.hideProgress();
    }
}

// Export for use in app.js
window.FileUploader = FileUploader;
