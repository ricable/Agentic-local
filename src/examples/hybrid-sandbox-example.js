/**
 * Hybrid Sandbox Integration Example
 *
 * Demonstrates how to use the HybridSandbox with agentic-flow for
 * secure code execution combined with MCP Gateway tools.
 *
 * Architecture:
 * - Code execution: Custom DockerSandbox (fine-grained control)
 * - File operations: MCP Gateway (centralized policy)
 * - Web search: MCP Gateway (rate limiting, audit)
 *
 * Usage:
 *   node src/examples/hybrid-sandbox-example.js
 *
 * Prerequisites:
 *   - Docker Desktop 4.50+ with MCP Toolkit enabled
 *   - npm install (dependencies installed)
 *   - Optional: GaiaNet node running for local inference
 */

import { createHybridSandbox } from '../sandbox/hybrid-sandbox.js';

// =============================================================================
// Configuration
// =============================================================================

const CONFIG = {
  // Inference endpoint (GaiaNet, LlamaEdge, or cloud fallback)
  llmEndpoint: process.env.GAIANET_ENDPOINT || 'http://localhost:8080/v1',
  llmModel: process.env.LLM_MODEL || 'Qwen2.5-Coder-32B-Instruct',

  // Sandbox configuration
  sandbox: {
    memoryLimit: process.env.SANDBOX_MEMORY_LIMIT || '2g',
    cpuLimit: process.env.SANDBOX_CPU_LIMIT || '2',
    timeout: parseInt(process.env.SANDBOX_TIMEOUT) || 300000,
    network: 'none'
  },

  // Gateway configuration
  gateway: {
    url: process.env.MCP_GATEWAY_URL || 'http://localhost:8811'
  }
};

// =============================================================================
// Example 1: Basic Code Execution (Local DockerSandbox)
// =============================================================================

async function exampleCodeExecution(sandbox) {
  console.log('\n' + '='.repeat(60));
  console.log('Example 1: Code Execution via Local DockerSandbox');
  console.log('='.repeat(60) + '\n');

  // JavaScript execution
  console.log('Executing JavaScript...');
  const jsResult = await sandbox.executeJavaScript(`
    const fibonacci = (n) => {
      if (n <= 1) return n;
      return fibonacci(n - 1) + fibonacci(n - 2);
    };

    console.log('Fibonacci sequence (first 10):');
    for (let i = 0; i < 10; i++) {
      console.log(\`fib(\${i}) = \${fibonacci(i)}\`);
    }
  `);

  console.log('JavaScript Result:', jsResult.success ? 'SUCCESS' : 'FAILED');
  if (jsResult.stdout) console.log('Output:', jsResult.stdout);

  // Python execution
  console.log('\nExecuting Python...');
  const pyResult = await sandbox.executePython(`
import json
import sys

def analyze_data(data):
    """Analyze a list of numbers."""
    if not data:
        return {"error": "No data provided"}

    return {
        "count": len(data),
        "sum": sum(data),
        "mean": sum(data) / len(data),
        "min": min(data),
        "max": max(data)
    }

# Sample data
numbers = [23, 45, 12, 67, 89, 34, 56, 78, 90, 11]
result = analyze_data(numbers)

print("Data Analysis Results:")
print(json.dumps(result, indent=2))
  `);

  console.log('Python Result:', pyResult.success ? 'SUCCESS' : 'FAILED');
  if (pyResult.stdout) console.log('Output:', pyResult.stdout);

  return { jsResult, pyResult };
}

// =============================================================================
// Example 2: Gateway Tools (When Available)
// =============================================================================

