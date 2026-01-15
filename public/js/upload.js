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

        this.maxFileSize = options.maxFileSize || 50 * 1024 * 1024; // 50MB default
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
        // Validate file extension first (more reliable than MIME type)
        const fileName = file.name.toLowerCase();
        if (!fileName.endsWith('.pdf')) {
            this.onUploadError({
                type: 'invalid_type',
                message: 'Solo se permiten archivos PDF'
            });
            this.reset(); // Reset input to allow re-upload
            return;
        }

        // Validate file type (allow common PDF MIME types and empty/octet-stream)
        const validMimeTypes = [
            'application/pdf',
            'application/x-pdf',
            'application/octet-stream',
            '' // Some systems don't set MIME type
        ];

        if (!validMimeTypes.includes(file.type)) {
            console.warn(`Unusual MIME type detected: ${file.type}, but filename is .pdf`);
            // Don't reject - filename extension is more reliable
        }

        // Validate file size
        if (file.size > this.maxFileSize) {
            const maxMB = this.maxFileSize / (1024 * 1024);
            this.onUploadError({
                type: 'file_too_large',
                message: `El archivo es demasiado grande. Máximo ${maxMB}MB`
            });
            this.reset(); // Reset input to allow re-upload
            return;
        }

        // Validate PDF magic bytes
        try {
            const isValidPDF = await this.validatePDFContent(file);
            if (!isValidPDF) {
                this.onUploadError({
                    type: 'invalid_content',
                    message: 'El archivo no es un PDF válido'
                });
                this.reset(); // Reset input to allow re-upload
                return;
            }
        } catch (error) {
            console.error('Error validating PDF content:', error);
            this.onUploadError({
                type: 'validation_error',
                message: 'Error al validar el archivo. Por favor intenta de nuevo.'
            });
            this.reset(); // Reset input to allow re-upload
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
        return new Promise((resolve, reject) => {
            // Add timeout to prevent hanging
            const timeout = setTimeout(() => {
                reject(new Error('PDF validation timeout'));
            }, 5000); // 5 second timeout

            const reader = new FileReader();

            reader.onload = (e) => {
                clearTimeout(timeout);
                try {
                    const arr = new Uint8Array(e.target.result).subarray(0, 5);
                    const header = String.fromCharCode.apply(null, arr);
                    // Check for %PDF- (more complete validation)
                    resolve(header.startsWith('%PDF'));
                } catch (error) {
                    console.error('Error reading PDF header:', error);
                    resolve(false);
                }
            };

            reader.onerror = (error) => {
                clearTimeout(timeout);
                console.error('FileReader error:', error);
                reject(error);
            };

            // Read first 5 bytes to check for %PDF-
            try {
                reader.readAsArrayBuffer(file.slice(0, 5));
            } catch (error) {
                clearTimeout(timeout);
                reject(error);
            }
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
