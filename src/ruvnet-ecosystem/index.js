/**
 * =============================================================================
 * Ruvnet Ecosystem - Complete Integration
 * Full integration of all ruvnet packages for Edge-Native AI
 * =============================================================================
 *
 * Packages Integrated:
 * - agentic-flow: 66 specialized agents, 213 MCP tools, ReasoningBank
 * - claude-flow: Enterprise workflows with WASM-powered memory
 * - agentdb: Vector database with causal reasoning and reflexion memory
 * - ruvector: High-performance vector search
 * - ruv-swarm: Multi-agent swarm coordination
 * - @ruv/quad: Distributed task execution
 * - @ruv/qdag: DAG workflow pipelines
 * - ruvllm: Intelligent LLM load balancing
 * - strange-loops: Temporal consciousness and emergent intelligence
 * - @ruvnet/bmssp: WASM-powered graph pathfinding
 * - neural-trader: Neural network trading systems
 * - sublinear-time-solver: Sublinear algorithm optimization
 * - temporal-neural-solver: Temporal neural networks
 */

import EventEmitter from 'events';

// Export all integrations
export { AgenticFlowManager } from './agents/agentic-flow-manager.js';
export { ClaudeFlowManager } from './orchestration/claude-flow-manager.js';
export { AgentDBManager } from './memory/agentdb-manager.js';
export { RuVectorManager } from './memory/ruvector-manager.js';
export { SwarmManager } from './orchestration/swarm-manager.js';
export { QUADManager } from './orchestration/quad-manager.js';
export { StrangeLoopsManager } from './solvers/strange-loops-manager.js';
export { SolversManager } from './solvers/solvers-manager.js';

/**
 * RuvnetEcosystem - Unified manager for all ruvnet packages
 */
export class RuvnetEcosystem extends EventEmitter {
    constructor(config = {}) {
        super();
        this.config = {
            // LLM Configuration
            llm: {
                provider: config.llm?.provider || 'local',
                model: config.llm?.model || 'qwen-coder',
                apiBase: config.llm?.apiBase || process.env.LITELLM_URL || 'http://localhost:4000',
                apiKey: config.llm?.apiKey || process.env.LITELLM_MASTER_KEY
            },

            // Storage Configuration
            storage: {
                sqlite: config.storage?.sqlite || './data/ruvnet.db',
                redis: config.storage?.redis || process.env.REDIS_URL || 'redis://localhost:6379',
                vector: config.storage?.vector || './data/vectors'
            },

            // Agent Configuration
            agents: {
                maxConcurrent: config.agents?.maxConcurrent || 10,
                defaultTimeout: config.agents?.defaultTimeout || 120000,
                enableBooster: config.agents?.enableBooster !== false
            },

            // Swarm Configuration
            swarm: {
                topology: config.swarm?.topology || 'mesh',
                consensusThreshold: config.swarm?.consensusThreshold || 0.7,
                maxAgents: config.swarm?.maxAgents || 100
            },

            ...config
        };

        // Component instances
        this.components = {
            agenticFlow: null,
            claudeFlow: null,
            agentdb: null,
            ruvector: null,
            swarm: null,
            quad: null,
            qdag: null,
            strangeLoops: null,
            solvers: null
        };

        this.initialized = false;
    }

