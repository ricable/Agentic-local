/**
 * =============================================================================
 * AgentDB Manager
 * Full integration with agentdb: Vector search, causal reasoning, reflexion memory
 * =============================================================================
 *
 * AgentDB Features:
 * - 150x faster vector search
 * - Causal reasoning chains
 * - Reflexion memory for self-improvement
 * - Episodic memory with temporal awareness
 * - Skill library for learned capabilities
 * - Lifelong learning with automated updates
 */

import EventEmitter from 'events';

/**
 * Memory Types supported by AgentDB
 */
export const MEMORY_TYPES = {
    EPISODIC: 'episodic',      // Event-based memories with temporal context
    SEMANTIC: 'semantic',      // Factual knowledge and concepts
    PROCEDURAL: 'procedural',  // Skills and how-to knowledge
    WORKING: 'working',        // Short-term task context
    REFLEXION: 'reflexion',    // Self-reflection and improvement
    CAUSAL: 'causal'           // Cause-effect relationships
};

/**
 * AgentDBManager - Manages agentdb integration
 */
export class AgentDBManager extends EventEmitter {
    constructor(config = {}) {
        super();
        this.config = config;
        this.agentdb = null;
        this.memories = new Map();
        this.skillLibrary = new Map();
        this.causalChains = [];
        this.metrics = {
            memoriesStored: 0,
            memoriesQueried: 0,
            skillsLearned: 0,
            reflexionsPerformed: 0,
            vectorSearches: 0
        };
    }

