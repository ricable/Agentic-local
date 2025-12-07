/**
 * Hybrid Sandbox Manager
 *
 * Combines Docker MCP Gateway for standard MCP tools with custom DockerSandbox
 * for specialized code execution needs.
 *
 * Architecture:
 * - Code Execution: Custom DockerSandbox (fine-grained control, optimized for agents)
 * - File Operations: MCP Gateway filesystem server (centralized policy)
 * - Web Search: MCP Gateway duckduckgo server (rate limiting, audit)
 * - Other Tools: MCP Gateway catalog servers (200+ available)
 *
 * Benefits:
 * - Best of both worlds: custom control + centralized management
 * - Unified audit logging across all tool calls
 * - Flexible security policies per tool category
 * - Fallback to local-only mode if gateway unavailable
 */

import { EventEmitter } from 'events';
import { DockerSandbox } from './docker-sandbox.js';
import MCPGatewayClient, { isMCPGatewayInstalled } from '../gateway/mcp-gateway-client.js';

/**
 * Tool routing configuration
 * Maps tool categories to their execution backend
 */
const DEFAULT_ROUTING = {
  // Tools handled by custom DockerSandbox
  local: [
    'execute_code',
    'execute_javascript',
    'execute_python',
    'execute_typescript',
    'run_tests',
    'compile_code'
  ],

  // Tools handled by MCP Gateway
  gateway: [
    'filesystem',
    'duckduckgo',
    'github',
    'fetch',
    'memory',
    'postgres',
    'sqlite',
    'brave-search',
    'puppeteer',
    'sequential-thinking'
  ]
};

export class HybridSandbox extends EventEmitter {
  constructor(options = {}) {
    super();

    // Custom sandbox for code execution
    this.dockerSandbox = new DockerSandbox({
      memoryLimit: options.memoryLimit || '2g',
      cpuLimit: options.cpuLimit || '2',
      timeout: options.timeout || 300000,
      network: options.network || 'none',
      volumesDir: options.volumesDir
    });

    // MCP Gateway client for other tools
    this.gatewayClient = new MCPGatewayClient({
      gatewayUrl: options.gatewayUrl || 'http://localhost:8811',
      timeout: options.gatewayTimeout || 30000,
      retries: options.gatewayRetries || 3
    });

    // Tool routing configuration
    this.routing = { ...DEFAULT_ROUTING, ...options.routing };

    // Mode: 'hybrid' (both), 'local' (sandbox only), 'gateway' (gateway only)
    this.mode = options.mode || 'hybrid';

    // Gateway availability state
    this.gatewayAvailable = false;

    // Audit log for all operations
    this.auditLog = [];

    // Setup event forwarding
    this._setupEventForwarding();
  }

  /**
   * Initialize the hybrid sandbox
   * Checks gateway availability and sets up servers
   */
  async initialize() {
    // Check Docker availability
    const dockerAvailable = await DockerSandbox.isDockerAvailable();
    if (!dockerAvailable) {
      throw new Error('Docker is not available. Please install Docker Desktop.');
    }

    // Check MCP Gateway availability
    if (this.mode !== 'local') {
      const gatewayInstalled = await isMCPGatewayInstalled();

      if (gatewayInstalled) {
        try {
          this.gatewayAvailable = await this.gatewayClient.isAvailable();
        } catch (error) {
          console.warn('MCP Gateway not responding, falling back to local mode');
          this.gatewayAvailable = false;
        }
      } else {
        console.warn('MCP Gateway not installed, using local mode only');
        this.gatewayAvailable = false;
      }
    }

    // Adjust mode based on availability
    if (this.mode === 'gateway' && !this.gatewayAvailable) {
      throw new Error('Gateway mode requested but MCP Gateway is not available');
    }

    if (this.mode === 'hybrid' && !this.gatewayAvailable) {
      console.log('Running in local-only mode (gateway unavailable)');
      this.mode = 'local';
    }

    this.emit('initialized', {
      mode: this.mode,
      gatewayAvailable: this.gatewayAvailable,
      dockerAvailable
    });

    return {
      mode: this.mode,
      gatewayAvailable: this.gatewayAvailable
    };
  }

  /**
   * Execute code in the custom DockerSandbox
   * @param {string} code - Code to execute
   * @param {string} language - Programming language
   * @param {object} options - Execution options
   * @returns {Promise<object>}
   */
  async executeCode(code, language = 'javascript', options = {}) {
    const auditEntry = this._createAuditEntry('execute_code', { language, codeLength: code.length });

    try {
      const result = await this.dockerSandbox.execute(code, language, options);

      auditEntry.success = result.success;
      auditEntry.duration = Date.now() - auditEntry.timestamp;
      this.auditLog.push(auditEntry);

      this.emit('codeExecuted', { language, success: result.success, sessionId: result.sessionId });

      return result;
    } catch (error) {
      auditEntry.success = false;
      auditEntry.error = error.message;
      auditEntry.duration = Date.now() - auditEntry.timestamp;
      this.auditLog.push(auditEntry);

      throw error;
    }
  }

