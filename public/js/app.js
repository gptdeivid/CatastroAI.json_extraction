/**
 * Catastro AI - Main Application
 * Orchestrates cache, upload, and viewer modules
 */

class CatastroApp {
    constructor() {
        this.cache = window.documentCache;
        this.uploader = null;
        this.viewer = null;

        this.cacheList = document.getElementById('cacheList');
        this.clearCacheButton = document.getElementById('clearCache');
        this.themeToggle = document.getElementById('themeToggle');
        this.toastContainer = document.getElementById('toastContainer');

        this.init();
    }

    async init() {
        // Initialize cache
        try {
            await this.cache.init();
            await this.refreshCacheList();
        } catch (error) {
            console.error('Failed to initialize cache:', error);
            this.showToast('error', 'Error al inicializar el caché local');
        }

        // Initialize viewer
        this.viewer = new JSONViewer();

        // Initialize uploader
        this.uploader = new FileUploader({
            onFileSelected: (file) => this.handleFileSelected(file),
            onUploadStart: (file) => this.handleUploadStart(file),
            onUploadComplete: (result) => this.handleUploadComplete(result),
            onUploadError: (error) => this.handleUploadError(error)
        });

        // Set up event listeners
        this.setupEventListeners();

        // Initialize theme
        this.initTheme();
    }

    setupEventListeners() {
        // Clear cache button
        this.clearCacheButton.addEventListener('click', () => {
            this.clearCache();
        });

        // Theme toggle
        this.themeToggle.addEventListener('click', () => {
            this.toggleTheme();
        });

        // Toast events
        window.addEventListener('showToast', (e) => {
            this.showToast(e.detail.type, e.detail.message);
        });
    }

    /**
     * Handle file selection - check cache first
     * @param {File} file 
     */
    async handleFileSelected(file) {
        try {
            // Generate hash for cache lookup
            const hash = await this.cache.generateHash(file);

            // Check if already in cache
            const cached = await this.cache.get(hash);

            if (cached) {
                this.showToast('success', 'Documento encontrado en caché');
                this.viewer.display(cached.data, cached.filename);
                this.highlightCacheItem(hash);
                return;
            }

            // Not in cache, process with API
            await this.uploader.sendToAPI(file);

        } catch (error) {
            console.error('Error processing file:', error);
        }
    }

    handleUploadStart(file) {
        console.log('Upload started:', file.name);
    }

    async handleUploadComplete(result) {
        const file = this.uploader.fileInput.files[0];

        if (file && result) {
            // Cache the result
            try {
                const hash = await this.cache.generateHash(file);
                await this.cache.set(hash, file.name, result);
                await this.refreshCacheList();
                this.highlightCacheItem(hash);
            } catch (error) {
                console.error('Error caching result:', error);
            }

            // Display result
            this.viewer.display(result, file.name);
            this.showToast('success', 'Documento procesado exitosamente');
        }

        this.uploader.reset();
    }

    handleUploadError(error) {
        console.error('Upload error:', error);
        this.showToast('error', error.message);
        this.uploader.reset();
    }

