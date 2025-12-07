/**
 * Agentic Flow + Hybrid Sandbox Integration
 *
 * This example demonstrates how to integrate the HybridSandbox with
 * agentic-flow for autonomous AI agent workflows.
 *
 * The agent can:
 * - Generate code using local LLM (GaiaNet/LlamaEdge)
 * - Execute code securely in DockerSandbox
 * - Access files through MCP Gateway
 * - Search the web through MCP Gateway
 * - All with unified audit logging
 *
 * Usage:
 *   node src/examples/agentic-flow-hybrid.js
 */

import { createHybridSandbox } from '../sandbox/hybrid-sandbox.js';

// =============================================================================
// Agent Configuration
// =============================================================================

const AGENT_CONFIG = {
  // LLM Provider
  provider: 'local',
  baseURL: process.env.GAIANET_ENDPOINT || 'http://localhost:8080/v1',
  model: process.env.LLM_MODEL || 'Qwen2.5-Coder-32B-Instruct',

  // Agent settings
  maxIterations: 10,
  retryOnError: true,
  autoFix: true,

  // Sandbox settings
  sandbox: {
    memoryLimit: '2g',
    cpuLimit: '2',
    timeout: 300000,
    network: 'none',
    mode: 'hybrid'
  }
};

// =============================================================================
// Simple Agent Implementation (for demonstration)
// This would typically use agentic-flow, but we show the integration pattern
// =============================================================================

class SimpleAgent {
  constructor(config, sandbox) {
    this.config = config;
    this.sandbox = sandbox;
    this.conversationHistory = [];
    this.codeHistory = [];
  }

  /**
   * Process a user task
   */
  async run(task) {
    console.log('\n📋 Task:', task);
    console.log('─'.repeat(50));

    const startTime = Date.now();
    let iteration = 0;
    let lastError = null;

    while (iteration < this.config.maxIterations) {
      iteration++;
      console.log(`\n🔄 Iteration ${iteration}/${this.config.maxIterations}`);

      try {
        // Step 1: Generate code (simulated LLM call)
        const code = await this.generateCode(task, lastError);
        console.log('📝 Generated code:', code.substring(0, 100) + '...');

        // Step 2: Execute in sandbox
        const result = await this.executeCode(code);

        if (result.success) {
          console.log('✅ Execution successful!');
          console.log('Output:', result.stdout);

          return {
            success: true,
            code,
            output: result.stdout,
            iterations: iteration,
            duration: Date.now() - startTime
          };
        }

        // Step 3: Handle error (auto-fix if enabled)
        console.log('❌ Execution failed:', result.stderr);
        lastError = result.stderr;

        if (!this.config.autoFix) {
          break;
        }

      } catch (error) {
        console.log('❌ Error:', error.message);
        lastError = error.message;

        if (!this.config.retryOnError) {
          break;
        }
      }
    }

    return {
      success: false,
      error: lastError,
      iterations: iteration,
      duration: Date.now() - startTime
    };
  }

