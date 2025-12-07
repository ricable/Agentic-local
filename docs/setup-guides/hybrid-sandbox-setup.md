# Hybrid Sandbox Setup Guide

## Overview

The Hybrid Sandbox combines the best of both worlds:

- **Custom DockerSandbox**: Fine-grained control for code execution
- **MCP Gateway**: Centralized management for other MCP tools

This approach gives you optimal security and control for agent code execution while leveraging Docker's MCP Gateway for standardized tool access.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          AI Agent (agentic-flow)                        │
│                                                                         │
│  Task: "Analyze this CSV and create a visualization"                    │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           HybridSandbox                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        Tool Router                               │   │
│  │  "What kind of tool is this?"                                    │   │
│  └──────────────┬─────────────────────────────────┬────────────────┘   │
│                 │                                 │                     │
│    Code Execution?                    File/Search/Other?                │
│                 │                                 │                     │
│                 ▼                                 ▼                     │
│  ┌─────────────────────────┐      ┌────────────────────────────────┐   │
│  │    DockerSandbox        │      │       MCP Gateway               │   │
│  │                         │      │                                 │   │
│  │  • Custom container     │      │  • Centralized policy          │   │
│  │  • Fine-grained limits  │      │  • Audit logging               │   │
│  │  • Network isolation    │      │  • Credential management       │   │
│  │  • Ephemeral execution  │      │  • 200+ available servers      │   │
│  └─────────────────────────┘      └────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

## Prerequisites

### Required
- **Docker Desktop 4.50+** with MCP Toolkit enabled
- **Node.js 18+**
- **macOS** (Apple Silicon recommended) or **Linux**

### Optional
- **GaiaNet Node** for local LLM inference
- **LlamaEdge** for standalone local inference

## Installation

### Step 1: Enable Docker MCP Toolkit

```bash
# Open Docker Desktop
# Settings → Features in Development → Enable MCP Toolkit

# Verify installation
docker mcp --help
```

### Step 2: Install Dependencies

```bash
cd Agentic-local
npm install
```

### Step 3: Configure Environment

```bash
cp .env.example .env

# Edit .env to set:
# HYBRID_SANDBOX_MODE=hybrid
# MCP_GATEWAY_URL=http://localhost:8811
# SANDBOX_MEMORY_LIMIT=2g
# SANDBOX_CPU_LIMIT=2
```

## Quick Start

### Basic Usage

```javascript
import { createHybridSandbox } from './src/sandbox/hybrid-sandbox.js';

// Initialize the hybrid sandbox
const sandbox = await createHybridSandbox({
  memoryLimit: '2g',
  cpuLimit: '2',
  timeout: 300000,
  network: 'none',
  mode: 'hybrid'  // 'hybrid', 'local', or 'gateway'
});

// Execute code (uses DockerSandbox)
const result = await sandbox.executeJavaScript(`
  console.log('Hello from secure sandbox!');
`);

// Access files (uses MCP Gateway if available)
if (sandbox.getStatus().gatewayAvailable) {
  const files = await sandbox.callGatewayTool('filesystem', 'list_directory', {
    path: '/workspace/src'
  });
}
```

### Integration with Agentic Flow

```javascript
import { AgenticFlow } from 'agentic-flow';
import { createHybridSandbox } from './src/sandbox/hybrid-sandbox.js';

const sandbox = await createHybridSandbox({ mode: 'hybrid' });

const agent = new AgenticFlow({
  provider: 'custom',
  baseURL: process.env.GAIANET_ENDPOINT || 'http://localhost:8080/v1',
  model: 'Qwen2.5-Coder-32B-Instruct',

  // Code execution routed through DockerSandbox
  onCodeGenerated: async (code, language) => {
    const result = await sandbox.executeCode(code, language);
    return result.success ? { output: result.stdout } : { error: result.stderr };
  },

  // Tools routed through appropriate backend
  onToolCall: async (tool, params) => {
    return sandbox.call(tool, params);
  }
});

await agent.run('Create a data processing pipeline');
```

## Configuration

