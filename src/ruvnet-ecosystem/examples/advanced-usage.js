/**
 * =============================================================================
 * Ruvnet Ecosystem - Advanced Usage Examples
 * Strange Loops, Temporal Consciousness, and Advanced Solvers
 * =============================================================================
 */

import RuvnetEcosystem from '../index.js';
import { StrangeLoopsManager, LOOP_TYPES, CONSCIOUSNESS_LEVELS } from '../solvers/strange-loops-manager.js';
import { SolversManager, SOLVER_TYPES, PROBLEM_CATEGORIES } from '../solvers/solvers-manager.js';

async function main() {
    console.log('═'.repeat(60));
    console.log('  Ruvnet Ecosystem - Advanced Usage Examples');
    console.log('═'.repeat(60));
    console.log();

    const ecosystem = new RuvnetEcosystem();
    await ecosystem.initialize();

    try {
        // Example 1: Strange Loops - Self-Referential Agent
        console.log('\n📋 Example 1: Strange Loops - Self-Referential Agent');
        console.log('─'.repeat(50));

        const strangeLoops = ecosystem.components.strangeLoops;

        // Create a Hofstadter-style strange loop
        const hofstadterLoop = await strangeLoops.createHofstadterLoop({
            name: 'consciousness-loop',
            context: { purpose: 'self-awareness' }
        });
        console.log('Created Hofstadter loop:', hofstadterLoop.id);

        // Iterate through the strange loop
        let result = await strangeLoops.iterate(hofstadterLoop.id, {
            symbol: 'I think therefore I am'
        });
        console.log('Iteration 1 - Level:', result.level);

        result = await strangeLoops.iterate(hofstadterLoop.id, result.output);
        console.log('Iteration 2 - Level:', result.level, 'Crossed:', result.levelCrossed);

        // Create self-referential agent
        const selfRefAgent = await strangeLoops.createSelfReferentialAgent('agent-consciousness', {
            name: 'Conscious Agent',
            capabilities: ['reasoning', 'self-reflection', 'learning'],
            goals: ['understand', 'improve', 'assist'],
            beliefs: ['I am an AI', 'I can learn', 'I should help']
        });
        console.log('Self-referential agent consciousness level:',
            Object.keys(CONSCIOUSNESS_LEVELS)[selfRefAgent.consciousness.level]);

        // Example 2: Temporal Consciousness
        console.log('\n📋 Example 2: Temporal Consciousness');
        console.log('─'.repeat(50));

        // Update consciousness with observations
        await strangeLoops.updateConsciousness('agent-temporal', {
            observation: { type: 'user-query', content: 'What is the time?' }
        });

        await strangeLoops.updateConsciousness('agent-temporal', {
            observation: { type: 'system-state', content: 'Processing request' }
        });

        await strangeLoops.updateConsciousness('agent-temporal', {
            selfModel: {
                id: 'agent-temporal',
                role: 'time-keeper',
                state: 'active'
            }
        });

        await strangeLoops.updateConsciousness('agent-temporal', {
            metaBelief: {
                type: 'self-assessment',
                content: 'I am processing temporal information accurately'
            }
        });

        const consciousness = strangeLoops.getConsciousness('agent-temporal');
        console.log('Agent consciousness level:',
            Object.keys(CONSCIOUSNESS_LEVELS)[consciousness.level]);
        console.log('Temporal awareness entries:', consciousness.temporalAwareness.length);

        // Example 3: Sublinear-Time Solvers
        console.log('\n📋 Example 3: Sublinear-Time Solvers');
        console.log('─'.repeat(50));

        const solvers = ecosystem.components.solvers;

        // Binary search (O(log n))
        const sortedData = Array.from({ length: 10000 }, (_, i) => i * 2);
        const binaryResult = await solvers.solve({
            type: SOLVER_TYPES.SUBLINEAR,
            algorithm: 'binary-search',
            data: sortedData,
            params: { target: 5000 }
        });
        console.log('Binary search - Found:', binaryResult.solution.found,
            'Comparisons:', binaryResult.solution.comparisons,
            'Time:', binaryResult.solveTime, 'ms');

        // Jump search (O(sqrt(n)))
        const jumpResult = await solvers.solve({
            type: SOLVER_TYPES.SUBLINEAR,
            algorithm: 'jump-search',
            data: sortedData,
            params: { target: 5000 }
        });
        console.log('Jump search - Found:', jumpResult.solution.found,
            'Comparisons:', jumpResult.solution.comparisons);

        // Approximate median
        const randomData = Array.from({ length: 100000 }, () => Math.random() * 1000);
        const medianResult = await solvers.solve({
            type: SOLVER_TYPES.SUBLINEAR,
            algorithm: 'approximate-median',
            data: randomData,
            params: { epsilon: 0.1 }
        });
        console.log('Approximate median:', medianResult.solution.approximateMedian.toFixed(2),
            'Sample size:', medianResult.solution.sampleSize);

        // Example 4: Temporal Neural Solver
        console.log('\n📋 Example 4: Temporal Neural Solver');
        console.log('─'.repeat(50));

        const timeSeries = Array.from({ length: 50 }, (_, i) =>
            Math.sin(i * 0.2) + Math.random() * 0.1
        );

        const temporalResult = await solvers.solve({
            type: SOLVER_TYPES.TEMPORAL_NEURAL,
            timeSeries,
            horizon: 5,
            features: ['value']
        });
        console.log('Temporal predictions:',
            temporalResult.solution.predictions.map(p => p.toFixed(3)));

        // Example 5: BMSSP Graph Pathfinding
        console.log('\n📋 Example 5: Graph Pathfinding (BMSSP)');
        console.log('─'.repeat(50));

        const graph = {
            nodes: [
                { id: 'A' }, { id: 'B' }, { id: 'C' },
                { id: 'D' }, { id: 'E' }, { id: 'F' }
            ],
            edges: [
                { from: 'A', to: 'B', weight: 4 },
                { from: 'A', to: 'C', weight: 2 },
                { from: 'B', to: 'C', weight: 1 },
                { from: 'B', to: 'D', weight: 5 },
                { from: 'C', to: 'D', weight: 8 },
                { from: 'C', to: 'E', weight: 10 },
                { from: 'D', to: 'E', weight: 2 },
                { from: 'D', to: 'F', weight: 6 },
                { from: 'E', to: 'F', weight: 3 }
            ]
        };

        const pathResult = await solvers.solve({
            type: SOLVER_TYPES.BMSSP,
            graph,
            sources: ['A'],
            targets: ['F']
        });
        console.log('Shortest path A->F:', pathResult.solution.paths['A->F']);

        // Example 6: Constraint Satisfaction
        console.log('\n📋 Example 6: Constraint Satisfaction');
        console.log('─'.repeat(50));

        const cspResult = await solvers.solve({
            type: SOLVER_TYPES.CONSTRAINT,
            variables: ['x', 'y', 'z'],
            domains: {
                x: [1, 2, 3, 4, 5],
                y: [1, 2, 3, 4, 5],
                z: [1, 2, 3, 4, 5]
            },
            constraints: [
                {
                    variables: ['x', 'y'],
                    check: (a) => a.x !== a.y
                },
                {
                    variables: ['y', 'z'],
                    check: (a) => a.y < a.z
                },
                {
                    variables: ['x', 'z'],
                    check: (a) => a.x + a.z === 5
                }
            ]
        });
        console.log('CSP solved:', cspResult.solution.solved);
        console.log('Assignment:', cspResult.solution.assignment);

        // Example 7: Optimization
        console.log('\n📋 Example 7: Gradient-Based Optimization');
        console.log('─'.repeat(50));

        // Minimize f(x,y) = (x-2)^2 + (y-3)^2
        const optResult = await solvers.solve({
            type: SOLVER_TYPES.OPTIMIZATION,
            objective: (point) => Math.pow(point[0] - 2, 2) + Math.pow(point[1] - 3, 2),
            initialPoint: [0, 0],
            learningRate: 0.1,
            maxIterations: 100
        });
        console.log('Optimum found:', optResult.solution.optimum.map(x => x.toFixed(3)));
        console.log('Objective value:', optResult.solution.value.toFixed(6));
        console.log('Converged in', optResult.solution.iterations, 'iterations');

        // Example 8: Neural Trading
        console.log('\n📋 Example 8: Neural Trading Signals');
        console.log('─'.repeat(50));

        const prices = [100, 102, 101, 103, 105, 104, 106, 108, 110, 109,
                       111, 113, 115, 114, 116, 118, 120, 119, 121, 123,
                       125, 127, 128, 130, 132];

        const tradingResult = await solvers.solve({
            type: SOLVER_TYPES.NEURAL_TRADER,
            prices,
            lookback: 20
        });
        console.log('Trading signal:', tradingResult.solution.signal);
        console.log('Confidence:', (tradingResult.solution.confidence * 100).toFixed(1) + '%');
        console.log('Momentum:', tradingResult.solution.momentum?.toFixed(4));
        console.log('Volatility:', tradingResult.solution.volatility?.toFixed(4));

        // Print final metrics
        console.log('\n📊 Solver Metrics');
        console.log('─'.repeat(50));
        const solverMetrics = solvers.getMetrics();
        console.log('Problems solved:', solverMetrics.problemsSolved);
        console.log('Sublinear ops:', solverMetrics.sublinearOps);
        console.log('Neural inferences:', solverMetrics.neuralInferences);
        console.log('Paths computed:', solverMetrics.pathsComputed);
        console.log('Avg solve time:', solverMetrics.averageSolveTime.toFixed(2), 'ms');

        console.log('\n📊 Strange Loops Metrics');
        console.log('─'.repeat(50));
        const loopMetrics = strangeLoops.getMetrics();
        console.log('Loops created:', loopMetrics.loopsCreated);
        console.log('Conscious agents:', loopMetrics.consciousAgents);
        console.log('Emergent patterns:', loopMetrics.emergentPatterns);

        await ecosystem.shutdown();

    } catch (error) {
        console.error('Error:', error.message);
        console.error(error.stack);
        await ecosystem.shutdown();
        process.exit(1);
    }
}

main().catch(console.error);