async function exampleGatewayTools(sandbox) {
  console.log('\n' + '='.repeat(60));
  console.log('Example 2: MCP Gateway Tools');
  console.log('='.repeat(60) + '\n');

  const status = sandbox.getStatus();
  console.log('Hybrid Sandbox Status:', status);

  if (!status.gatewayAvailable) {
    console.log('\nMCP Gateway not available. Skipping gateway tool examples.');
    console.log('To enable gateway tools:');
    console.log('  1. Install Docker Desktop 4.50+');
    console.log('  2. Enable MCP Toolkit in Docker Desktop settings');
    console.log('  3. Run: docker mcp gateway run');
    return null;
  }

  // List available tools
  console.log('\nListing available tools...');
  const tools = await sandbox.listTools();
  console.log('Local tools:', tools.local.map(t => t.name));
  console.log('Gateway tools:', tools.gateway.map(t => t.name));

  // Example: File system access through gateway
  console.log('\nTrying filesystem access via gateway...');
  try {
    const files = await sandbox.callGatewayTool('filesystem', 'list_directory', {
      path: '/workspace/src'
    });
    console.log('Files:', files);
  } catch (error) {
    console.log('Filesystem access not available:', error.message);
  }

  // Example: Web search through gateway
  console.log('\nTrying web search via gateway...');
  try {
    const searchResults = await sandbox.callGatewayTool('duckduckgo', 'search', {
      query: 'Docker MCP Gateway documentation'
    });
    console.log('Search results:', searchResults);
  } catch (error) {
    console.log('Web search not available:', error.message);
  }

  return tools;
}

// =============================================================================
// Example 3: Agent-Generated Code Workflow
// =============================================================================

async function exampleAgentWorkflow(sandbox) {
  console.log('\n' + '='.repeat(60));
  console.log('Example 3: Agent-Generated Code Workflow');
  console.log('='.repeat(60) + '\n');

  // Simulate agent generating code
  const agentGeneratedCode = `
/**
 * Agent-generated: REST API endpoint handler
 * Task: Create a function to validate and process user data
 */

function validateUserData(userData) {
  const errors = [];

  // Validate required fields
  if (!userData.name || userData.name.trim().length === 0) {
    errors.push('Name is required');
  }

  if (!userData.email || !userData.email.includes('@')) {
    errors.push('Valid email is required');
  }

  if (userData.age !== undefined) {
    const age = parseInt(userData.age);
    if (isNaN(age) || age < 0 || age > 150) {
      errors.push('Age must be a valid number between 0 and 150');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function processUserData(userData) {
  const validation = validateUserData(userData);

  if (!validation.valid) {
    return {
      success: false,
      message: 'Validation failed',
      errors: validation.errors
    };
  }

  // Process valid data
  return {
    success: true,
    message: 'User data processed successfully',
    data: {
      name: userData.name.trim(),
      email: userData.email.toLowerCase(),
      age: userData.age ? parseInt(userData.age) : null,
      createdAt: new Date().toISOString()
    }
  };
}

// Test cases
const testCases = [
  { name: 'John Doe', email: 'john@example.com', age: 30 },
  { name: '', email: 'invalid', age: -5 },
  { name: 'Jane Smith', email: 'jane@test.org' }
];

console.log('Running test cases...');
testCases.forEach((testCase, i) => {
  console.log(\`\\nTest \${i + 1}:\`, JSON.stringify(testCase));
  const result = processUserData(testCase);
  console.log('Result:', JSON.stringify(result, null, 2));
});
  `;

  console.log('Executing agent-generated code in secure sandbox...');
  console.log('Code length:', agentGeneratedCode.length, 'characters');

  const result = await sandbox.executeJavaScript(agentGeneratedCode);

  console.log('\nExecution Result:', result.success ? 'SUCCESS' : 'FAILED');
  if (result.stdout) {
    console.log('\nOutput:');
    console.log(result.stdout);
  }
  if (result.stderr) {
    console.log('\nErrors:');
    console.log(result.stderr);
  }

  return result;
}

// =============================================================================
// Example 4: Test Execution with Assertions
// =============================================================================