  /**
   * Execute Python code
   * @param {string} code - Python code
   * @returns {Promise<object>}
   */
  async executePython(code) {
    return this.executeCode(code, 'python');
  }

  /**
   * Execute JavaScript code
   * @param {string} code - JavaScript code
   * @returns {Promise<object>}
   */
  async executeJavaScript(code) {
    return this.executeCode(code, 'javascript');
  }

  /**
   * Execute TypeScript code
   * @param {string} code - TypeScript code
   * @returns {Promise<object>}
   */
  async executeTypeScript(code) {
    return this.executeCode(code, 'typescript');
  }

  /**
   * Call an MCP tool through the gateway
   * @param {string} serverName - Server name (e.g., 'filesystem', 'duckduckgo')
   * @param {string} toolName - Tool name
   * @param {object} params - Tool parameters
   * @returns {Promise<object>}
   */
  async callGatewayTool(serverName, toolName, params = {}) {
    if (!this.gatewayAvailable) {
      throw new Error(`MCP Gateway not available. Cannot call ${serverName}/${toolName}`);
    }

    const auditEntry = this._createAuditEntry(`${serverName}/${toolName}`, params);

    try {
      const result = await this.gatewayClient.callTool(serverName, toolName, params);

      auditEntry.success = true;
      auditEntry.duration = Date.now() - auditEntry.timestamp;
      this.auditLog.push(auditEntry);

      return result;
    } catch (error) {
      auditEntry.success = false;
      auditEntry.error = error.message;
      auditEntry.duration = Date.now() - auditEntry.timestamp;
      this.auditLog.push(auditEntry);

      throw error;
    }
  }

  /**
   * Unified tool call that routes to appropriate backend
   * @param {string} tool - Tool name (may include server prefix)
   * @param {object} params - Tool parameters
   * @returns {Promise<object>}
   */
  async call(tool, params = {}) {
    // Check if this is a code execution tool
    if (this.routing.local.includes(tool)) {
      return this._handleLocalTool(tool, params);
    }

    // Check if this should go through gateway
    const serverName = this._getServerForTool(tool);
    if (serverName && this.gatewayAvailable) {
      return this.callGatewayTool(serverName, tool, params);
    }

    // Fallback to local handling
    return this._handleLocalTool(tool, params);
  }

  /**
   * Handle tools that run locally
   * @private
   */
  async _handleLocalTool(tool, params) {
    switch (tool) {
      case 'execute_code':
        return this.executeCode(params.code, params.language, params);

      case 'execute_javascript':
        return this.executeJavaScript(params.code);

      case 'execute_python':
        return this.executePython(params.code);

      case 'execute_typescript':
        return this.executeTypeScript(params.code);

      case 'run_tests':
        return this._runTests(params);

      case 'compile_code':
        return this._compileCode(params);

      default:
        throw new Error(`Unknown local tool: ${tool}`);
    }
  }

  /**
   * Run tests in sandbox
   * @private
   */
  async _runTests(params) {
    const { code, testCode, language = 'javascript' } = params;

    // Combine code and test code
    const fullCode = `
${code}

// Test code
${testCode}
`;

    return this.executeCode(fullCode, language);
  }

  /**
   * Compile code (for TypeScript, etc.)
   * @private
   */
  async _compileCode(params) {
    const { code, language } = params;

    // For TypeScript, just run with tsx which handles compilation
    if (language === 'typescript') {
      return this.executeTypeScript(code);
    }

    // For other languages, just execute directly
    return this.executeCode(code, language);
  }

  /**
   * Get the server name for a tool
   * @private
   */
  _getServerForTool(tool) {
    // Direct server mappings
    const serverMappings = {
      'read_file': 'filesystem',
      'write_file': 'filesystem',
      'list_directory': 'filesystem',
      'search': 'duckduckgo',
      'web_search': 'duckduckgo',
      'fetch_url': 'fetch',
      'create_issue': 'github',
      'list_repos': 'github',
      'navigate': 'puppeteer',
      'screenshot': 'puppeteer',
      'query': 'postgres',
      'execute_sql': 'sqlite'
    };

    if (serverMappings[tool]) {
      return serverMappings[tool];
    }

    // Check if tool name contains server prefix (e.g., 'filesystem/read_file')
    if (tool.includes('/')) {
      return tool.split('/')[0];
    }

    // Check routing configuration
    for (const server of this.routing.gateway) {
      if (tool.startsWith(server)) {
        return server;
      }
    }

    return null;
  }

  /**
   * Enable a gateway server
   * @param {string} serverName - Server name
   * @param {object} config - Server configuration
   */
  async enableGatewayServer(serverName, config = {}) {
    if (!this.gatewayAvailable) {
      throw new Error('MCP Gateway not available');
    }

    return this.gatewayClient.enableServer(serverName, config);
  }