  /**
   * Generate code for the task
   * In production, this would call the LLM
   */
  async generateCode(task, previousError = null) {
    // For demonstration, we use predefined code examples
    // In production, this would be:
    // const response = await fetch(this.config.baseURL + '/chat/completions', {...})

    const codeExamples = {
      'fibonacci': `
// Fibonacci sequence generator
function fibonacci(n) {
  const sequence = [0, 1];
  for (let i = 2; i <= n; i++) {
    sequence.push(sequence[i-1] + sequence[i-2]);
  }
  return sequence;
}

console.log('Fibonacci sequence (first 15 numbers):');
console.log(fibonacci(15).join(', '));
      `,

      'sort': `
// Various sorting algorithms demonstration
const data = [64, 34, 25, 12, 22, 11, 90, 42, 15, 78];

function bubbleSort(arr) {
  const n = arr.length;
  const sorted = [...arr];
  for (let i = 0; i < n-1; i++) {
    for (let j = 0; j < n-i-1; j++) {
      if (sorted[j] > sorted[j+1]) {
        [sorted[j], sorted[j+1]] = [sorted[j+1], sorted[j]];
      }
    }
  }
  return sorted;
}

function quickSort(arr) {
  if (arr.length <= 1) return arr;
  const pivot = arr[Math.floor(arr.length / 2)];
  const left = arr.filter(x => x < pivot);
  const middle = arr.filter(x => x === pivot);
  const right = arr.filter(x => x > pivot);
  return [...quickSort(left), ...middle, ...quickSort(right)];
}

console.log('Original:', data.join(', '));
console.log('Bubble Sort:', bubbleSort(data).join(', '));
console.log('Quick Sort:', quickSort(data).join(', '));
      `,

      'api': `
// Simple API endpoint handler simulation
class APIHandler {
  constructor() {
    this.data = new Map();
  }

  get(id) {
    return this.data.get(id) || null;
  }

  post(data) {
    const id = Date.now().toString();
    this.data.set(id, { id, ...data, createdAt: new Date().toISOString() });
    return this.data.get(id);
  }

  put(id, data) {
    if (!this.data.has(id)) return null;
    this.data.set(id, { ...this.data.get(id), ...data, updatedAt: new Date().toISOString() });
    return this.data.get(id);
  }

  delete(id) {
    return this.data.delete(id);
  }

  list() {
    return Array.from(this.data.values());
  }
}

// Test the API handler
const api = new APIHandler();

// Create
const user1 = api.post({ name: 'Alice', email: 'alice@example.com' });
const user2 = api.post({ name: 'Bob', email: 'bob@example.com' });
console.log('Created:', user1, user2);

// Read
console.log('Get user1:', api.get(user1.id));

// Update
const updated = api.put(user1.id, { name: 'Alice Smith' });
console.log('Updated:', updated);

// List
console.log('All users:', api.list());

// Delete
api.delete(user2.id);
console.log('After delete:', api.list());
      `,

      'default': `
// Default code example
console.log('Hello from the Sovereign Agentic Stack!');
console.log('Task received:', ${JSON.stringify(task)});

const result = {
  status: 'completed',
  message: 'This is a demonstration of the hybrid sandbox.',
  timestamp: new Date().toISOString()
};

console.log(JSON.stringify(result, null, 2));
      `
    };

    // Select appropriate code based on task keywords
    const taskLower = task.toLowerCase();
    if (taskLower.includes('fibonacci')) return codeExamples.fibonacci;
    if (taskLower.includes('sort')) return codeExamples.sort;
    if (taskLower.includes('api') || taskLower.includes('endpoint')) return codeExamples.api;
    return codeExamples.default;
  }

  /**
   * Execute code in the hybrid sandbox
   */
  async executeCode(code) {
    return this.sandbox.executeJavaScript(code);
  }

  /**
   * Use a gateway tool (file access, web search, etc.)
   */
  async useTool(serverName, toolName, params) {
    return this.sandbox.callGatewayTool(serverName, toolName, params);
  }
}

// =============================================================================
// Integration with Agentic Flow Pattern
// =============================================================================

/**
 * Create an agentic-flow compatible configuration with hybrid sandbox
 */
