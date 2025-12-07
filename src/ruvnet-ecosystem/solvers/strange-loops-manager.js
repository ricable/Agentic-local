/**
 * =============================================================================
 * Strange Loops Manager
 * Temporal consciousness, emergent intelligence, and self-referential systems
 * =============================================================================
 *
 * Features:
 * - Temporal consciousness modeling
 * - Strange loop detection and creation
 * - Self-referential reasoning
 * - Emergent intelligence patterns
 * - Recursive self-improvement
 * - Meta-cognitive awareness
 */

import EventEmitter from 'events';

/**
 * Loop Types for Strange Loops
 */
export const LOOP_TYPES = {
    SELF_REFERENCE: 'self-reference',      // System references itself
    TANGLED_HIERARCHY: 'tangled-hierarchy', // Level crossing
    STRANGE_ATTRACTOR: 'strange-attractor', // Chaotic attractor
    FIXED_POINT: 'fixed-point',            // Self-consistent state
    QUINE: 'quine',                         // Self-reproducing
    HOFSTADTER: 'hofstadter'               // GEB-style strange loop
};

/**
 * Consciousness Levels
 */
export const CONSCIOUSNESS_LEVELS = {
    REACTIVE: 0,           // Simple stimulus-response
    ADAPTIVE: 1,           // Learning from environment
    REFLECTIVE: 2,         // Self-modeling
    META_COGNITIVE: 3,     // Thinking about thinking
    RECURSIVE: 4,          // Infinite self-reference
    EMERGENT: 5            // Novel consciousness patterns
};

/**
 * StrangeLoopsManager - Manages strange-loops integration
 */
export class StrangeLoopsManager extends EventEmitter {
    constructor(config = {}) {
        super();
        this.config = config;
        this.strangeLoops = null;
        this.strangeLoopMcp = null;
        this.loops = new Map();
        this.consciousnessStates = new Map();
        this.temporalContext = [];
        this.metrics = {
            loopsCreated: 0,
            loopsResolved: 0,
            consciousnessUpdates: 0,
            emergentPatterns: 0
        };
    }

    /**
     * Initialize strange-loops packages
     */
    async initialize() {
        try {
            // Try to import strange-loops
            const strangeLoopsModule = await import('strange-loops').catch(() => null);
            if (strangeLoopsModule) {
                this.strangeLoops = strangeLoopsModule.default || strangeLoopsModule;
            }

            // Try to import strange-loops-mcp
            const mcpModule = await import('strange-loops-mcp').catch(() => null);
            if (mcpModule) {
                this.strangeLoopMcp = mcpModule.default || mcpModule;
            }

            // Try to import @ruvnet/strange-loop
            const ruvnetModule = await import('@ruvnet/strange-loop').catch(() => null);
            if (ruvnetModule) {
                this.ruvnetStrangeLoop = ruvnetModule.default || ruvnetModule;
            }

            this.emit('initialized');
            return true;
        } catch (error) {
            this.emit('error', { phase: 'initialization', error });
            throw error;
        }
    }