    /**
     * Refresh the cache list UI
     */
    async refreshCacheList() {
        try {
            const documents = await this.cache.getAll();

            if (documents.length === 0) {
                this.cacheList.innerHTML = `
                    <li class="cache-empty">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="8" x2="12" y2="12"/>
                            <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        <span>No hay documentos en caché</span>
                    </li>
                `;
                return;
            }

            this.cacheList.innerHTML = documents.map(doc => `
                <li class="cache-item" data-hash="${doc.hash}">
                    <div class="cache-item-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14,2 14,8 20,8"/>
                        </svg>
                    </div>
                    <div class="cache-item-info">
                        <div class="cache-item-name" title="${doc.filename}">${doc.filename}</div>
                        <div class="cache-item-date">${this.formatDate(doc.timestamp)}</div>
                    </div>
                    <button class="cache-item-delete" data-hash="${doc.hash}" title="Eliminar documento">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            <line x1="10" y1="11" x2="10" y2="17"/>
                            <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                    </button>
                </li>
            `).join('');

            // Add click handlers for items
            this.cacheList.querySelectorAll('.cache-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    // Don't trigger if clicking delete button
                    if (!e.target.closest('.cache-item-delete')) {
                        this.loadFromCache(item.dataset.hash);
                    }
                });
            });

            // Add click handlers for delete buttons
            this.cacheList.querySelectorAll('.cache-item-delete').forEach(button => {
                button.addEventListener('click', async (e) => {
                    e.stopPropagation(); // Prevent item click
                    const hash = button.dataset.hash;
                    await this.deleteFromCache(hash);
                });
            });

        } catch (error) {
            console.error('Error refreshing cache list:', error);
        }
    }

    /**
     * Delete a specific document from cache
     * @param {string} hash 
     */
    async deleteFromCache(hash) {
        try {
            const cached = await this.cache.get(hash);
            if (!cached) return;

            if (!confirm(`¿Eliminar "${cached.filename}" del caché?`)) {
                return;
            }

            await this.cache.delete(hash);
            await this.refreshCacheList();

            // Clear viewer if the deleted item was being displayed
            const activeItem = this.cacheList.querySelector('.cache-item.active');
            if (activeItem && activeItem.dataset.hash === hash) {
                this.viewer.clear();
            }

            this.showToast('success', 'Documento eliminado del caché');
        } catch (error) {
            console.error('Error deleting from cache:', error);
            this.showToast('error', 'Error al eliminar el documento');
        }
    }

    /**
     * Load a document from cache
     * @param {string} hash 
     */
    async loadFromCache(hash) {
        try {
            const cached = await this.cache.get(hash);
            if (cached) {
                this.viewer.display(cached.data, cached.filename);
                this.highlightCacheItem(hash);
            }
        } catch (error) {
            console.error('Error loading from cache:', error);
            this.showToast('error', 'Error al cargar desde caché');
        }
    }

    /**
     * Highlight a cache item as active
     * @param {string} hash 
     */
    highlightCacheItem(hash) {
        this.cacheList.querySelectorAll('.cache-item').forEach(item => {
            item.classList.toggle('active', item.dataset.hash === hash);
        });
    }

    /**
     * Clear all cache
     */
    async clearCache() {
        if (!confirm('¿Estás seguro de que quieres borrar todos los documentos en caché?')) {
            return;
        }

        try {
            await this.cache.clear();
            await this.refreshCacheList();
            this.viewer.clear();
            this.showToast('success', 'Caché borrado exitosamente');
        } catch (error) {
            console.error('Error clearing cache:', error);
            this.showToast('error', 'Error al borrar el caché');
        }
    }

    /**
     * Format timestamp for display
     * @param {number} timestamp 
     * @returns {string}
     */
    formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        // Less than 1 minute
        if (diff < 60000) {
            return 'Hace un momento';
        }

        // Less than 1 hour
        if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return `Hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
        }

        // Less than 24 hours
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
        }

        // Show date
        return date.toLocaleDateString('es-MX', {
            day: 'numeric',
            month: 'short',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    }

    // ============================================
    // Theme Management
    // ============================================

    initTheme() {
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
        } else if (prefersDark) {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }

    // ============================================
    // Toast Notifications
    // ============================================

    showToast(type, message) {
        const icons = {
            success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>`,
            error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>`,
            warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>`
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-icon">${icons[type] || icons.success}</div>
            <div class="toast-message">${message}</div>
            <button class="toast-close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        `;

        this.toastContainer.appendChild(toast);

        // Close button handler
        toast.querySelector('.toast-close').addEventListener('click', () => {
            this.removeToast(toast);
        });

        // Auto-remove after 5 seconds
        setTimeout(() => {
            this.removeToast(toast);
        }, 5000);
    }

    removeToast(toast) {
        toast.style.animation = 'toastOut 0.3s ease-out forwards';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }
}

// Add toast out animation
const style = document.createElement('style');
style.textContent = `
    @keyframes toastOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
`;
document.head.appendChild(style);

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CatastroApp();
});
