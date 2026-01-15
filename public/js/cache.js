/**
 * Cache Module - IndexedDB-based document caching
 * Stores processed PDFs and their JSON results for offline access
 */

class DocumentCache {
    constructor() {
        this.dbName = 'CatastroAI_DocumentCache';
        this.storeName = 'documents';
        this.dbVersion = 1;
        this.db = null;
    }

    /**
     * Initialize the IndexedDB database
     * @returns {Promise<void>}
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('Failed to open IndexedDB:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB initialized successfully');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object store if it doesn't exist
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'hash' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('filename', 'filename', { unique: false });
                }
            };
        });
    }

    /**
     * Generate SHA-256 hash from file content
     * @param {File} file - The file to hash
     * @returns {Promise<string>} - Hex string of the hash
     */
    async generateHash(file) {
        const buffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Get a cached document by its hash
     * @param {string} hash - Document hash
     * @returns {Promise<object|null>} - Cached document or null
     */
    async get(hash) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                resolve(null);
                return;
            }

            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(hash);

            request.onsuccess = () => {
                resolve(request.result || null);
            };

            request.onerror = () => {
                console.error('Error getting cached document:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Store a document and its extraction result
     * @param {string} hash - Document hash
     * @param {string} filename - Original filename
     * @param {object} data - Extracted JSON data
     * @returns {Promise<void>}
     */
    async set(hash, filename, data) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            const record = {
                hash,
                filename,
                data,
                timestamp: Date.now()
            };

            const request = store.put(record);

            request.onsuccess = () => {
                console.log('Document cached successfully:', filename);
                resolve();
            };

            request.onerror = () => {
                console.error('Error caching document:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Get all cached documents
     * @returns {Promise<Array>} - Array of cached documents
     */
    async getAll() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                resolve([]);
                return;
            }

            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const index = store.index('timestamp');
            const request = index.openCursor(null, 'prev'); // Most recent first

            const documents = [];

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    documents.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(documents);
                }
            };

            request.onerror = () => {
                console.error('Error getting all cached documents:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Delete a specific document from cache
     * @param {string} hash - Document hash to delete
     * @returns {Promise<void>}
     */
    async delete(hash) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(hash);

            request.onsuccess = () => {
                console.log('Document deleted from cache:', hash);
                resolve();
            };

            request.onerror = () => {
                console.error('Error deleting document:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Clear all cached documents
     * @returns {Promise<void>}
     */
    async clear() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.clear();

            request.onsuccess = () => {
                console.log('Cache cleared successfully');
                resolve();
            };

            request.onerror = () => {
                console.error('Error clearing cache:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Get cache statistics
     * @returns {Promise<object>} - Cache stats
     */
    async getStats() {
        const documents = await this.getAll();
        return {
            count: documents.length,
            documents: documents.map(d => ({
                hash: d.hash,
                filename: d.filename,
                timestamp: d.timestamp
            }))
        };
    }
}

// Export singleton instance
window.documentCache = new DocumentCache();