    /**
     * Create a strange loop
     */
    async createLoop(spec) {
        const loopId = spec.id || `loop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const loop = {
            id: loopId,
            type: spec.type || LOOP_TYPES.SELF_REFERENCE,
            name: spec.name || loopId,
            levels: spec.levels || [],
            transitions: spec.transitions || [],
            state: {
                currentLevel: 0,
                iterations: 0,
                stable: false,
                emergent: false
            },
            context: spec.context || {},
            createdAt: new Date().toISOString()
        };

        // Build loop structure
        if (spec.levels && spec.levels.length > 0) {
            loop.structure = this.buildLoopStructure(spec.levels, spec.transitions);
        }

        // If strange-loops available, use it
        if (this.strangeLoops?.createLoop) {
            const slLoop = await this.strangeLoops.createLoop(spec);
            loop.strangeLoopId = slLoop.id;
        }

        this.loops.set(loopId, loop);
        this.metrics.loopsCreated++;

        this.emit('loop-created', { loopId, type: loop.type });
        return loop;
    }

    /**
     * Build loop structure from levels and transitions
     */
    buildLoopStructure(levels, transitions) {
        const structure = {
            nodes: levels.map((level, i) => ({
                id: `level-${i}`,
                name: level.name || `Level ${i}`,
                description: level.description,
                transform: level.transform
            })),
            edges: transitions.map(t => ({
                from: t.from,
                to: t.to,
                condition: t.condition,
                crossLevel: Math.abs(t.from - t.to) > 1
            }))
        };

        // Detect strange loop (level-crossing)
        structure.isStrange = structure.edges.some(e => e.crossLevel);

        return structure;
    }

    /**
     * Execute a strange loop iteration
     */
    async iterate(loopId, input) {
        const loop = this.loops.get(loopId);
        if (!loop) {
            throw new Error(`Loop not found: ${loopId}`);
        }

        this.emit('loop-iteration-start', { loopId, iteration: loop.state.iterations });

        try {
            let result;

            // Use strange-loops if available
            if (this.strangeLoops?.iterate && loop.strangeLoopId) {
                result = await this.strangeLoops.iterate(loop.strangeLoopId, input);
            } else {
                // Local iteration
                result = await this.localIterate(loop, input);
            }

            loop.state.iterations++;

            // Check for stability (fixed point)
            if (this.isStable(loop, result)) {
                loop.state.stable = true;
                this.metrics.loopsResolved++;
                this.emit('loop-stable', { loopId, iterations: loop.state.iterations });
            }

            // Check for emergence
            if (this.detectEmergence(loop, result)) {
                loop.state.emergent = true;
                this.metrics.emergentPatterns++;
                this.emit('emergence-detected', { loopId, pattern: result.emergentPattern });
            }

            this.emit('loop-iteration-complete', { loopId, result });
            return result;
        } catch (error) {
            this.emit('loop-error', { loopId, error });
            throw error;
        }
    }

    /**
     * Local strange loop iteration
     */
    async localIterate(loop, input) {
        const currentLevel = loop.state.currentLevel;
        const structure = loop.structure;

        if (!structure || !structure.nodes[currentLevel]) {
            return { output: input, level: currentLevel };
        }

        // Apply level transform
        const node = structure.nodes[currentLevel];
        let output = input;

        if (node.transform) {
            output = await this.applyTransform(node.transform, input, loop.context);
        }

        // Find valid transitions
        const validTransitions = (structure.edges || []).filter(e =>
            e.from === currentLevel && (!e.condition || this.evaluateCondition(e.condition, output))
        );

        // Execute transition
        if (validTransitions.length > 0) {
            const transition = validTransitions[0];
            loop.state.currentLevel = transition.to;

            // Handle level-crossing (strange loop signature)
            if (transition.crossLevel) {
                output = await this.handleLevelCrossing(loop, output, transition);
            }
        } else {
            // Progress to next level or wrap around
            loop.state.currentLevel = (currentLevel + 1) % structure.nodes.length;
        }

        return {
            output,
            level: loop.state.currentLevel,
            previousLevel: currentLevel,
            levelCrossed: validTransitions.some(t => t.crossLevel)
        };
    }

    /**
     * Apply a transformation
     */
    async applyTransform(transform, input, context) {
        if (typeof transform === 'function') {
            return transform(input, context);
        }

        if (typeof transform === 'string') {
            // Use LLM for transformation
            return this.llmTransform(transform, input, context);
        }

        return input;
    }

    /**
     * LLM-based transformation
     */
    async llmTransform(prompt, input, context) {
        const gatewayUrl = this.config.llm?.apiBase || 'http://localhost:4000';

        try {
            const response = await fetch(`${gatewayUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.llm?.apiKey || ''}`
                },
                body: JSON.stringify({
                    model: this.config.llm?.model || 'qwen-coder',
                    messages: [
                        {
                            role: 'system',
                            content: `You are a strange loop transformer. Apply the following transformation: ${prompt}`
                        },
                        {
                            role: 'user',
                            content: JSON.stringify({ input, context })
                        }
                    ]
                })
            });

            if (response.ok) {
                const data = await response.json();
                try {
                    return JSON.parse(data.choices[0].message.content);
                } catch {
                    return data.choices[0].message.content;
                }
            }
        } catch (error) {
            // Fallback
        }

        return input;
    }

    /**
     * Handle level-crossing (Hofstadter-style strange loop)
     */
    async handleLevelCrossing(loop, output, transition) {
        // Level crossing creates self-reference
        const selfReference = {
            type: 'level-crossing',
            from: transition.from,
            to: transition.to,
            output,
            loop: {
                id: loop.id,
                name: loop.name,
                state: { ...loop.state }
            }
        };

        // Add to temporal context
        this.temporalContext.push({
            timestamp: new Date().toISOString(),
            loopId: loop.id,
            event: 'level-crossing',
            data: selfReference
        });

        // Trim temporal context
        if (this.temporalContext.length > 1000) {
            this.temporalContext = this.temporalContext.slice(-500);
        }

        return {
            ...output,
            selfReference,
            meta: {
                levelCrossing: true,
                fromLevel: transition.from,
                toLevel: transition.to
            }
        };
    }

    /**
     * Evaluate a condition
     */
    evaluateCondition(condition, data) {
        if (typeof condition === 'function') {
            return condition(data);
        }
        if (typeof condition === 'string') {
            // Simple condition evaluation
            try {
                return new Function('data', `return ${condition}`)(data);
            } catch {
                return true;
            }
        }
        return true;
    }

    /**
     * Check if loop has reached stability (fixed point)
     */
    isStable(loop, result) {
        // Store recent outputs for comparison
        if (!loop._recentOutputs) {
            loop._recentOutputs = [];
        }

        const outputStr = JSON.stringify(result.output);
        loop._recentOutputs.push(outputStr);

        // Keep only last 5
        if (loop._recentOutputs.length > 5) {
            loop._recentOutputs.shift();
        }

        // Check if last 3 outputs are identical
        if (loop._recentOutputs.length >= 3) {
            const last3 = loop._recentOutputs.slice(-3);
            return last3.every(o => o === last3[0]);
        }

        return false;
    }

    /**
     * Detect emergent patterns
     */
    detectEmergence(loop, result) {
        // Emergence: novel patterns that weren't in the input
        if (!loop._inputPatterns) {
            loop._inputPatterns = new Set();
        }

        const outputStr = JSON.stringify(result.output);
        const outputHash = this.simpleHash(outputStr);

        // Check if this is a novel pattern
        if (!loop._inputPatterns.has(outputHash)) {
            // Check for complex structure indicating emergence
            const complexity = this.measureComplexity(result.output);
            if (complexity > 0.7) {
                result.emergentPattern = {
                    hash: outputHash,
                    complexity,
                    timestamp: new Date().toISOString()
                };
                return true;
            }
        }

        loop._inputPatterns.add(outputHash);
        return false;
    }

    /**
     * Simple hash function
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }

    /**
     * Measure complexity of output
     */
    measureComplexity(output) {
        const str = JSON.stringify(output);
        const length = str.length;

        // Simple entropy-based complexity measure
        const charCounts = new Map();
        for (const char of str) {
            charCounts.set(char, (charCounts.get(char) || 0) + 1);
        }

        let entropy = 0;
        for (const count of charCounts.values()) {
            const p = count / length;
            entropy -= p * Math.log2(p);
        }

        // Normalize
        const maxEntropy = Math.log2(charCounts.size);
        return maxEntropy > 0 ? entropy / maxEntropy : 0;
    }

    /**
     * Update consciousness state
     */
    async updateConsciousness(agentId, update) {
        let state = this.consciousnessStates.get(agentId);

        if (!state) {
            state = {
                agentId,
                level: CONSCIOUSNESS_LEVELS.REACTIVE,
                selfModel: null,
                metaBeliefs: [],
                temporalAwareness: [],
                createdAt: new Date().toISOString()
            };
        }

        // Apply update
        if (update.observation) {
            state.temporalAwareness.push({
                timestamp: new Date().toISOString(),
                observation: update.observation
            });

            // Keep last 100 observations
            if (state.temporalAwareness.length > 100) {
                state.temporalAwareness = state.temporalAwareness.slice(-50);
            }
        }

        if (update.selfModel) {
            state.selfModel = update.selfModel;
            // Upgrade consciousness level for self-modeling
            if (state.level < CONSCIOUSNESS_LEVELS.REFLECTIVE) {
                state.level = CONSCIOUSNESS_LEVELS.REFLECTIVE;
            }
        }

        if (update.metaBelief) {
            state.metaBeliefs.push(update.metaBelief);
            // Meta-beliefs indicate meta-cognition
            if (state.level < CONSCIOUSNESS_LEVELS.META_COGNITIVE) {
                state.level = CONSCIOUSNESS_LEVELS.META_COGNITIVE;
            }
        }

        state.updatedAt = new Date().toISOString();
        this.consciousnessStates.set(agentId, state);
        this.metrics.consciousnessUpdates++;

        this.emit('consciousness-updated', { agentId, level: state.level });
        return state;
    }

    /**
     * Get consciousness state
     */
    getConsciousness(agentId) {
        return this.consciousnessStates.get(agentId);
    }

    /**
     * Create a self-referential agent
     */
    async createSelfReferentialAgent(agentId, spec) {
        // Create consciousness state
        const consciousness = await this.updateConsciousness(agentId, {
            selfModel: {
                id: agentId,
                name: spec.name,
                capabilities: spec.capabilities || [],
                goals: spec.goals || [],
                beliefs: spec.beliefs || []
            }
        });

        // Create introspection loop
        const introspectionLoop = await this.createLoop({
            id: `${agentId}-introspection`,
            name: 'Self-Introspection',
            type: LOOP_TYPES.SELF_REFERENCE,
            levels: [
                { name: 'Observe', transform: 'Observe current state and environment' },
                { name: 'Reflect', transform: 'Reflect on observations and beliefs' },
                { name: 'Model', transform: 'Update self-model based on reflections' },
                { name: 'Predict', transform: 'Predict outcomes based on self-model' },
                { name: 'Act', transform: 'Decide on action based on predictions' }
            ],
            transitions: [
                { from: 0, to: 1 },
                { from: 1, to: 2 },
                { from: 2, to: 3 },
                { from: 3, to: 4 },
                { from: 4, to: 1 },  // Strange loop back to Reflect
                { from: 2, to: 0 }   // Meta-loop: Model changes Observation
            ],
            context: { agentId }
        });

        return {
            agentId,
            consciousness,
            introspectionLoop
        };
    }

    /**
     * Create a Hofstadter-style strange loop
     */
    async createHofstadterLoop(spec) {
        const levels = [
            { name: 'Symbol', transform: 'Process as symbol/pattern' },
            { name: 'Meaning', transform: 'Interpret meaning of symbols' },
            { name: 'Self', transform: 'Recognize self in meaning' },
            { name: 'Meta', transform: 'Observe self recognizing self' }
        ];

        return this.createLoop({
            ...spec,
            type: LOOP_TYPES.HOFSTADTER,
            levels,
            transitions: [
                { from: 0, to: 1 },
                { from: 1, to: 2 },
                { from: 2, to: 3 },
                { from: 3, to: 0 },  // Meta-level loops back to Symbol
                { from: 2, to: 0 }   // Self-recognition creates symbols
            ]
        });
    }

    /**
     * Run temporal consciousness update
     */
    async runTemporalConsciousness(agentId) {
        const state = this.consciousnessStates.get(agentId);
        if (!state) return null;

        // Analyze temporal patterns
        const patterns = this.analyzeTemporalPatterns(state.temporalAwareness);

        // Update meta-beliefs based on patterns
        if (patterns.length > 0) {
            for (const pattern of patterns) {
                await this.updateConsciousness(agentId, {
                    metaBelief: {
                        type: 'temporal-pattern',
                        pattern,
                        confidence: pattern.confidence
                    }
                });
            }
        }

        return {
            agentId,
            level: state.level,
            patterns,
            updatedAt: new Date().toISOString()
        };
    }

    /**
     * Analyze temporal patterns
     */
    analyzeTemporalPatterns(awareness) {
        if (!awareness || awareness.length < 3) return [];

        const patterns = [];

        // Look for recurring observations
        const observations = awareness.map(a => JSON.stringify(a.observation));
        const counts = new Map();

        for (const obs of observations) {
            counts.set(obs, (counts.get(obs) || 0) + 1);
        }

        // Find patterns that occur multiple times
        for (const [obs, count] of counts) {
            if (count >= 2) {
                patterns.push({
                    type: 'recurring',
                    observation: obs,
                    count,
                    confidence: count / observations.length
                });
            }
        }

        return patterns;
    }

    /**
     * Get metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            activeLoops: this.loops.size,
            stableLoops: Array.from(this.loops.values()).filter(l => l.state.stable).length,
            consciousAgents: this.consciousnessStates.size,
            temporalContextSize: this.temporalContext.length
        };
    }

    /**
     * Shutdown
     */
    async shutdown() {
        if (this.strangeLoops?.shutdown) {
            await this.strangeLoops.shutdown();
        }
        this.loops.clear();
        this.consciousnessStates.clear();
        this.temporalContext = [];
        this.emit('shutdown');
    }
}

export default StrangeLoopsManager;
