/**
 * =============================================================================
 * Ruvnet Ecosystem - Basic Usage Examples
 * =============================================================================
 */

import RuvnetEcosystem from '../index.js';

async function main() {
    console.log('═'.repeat(60));
    console.log('  Ruvnet Ecosystem - Basic Usage Examples');
    console.log('═'.repeat(60));
    console.log();

    // Initialize the ecosystem
    const ecosystem = new RuvnetEcosystem({
        llm: {
            provider: 'local',
            model: 'qwen-coder',
            apiBase: process.env.LITELLM_URL || 'http://localhost:4000'
        },
        storage: {
            sqlite: './data/example.db',
            vector: './data/vectors'
        }
    });

    try {
        await ecosystem.initialize();

        // Example 1: Create and use an agent
        console.log('\n📋 Example 1: Creating an Agent');
        console.log('─'.repeat(40));

        const agent = await ecosystem.createAgent({
            name: 'research-agent',
            type: 'researcher',
            capabilities: ['web-search', 'summarization', 'analysis']
        });
        console.log('Created agent:', agent.id);

        // Example 2: Store and search vectors
        console.log('\n📋 Example 2: Vector Storage and Search');
        console.log('─'.repeat(40));

        await ecosystem.storeVector('doc-1', 'WebAssembly enables portable binary code execution', {
            type: 'documentation',
            topic: 'wasm'
        });

        await ecosystem.storeVector('doc-2', 'Edge computing brings computation closer to data sources', {
            type: 'documentation',
            topic: 'edge'
        });

        await ecosystem.storeVector('doc-3', 'Kubernetes orchestrates containerized applications', {
            type: 'documentation',
            topic: 'kubernetes'
        });

        const searchResults = await ecosystem.vectorSearch('What is WASM?', { k: 2 });
        console.log('Search results:', searchResults.slice(0, 2).map(r => ({
            id: r.id,
            score: r.score?.toFixed(3)
        })));

        // Example 3: Store agent memory
        console.log('\n📋 Example 3: Agent Memory');
        console.log('─'.repeat(40));

        await ecosystem.storeMemory(agent.id, {
            type: 'episodic',
            content: 'User asked about WebAssembly performance',
            importance: 0.8,
            tags: ['wasm', 'performance']
        });

        const memories = await ecosystem.queryMemories(agent.id, 'WebAssembly');
        console.log('Retrieved memories:', memories.length);

        // Example 4: Create a swarm
        console.log('\n📋 Example 4: Multi-Agent Swarm');
        console.log('─'.repeat(40));

        const swarm = await ecosystem.createSwarm({
            name: 'research-swarm',
            topology: 'mesh',
            roles: [
                { name: 'coordinator', isCoordinator: true, capabilities: ['planning', 'synthesis'] },
                { name: 'researcher-1', capabilities: ['web-search'] },
                { name: 'researcher-2', capabilities: ['document-analysis'] },
                { name: 'writer', capabilities: ['writing', 'editing'] }
            ]
        });
        console.log('Created swarm:', swarm.id, 'with', swarm.agents.length, 'agents');

        // Example 5: Execute a DAG workflow
        console.log('\n📋 Example 5: DAG Workflow');
        console.log('─'.repeat(40));

        const dagResult = await ecosystem.executeDAG({
            name: 'research-pipeline',
            nodes: [
                { id: 'gather', name: 'Gather Data', type: 'task' },
                { id: 'process', name: 'Process Data', type: 'task' },
                { id: 'analyze', name: 'Analyze Results', type: 'task' },
                { id: 'report', name: 'Generate Report', type: 'task' }
            ],
            edges: [
                { from: 'gather', to: 'process' },
                { from: 'process', to: 'analyze' },
                { from: 'analyze', to: 'report' }
            ]
        });
        console.log('DAG completed:', Object.keys(dagResult).length, 'nodes processed');

        // Example 6: Get ecosystem health
        console.log('\n📋 Example 6: Ecosystem Health');
        console.log('─'.repeat(40));

        const health = ecosystem.getHealth();
        console.log('Components initialized:');
        for (const [name, status] of Object.entries(health.components)) {
            console.log(`  ${status.initialized ? '✓' : '✗'} ${name}`);
        }

        // Shutdown
        await ecosystem.shutdown();

    } catch (error) {
        console.error('Error:', error.message);
        await ecosystem.shutdown();
        process.exit(1);
    }
}

main().catch(console.error);