    /**
     * Initialize agentdb
     */
    async initialize() {
        try {
            // Try to import actual agentdb package
            const agentdbModule = await import('agentdb').catch(() => null);

            if (agentdbModule) {
                this.agentdb = agentdbModule.default || agentdbModule;

                // Initialize with WASM-accelerated vector search
                if (this.agentdb.initialize) {
                    await this.agentdb.initialize({
                        dbPath: this.config.storage?.sqlite || './data/agentdb.db',
                        vectorDimensions: 1536,
                        enableWasm: true,
                        enableReflexion: true,
                        enableCausalReasoning: true
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
     * Store a memory for an agent
     */
    async storeMemory(agentId, memory) {
        const memoryId = `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const memoryEntry = {
            id: memoryId,
            agentId,
            type: memory.type || MEMORY_TYPES.EPISODIC,
            content: memory.content,
            embedding: memory.embedding || null,
            metadata: {
                importance: memory.importance || 0.5,
                emotionalValence: memory.emotionalValence || 0,
                timestamp: new Date().toISOString(),
                source: memory.source || 'direct',
                tags: memory.tags || [],
                ...memory.metadata
            },
            links: memory.links || [],
            accessCount: 0,
            lastAccessed: null
        };

        // Generate embedding if not provided
        if (!memoryEntry.embedding && typeof memory.content === 'string') {
            memoryEntry.embedding = await this.generateEmbedding(memory.content);
        }

        // Store in agentdb if available
        if (this.agentdb?.storeMemory) {
            await this.agentdb.storeMemory(agentId, memoryEntry);
        }

        // Store locally
        if (!this.memories.has(agentId)) {
            this.memories.set(agentId, []);
        }
        this.memories.get(agentId).push(memoryEntry);

        this.metrics.memoriesStored++;
        this.emit('memory-stored', { agentId, memoryId, type: memoryEntry.type });

        return memoryEntry;
    }

    /**
     * Query memories with various strategies
     */
    async queryMemories(agentId, query, options = {}) {
        const {
            type = null,
            k = 10,
            minImportance = 0,
            useReflexion = false,
            useCausal = false,
            timeRange = null
        } = options;

        this.metrics.memoriesQueried++;

        // If agentdb available, use its optimized search
        if (this.agentdb?.queryMemories) {
            return this.agentdb.queryMemories(agentId, query, options);
        }

        // Fallback to local implementation
        let memories = this.memories.get(agentId) || [];

        // Filter by type
        if (type) {
            memories = memories.filter(m => m.type === type);
        }

        // Filter by importance
        memories = memories.filter(m => m.metadata.importance >= minImportance);

        // Filter by time range
        if (timeRange) {
            const { start, end } = timeRange;
            memories = memories.filter(m => {
                const ts = new Date(m.metadata.timestamp);
                return (!start || ts >= new Date(start)) && (!end || ts <= new Date(end));
            });
        }

        // Vector search if query provided
        if (query && typeof query === 'string') {
            const queryEmbedding = await this.generateEmbedding(query);
            memories = await this.vectorSearch(memories, queryEmbedding, k);
            this.metrics.vectorSearches++;
        }

        // Apply reflexion if requested
        if (useReflexion) {
            memories = await this.applyReflexion(agentId, memories, query);
        }

        // Apply causal reasoning if requested
        if (useCausal) {
            memories = await this.applyCausalReasoning(agentId, memories);
        }

        // Update access counts
        for (const memory of memories) {
            memory.accessCount++;
            memory.lastAccessed = new Date().toISOString();
        }

        return memories.slice(0, k);
    }

    /**
     * Generate embedding for text
     */
    async generateEmbedding(text) {
        // If agentdb has embedding, use it
        if (this.agentdb?.generateEmbedding) {
            return this.agentdb.generateEmbedding(text);
        }

        // Fallback to LLM gateway embedding
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
            // Fallback to simple hash-based pseudo-embedding
        }

        // Simple fallback embedding (not for production)
        return this.simpleEmbedding(text);
    }

    /**
     * Simple fallback embedding (deterministic hash-based)
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

        // Normalize
        const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        if (magnitude > 0) {
            for (let i = 0; i < dimensions; i++) {
                embedding[i] /= magnitude;
            }
        }

        return embedding;
    }

    /**
     * Vector similarity search
     */
    async vectorSearch(memories, queryEmbedding, k) {
        const scored = memories.map(memory => {
            if (!memory.embedding) {
                return { memory, score: 0 };
            }

            const score = this.cosineSimilarity(queryEmbedding, memory.embedding);
            return { memory, score };
        });

        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, k).map(s => ({ ...s.memory, relevanceScore: s.score }));
    }

    /**
     * Calculate cosine similarity
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
     * Apply reflexion to memories
     */
    async applyReflexion(agentId, memories, query) {
        this.metrics.reflexionsPerformed++;

        // Get past reflexions
        const pastReflexions = (this.memories.get(agentId) || [])
            .filter(m => m.type === MEMORY_TYPES.REFLEXION)
            .slice(-5);

        // Add reflexion context to memories
        for (const memory of memories) {
            const relevantReflexions = pastReflexions.filter(r =>
                r.links?.includes(memory.id) ||
                r.metadata.tags?.some(tag => memory.metadata.tags?.includes(tag))
            );

            memory.reflexionContext = relevantReflexions.map(r => r.content);
        }

        return memories;
    }

    /**
     * Apply causal reasoning to memories
     */
    async applyCausalReasoning(agentId, memories) {
        // Build causal links between memories
        for (const memory of memories) {
            const causes = memories.filter(m =>
                new Date(m.metadata.timestamp) < new Date(memory.metadata.timestamp) &&
                m.links?.includes(memory.id)
            );

            const effects = memories.filter(m =>
                new Date(m.metadata.timestamp) > new Date(memory.metadata.timestamp) &&
                memory.links?.includes(m.id)
            );

            memory.causalContext = {
                causes: causes.map(c => ({ id: c.id, content: c.content?.substring(0, 100) })),
                effects: effects.map(e => ({ id: e.id, content: e.content?.substring(0, 100) }))
            };
        }

        return memories;
    }

    /**
     * Store a skill in the skill library
     */
    async storeSkill(agentId, skill) {
        const skillId = `skill-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const skillEntry = {
            id: skillId,
            agentId,
            name: skill.name,
            description: skill.description,
            procedure: skill.procedure,
            examples: skill.examples || [],
            prerequisites: skill.prerequisites || [],
            successRate: skill.successRate || 0,
            usageCount: 0,
            learnedAt: new Date().toISOString(),
            lastUsed: null
        };

        if (!this.skillLibrary.has(agentId)) {
            this.skillLibrary.set(agentId, []);
        }
        this.skillLibrary.get(agentId).push(skillEntry);

        this.metrics.skillsLearned++;
        this.emit('skill-stored', { agentId, skillId, name: skill.name });

        return skillEntry;
    }

    /**
     * Get skills for an agent
     */
    getSkills(agentId) {
        return this.skillLibrary.get(agentId) || [];
    }

    /**
     * Add a causal chain
     */
    addCausalChain(chain) {
        const chainEntry = {
            id: `chain-${Date.now()}`,
            cause: chain.cause,
            effect: chain.effect,
            confidence: chain.confidence || 1.0,
            evidence: chain.evidence || [],
            createdAt: new Date().toISOString()
        };

        this.causalChains.push(chainEntry);
        return chainEntry;
    }

    /**
     * Query causal chains
     */
    queryCausalChains(query) {
        return this.causalChains.filter(chain =>
            chain.cause.includes(query) || chain.effect.includes(query)
        );
    }

    /**
     * Consolidate memories (memory management)
     */
    async consolidateMemories(agentId, options = {}) {
        const memories = this.memories.get(agentId) || [];

        // Remove duplicates
        const uniqueMemories = [];
        const seen = new Set();

        for (const memory of memories) {
            const key = JSON.stringify(memory.content);
            if (!seen.has(key)) {
                seen.add(key);
                uniqueMemories.push(memory);
            }
        }

        // Decay importance of old, rarely accessed memories
        const now = Date.now();
        for (const memory of uniqueMemories) {
            const age = now - new Date(memory.metadata.timestamp).getTime();
            const ageInDays = age / (1000 * 60 * 60 * 24);

            if (ageInDays > 30 && memory.accessCount < 3) {
                memory.metadata.importance *= 0.9;
            }
        }

        // Keep only important memories
        const threshold = options.importanceThreshold || 0.1;
        const filtered = uniqueMemories.filter(m => m.metadata.importance >= threshold);

        this.memories.set(agentId, filtered);

        return {
            original: memories.length,
            consolidated: filtered.length,
            removed: memories.length - filtered.length
        };
    }

    /**
     * Get metrics
     */
    getMetrics() {
        let totalMemories = 0;
        let totalSkills = 0;

        for (const memories of this.memories.values()) {
            totalMemories += memories.length;
        }

        for (const skills of this.skillLibrary.values()) {
            totalSkills += skills.length;
        }

        return {
            ...this.metrics,
            totalMemories,
            totalSkills,
            causalChains: this.causalChains.length,
            agents: this.memories.size
        };
    }

    /**
     * Shutdown
     */
    async shutdown() {
        if (this.agentdb?.shutdown) {
            await this.agentdb.shutdown();
        }
        this.memories.clear();
        this.skillLibrary.clear();
        this.causalChains = [];
        this.emit('shutdown');
    }
}

export default AgentDBManager;