### Hybrid Sandbox Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mode` | string | `'hybrid'` | `'hybrid'`, `'local'`, or `'gateway'` |
| `memoryLimit` | string | `'2g'` | Container memory limit |
| `cpuLimit` | string | `'2'` | Container CPU limit |
| `timeout` | number | `300000` | Execution timeout (ms) |
| `network` | string | `'none'` | Container network mode |
| `gatewayUrl` | string | `'http://localhost:8811'` | MCP Gateway URL |

### MCP Configuration File

Use the hybrid configuration file:

```bash
# Copy hybrid config
cp mcp-config-hybrid.json mcp-config.json
```

Or merge with existing:

```json
{
  "mode": "hybrid",
  "mcpServers": {
    "docker-sandbox": {
      "env": {
        "HYBRID_SANDBOX_MODE": "hybrid",
        "MCP_GATEWAY_URL": "http://localhost:8811"
      }
    }
  },
  "gateway": {
    "url": "http://localhost:8811",
    "policy": "./config/mcp-gateway/sovereign-stack-policy.yaml"
  }
}
```

### Gateway Security Policy

The policy file (`config/mcp-gateway/sovereign-stack-policy.yaml`) defines security boundaries:

```yaml
# Key sections:
defaults:
  network: none
  memory: 1g
  read_only: true
  cap_drop: ALL

servers:
  filesystem:
    volumes:
      - "${PWD}/src:/workspace/src:ro"
    blocked_paths:
      - ".env"
      - "**/*.key"

  duckduckgo:
    network: bridge
    allowed_domains:
      - duckduckgo.com
    rate_limit:
      requests_per_minute: 10

audit:
  enabled: true
  log_path: ./logs/mcp-gateway-audit.log
```

## Operating Modes

### Mode: `hybrid` (Recommended)

Uses both DockerSandbox and MCP Gateway:

```javascript
const sandbox = await createHybridSandbox({ mode: 'hybrid' });

// Code execution → DockerSandbox
await sandbox.executeJavaScript(code);

// File access → MCP Gateway
await sandbox.callGatewayTool('filesystem', 'read_file', { path });

// Falls back to local-only if gateway unavailable
```

### Mode: `local`

Uses only DockerSandbox:

```javascript
const sandbox = await createHybridSandbox({ mode: 'local' });

// All operations through DockerSandbox
await sandbox.executeCode(code, 'javascript');

// Gateway tools not available
// sandbox.callGatewayTool() will throw error
```

### Mode: `gateway`

Uses only MCP Gateway (requires gateway to be running):

```javascript
const sandbox = await createHybridSandbox({ mode: 'gateway' });

// Will throw if gateway not available
// All operations through MCP Gateway
```

## Starting the Gateway

### Option 1: Auto-Start (Docker Desktop)

If MCP Toolkit is enabled in Docker Desktop, the gateway starts automatically.

### Option 2: Manual Start

```bash
# Enable servers you need
docker mcp server enable filesystem
docker mcp server enable duckduckgo

# Start gateway with policy
docker mcp gateway run --policy ./config/mcp-gateway/sovereign-stack-policy.yaml
```

### Option 3: Background Start

```bash
# Start in background
docker mcp gateway run --detach

# Check status
docker mcp gateway status

# View logs
docker mcp gateway logs
```

## Tool Routing

The HybridSandbox automatically routes tools to the appropriate backend:

### Local Tools (DockerSandbox)

- `execute_code`
- `execute_javascript`
- `execute_python`
- `execute_typescript`
- `run_tests`
- `compile_code`

### Gateway Tools (MCP Gateway)

- `filesystem/*` - File operations
- `duckduckgo/*` - Web search
- `fetch/*` - HTTP requests
- `github/*` - GitHub API
- `memory/*` - Semantic memory
- `sequential-thinking/*` - Structured reasoning

### Custom Routing

```javascript
const sandbox = await createHybridSandbox({
  routing: {
    local: [
      'execute_code',
      'my_custom_tool'  // Route custom tool to DockerSandbox
    ],
    gateway: [
      'filesystem',
      'duckduckgo',
      'my_gateway_tool'  // Route to MCP Gateway
    ]
  }
});
```

