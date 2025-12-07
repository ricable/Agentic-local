/**
 * =============================================================================
 * Claude Flow Manager
 * Full integration with claude-flow: SPARC workflows, ReasoningBank, AgentDB
 * =============================================================================
 */

import EventEmitter from 'events';

/**
 * SPARC Methodology Phases
 */
export const SPARC_PHASES = {
    SPECIFICATION: {
        name: 'specification',
        description: 'Analyze requirements and create detailed specifications',
        outputs: ['requirements', 'constraints', 'acceptance_criteria', 'scope']
    },
    PSEUDOCODE: {
        name: 'pseudocode',
        description: 'Design the solution using pseudocode and algorithms',
        outputs: ['pseudocode', 'data_structures', 'algorithms', 'flowcharts']
    },
    ARCHITECTURE: {
        name: 'architecture',
        description: 'Define system architecture and component design',
        outputs: ['architecture_diagram', 'components', 'interfaces', 'data_flow']
    },
    REFINEMENT: {
        name: 'refinement',
        description: 'Implement with iterative refinement and testing',
        outputs: ['code', 'tests', 'documentation', 'refactoring']
    },
    COMPLETION: {
        name: 'completion',
        description: 'Finalize, review, and validate the implementation',
        outputs: ['final_code', 'test_results', 'deployment_ready', 'review']
    }
};

/**
 * Workflow Templates
 */
export const WORKFLOW_TEMPLATES = {
    'sparc-full': {
        name: 'Full SPARC Development',
        description: 'Complete SPARC methodology workflow',
        phases: Object.values(SPARC_PHASES)
    },
    'sparc-quick': {
        name: 'Quick SPARC',
        description: 'Abbreviated SPARC for smaller tasks',
        phases: [SPARC_PHASES.SPECIFICATION, SPARC_PHASES.ARCHITECTURE, SPARC_PHASES.COMPLETION]
    },
    'code-review': {
        name: 'Code Review Workflow',
        description: 'Comprehensive code review process',
        phases: [
            { name: 'analysis', description: 'Analyze code structure and patterns', outputs: ['findings'] },
            { name: 'security', description: 'Security vulnerability assessment', outputs: ['vulnerabilities'] },
            { name: 'performance', description: 'Performance analysis', outputs: ['optimizations'] },
            { name: 'suggestions', description: 'Improvement suggestions', outputs: ['recommendations'] }
        ]
    },
    'research': {
        name: 'Research Workflow',
        description: 'Structured research process',
        phases: [
            { name: 'gather', description: 'Gather information and sources', outputs: ['sources', 'data'] },
            { name: 'analyze', description: 'Analyze and synthesize findings', outputs: ['analysis'] },
            { name: 'conclude', description: 'Draw conclusions', outputs: ['conclusions', 'recommendations'] }
        ]
    },
    'debug': {
        name: 'Debug Workflow',
        description: 'Systematic debugging process',
        phases: [
            { name: 'reproduce', description: 'Reproduce the issue', outputs: ['reproduction_steps'] },
            { name: 'isolate', description: 'Isolate the root cause', outputs: ['root_cause'] },
            { name: 'fix', description: 'Implement the fix', outputs: ['fix', 'tests'] },
            { name: 'verify', description: 'Verify the fix', outputs: ['verification'] }
        ]
    }
};

/**
 * ClaudeFlowManager - Manages claude-flow integration
 */
export class ClaudeFlowManager extends EventEmitter {
    constructor(config = {}) {
        super();
        this.config = config;
        this.claudeFlow = null;
        this.reasoningBank = new Map();
        this.workflows = new Map();
        this.metrics = {
            workflowsCreated: 0,
            workflowsCompleted: 0,
            reasoningStored: 0,
            phasesExecuted: 0
        };
    }

