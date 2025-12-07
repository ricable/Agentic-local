/**
 * =============================================================================
 * QUAD Manager
 * Integration with @ruv/quad and @ruv/qdag for distributed DAG execution
 * =============================================================================
 *
 * QUAD: Quantum Unified Agent Distribution
 * QDAG: Quantum DAG workflow pipelines
 */

import EventEmitter from 'events';

/**
 * QUADManager - Manages QUAD/QDAG integration
 */
export class QUADManager extends EventEmitter {
    constructor(config = {}) {
        super();
        this.config = config;
        this.quad = null;
        this.qdag = null;
        this.dags = new Map();
        this.tasks = new Map();
        this.metrics = {
            dagsExecuted: 0,
            nodesExecuted: 0,
            parallelExecutions: 0
        };
    }

    /**
     * Initialize QUAD/QDAG
     */
    async initialize() {
        try {
            // Try to import QUAD
            const quadModule = await import('@ruv/quad').catch(() => null);
            if (quadModule) {
                this.quad = quadModule.default || quadModule;
            }

            // Try to import QDAG
            const qdagModule = await import('@ruv/qdag').catch(() => null);
            if (qdagModule) {
                this.qdag = qdagModule.default || qdagModule;
            }

            this.emit('initialized');
            return true;
        } catch (error) {
            this.emit('error', { phase: 'initialization', error });
            throw error;
        }
    }

    /**
     * Create a DAG workflow
     */
    createDAG(spec) {
        const dagId = spec.id || `dag-${Date.now()}`;

        const dag = {
            id: dagId,
            name: spec.name || dagId,
            nodes: new Map(),
            edges: [],
            state: 'created',
            results: new Map(),
            createdAt: new Date().toISOString()
        };

        // Add nodes
        for (const node of spec.nodes || []) {
            dag.nodes.set(node.id, {
                id: node.id,
                name: node.name || node.id,
                type: node.type || 'task',
                handler: node.handler,
                config: node.config || {},
                state: 'pending',
                dependencies: [],
                dependents: [],
                result: null
            });
        }

        // Add edges (dependencies)
        for (const edge of spec.edges || []) {
            dag.edges.push(edge);
            const fromNode = dag.nodes.get(edge.from);
            const toNode = dag.nodes.get(edge.to);

            if (fromNode && toNode) {
                toNode.dependencies.push(edge.from);
                fromNode.dependents.push(edge.to);
            }
        }

        this.dags.set(dagId, dag);
        this.emit('dag-created', { dagId });

        return dag;
    }

    /**
     * Execute a DAG workflow
     */
    async executeDAG(dagSpec) {
        // Create DAG if spec provided, otherwise assume dagSpec is dagId
        let dag;
        if (typeof dagSpec === 'string') {
            dag = this.dags.get(dagSpec);
        } else {
            dag = this.createDAG(dagSpec);
        }

        if (!dag) {
            throw new Error('DAG not found');
        }

        dag.state = 'running';
        this.emit('dag-started', { dagId: dag.id });

        try {
            // If QDAG available, use it
            if (this.qdag?.execute) {
                const result = await this.qdag.execute(dag);
                dag.state = 'completed';
                this.metrics.dagsExecuted++;
                return result;
            }

            // Execute using topological sort
            const executionOrder = this.topologicalSort(dag);

            for (const nodeId of executionOrder) {
                await this.executeNode(dag, nodeId);
            }

            dag.state = 'completed';
            this.metrics.dagsExecuted++;

            this.emit('dag-completed', { dagId: dag.id, results: Object.fromEntries(dag.results) });
            return Object.fromEntries(dag.results);
        } catch (error) {
            dag.state = 'failed';
            this.emit('dag-failed', { dagId: dag.id, error });
            throw error;
        }
    }

    /**
     * Topological sort of DAG nodes
     */
    topologicalSort(dag) {
        const visited = new Set();
        const result = [];

        const visit = (nodeId) => {
            if (visited.has(nodeId)) return;
            visited.add(nodeId);

            const node = dag.nodes.get(nodeId);
            for (const depId of node.dependencies) {
                visit(depId);
            }

            result.push(nodeId);
        };

        for (const nodeId of dag.nodes.keys()) {
            visit(nodeId);
        }

        return result;
    }