function createAgenticFlowConfig(sandbox) {
  return {
    provider: 'custom',
    baseURL: AGENT_CONFIG.baseURL,
    model: AGENT_CONFIG.model,

    // Hook for code execution - routes through hybrid sandbox
    onCodeGenerated: async (code, language) => {
      console.log(`\n🔧 Executing ${language} code in hybrid sandbox...`);

      const result = await sandbox.executeCode(code, language);

      if (!result.success) {
        console.log('❌ Execution failed:', result.stderr);
        return { error: result.stderr };
      }

      console.log('✅ Execution succeeded');
      return { output: result.stdout };
    },

    // Hook for tool calls - routes through appropriate backend
    onToolCall: async (toolName, params) => {
      console.log(`\n🔧 Calling tool: ${toolName}`);

      const result = await sandbox.call(toolName, params);
      return result;
    },

    // Hook for file access - routes through gateway
    onFileAccess: async (operation, path, content) => {
      const status = sandbox.getStatus();

      if (status.gatewayAvailable) {
        // Use gateway for file operations
        switch (operation) {
          case 'read':
            return sandbox.callGatewayTool('filesystem', 'read_file', { path });
          case 'write':
            return sandbox.callGatewayTool('filesystem', 'write_file', { path, content });
          case 'list':
            return sandbox.callGatewayTool('filesystem', 'list_directory', { path });
        }
      }

      throw new Error('File access not available (gateway offline)');
    },

    // Hook for web search - routes through gateway
    onWebSearch: async (query) => {
      const status = sandbox.getStatus();

      if (status.gatewayAvailable) {
        return sandbox.callGatewayTool('duckduckgo', 'search', { query });
      }

      throw new Error('Web search not available (gateway offline)');
    }
  };
}

// =============================================================================
// Main Example
// =============================================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       Agentic Flow + Hybrid Sandbox Integration            ║');
  console.log('║       Sovereign Agentic Stack v3.0                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    // Initialize hybrid sandbox
    console.log('\n🚀 Initializing Hybrid Sandbox...');
    const sandbox = await createHybridSandbox(AGENT_CONFIG.sandbox);

    const status = sandbox.getStatus();
    console.log('✅ Sandbox initialized');
    console.log(`   Mode: ${status.mode}`);
    console.log(`   Gateway: ${status.gatewayAvailable ? 'Available' : 'Not available'}`);

    // Create agent with sandbox
    const agent = new SimpleAgent(AGENT_CONFIG, sandbox);

    // Run example tasks
    const tasks = [
      'Generate a fibonacci sequence',
      'Implement sorting algorithms',
      'Create a simple API handler'
    ];

    console.log('\n' + '═'.repeat(60));
    console.log('Running agent tasks...');
    console.log('═'.repeat(60));

    for (const task of tasks) {
      const result = await agent.run(task);

      console.log('\n📊 Task Result:');
      console.log(`   Success: ${result.success}`);
      console.log(`   Iterations: ${result.iterations}`);
      console.log(`   Duration: ${result.duration}ms`);

      if (!result.success) {
        console.log(`   Error: ${result.error}`);
      }
    }

    // Show agentic-flow integration pattern
    console.log('\n' + '═'.repeat(60));
    console.log('Agentic Flow Integration Pattern:');
    console.log('═'.repeat(60));

    const agenticConfig = createAgenticFlowConfig(sandbox);
    console.log('\nConfiguration for agentic-flow:');
    console.log(JSON.stringify({
      provider: agenticConfig.provider,
      baseURL: agenticConfig.baseURL,
      model: agenticConfig.model,
      hooks: [
        'onCodeGenerated',
        'onToolCall',
        'onFileAccess',
        'onWebSearch'
      ]
    }, null, 2));

    // Show audit log summary
    console.log('\n' + '═'.repeat(60));
    console.log('Audit Log Summary:');
    console.log('═'.repeat(60));

    const auditLog = sandbox.getAuditLog();
    console.log(`Total operations: ${auditLog.length}`);

    const successful = auditLog.filter(e => e.success).length;
    const failed = auditLog.filter(e => !e.success).length;
    console.log(`Successful: ${successful}, Failed: ${failed}`);

    const durations = auditLog.filter(e => e.duration).map(e => e.duration);
    if (durations.length > 0) {
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const totalDuration = durations.reduce((a, b) => a + b, 0);
      console.log(`Average duration: ${avgDuration.toFixed(2)}ms`);
      console.log(`Total time in sandbox: ${totalDuration}ms`);
    }

    console.log('\n✅ All examples completed successfully!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if executed directly
main().catch(console.error);

export { SimpleAgent, createAgenticFlowConfig, main };