    /**
     * Initialize claude-flow
     */
    async initialize() {
        try {
            // Try to import actual claude-flow package
            const claudeFlowModule = await import('claude-flow').catch(() => null);

            if (claudeFlowModule) {
                this.claudeFlow = claudeFlowModule.default || claudeFlowModule;

                // Initialize with config
                if (this.claudeFlow.initialize) {
                    await this.claudeFlow.initialize({
                        llm: this.config.llm,
                        storage: this.config.storage,
                        reasoningBank: {
                            enabled: true,
                            persistPath: this.config.storage?.sqlite?.replace('.db', '-reasoning')
                        }
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
     * Get available workflow templates
     */
    getTemplates() {
        return Object.entries(WORKFLOW_TEMPLATES).map(([id, template]) => ({
            id,
            name: template.name,
            description: template.description,
            phases: template.phases.length
        }));
    }

    /**
     * Create a workflow
     */
    async createWorkflow(templateId, context = {}) {
        const template = WORKFLOW_TEMPLATES[templateId];
        if (!template) {
            throw new Error(`Unknown workflow template: ${templateId}`);
        }

        const workflowId = `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const workflow = {
            id: workflowId,
            templateId,
            name: template.name,
            description: template.description,
            context,
            phases: template.phases.map(phase => ({
                ...phase,
                status: 'pending',
                result: null,
                startedAt: null,
                completedAt: null
            })),
            currentPhase: 0,
            status: 'created',
            outputs: {},
            createdAt: new Date().toISOString(),
            completedAt: null
        };

        this.workflows.set(workflowId, workflow);
        this.metrics.workflowsCreated++;

        this.emit('workflow-created', { workflowId, workflow });
        return workflow;
    }

    /**
     * Execute a workflow
     */
    async executeWorkflow(templateId, context = {}) {
        const workflow = await this.createWorkflow(templateId, context);
        workflow.status = 'running';

        this.emit('workflow-started', { workflowId: workflow.id });

        try {
            for (let i = 0; i < workflow.phases.length; i++) {
                workflow.currentPhase = i;
                const phase = workflow.phases[i];

                await this.executePhase(workflow, phase);
            }

            workflow.status = 'completed';
            workflow.completedAt = new Date().toISOString();
            this.metrics.workflowsCompleted++;

            this.emit('workflow-completed', { workflowId: workflow.id, workflow });
            return workflow;
        } catch (error) {
            workflow.status = 'failed';
            this.emit('workflow-failed', { workflowId: workflow.id, error });
            throw error;
        }
    }

    /**
     * Execute a single workflow phase
     */
    async executePhase(workflow, phase) {
        phase.status = 'running';
        phase.startedAt = new Date().toISOString();

        this.emit('phase-started', { workflowId: workflow.id, phase: phase.name });

        try {
            // Build context from previous phases
            const phaseContext = {
                workflow: workflow.context,
                previousOutputs: workflow.outputs,
                phase: phase.name,
                phaseDescription: phase.description
            };

            let result;

            // If actual claude-flow is available, use it
            if (this.claudeFlow?.executePhase) {
                result = await this.claudeFlow.executePhase(phase, phaseContext);
            } else {
                // Execute via LLM gateway
                result = await this.executePhaseViaGateway(workflow, phase, phaseContext);
            }

            phase.result = result;
            phase.status = 'completed';
            phase.completedAt = new Date().toISOString();
            this.metrics.phasesExecuted++;

            // Store outputs
            if (phase.outputs) {
                for (const output of phase.outputs) {
                    workflow.outputs[output] = result[output] || result;
                }
            }

            // Store reasoning in ReasoningBank
            await this.storeReasoning(`${workflow.id}-${phase.name}`, {
                type: 'workflow-phase',
                workflowId: workflow.id,
                phase: phase.name,
                context: phaseContext,
                result
            });

            this.emit('phase-completed', { workflowId: workflow.id, phase: phase.name, result });
        } catch (error) {
            phase.status = 'failed';
            phase.error = error.message;
            throw error;
        }
    }

    /**
     * Execute phase via LLM gateway
     */
    async executePhaseViaGateway(workflow, phase, context) {
        const gatewayUrl = this.config.llm?.apiBase || 'http://localhost:4000';

        const systemPrompt = `You are executing the "${phase.name}" phase of the ${workflow.name} workflow.

Phase Description: ${phase.description}

Expected Outputs: ${phase.outputs?.join(', ') || 'analysis and results'}

Instructions:
1. Analyze the context and previous outputs
2. Execute this phase according to the SPARC methodology
3. Provide structured outputs matching the expected format
4. Be thorough and precise`;

        const userPrompt = `Context:
${JSON.stringify(context, null, 2)}

Please execute this phase and provide the required outputs.`;

        const response = await fetch(`${gatewayUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.llm?.apiKey || ''}`
            },
            body: JSON.stringify({
                model: this.config.llm?.model || 'qwen-coder',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`Gateway error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    /**
     * Store reasoning in ReasoningBank
     */
    async storeReasoning(key, reasoning) {
        const entry = {
            id: key,
            timestamp: new Date().toISOString(),
            reasoning,
            metadata: {
                type: reasoning.type || 'general',
                confidence: reasoning.confidence || 1.0
            }
        };

        this.reasoningBank.set(key, entry);
        this.metrics.reasoningStored++;

        // If actual claude-flow has ReasoningBank, use it
        if (this.claudeFlow?.storeReasoning) {
            await this.claudeFlow.storeReasoning(key, reasoning);
        }

        this.emit('reasoning-stored', { key, entry });
        return entry;
    }

    /**
     * Retrieve reasoning from ReasoningBank
     */
    async getReasoning(key) {
        // Check local cache first
        if (this.reasoningBank.has(key)) {
            return this.reasoningBank.get(key);
        }

        // If actual claude-flow has ReasoningBank, try it
        if (this.claudeFlow?.getReasoning) {
            return this.claudeFlow.getReasoning(key);
        }

        return null;
    }

    /**
     * Search reasoning entries
     */
    async searchReasoning(query) {
        const results = [];

        for (const [key, entry] of this.reasoningBank.entries()) {
            const text = JSON.stringify(entry.reasoning).toLowerCase();
            if (text.includes(query.toLowerCase())) {
                results.push(entry);
            }
        }

        return results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    /**
     * Perform reasoning with context
     */
    async reason(context, options = {}) {
        const gatewayUrl = this.config.llm?.apiBase || 'http://localhost:4000';

        // Retrieve relevant past reasoning
        const pastReasoning = await this.searchReasoning(context.query || context.topic || '');
        const relevantContext = pastReasoning.slice(0, 5);

        const systemPrompt = `You are a reasoning engine with access to past reasoning and knowledge.

Your role is to:
1. Analyze the given context
2. Apply logical reasoning
3. Consider relevant past reasoning
4. Provide well-structured conclusions

Past relevant reasoning:
${relevantContext.map(r => `- ${r.reasoning.type}: ${JSON.stringify(r.reasoning).substring(0, 200)}`).join('\n')}`;

        const response = await fetch(`${gatewayUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.llm?.apiKey || ''}`
            },
            body: JSON.stringify({
                model: options.model || this.config.llm?.model || 'qwen-coder',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: JSON.stringify(context) }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`Gateway error: ${response.status}`);
        }

        const data = await response.json();
        const result = data.choices[0].message.content;

        // Store the new reasoning
        await this.storeReasoning(`reason-${Date.now()}`, {
            type: 'reasoning',
            context,
            result,
            options
        });

        return result;
    }

    /**
     * Get workflow by ID
     */
    getWorkflow(workflowId) {
        return this.workflows.get(workflowId);
    }

    /**
     * List workflows
     */
    listWorkflows(filter = {}) {
        let workflows = Array.from(this.workflows.values());

        if (filter.status) {
            workflows = workflows.filter(w => w.status === filter.status);
        }

        if (filter.templateId) {
            workflows = workflows.filter(w => w.templateId === filter.templateId);
        }

        return workflows;
    }

    /**
     * Get metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            reasoningBankSize: this.reasoningBank.size,
            activeWorkflows: Array.from(this.workflows.values()).filter(w => w.status === 'running').length
        };
    }

    /**
     * Shutdown
     */
    async shutdown() {
        if (this.claudeFlow?.shutdown) {
            await this.claudeFlow.shutdown();
        }
        this.workflows.clear();
        this.reasoningBank.clear();
        this.emit('shutdown');
    }
}

export default ClaudeFlowManager;