## Audit Logging

The HybridSandbox maintains a unified audit log:

```javascript
// Get audit log
const log = sandbox.getAuditLog();

// Filter options
const recentErrors = sandbox.getAuditLog({
  since: Date.now() - 3600000,  // Last hour
  success: false
});

// Each entry contains:
// {
//   id: 'audit-xxx',
//   timestamp: 1699999999999,
//   tool: 'execute_code',
//   params: { language: 'javascript', codeLength: 150 },
//   success: true,
//   duration: 1234
// }
```

## Examples

### Run Example Scripts

```bash
# Basic hybrid sandbox demo
node src/examples/hybrid-sandbox-example.js

# Agentic flow integration demo
node src/examples/agentic-flow-hybrid.js
```

### Example: Code Review Agent

```javascript
import { createHybridSandbox } from './src/sandbox/hybrid-sandbox.js';

async function codeReviewAgent(codeToReview) {
  const sandbox = await createHybridSandbox({ mode: 'hybrid' });

  // 1. Read the code (via gateway)
  const codeContent = await sandbox.callGatewayTool('filesystem', 'read_file', {
    path: codeToReview
  });

  // 2. Run static analysis (via DockerSandbox)
  const analysisResult = await sandbox.executePython(`
import ast
import json

code = '''${codeContent}'''

try:
    tree = ast.parse(code)
    functions = [node.name for node in ast.walk(tree) if isinstance(node, ast.FunctionDef)]
    classes = [node.name for node in ast.walk(tree) if isinstance(node, ast.ClassDef)]

    print(json.dumps({
        'functions': functions,
        'classes': classes,
        'lines': len(code.split('\\n'))
    }))
except SyntaxError as e:
    print(json.dumps({'error': str(e)}))
  `);

  // 3. Search for best practices (via gateway)
  if (sandbox.getStatus().gatewayAvailable) {
    const bestPractices = await sandbox.callGatewayTool('duckduckgo', 'search', {
      query: 'python code review best practices'
    });
  }

  return analysisResult;
}
```

## Troubleshooting

### Gateway Not Available

```
Error: MCP Gateway not available
```

**Solutions:**
1. Verify Docker Desktop is running
2. Enable MCP Toolkit in Docker Desktop settings
3. Start gateway manually: `docker mcp gateway run`
4. Use `mode: 'local'` to run without gateway

### Docker Not Available

```
Error: Docker is not available
```

**Solutions:**
1. Install Docker Desktop
2. Start Docker Desktop
3. Verify: `docker --version`

### Permission Denied

```
Error: Permission denied accessing /workspace
```

**Solutions:**
1. Check volume mounts in policy file
2. Ensure paths are within allowed directories
3. Check blocked_paths configuration

### Timeout Errors

```
Error: Execution timeout after 300000ms
```

**Solutions:**
1. Increase timeout: `{ timeout: 600000 }`
2. Optimize code to run faster
3. Check for infinite loops

## Security Best Practices

1. **Use `network: none`** for code execution unless network access is required
2. **Enable audit logging** to track all operations
3. **Define specific allowed_domains** for network-enabled servers
4. **Block sensitive paths** in filesystem access
5. **Use read-only volumes** where possible
6. **Set appropriate resource limits** to prevent DoS
7. **Rotate credentials** regularly for gateway servers

## Performance Tips

1. **Pre-warm Docker images**: `docker pull node:20-alpine python:3.11-alpine`
2. **Use local mode** when gateway isn't needed for faster startup
3. **Set appropriate timeouts** - don't use overly long timeouts
4. **Enable caching** in gateway policy for repeated operations
5. **Use appropriate resource limits** - don't over-provision

## Further Reading

- [MCP Gateway Analysis](../technical-analysis/mcp-gateway-coding-agent-safety.md)
- [Sandbox Security Guide](./sandbox-security.md)
- [Sovereign Agentic Architectures](../technical-analysis/sovereign-agentic-architectures.md)
- [Docker MCP Documentation](https://docs.docker.com/ai/mcp-gateway/)

---

*Last Updated: December 2025*