    /**
     * Execute a single DAG node
     */
    async executeNode(dag, nodeId) {
        const node = dag.nodes.get(nodeId);
        if (!node) {
            throw new Error(`Node not found: ${nodeId}`);
        }

        // Wait for dependencies
        for (const depId of node.dependencies) {
            const depNode = dag.nodes.get(depId);
            if (depNode.state !== 'completed') {
                throw new Error(`Dependency ${depId} not completed`);
            }
        }

        node.state = 'running';
        this.emit('node-started', { dagId: dag.id, nodeId });

        try {
            // Gather inputs from dependencies
            const inputs = {};
            for (const depId of node.dependencies) {
                inputs[depId] = dag.results.get(depId);
            }

            let result;

            // Execute based on node type
            if (node.handler) {
                result = await node.handler(inputs, node.config);
            } else if (node.type === 'llm') {
                result = await this.executeLLMNode(node, inputs);
            } else {
                result = { inputs, nodeId };
            }

            node.state = 'completed';
            node.result = result;
            dag.results.set(nodeId, result);
            this.metrics.nodesExecuted++;

            this.emit('node-completed', { dagId: dag.id, nodeId, result });
            return result;
        } catch (error) {
            node.state = 'failed';
            node.error = error.message;
            throw error;
        }
    }

    /**
     * Execute LLM node
     */
    async executeLLMNode(node, inputs) {
        const gatewayUrl = this.config.llm?.apiBase || 'http://localhost:4000';

        const response = await fetch(`${gatewayUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.llm?.apiKey || ''}`
            },
            body: JSON.stringify({
                model: node.config.model || this.config.llm?.model || 'qwen-coder',
                messages: [
                    {
                        role: 'system',
                        content: node.config.systemPrompt || 'Process the input and produce output.'
                    },
                    {
                        role: 'user',
                        content: JSON.stringify(inputs)
                    }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`LLM error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    /**
     * Execute nodes in parallel where possible
     */
    async executeParallel(dag) {
        const completed = new Set();
        const inProgress = new Set();

        while (completed.size < dag.nodes.size) {
            // Find nodes ready to execute
            const ready = [];
            for (const [nodeId, node] of dag.nodes.entries()) {
                if (completed.has(nodeId) || inProgress.has(nodeId)) continue;

                const depsCompleted = node.dependencies.every(d => completed.has(d));
                if (depsCompleted) {
                    ready.push(nodeId);
                }
            }

            if (ready.length === 0 && inProgress.size === 0) {
                throw new Error('DAG has circular dependencies or unreachable nodes');
            }

            // Execute ready nodes in parallel
            if (ready.length > 0) {
                this.metrics.parallelExecutions++;
                for (const nodeId of ready) {
                    inProgress.add(nodeId);
                }

                await Promise.all(
                    ready.map(async (nodeId) => {
                        await this.executeNode(dag, nodeId);
                        inProgress.delete(nodeId);
                        completed.add(nodeId);
                    })
                );
            }
        }
    }

    /**
     * Create a distributed task
     */
    async createTask(spec) {
        const taskId = spec.id || `task-${Date.now()}`;

        const task = {
            id: taskId,
            type: spec.type || 'compute',
            input: spec.input,
            config: spec.config || {},
            state: 'pending',
            result: null,
            createdAt: new Date().toISOString()
        };

        // If QUAD available, distribute
        if (this.quad?.createTask) {
            const quadTask = await this.quad.createTask(spec);
            task.quadTaskId = quadTask.id;
        }

        this.tasks.set(taskId, task);
        return task;
    }

    /**
     * Get metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            activeDags: Array.from(this.dags.values()).filter(d => d.state === 'running').length,
            totalDags: this.dags.size,
            totalTasks: this.tasks.size
        };
    }

    /**
     * Shutdown
     */
    async shutdown() {
        if (this.quad?.shutdown) {
            await this.quad.shutdown();
        }
        if (this.qdag?.shutdown) {
            await this.qdag.shutdown();
        }
        this.dags.clear();
        this.tasks.clear();
        this.emit('shutdown');
    }
}

export default QUADManager;