  /**
   * List available tools from both backends
   * @returns {Promise<object>}
   */
  async listTools() {
    const tools = {
      local: [
        {
          name: 'execute_code',
          description: 'Execute code in secure Docker sandbox',
          parameters: {
            code: { type: 'string', required: true },
            language: { type: 'string', enum: ['javascript', 'python', 'typescript'] }
          }
        },
        {
          name: 'execute_javascript',
          description: 'Execute JavaScript code',
          parameters: { code: { type: 'string', required: true } }
        },
        {
          name: 'execute_python',
          description: 'Execute Python code',
          parameters: { code: { type: 'string', required: true } }
        },
        {
          name: 'execute_typescript',
          description: 'Execute TypeScript code',
          parameters: { code: { type: 'string', required: true } }
        },
        {
          name: 'run_tests',
          description: 'Run tests in sandbox',
          parameters: {
            code: { type: 'string', required: true },
            testCode: { type: 'string', required: true },
            language: { type: 'string' }
          }
        }
      ],
      gateway: []
    };

    if (this.gatewayAvailable) {
      try {
        const gatewayTools = await this.gatewayClient.listTools();
        tools.gateway = gatewayTools.tools || [];
      } catch (error) {
        console.warn('Failed to list gateway tools:', error.message);
      }
    }

    return tools;
  }

  /**
   * Get audit log
   * @param {object} options - Filter options
   * @returns {Array}
   */
  getAuditLog(options = {}) {
    let logs = [...this.auditLog];

    if (options.since) {
      const since = new Date(options.since).getTime();
      logs = logs.filter(l => l.timestamp >= since);
    }

    if (options.tool) {
      logs = logs.filter(l => l.tool === options.tool || l.tool.includes(options.tool));
    }

    if (options.success !== undefined) {
      logs = logs.filter(l => l.success === options.success);
    }

    return logs;
  }

  /**
   * Clear audit log
   */
  clearAuditLog() {
    this.auditLog = [];
  }

  /**
   * Get current mode and status
   * @returns {object}
   */
  getStatus() {
    return {
      mode: this.mode,
      gatewayAvailable: this.gatewayAvailable,
      gatewayUrl: this.gatewayClient.gatewayUrl,
      auditLogSize: this.auditLog.length,
      enabledServers: Array.from(this.gatewayClient.enabledServers)
    };
  }

  /**
   * Create an audit entry
   * @private
   */
  _createAuditEntry(tool, params) {
    return {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      tool,
      params: this._sanitizeParams(params),
      success: null,
      error: null,
      duration: null
    };
  }

  /**
   * Sanitize params for audit log (remove sensitive data)
   * @private
   */
  _sanitizeParams(params) {
    const sanitized = { ...params };

    // Don't log full code in audit
    if (sanitized.code && sanitized.code.length > 100) {
      sanitized.code = `${sanitized.code.substring(0, 100)}... (${sanitized.code.length} chars)`;
    }

    // Remove sensitive fields
    delete sanitized.apiKey;
    delete sanitized.token;
    delete sanitized.password;
    delete sanitized.secret;

    return sanitized;
  }

  /**
   * Setup event forwarding from child components
   * @private
   */
  _setupEventForwarding() {
    // Forward gateway events
    this.gatewayClient.on('serverEnabled', (data) => {
      this.emit('gatewayServerEnabled', data);
    });

    this.gatewayClient.on('serverDisabled', (data) => {
      this.emit('gatewayServerDisabled', data);
    });

    this.gatewayClient.on('toolCallStart', (data) => {
      this.emit('toolCallStart', { backend: 'gateway', ...data });
    });

    this.gatewayClient.on('toolCallEnd', (data) => {
      this.emit('toolCallEnd', { backend: 'gateway', ...data });
    });
  }
}

/**
 * Create a pre-configured hybrid sandbox for agentic workflows
 * @param {object} options - Configuration options
 * @returns {Promise<HybridSandbox>}
 */
export async function createHybridSandbox(options = {}) {
  const sandbox = new HybridSandbox({
    // Code execution settings
    memoryLimit: options.memoryLimit || process.env.SANDBOX_MEMORY_LIMIT || '2g',
    cpuLimit: options.cpuLimit || process.env.SANDBOX_CPU_LIMIT || '2',
    timeout: options.timeout || parseInt(process.env.SANDBOX_TIMEOUT) || 300000,
    network: options.network || process.env.SANDBOX_NETWORK || 'none',

    // Gateway settings
    gatewayUrl: options.gatewayUrl || process.env.MCP_GATEWAY_URL || 'http://localhost:8811',
    gatewayTimeout: options.gatewayTimeout || 30000,

    // Mode
    mode: options.mode || process.env.HYBRID_SANDBOX_MODE || 'hybrid',

    // Custom routing
    routing: options.routing
  });

  await sandbox.initialize();

  return sandbox;
}

export default HybridSandbox;