    /**
     * Initialize all ruvnet ecosystem components
     */
    async initialize() {
        console.log('🚀 Initializing Ruvnet Ecosystem...\n');

        const initResults = {};

        // Initialize AgenticFlow (66 agents, 213 MCP tools)
        try {
            console.log('📦 Loading agentic-flow...');
            const { AgenticFlowManager } = await import('./agents/agentic-flow-manager.js');
            this.components.agenticFlow = new AgenticFlowManager(this.config);
            await this.components.agenticFlow.initialize();
            initResults.agenticFlow = true;
            console.log('   ✓ agentic-flow initialized (66 agents, 213 tools)\n');
        } catch (error) {
            initResults.agenticFlow = false;
            console.warn('   ⚠ agentic-flow:', error.message, '\n');
        }

        // Initialize ClaudeFlow (SPARC workflows, ReasoningBank)
        try {
            console.log('📦 Loading claude-flow...');
            const { ClaudeFlowManager } = await import('./orchestration/claude-flow-manager.js');
            this.components.claudeFlow = new ClaudeFlowManager(this.config);
            await this.components.claudeFlow.initialize();
            initResults.claudeFlow = true;
            console.log('   ✓ claude-flow initialized (SPARC, ReasoningBank)\n');
        } catch (error) {
            initResults.claudeFlow = false;
            console.warn('   ⚠ claude-flow:', error.message, '\n');
        }

        // Initialize AgentDB (vector search, causal reasoning, reflexion)
        try {
            console.log('📦 Loading agentdb...');
            const { AgentDBManager } = await import('./memory/agentdb-manager.js');
            this.components.agentdb = new AgentDBManager(this.config);
            await this.components.agentdb.initialize();
            initResults.agentdb = true;
            console.log('   ✓ agentdb initialized (vector search, reflexion memory)\n');
        } catch (error) {
            initResults.agentdb = false;
            console.warn('   ⚠ agentdb:', error.message, '\n');
        }

        // Initialize RuVector
        try {
            console.log('📦 Loading ruvector...');
            const { RuVectorManager } = await import('./memory/ruvector-manager.js');
            this.components.ruvector = new RuVectorManager(this.config);
            await this.components.ruvector.initialize();
            initResults.ruvector = true;
            console.log('   ✓ ruvector initialized (150x faster vector search)\n');
        } catch (error) {
            initResults.ruvector = false;
            console.warn('   ⚠ ruvector:', error.message, '\n');
        }

        // Initialize Swarm Manager (ruv-swarm)
        try {
            console.log('📦 Loading ruv-swarm...');
            const { SwarmManager } = await import('./orchestration/swarm-manager.js');
            this.components.swarm = new SwarmManager(this.config);
            await this.components.swarm.initialize();
            initResults.swarm = true;
            console.log('   ✓ ruv-swarm initialized (500K+ ops/sec)\n');
        } catch (error) {
            initResults.swarm = false;
            console.warn('   ⚠ ruv-swarm:', error.message, '\n');
        }

        // Initialize QUAD/QDAG
        try {
            console.log('📦 Loading @ruv/quad and @ruv/qdag...');
            const { QUADManager } = await import('./orchestration/quad-manager.js');
            this.components.quad = new QUADManager(this.config);
            await this.components.quad.initialize();
            initResults.quad = true;
            console.log('   ✓ QUAD/QDAG initialized (distributed DAG execution)\n');
        } catch (error) {
            initResults.quad = false;
            console.warn('   ⚠ QUAD/QDAG:', error.message, '\n');
        }

        // Initialize Strange Loops
        try {
            console.log('📦 Loading strange-loops...');
            const { StrangeLoopsManager } = await import('./solvers/strange-loops-manager.js');
            this.components.strangeLoops = new StrangeLoopsManager(this.config);
            await this.components.strangeLoops.initialize();
            initResults.strangeLoops = true;
            console.log('   ✓ strange-loops initialized (temporal consciousness)\n');
        } catch (error) {
            initResults.strangeLoops = false;
            console.warn('   ⚠ strange-loops:', error.message, '\n');
        }

        // Initialize Solvers (sublinear, temporal-neural)
        try {
            console.log('📦 Loading solvers...');
            const { SolversManager } = await import('./solvers/solvers-manager.js');
            this.components.solvers = new SolversManager(this.config);
            await this.components.solvers.initialize();
            initResults.solvers = true;
            console.log('   ✓ solvers initialized (sublinear, temporal-neural)\n');
        } catch (error) {
            initResults.solvers = false;
            console.warn('   ⚠ solvers:', error.message, '\n');
        }

        this.initialized = true;
        this.emit('initialized', initResults);

        console.log('✅ Ruvnet Ecosystem initialized!\n');
        return initResults;
    }

    // =========================================================================
    // AGENT OPERATIONS
    // =========================================================================

    /**
     * Create an agent using agentic-flow
     */
    async createAgent(spec) {
        if (!this.components.agenticFlow) {
            throw new Error('agentic-flow not initialized');
        }
        return this.components.agenticFlow.createAgent(spec);
    }

    /**
     * Get available agent types (66 specialized agents)
     */
    getAvailableAgents() {
        if (!this.components.agenticFlow) {
            return [];
        }
        return this.components.agenticFlow.getAvailableAgents();
    }

    /**
     * Execute a task with an agent
     */
    async executeTask(agentId, task) {
        if (!this.components.agenticFlow) {
            throw new Error('agentic-flow not initialized');
        }
        return this.components.agenticFlow.executeTask(agentId, task);
    }

    // =========================================================================
    // SWARM OPERATIONS
    // =========================================================================

    /**
     * Create a multi-agent swarm
     */
    async createSwarm(spec) {
        if (!this.components.swarm) {
            throw new Error('ruv-swarm not initialized');
        }
        return this.components.swarm.createSwarm(spec);
    }

    /**
     * Execute a collaborative swarm task
     */
    async executeSwarmTask(swarmId, task) {
        if (!this.components.swarm) {
            throw new Error('ruv-swarm not initialized');
        }
        return this.components.swarm.executeTask(swarmId, task);
    }

    // =========================================================================
    // WORKFLOW OPERATIONS
    // =========================================================================

    /**
     * Execute a SPARC workflow using claude-flow
     */
    async executeWorkflow(template, context) {
        if (!this.components.claudeFlow) {
            throw new Error('claude-flow not initialized');
        }
        return this.components.claudeFlow.executeWorkflow(template, context);
    }

