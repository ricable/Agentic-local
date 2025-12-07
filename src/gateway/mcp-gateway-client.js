/**
 * MCP Gateway Client
 * Client for communicating with Docker's MCP Gateway
 *
 * This client provides a JavaScript interface to Docker's MCP Gateway,
 * enabling centralized management of MCP servers with built-in security policies.
 */

import { EventEmitter } from 'events';

export class MCPGatewayClient extends EventEmitter {
  constructor(options = {}) {
    super();

    this.gatewayUrl = options.gatewayUrl || 'http://localhost:8811';
    this.timeout = options.timeout || 30000;
    this.retries = options.retries || 3;
    this.retryDelay = options.retryDelay || 1000;

    // Track enabled servers
    this.enabledServers = new Set();

    // Connection state
    this.connected = false;
    this.lastHealthCheck = null;
  }

  /**
   * Check if MCP Gateway is available
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    try {
      const response = await this._fetch('/health', { method: 'GET' });
      this.connected = response.status === 'healthy';
      this.lastHealthCheck = new Date();
      return this.connected;
    } catch (error) {
      this.connected = false;
      return false;
    }
  }

  /**
   * Get gateway information and capabilities
   * @returns {Promise<object>}
   */
  async getInfo() {
    return this._fetch('/info', { method: 'GET' });
  }

  /**
   * List all available MCP servers in the catalog
   * @returns {Promise<Array>}
   */
  async listServers() {
    return this._fetch('/servers', { method: 'GET' });
  }

  /**
   * Enable an MCP server
   * @param {string} serverName - Name of the server (e.g., 'duckduckgo', 'filesystem')
   * @param {object} config - Server-specific configuration
   * @returns {Promise<object>}
   */
  async enableServer(serverName, config = {}) {
    const result = await this._fetch(`/servers/${serverName}/enable`, {
      method: 'POST',
      body: JSON.stringify(config)
    });

    if (result.success) {
      this.enabledServers.add(serverName);
      this.emit('serverEnabled', { server: serverName, config });
    }

    return result;
  }

  /**
   * Disable an MCP server
   * @param {string} serverName - Name of the server
   * @returns {Promise<object>}
   */
  async disableServer(serverName) {
    const result = await this._fetch(`/servers/${serverName}/disable`, {
      method: 'POST'
    });

    if (result.success) {
      this.enabledServers.delete(serverName);
      this.emit('serverDisabled', { server: serverName });
    }

    return result;
  }

  /**
   * Get server status
   * @param {string} serverName - Name of the server
   * @returns {Promise<object>}
   */
  async getServerStatus(serverName) {
    return this._fetch(`/servers/${serverName}/status`, { method: 'GET' });
  }

  /**
   * List available tools from all enabled servers
   * @returns {Promise<Array>}
   */
  async listTools() {
    return this._fetch('/tools', { method: 'GET' });
  }

  /**
   * Call a tool through the gateway
   * @param {string} serverName - Server providing the tool
   * @param {string} toolName - Name of the tool
   * @param {object} params - Tool parameters
   * @returns {Promise<object>}
   */
  async callTool(serverName, toolName, params = {}) {
    const startTime = Date.now();

    this.emit('toolCallStart', { server: serverName, tool: toolName, params });

    try {
      const result = await this._fetch(`/servers/${serverName}/tools/${toolName}`, {
        method: 'POST',
        body: JSON.stringify(params)
      });

      const duration = Date.now() - startTime;
      this.emit('toolCallEnd', { server: serverName, tool: toolName, duration, success: true });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.emit('toolCallEnd', { server: serverName, tool: toolName, duration, success: false, error });
      throw error;
    }
  }

  /**
   * List available resources
   * @returns {Promise<Array>}
   */
  async listResources() {
    return this._fetch('/resources', { method: 'GET' });
  }

  /**
   * Get a resource
   * @param {string} uri - Resource URI
   * @returns {Promise<object>}
   */
  async getResource(uri) {
    return this._fetch(`/resources/${encodeURIComponent(uri)}`, { method: 'GET' });
  }

