import { exec, spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { OpenAPISpec, MockoonEnvironment } from '../../types';

export class MockoonService {
  public mockoonInstances: Map<string, ChildProcess>;
  private mockoonDataDir: string;

  constructor() {
    this.mockoonInstances = new Map();
    this.mockoonDataDir = path.join(__dirname, '../mockoon-data');
    this.ensureDataDirectory();
  }

  async ensureDataDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.mockoonDataDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create Mockoon data directory:', error);
    }
  }

  // Create a Mockoon environment from OpenAPI spec
  async createEnvironmentFromSpec(specId: string, openApiSpec: OpenAPISpec): Promise<{
    environmentId: string;
    environmentFile: string;
    port: number;
  }> {
    try {
      const environmentId = uuidv4();
      const environmentFile = path.join(this.mockoonDataDir, `${environmentId}.json`);
      
      // Convert OpenAPI spec to Mockoon environment format
      const mockoonEnvironment = this.convertOpenApiToMockoon(specId, openApiSpec);
      
      // Write environment file
      await fs.writeFile(environmentFile, JSON.stringify(mockoonEnvironment, null, 2));
      
      return {
        environmentId,
        environmentFile,
        port: mockoonEnvironment.port
      };
    } catch (error) {
      console.error('Failed to create Mockoon environment:', error);
      throw error;
    }
  }

  // Convert OpenAPI spec to Mockoon environment format
  convertOpenApiToMockoon(specId: string, openApiSpec: OpenAPISpec): any {
    const basePort = 3001; // Start from 3001 to avoid conflicts
    const port = basePort + Math.floor(Math.random() * 1000);
    
    const environment: any = {
      uuid: uuidv4(),
      lastMigration: 32,
      name: `API Sandbox - ${openApiSpec.info?.title || specId}`,
      endpointPrefix: "",
      latency: 0,
      port: port,
      hostname: "localhost",
      folders: [],
      routes: [],
      rootChildren: [],
      proxyMode: false,
      proxyHost: "",
      proxyRemovePrefix: false,
      tlsOptions: {},
      cors: true,
      headers: [
        {
          key: "Content-Type",
          value: "application/json"
        }
      ],
      proxyReqHeaders: [],
      proxyResHeaders: [],
      data: [],
      callbacks: []
    };

    // Convert OpenAPI paths to Mockoon routes
    if (openApiSpec.paths) {
      Object.entries(openApiSpec.paths).forEach(([path, pathItem]) => {
        Object.entries(pathItem).forEach(([method, operation]) => {
          if (['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method.toLowerCase())) {
            const route = this.createMockoonRoute(path, method.toUpperCase(), operation);
            environment.routes.push(route);
            environment.rootChildren.push({
              type: "route",
              uuid: route.uuid
            });
          }
        });
      });
    }

    return environment;
  }

  // Create a Mockoon route from OpenAPI operation
  createMockoonRoute(path: string, method: string, operation: any): any {
    const routeId = uuidv4();
    
    // Convert OpenAPI path parameters to Mockoon format
    const mockoonPath = path.replace(/{([^}]+)}/g, ':$1');
    
    // Generate response based on OpenAPI response schema
    let responseBody = '{}';
    let statusCode = '200';
    
    if (operation.responses) {
      // Find first successful response
      const successResponse = operation.responses['200'] || 
                             operation.responses['201'] || 
                             operation.responses['204'] ||
                             Object.values(operation.responses)[0];
      
      if (successResponse) {
        statusCode = Object.keys(operation.responses).find(code => 
          operation.responses[code] === successResponse
        ) || '200';
        
        // Generate mock data from schema
        if (successResponse.content?.['application/json']?.schema) {
          responseBody = this.generateMockResponse(successResponse.content['application/json'].schema);
        }
      }
    }

    return {
      uuid: routeId,
      type: "http",
      documentation: operation.description || operation.summary || "",
      method: method,
      endpoint: mockoonPath,
      responses: [
        {
          uuid: uuidv4(),
          body: responseBody,
          latency: 0,
          statusCode: parseInt(statusCode),
          label: operation.summary || `${method} ${path}`,
          headers: [],
          bodyType: "INLINE",
          filePath: "",
          databucketID: "",
          sendFileAsBody: false,
          rules: [],
          rulesOperator: "OR",
          disableTemplating: false,
          fallbackTo404: false,
          default: true,
          crudKey: "id",
          callbacks: []
        }
      ],
      responseMode: null
    };
  }

  // Generate mock response from OpenAPI schema
  generateMockResponse(schema: any): string {
    try {
      if (schema.example) {
        return JSON.stringify(schema.example, null, 2);
      }
      
      if (schema.type === 'object' && schema.properties) {
        const mockObject: any = {};
        Object.entries(schema.properties).forEach(([key, prop]) => {
          mockObject[key] = this.generateMockValue(prop);
        });
        return JSON.stringify(mockObject, null, 2);
      }
      
      if (schema.type === 'array' && schema.items) {
        const mockArray = [this.generateMockValue(schema.items)];
        return JSON.stringify(mockArray, null, 2);
      }
      
      return JSON.stringify(this.generateMockValue(schema), null, 2);
    } catch (error) {
      console.error('Error generating mock response:', error);
      return '{"message": "Mock response"}';
    }
  }

  // Generate mock value based on schema type
  generateMockValue(schema: any): any {
    if (schema.example !== undefined) {
      return schema.example;
    }
    
    switch (schema.type) {
      case 'string':
        if (schema.format === 'email') return 'user@example.com';
        if (schema.format === 'date-time') return new Date().toISOString();
        if (schema.format === 'uuid') return uuidv4();
        return schema.enum ? schema.enum[0] : 'string value';
      case 'number':
      case 'integer':
        return schema.enum ? schema.enum[0] : 42;
      case 'boolean':
        return true;
      case 'array':
        return schema.items ? [this.generateMockValue(schema.items)] : [];
      case 'object':
        if (schema.properties) {
          const obj: any = {};
          Object.entries(schema.properties).forEach(([key, prop]) => {
            obj[key] = this.generateMockValue(prop);
          });
          return obj;
        }
        return {};
      default:
        return null;
    }
  }

  // Start a Mockoon instance
  async startMockoonInstance(environmentFile: string, port: number): Promise<ChildProcess> {
    return new Promise((resolve, reject) => {
      const mockoonProcess = spawn('npx', ['@mockoon/cli', 'start', '--data', environmentFile, '--port', port.toString()], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let started = false;
      
      mockoonProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        console.log(`Mockoon stdout: ${output}`);
        
        if (output.includes('Server started') || output.includes('listening')) {
          if (!started) {
            started = true;
            resolve(mockoonProcess);
          }
        }
      });

      mockoonProcess.stderr?.on('data', (data) => {
        console.error(`Mockoon stderr: ${data}`);
      });

      mockoonProcess.on('error', (error) => {
        console.error('Failed to start Mockoon:', error);
        if (!started) {
          reject(error);
        }
      });

      mockoonProcess.on('exit', (code) => {
        console.log(`Mockoon process exited with code ${code}`);
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!started) {
          mockoonProcess.kill();
          reject(new Error('Mockoon startup timeout'));
        }
      }, 10000);
    });
  }

  // Stop a Mockoon instance
  async stopMockoonInstance(environmentId: string): Promise<boolean> {
    const instance = this.mockoonInstances.get(environmentId);
    if (instance) {
      instance.kill();
      this.mockoonInstances.delete(environmentId);
      return true;
    }
    return false;
  }

  // Get running instances
  getRunningInstances(): string[] {
    return Array.from(this.mockoonInstances.keys());
  }

  // Check if Mockoon CLI is available
  async checkMockoonAvailability(): Promise<boolean> {
    return new Promise((resolve) => {
      exec('npx @mockoon/cli --version', (error, stdout, stderr) => {
        if (error) {
          console.error('Mockoon CLI not available:', error.message);
          resolve(false);
        } else {
          console.log('Mockoon CLI version:', stdout.trim());
          resolve(true);
        }
      });
    });
  }
}

export default MockoonService;
