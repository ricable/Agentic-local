/**
 * =============================================================================
 * RuVector Manager
 * High-performance vector search with 150x speedup
 * =============================================================================
 */

import EventEmitter from 'events';

/**
 * RuVectorManager - Manages ruvector integration
 */
export class RuVectorManager extends EventEmitter {
    constructor(config = {}) {
        super();
        this.config = {
            dimensions: config.dimensions || 1536,
            indexType: config.indexType || 'hnsw',
            similarity: config.similarity || 'cosine',
            storagePath: config.storage?.vector || './data/vectors',
            ...config
        };

        this.ruvector = null;
        this.vectors = new Map();
        this.metadata = new Map();
        this.metrics = {
            vectorsStored: 0,
            searchesPerformed: 0,
            averageSearchTime: 0
        };
    }

    /**
     * Initialize ruvector
     */
    async initialize() {
        try {
            // Try to import actual ruvector package
            const ruvectorModule = await import('ruvector').catch(() => null);

            if (ruvectorModule) {
                this.ruvector = ruvectorModule.default || ruvectorModule;

                if (this.ruvector.initialize) {
                    await this.ruvector.initialize({
                        dimensions: this.config.dimensions,
                        indexType: this.config.indexType,
                        storagePath: this.config.storagePath
                    });
                }
            }

            this.emit('initialized');
            return true;
        } catch (error) {
            this.emit('error', { phase: 'initialization', error });
            throw error;
        }
    }

    /**
     * Store a vector
     */
    async store(id, content, metadata = {}) {
        let embedding;

        if (typeof content === 'string') {
            embedding = await this.generateEmbedding(content);
            metadata.originalText = content;
        } else if (Array.isArray(content)) {
            embedding = content;
        } else {
            throw new Error('Content must be string or embedding array');
        }

        // Store in ruvector if available
        if (this.ruvector?.store) {
            await this.ruvector.store(id, embedding, metadata);
        }

        // Store locally
        this.vectors.set(id, embedding);
        this.metadata.set(id, {
            ...metadata,
            storedAt: new Date().toISOString()
        });

        this.metrics.vectorsStored++;
        this.emit('vector-stored', { id });

        return { id, dimensions: embedding.length };
    }

    /**
     * Search for similar vectors
     */
    async search(query, options = {}) {
        const { k = 10, threshold = 0, filter = null } = options;
        const startTime = Date.now();

        let queryEmbedding;

        if (typeof query === 'string') {
            queryEmbedding = await this.generateEmbedding(query);
        } else {
            queryEmbedding = query;
        }

        let results;

        // Use ruvector if available (150x faster)
        if (this.ruvector?.search) {
            results = await this.ruvector.search(queryEmbedding, { k, threshold, filter });
        } else {
            // Fallback to local search
            results = this.localSearch(queryEmbedding, k, filter);
        }

        // Apply threshold
        if (threshold > 0) {
            results = results.filter(r => r.score >= threshold);
        }

        const searchTime = Date.now() - startTime;
        this.metrics.searchesPerformed++;
        this.updateAverageSearchTime(searchTime);

        this.emit('search-completed', { k, results: results.length, time: searchTime });

        return results;
    }

    /**
     * Local fallback search
     */
    localSearch(queryEmbedding, k, filter) {
        const results = [];

        for (const [id, embedding] of this.vectors.entries()) {
            const meta = this.metadata.get(id);

            // Apply filter
            if (filter) {
                let matches = true;
                for (const [key, value] of Object.entries(filter)) {
                    if (meta[key] !== value) {
                        matches = false;
                        break;
                    }
                }
                if (!matches) continue;
            }

            const score = this.cosineSimilarity(queryEmbedding, embedding);
            results.push({
                id,
                score,
                metadata: meta
            });
        }

        results.sort((a, b) => b.score - a.score);
        return results.slice(0, k);
    }

    /**
     * Generate embedding
     */
    async generateEmbedding(text) {
        if (this.ruvector?.embed) {
            return this.ruvector.embed(text);
        }

        const gatewayUrl = this.config.llm?.apiBase || 'http://localhost:4000';

        try {
            const response = await fetch(`${gatewayUrl}/v1/embeddings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.llm?.apiKey || ''}`
                },
                body: JSON.stringify({
                    model: 'local-embedding',
                    input: text
                })
            });

            if (response.ok) {
                const data = await response.json();
                return data.data[0].embedding;
            }
        } catch (error) {
            // Fallback
        }

        return this.simpleEmbedding(text);
    }

    /**
     * Simple fallback embedding
     */
    simpleEmbedding(text, dimensions = 1536) {
        const embedding = new Array(dimensions).fill(0);
        const words = text.toLowerCase().split(/\s+/);

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            for (let j = 0; j < word.length; j++) {
                const idx = (word.charCodeAt(j) * (i + 1) * (j + 1)) % dimensions;
                embedding[idx] += 1 / (i + 1);
            }
        }

        const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        if (magnitude > 0) {
            for (let i = 0; i < dimensions; i++) {
                embedding[i] /= magnitude;
            }
        }

        return embedding;
    }

    /**
     * Cosine similarity
     */
    cosineSimilarity(a, b) {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * Delete vector
     */
    async delete(id) {
        if (this.ruvector?.delete) {
            await this.ruvector.delete(id);
        }

        this.vectors.delete(id);
        this.metadata.delete(id);

        this.emit('vector-deleted', { id });
    }

    /**
     * Get vector by ID
     */
    async get(id) {
        if (this.ruvector?.get) {
            return this.ruvector.get(id);
        }

        return {
            id,
            embedding: this.vectors.get(id),
            metadata: this.metadata.get(id)
        };
    }

    /**
     * Update average search time
     */
    updateAverageSearchTime(newTime) {
        const count = this.metrics.searchesPerformed;
        const currentAvg = this.metrics.averageSearchTime;
        this.metrics.averageSearchTime = ((currentAvg * (count - 1)) + newTime) / count;
    }

    /**
     * Get metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            totalVectors: this.vectors.size,
            dimensions: this.config.dimensions,
            indexType: this.config.indexType
        };
    }

    /**
     * Shutdown
     */
    async shutdown() {
        if (this.ruvector?.shutdown) {
            await this.ruvector.shutdown();
        }
        this.vectors.clear();
        this.metadata.clear();
        this.emit('shutdown');
    }
}

export default RuVectorManager;
