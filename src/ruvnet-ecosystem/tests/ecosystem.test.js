/**
 * =============================================================================
 * Ruvnet Ecosystem - Test Suite
 * =============================================================================
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import RuvnetEcosystem from '../index.js';
import { StrangeLoopsManager, LOOP_TYPES, CONSCIOUSNESS_LEVELS } from '../solvers/strange-loops-manager.js';
import { SolversManager, SOLVER_TYPES } from '../solvers/solvers-manager.js';
import { SwarmManager, SWARM_TOPOLOGIES } from '../orchestration/swarm-manager.js';
import { QUADManager } from '../orchestration/quad-manager.js';
import { AgentDBManager, MEMORY_TYPES } from '../memory/agentdb-manager.js';
import { RuVectorManager } from '../memory/ruvector-manager.js';

describe('Ruvnet Ecosystem', () => {
    let ecosystem;

    beforeAll(async () => {
        ecosystem = new RuvnetEcosystem({
            llm: {
                provider: 'local',
                apiBase: 'http://localhost:4000'
            }
        });
        await ecosystem.initialize();
    });

    afterAll(async () => {
        await ecosystem.shutdown();
    });

    describe('Initialization', () => {
        it('should initialize all components', () => {
            expect(ecosystem.initialized).toBe(true);
            expect(ecosystem.components.agenticFlow).toBeDefined();
            expect(ecosystem.components.claudeFlow).toBeDefined();
            expect(ecosystem.components.agentdb).toBeDefined();
            expect(ecosystem.components.ruvector).toBeDefined();
            expect(ecosystem.components.swarm).toBeDefined();
            expect(ecosystem.components.quad).toBeDefined();
            expect(ecosystem.components.strangeLoops).toBeDefined();
            expect(ecosystem.components.solvers).toBeDefined();
        });

        it('should return health status', () => {
            const health = ecosystem.getHealth();
            expect(health.initialized).toBe(true);
            expect(health.components).toBeDefined();
            expect(health.timestamp).toBeDefined();
        });
    });

    describe('Agent Operations', () => {
        it('should create an agent', async () => {
            const agent = await ecosystem.createAgent({
                name: 'test-agent',
                type: 'coder',
                capabilities: ['code-generation']
            });
            expect(agent).toBeDefined();
            expect(agent.id).toBeDefined();
            expect(agent.name).toBe('test-agent');
        });

        it('should list available agents', () => {
            const agents = ecosystem.getAvailableAgents();
            expect(Array.isArray(agents)).toBe(true);
            expect(agents.length).toBeGreaterThan(0);
        });
    });

    describe('Vector Operations', () => {
        it('should store and search vectors', async () => {
            await ecosystem.storeVector('test-vec-1', 'Test content about AI', {
                type: 'test'
            });

            const results = await ecosystem.vectorSearch('AI', { k: 5 });
            expect(Array.isArray(results)).toBe(true);
        });
    });

    describe('Memory Operations', () => {
        it('should store and query memories', async () => {
            const memory = await ecosystem.storeMemory('test-agent', {
                type: 'episodic',
                content: 'Test memory content',
                importance: 0.8
            });
            expect(memory).toBeDefined();
            expect(memory.id).toBeDefined();

            const memories = await ecosystem.queryMemories('test-agent', 'test');
            expect(Array.isArray(memories)).toBe(true);
        });
    });

    describe('Swarm Operations', () => {
        it('should create a swarm', async () => {
            const swarm = await ecosystem.createSwarm({
                name: 'test-swarm',
                topology: 'mesh',
                roles: [
                    { name: 'worker', capabilities: ['task'] }
                ]
            });
            expect(swarm).toBeDefined();
            expect(swarm.id).toBeDefined();
            expect(swarm.agents.length).toBeGreaterThan(0);
        });
    });

    describe('DAG Operations', () => {
        it('should execute a DAG', async () => {
            const result = await ecosystem.executeDAG({
                name: 'test-dag',
                nodes: [
                    { id: 'start', type: 'task' },
                    { id: 'end', type: 'task' }
                ],
                edges: [
                    { from: 'start', to: 'end' }
                ]
            });
            expect(result).toBeDefined();
        });
    });
});

describe('Strange Loops Manager', () => {
    let manager;

    beforeAll(async () => {
        manager = new StrangeLoopsManager();
        await manager.initialize();
    });

    afterAll(async () => {
        await manager.shutdown();
    });

    describe('Loop Creation', () => {
        it('should create a strange loop', async () => {
            const loop = await manager.createLoop({
                name: 'test-loop',
                type: LOOP_TYPES.SELF_REFERENCE
            });
            expect(loop).toBeDefined();
            expect(loop.id).toBeDefined();
            expect(loop.type).toBe(LOOP_TYPES.SELF_REFERENCE);
        });

        it('should create a Hofstadter loop', async () => {
            const loop = await manager.createHofstadterLoop({
                name: 'hofstadter-test'
            });
            expect(loop).toBeDefined();
            expect(loop.type).toBe(LOOP_TYPES.HOFSTADTER);
            expect(loop.structure.isStrange).toBe(true);
        });
    });

    describe('Consciousness', () => {
        it('should update consciousness state', async () => {
            const state = await manager.updateConsciousness('test-agent', {
                observation: { type: 'test', value: 42 }
            });
            expect(state).toBeDefined();
            expect(state.level).toBe(CONSCIOUSNESS_LEVELS.REACTIVE);
        });

        it('should upgrade to reflective level with self-model', async () => {
            const state = await manager.updateConsciousness('test-agent-2', {
                selfModel: { id: 'test', name: 'Test Agent' }
            });
            expect(state.level).toBe(CONSCIOUSNESS_LEVELS.REFLECTIVE);
        });

        it('should upgrade to meta-cognitive with meta-beliefs', async () => {
            await manager.updateConsciousness('test-agent-3', {
                selfModel: { id: 'test', name: 'Test' }
            });
            const state = await manager.updateConsciousness('test-agent-3', {
                metaBelief: { type: 'test', content: 'I think about thinking' }
            });
            expect(state.level).toBe(CONSCIOUSNESS_LEVELS.META_COGNITIVE);
        });
    });
});

describe('Solvers Manager', () => {
    let manager;

    beforeAll(async () => {
        manager = new SolversManager();
        await manager.initialize();
    });

    afterAll(async () => {
        await manager.shutdown();
    });

    describe('Sublinear Solvers', () => {
        it('should perform binary search', async () => {
            const data = Array.from({ length: 1000 }, (_, i) => i);
            const result = await manager.solve({
                type: SOLVER_TYPES.SUBLINEAR,
                algorithm: 'binary-search',
                data,
                params: { target: 500 }
            });
            expect(result.solution.found).toBe(true);
            expect(result.solution.index).toBe(500);
            expect(result.solution.comparisons).toBeLessThan(15); // log2(1000) ≈ 10
        });

        it('should perform jump search', async () => {
            const data = Array.from({ length: 100 }, (_, i) => i);
            const result = await manager.solve({
                type: SOLVER_TYPES.SUBLINEAR,
                algorithm: 'jump-search',
                data,
                params: { target: 50 }
            });
            expect(result.solution.found).toBe(true);
        });

        it('should compute approximate median', async () => {
            const data = Array.from({ length: 1000 }, () => Math.random() * 100);
            const result = await manager.solve({
                type: SOLVER_TYPES.SUBLINEAR,
                algorithm: 'approximate-median',
                data,
                params: { epsilon: 0.2 }
            });
            expect(result.solution.approximateMedian).toBeDefined();
            // Should be close to 50 for uniform random
            expect(result.solution.approximateMedian).toBeGreaterThan(20);
            expect(result.solution.approximateMedian).toBeLessThan(80);
        });
    });

    describe('Graph Solvers', () => {
        it('should find shortest path', async () => {
            const result = await manager.solve({
                type: SOLVER_TYPES.BMSSP,
                graph: {
                    nodes: [{ id: 'A' }, { id: 'B' }, { id: 'C' }],
                    edges: [
                        { from: 'A', to: 'B', weight: 1 },
                        { from: 'B', to: 'C', weight: 1 },
                        { from: 'A', to: 'C', weight: 5 }
                    ]
                },
                sources: ['A'],
                targets: ['C']
            });
            expect(result.solution.paths['A->C']).toBe(2); // A->B->C = 2, not A->C = 5
        });
    });

    describe('Constraint Solvers', () => {
        it('should solve CSP', async () => {
            const result = await manager.solve({
                type: SOLVER_TYPES.CONSTRAINT,
                variables: ['a', 'b'],
                domains: {
                    a: [1, 2, 3],
                    b: [1, 2, 3]
                },
                constraints: [{
                    variables: ['a', 'b'],
                    check: (assignment) => assignment.a !== assignment.b
                }]
            });
            expect(result.solution.solved).toBe(true);
            expect(result.solution.assignment.a).not.toBe(result.solution.assignment.b);
        });
    });

    describe('Optimization', () => {
        it('should minimize quadratic function', async () => {
            const result = await manager.solve({
                type: SOLVER_TYPES.OPTIMIZATION,
                objective: (x) => x[0] * x[0] + x[1] * x[1], // min at (0,0)
                initialPoint: [5, 5],
                learningRate: 0.1,
                maxIterations: 100
            });
            expect(result.solution.converged).toBe(true);
            expect(Math.abs(result.solution.optimum[0])).toBeLessThan(0.1);
            expect(Math.abs(result.solution.optimum[1])).toBeLessThan(0.1);
        });
    });
});

describe('Swarm Manager', () => {
    let manager;

    beforeAll(async () => {
        manager = new SwarmManager();
        await manager.initialize();
    });

    afterAll(async () => {
        await manager.shutdown();
    });

    describe('Swarm Creation', () => {
        it('should create a mesh swarm', async () => {
            const swarm = await manager.createSwarm({
                name: 'mesh-test',
                topology: SWARM_TOPOLOGIES.MESH,
                roles: [
                    { name: 'agent1' },
                    { name: 'agent2' },
                    { name: 'agent3' }
                ]
            });
            expect(swarm.agents.length).toBe(3);
            expect(swarm.topology).toBe(SWARM_TOPOLOGIES.MESH);

            // Each agent should be connected to all others
            for (const agent of swarm.agents) {
                expect(agent.connections.length).toBe(2);
            }
        });

        it('should create a star swarm', async () => {
            const swarm = await manager.createSwarm({
                name: 'star-test',
                topology: SWARM_TOPOLOGIES.STAR,
                roles: [
                    { name: 'hub', isCoordinator: true },
                    { name: 'spoke1' },
                    { name: 'spoke2' }
                ]
            });
            expect(swarm.coordinator).toBeDefined();

            const hub = swarm.agents.find(a => a.id === swarm.coordinator);
            expect(hub.connections.length).toBe(2); // Connected to all spokes
        });
    });
});

describe('QUAD Manager', () => {
    let manager;

    beforeAll(async () => {
        manager = new QUADManager();
        await manager.initialize();
    });

    afterAll(async () => {
        await manager.shutdown();
    });

    describe('DAG Operations', () => {
        it('should create and execute a DAG', async () => {
            const result = await manager.executeDAG({
                name: 'test-dag',
                nodes: [
                    { id: 'a', type: 'task' },
                    { id: 'b', type: 'task' },
                    { id: 'c', type: 'task' }
                ],
                edges: [
                    { from: 'a', to: 'b' },
                    { from: 'a', to: 'c' }
                ]
            });
            expect(result).toBeDefined();
            expect(result.a).toBeDefined();
            expect(result.b).toBeDefined();
            expect(result.c).toBeDefined();
        });

        it('should respect dependencies', async () => {
            const executionOrder = [];
            const result = await manager.executeDAG({
                name: 'order-test',
                nodes: [
                    {
                        id: 'first',
                        handler: async () => {
                            executionOrder.push('first');
                            return { order: 1 };
                        }
                    },
                    {
                        id: 'second',
                        handler: async () => {
                            executionOrder.push('second');
                            return { order: 2 };
                        }
                    }
                ],
                edges: [
                    { from: 'first', to: 'second' }
                ]
            });
            expect(executionOrder[0]).toBe('first');
            expect(executionOrder[1]).toBe('second');
        });
    });
});

describe('AgentDB Manager', () => {
    let manager;

    beforeAll(async () => {
        manager = new AgentDBManager();
        await manager.initialize();
    });

    afterAll(async () => {
        await manager.shutdown();
    });

    describe('Memory Operations', () => {
        it('should store memory', async () => {
            const memory = await manager.storeMemory('agent-1', {
                type: MEMORY_TYPES.EPISODIC,
                content: 'Test memory',
                importance: 0.8
            });
            expect(memory.id).toBeDefined();
            expect(memory.type).toBe(MEMORY_TYPES.EPISODIC);
        });

        it('should query memories', async () => {
            await manager.storeMemory('agent-2', {
                content: 'Memory about cats',
                tags: ['animals', 'cats']
            });
            await manager.storeMemory('agent-2', {
                content: 'Memory about dogs',
                tags: ['animals', 'dogs']
            });

            const memories = await manager.queryMemories('agent-2', 'cats');
            expect(memories.length).toBeGreaterThan(0);
        });
    });

    describe('Skill Library', () => {
        it('should store and retrieve skills', async () => {
            const skill = await manager.storeSkill('agent-3', {
                name: 'coding',
                description: 'Write code',
                procedure: 'Use programming language to write code'
            });
            expect(skill.id).toBeDefined();

            const skills = manager.getSkills('agent-3');
            expect(skills.length).toBe(1);
            expect(skills[0].name).toBe('coding');
        });
    });
});

describe('RuVector Manager', () => {
    let manager;

    beforeAll(async () => {
        manager = new RuVectorManager({ dimensions: 64 });
        await manager.initialize();
    });

    afterAll(async () => {
        await manager.shutdown();
    });

    describe('Vector Operations', () => {
        it('should store vectors from text', async () => {
            const result = await manager.store('vec-1', 'Hello world', {
                type: 'greeting'
            });
            expect(result.id).toBe('vec-1');
            expect(result.dimensions).toBe(64);
        });

        it('should search similar vectors', async () => {
            await manager.store('doc-a', 'Machine learning is great');
            await manager.store('doc-b', 'Deep learning neural networks');
            await manager.store('doc-c', 'Cooking recipes for dinner');

            const results = await manager.search('artificial intelligence', { k: 2 });
            expect(results.length).toBeLessThanOrEqual(2);
        });
    });
});