    /**
     * Execute a DAG workflow using QDAG
     */
    async executeDAG(dag) {
        if (!this.components.quad) {
            throw new Error('QUAD/QDAG not initialized');
        }
        return this.components.quad.executeDAG(dag);
    }

    // =========================================================================
    // MEMORY OPERATIONS
    // =========================================================================

    /**
     * Store memory using agentdb
     */
    async storeMemory(agentId, memory) {
        if (!this.components.agentdb) {
            throw new Error('agentdb not initialized');
        }
        return this.components.agentdb.storeMemory(agentId, memory);
    }

    /**
     * Query memories with reflexion
     */
    async queryMemories(agentId, query, options = {}) {
        if (!this.components.agentdb) {
            throw new Error('agentdb not initialized');
        }
        return this.components.agentdb.queryMemories(agentId, query, options);
    }

    /**
     * Vector search using ruvector
     */
    async vectorSearch(query, options = {}) {
        if (!this.components.ruvector) {
            throw new Error('ruvector not initialized');
        }
        return this.components.ruvector.search(query, options);
    }

    /**
     * Store vector embedding
     */
    async storeVector(id, content, metadata = {}) {
        if (!this.components.ruvector) {
            throw new Error('ruvector not initialized');
        }
        return this.components.ruvector.store(id, content, metadata);
    }

    // =========================================================================
    // REASONING OPERATIONS
    // =========================================================================

    /**
     * Use ReasoningBank for persistent reasoning
     */
    async reason(context, options = {}) {
        if (!this.components.claudeFlow) {
            throw new Error('claude-flow not initialized');
        }
        return this.components.claudeFlow.reason(context, options);
    }

    /**
     * Execute strange loop for emergent reasoning
     */
    async executeStrangeLoop(input, options = {}) {
        if (!this.components.strangeLoops) {
            throw new Error('strange-loops not initialized');
        }
        return this.components.strangeLoops.execute(input, options);
    }

    // =========================================================================
    // SOLVER OPERATIONS
    // =========================================================================

    /**
     * Solve using sublinear algorithms
     */
    async solveSublinear(problem, options = {}) {
        if (!this.components.solvers) {
            throw new Error('solvers not initialized');
        }
        return this.components.solvers.solveSublinear(problem, options);
    }

    /**
     * Solve using temporal neural networks
     */
    async solveTemporal(problem, options = {}) {
        if (!this.components.solvers) {
            throw new Error('solvers not initialized');
        }
        return this.components.solvers.solveTemporal(problem, options);
    }

    // =========================================================================
    // MCP TOOLS
    // =========================================================================

    /**
     * Get all available MCP tools (213 tools from agentic-flow)
     */
    getMCPTools() {
        if (!this.components.agenticFlow) {
            return [];
        }
        return this.components.agenticFlow.getMCPTools();
    }

    /**
     * Execute an MCP tool
     */
    async executeTool(toolName, params) {
        if (!this.components.agenticFlow) {
            throw new Error('agentic-flow not initialized');
        }
        return this.components.agenticFlow.executeTool(toolName, params);
    }

    // =========================================================================
    // SYSTEM OPERATIONS
    // =========================================================================

    /**
     * Get ecosystem health and metrics
     */
    getHealth() {
        return {
            initialized: this.initialized,
            components: Object.fromEntries(
                Object.entries(this.components).map(([key, value]) => [
                    key,
                    {
                        initialized: !!value,
                        metrics: value?.getMetrics?.() || null
                    }
                ])
            ),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Shutdown all components
     */
    async shutdown() {
        console.log('🛑 Shutting down Ruvnet Ecosystem...');

        for (const [name, component] of Object.entries(this.components)) {
            if (component?.shutdown) {
                try {
                    await component.shutdown();
                    console.log(`   ✓ ${name} shut down`);
                } catch (error) {
                    console.warn(`   ⚠ ${name} shutdown error:`, error.message);
                }
            }
        }

        this.initialized = false;
        this.emit('shutdown');
        console.log('👋 Ruvnet Ecosystem shut down\n');
    }
}

// Default export
export default RuvnetEcosystem;

// CLI Entry Point
if (process.argv[1] === import.meta.url.replace('file://', '')) {
    const ecosystem = new RuvnetEcosystem();

    process.on('SIGINT', () => ecosystem.shutdown().then(() => process.exit(0)));
    process.on('SIGTERM', () => ecosystem.shutdown().then(() => process.exit(0)));

    ecosystem.initialize()
        .then(() => {
            console.log('Ruvnet Ecosystem is running...');
            console.log('Press Ctrl+C to exit\n');
        })
        .catch(error => {
            console.error('Failed to initialize:', error);
            process.exit(1);
        });
}