async function exampleTestExecution(sandbox) {
  console.log('\n' + '='.repeat(60));
  console.log('Example 4: Test Execution with Assertions');
  console.log('='.repeat(60) + '\n');

  const sourceCode = `
// Simple math utilities
function add(a, b) { return a + b; }
function subtract(a, b) { return a - b; }
function multiply(a, b) { return a * b; }
function divide(a, b) {
  if (b === 0) throw new Error('Division by zero');
  return a / b;
}

module.exports = { add, subtract, multiply, divide };
  `;

  const testCode = `
// Test suite
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log('✓', name);
    passed++;
  } catch (error) {
    console.log('✗', name, '-', error.message);
    failed++;
  }
}

function assertEqual(actual, expected) {
  if (actual !== expected) {
    throw new Error(\`Expected \${expected} but got \${actual}\`);
  }
}

// Run tests
test('add: 2 + 3 = 5', () => assertEqual(add(2, 3), 5));
test('add: -1 + 1 = 0', () => assertEqual(add(-1, 1), 0));
test('subtract: 5 - 3 = 2', () => assertEqual(subtract(5, 3), 2));
test('multiply: 4 * 3 = 12', () => assertEqual(multiply(4, 3), 12));
test('divide: 10 / 2 = 5', () => assertEqual(divide(10, 2), 5));
test('divide by zero throws', () => {
  try {
    divide(10, 0);
    throw new Error('Should have thrown');
  } catch (e) {
    if (e.message !== 'Division by zero') throw e;
  }
});

console.log(\`\\nResults: \${passed} passed, \${failed} failed\`);
  `;

  console.log('Running tests in sandbox...');

  const result = await sandbox.call('run_tests', {
    code: sourceCode,
    testCode: testCode,
    language: 'javascript'
  });

  console.log('Test Result:', result.success ? 'SUCCESS' : 'FAILED');
  if (result.stdout) console.log('\nOutput:\n' + result.stdout);

  return result;
}

// =============================================================================
// Example 5: Audit Log Analysis
// =============================================================================

async function exampleAuditLog(sandbox) {
  console.log('\n' + '='.repeat(60));
  console.log('Example 5: Audit Log Analysis');
  console.log('='.repeat(60) + '\n');

  const auditLog = sandbox.getAuditLog();
  console.log('Total audit entries:', auditLog.length);

  // Analyze by success/failure
  const successful = auditLog.filter(e => e.success).length;
  const failed = auditLog.filter(e => !e.success).length;
  console.log(`Successful: ${successful}, Failed: ${failed}`);

  // Analyze by tool
  const byTool = {};
  auditLog.forEach(entry => {
    byTool[entry.tool] = (byTool[entry.tool] || 0) + 1;
  });
  console.log('Calls by tool:', byTool);

  // Average duration
  const durations = auditLog.filter(e => e.duration).map(e => e.duration);
  if (durations.length > 0) {
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    console.log(`Average duration: ${avgDuration.toFixed(2)}ms`);
  }

  // Recent entries
  console.log('\nRecent audit entries:');
  auditLog.slice(-5).forEach(entry => {
    console.log(`  ${new Date(entry.timestamp).toISOString()} | ${entry.tool} | ${entry.success ? 'OK' : 'FAIL'} | ${entry.duration}ms`);
  });

  return auditLog;
}

// =============================================================================
// Main Entry Point
// =============================================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       Hybrid Sandbox Integration Example                   ║');
  console.log('║       Sovereign Agentic Stack v3.0                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    // Initialize hybrid sandbox
    console.log('\nInitializing Hybrid Sandbox...');
    const sandbox = await createHybridSandbox(CONFIG.sandbox);

    const status = sandbox.getStatus();
    console.log('Initialization complete:');
    console.log(`  Mode: ${status.mode}`);
    console.log(`  Gateway Available: ${status.gatewayAvailable}`);

    // Run examples
    await exampleCodeExecution(sandbox);
    await exampleGatewayTools(sandbox);
    await exampleAgentWorkflow(sandbox);
    await exampleTestExecution(sandbox);
    await exampleAuditLog(sandbox);

    console.log('\n' + '='.repeat(60));
    console.log('All examples completed successfully!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\nError:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if executed directly
main().catch(console.error);

export { main, CONFIG };
