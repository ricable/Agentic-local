/**
 * HyperScale AI Agents Platform
 *
 * Main entry point for the sovereign edge-native AI infrastructure
 *
 * @module @edge-ai/hyperscale-platform
 */

// Core Components
export { QUADScheduler } from './core/quad/scheduler';
export { RuvLLMEngine, DEFAULT_MODELS } from './core/ruvllm/inference-engine';

// GPU Acceleration
export {
  MacSiliconAccelerator,
  LlamaEdgeMetalRunner,
} from './gpu/mac-silicon-accelerator';

// Federation & Scaling
export {
  HybridCloudFederationController,
  ClusterRegistry,
  PlacementScheduler,
  SpilloverController,
  GaiaNetworkIntegration,
  DEFAULT_LOCAL_CLUSTER,
  DEFAULT_EDGE_CLUSTERS,
} from './federation/hybrid-cloud-controller';

// Agent Orchestration
export {
  UnifiedOrchestrator,
  createOrchestrator,
  createCodingSwarm,
  createResearchSwarm,
} from './agents/unified-orchestrator';

// Types
export type {
  // From QUAD Scheduler
  QDAGNode,
  TaskPayload,
  ResourceRequirements,
  AgentCapabilities,
  SchedulerConfig,
  DAGExecution,
} from './core/quad/scheduler';

export type {
  // From ruvllm
  ModelConfig,
  InferenceRequest,
  InferenceResponse,
  StreamChunk,
  BackendStatus,
} from './core/ruvllm/inference-engine';

export type {
  // From Federation
  ClusterConfig,
  ClusterCapabilities,
  WorkloadSpec,
  PlacementDecision,
  SpilloverConfig,
  FederationMetrics,
} from './federation/hybrid-cloud-controller';

export type {
  // From Orchestrator
  OrchestratorConfig,
  AgentDefinition,
  Agent,
  Swarm,
  SwarmDefinition,
  TaskRequest,
  TaskResult,
} from './agents/unified-orchestrator';

// =============================================================================
// QUICK START API
// =============================================================================

/**
 * Initialize the HyperScale platform with sensible defaults
 */
export async function initializeHyperScale(config?: {
  enableGPU?: boolean;
  enableFederation?: boolean;
  maxAgents?: number;
}): Promise<{
  orchestrator: UnifiedOrchestrator;
  inference: RuvLLMEngine;
  federation?: HybridCloudFederationController;
  gpu?: MacSiliconAccelerator;
}> {
  console.log('🚀 Initializing HyperScale AI Agents Platform...');

  // Create inference engine
  const inference = new RuvLLMEngine({
    backends: ['llamaedge', 'mlx', 'gaia'],
    autoSelectBackend: true,
    enableCaching: true,
  });

  await inference.initialize();
  console.log('✅ Inference engine initialized');

  // Create GPU accelerator if enabled
  let gpu: MacSiliconAccelerator | undefined;
  if (config?.enableGPU !== false && process.platform === 'darwin') {
    try {
      gpu = new MacSiliconAccelerator();
      await gpu.initialize();
      console.log('✅ GPU acceleration enabled (Mac Silicon)');
    } catch (error) {
      console.warn('⚠️ GPU acceleration not available:', error);
    }
  }

  // Create federation controller if enabled
  let federation: HybridCloudFederationController | undefined;
  if (config?.enableFederation !== false) {
    federation = new HybridCloudFederationController();
    await federation.initialize();
    console.log('✅ Hybrid cloud federation enabled');
  }

  // Create orchestrator
  const orchestrator = new UnifiedOrchestrator({
    maxAgents: config?.maxAgents || 10000,
    enableGPU: !!gpu,
    enableFederation: !!federation,
    enableAutoScale: true,
  });

  await orchestrator.initialize();
  console.log('✅ Agent orchestrator initialized');

  console.log('🎉 HyperScale platform ready!');

  return {
    orchestrator,
    inference,
    federation,
    gpu,
  };
}

/**
 * Quick agent creation
 */
export function quickAgent(
  orchestrator: UnifiedOrchestrator,
  type: 'coder' | 'researcher' | 'analyst' = 'coder'
) {
  return orchestrator.createAgent({
    name: `quick-${type}-${Date.now()}`,
    type,
    capabilities: [],
  });
}

/**
 * Quick swarm creation
 */
export function quickSwarm(
  orchestrator: UnifiedOrchestrator,
  size: number = 5,
  type: 'coding' | 'research' = 'coding'
) {
  if (type === 'coding') {
    return createCodingSwarm(orchestrator, size);
  } else {
    return createResearchSwarm(orchestrator, size);
  }
}

/**
 * Quick chat with an agent
 */
export async function quickChat(
  orchestrator: UnifiedOrchestrator,
  message: string,
  options?: {
    model?: string;
    temperature?: number;
    stream?: boolean;
  }
) {
  const result = await orchestrator.executeTask({
    type: 'chat',
    input: {
      message,
      model: options?.model || 'qwen-coder-7b',
      temperature: options?.temperature || 0.7,
    },
    options: {
      stream: options?.stream,
    },
  });

  return result.output;
}

// =============================================================================
// CLI INTERFACE
// =============================================================================

if (require.main === module) {
  // Run as CLI
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
HyperScale AI Agents Platform

Usage: npx ts-node platform/index.ts [command] [options]

Commands:
  init              Initialize the platform
  agent <type>      Create a quick agent
  swarm <size>      Launch an agent swarm
  chat <message>    Chat with an agent
  status            Show platform status

Options:
  --gpu             Enable GPU acceleration
  --no-federation   Disable cluster federation
  --model <name>    Specify LLM model

Examples:
  npx ts-node platform/index.ts init
  npx ts-node platform/index.ts agent coder
  npx ts-node platform/index.ts swarm 100
  npx ts-node platform/index.ts chat "Write a sorting algorithm"
    `);
    process.exit(0);
  }

  const command = args[0];

  (async () => {
    const { orchestrator } = await initializeHyperScale({
      enableGPU: !args.includes('--no-gpu'),
      enableFederation: !args.includes('--no-federation'),
    });

    switch (command) {
      case 'init':
        console.log('Platform initialized successfully!');
        break;

      case 'agent':
        const agentType = (args[1] || 'coder') as 'coder' | 'researcher' | 'analyst';
        const agent = quickAgent(orchestrator, agentType);
        console.log(`Created agent: ${agent.id}`);
        break;

      case 'swarm':
        const size = parseInt(args[1] || '5', 10);
        const swarm = quickSwarm(orchestrator, size);
        console.log(`Created swarm: ${swarm.id} with ${size} agents`);
        break;

      case 'chat':
        const message = args.slice(1).join(' ') || 'Hello!';
        const response = await quickChat(orchestrator, message);
        console.log('Response:', response.response);
        break;

      case 'status':
        console.log('Platform Status:', orchestrator.getStatus());
        break;

      default:
        console.log('Unknown command. Use --help for usage.');
    }

    await orchestrator.shutdown();
  })().catch(console.error);
}