  /**
   * Apply a security policy to the gateway
   * @param {object} policy - Policy configuration
   * @returns {Promise<object>}
   */
  async applyPolicy(policy) {
    return this._fetch('/policy', {
      method: 'POST',
      body: JSON.stringify(policy)
    });
  }

  /**
   * Get current policy
   * @returns {Promise<object>}
   */
  async getPolicy() {
    return this._fetch('/policy', { method: 'GET' });
  }

  /**
   * Get audit logs
   * @param {object} options - Filter options (since, until, server, tool)
   * @returns {Promise<Array>}
   */
  async getAuditLogs(options = {}) {
    const params = new URLSearchParams(options);
    return this._fetch(`/audit?${params}`, { method: 'GET' });
  }

  /**
   * Internal fetch wrapper with retries and error handling
   * @private
   */
  async _fetch(path, options = {}) {
    const url = `${this.gatewayUrl}${path}`;
    const fetchOptions = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    let lastError;

    for (let attempt = 0; attempt < this.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Gateway error (${response.status}): ${errorBody}`);
        }

        return response.json();
      } catch (error) {
        lastError = error;

        if (attempt < this.retries - 1) {
          await this._sleep(this.retryDelay * Math.pow(2, attempt));
        }
      }
    }

    throw new Error(`Failed to communicate with MCP Gateway after ${this.retries} attempts: ${lastError.message}`);
  }

  /**
   * Sleep utility
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Check if Docker MCP Gateway is installed
 * @returns {Promise<boolean>}
 */
export async function isMCPGatewayInstalled() {
  const { spawn } = await import('child_process');

  return new Promise((resolve) => {
    const child = spawn('docker', ['mcp', '--version']);

    child.on('close', (code) => resolve(code === 0));
    child.on('error', () => resolve(false));
  });
}

/**
 * Start the MCP Gateway using Docker CLI
 * @param {object} options - Gateway options
 * @returns {Promise<object>}
 */
export async function startMCPGateway(options = {}) {
  const { spawn } = await import('child_process');

  const args = ['mcp', 'gateway', 'run'];

  if (options.policy) {
    args.push('--policy', options.policy);
  }

  if (options.port) {
    args.push('--port', options.port.toString());
  }

  if (options.detach) {
    args.push('--detach');
  }

  return new Promise((resolve, reject) => {
    const child = spawn('docker', args, {
      stdio: options.detach ? 'ignore' : 'inherit'
    });

    if (options.detach) {
      // Give it a moment to start
      setTimeout(() => resolve({ started: true, pid: child.pid }), 2000);
    } else {
      child.on('close', (code) => {
        if (code === 0) {
          resolve({ started: true });
        } else {
          reject(new Error(`Gateway exited with code ${code}`));
        }
      });

      child.on('error', reject);
    }
  });
}

/**
 * Enable an MCP server using Docker CLI
 * @param {string} serverName - Server name
 * @returns {Promise<boolean>}
 */
export async function enableServer(serverName) {
  const { spawn } = await import('child_process');

  return new Promise((resolve, reject) => {
    const child = spawn('docker', ['mcp', 'server', 'enable', serverName]);

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => { stdout += data; });
    child.stderr?.on('data', (data) => { stderr += data; });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        reject(new Error(`Failed to enable server ${serverName}: ${stderr}`));
      }
    });

    child.on('error', reject);
  });
}

/**
 * Connect a client to MCP Gateway using Docker CLI
 * @param {string} clientName - Client name (e.g., 'claude-code')
 * @returns {Promise<boolean>}
 */
export async function connectClient(clientName) {
  const { spawn } = await import('child_process');

  return new Promise((resolve, reject) => {
    const child = spawn('docker', ['mcp', 'client', 'connect', clientName]);

    child.on('close', (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        reject(new Error(`Failed to connect client ${clientName}`));
      }
    });

    child.on('error', reject);
  });
}

export default MCPGatewayClient;
