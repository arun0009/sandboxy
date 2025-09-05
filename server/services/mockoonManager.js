const { exec, spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class MockoonManager {
  constructor() {
    this.mockoonInstances = new Map();
    this.mockoonDataDir = path.join(__dirname, '../mockoon-data');
    this.ensureDataDirectory();
  }

  async ensureDataDirectory() {
    try {
      await fs.mkdir(this.mockoonDataDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create Mockoon data directory:', error);
    }
  }

  // Create Mockoon environment from OpenAPI spec
  async createEnvironmentFromSpec(specId, openApiSpec, specName = 'API') {
    try {
      const environmentId = uuidv4();
      const environmentFile = path.join(this.mockoonDataDir, `${environmentId}.json`);
      
      // Convert OpenAPI spec to Mockoon environment format
      const mockoonEnvironment = this.convertOpenApiToMockoon(specId, openApiSpec, specName);
      
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
  convertOpenApiToMockoon(specId, openApiSpec, specName) {
    const port = 3100 + Math.floor(Math.random() * 900); // Random port 3100-3999
    
    const environment = {
      uuid: uuidv4(),
      lastMigration: 29,
      name: specName,
      endpointPrefix: "",
      latency: 0,
      port: port,
      hostname: "0.0.0.0",
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

    // Create data buckets for stateful storage
    environment.data = [
      {
        uuid: uuidv4(),
        id: "users",
        name: "Users Data",
        documentation: "Stateful user data storage",
        value: "[]"
      },
      {
        uuid: uuidv4(),
        id: "resources",
        name: "Generic Resources",
        documentation: "Generic resource storage for any endpoint",
        value: "{}"
      }
    ];

    // Convert OpenAPI paths to Mockoon routes
    const paths = openApiSpec.paths || {};
    
    Object.entries(paths).forEach(([path, methods]) => {
      Object.entries(methods).forEach(([method, operation]) => {
        if (['get', 'post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) {
          const route = this.createMockoonRoute(path, method, operation, openApiSpec);
          environment.routes.push(route);
          environment.rootChildren.push({
            type: "route",
            uuid: route.uuid
          });
        }
      });
    });

    return environment;
  }

  // Create individual Mockoon route from OpenAPI operation
  createMockoonRoute(path, method, operation, spec) {
    const routeId = uuidv4();
    
    // Get response schema for smart data generation
    const responses = operation.responses || {};
    const successResponse = responses['200'] || responses['201'] || responses['default'];
    const responseSchema = successResponse?.content?.['application/json']?.schema;
    
    // Generate smart response body using data buckets
    let responseBody = this.generateSmartResponseBody(method.toUpperCase(), path, responseSchema);
    
    return {
      uuid: routeId,
      type: "http",
      documentation: operation.summary || operation.description || `${method.toUpperCase()} ${path}`,
      method: method.toUpperCase(),
      endpoint: path,
      responses: [
        {
          uuid: uuidv4(),
          body: responseBody,
          latency: 0,
          statusCode: method.toLowerCase() === 'post' ? 201 : 200,
          label: "Success",
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
          crudKey: "id"
        }
      ],
      responseMode: null
    };
  }

  // Generate smart response body using Mockoon templating and data buckets
  generateSmartResponseBody(method, path, schema) {
    switch (method) {
      case 'GET':
        if (path.includes('{') || path.includes(':')) {
          // Single resource GET - return from data bucket
          return `{{ data 'resources' (urlParam 'id') }}`;
        } else {
          // List GET - return array from data bucket
          return `{{ data 'users' }}`;
        }
        
      case 'POST':
        // Create new resource and store in data bucket
        return `{{setData 'push' 'users' '' (bodyRaw)}}{{ bodyRaw }}`;
        
      case 'PUT':
      case 'PATCH':
        // Update resource in data bucket
        return `{{setData 'set' 'resources' (urlParam 'id') (bodyRaw)}}{{ bodyRaw }}`;
        
      case 'DELETE':
        // Remove from data bucket and return empty
        return `{{setData 'del' 'resources' (urlParam 'id')}}`;
        
      default:
        return this.generateSchemaBasedResponse(schema);
    }
  }

  // Generate response based on OpenAPI schema
  generateSchemaBasedResponse(schema) {
    if (!schema) {
      return '{"message": "Success", "timestamp": "{{now}}"}';
    }

    if (schema.type === 'array') {
      return `[${this.generateObjectFromSchema(schema.items || {})}]`;
    }
    
    return this.generateObjectFromSchema(schema);
  }

  generateObjectFromSchema(schema) {
    if (!schema.properties) {
      return '{"id": "{{faker \'datatype.uuid\'}}", "createdAt": "{{now}}"}';
    }

    const properties = Object.entries(schema.properties).map(([key, prop]) => {
      let value;
      
      switch (prop.type) {
        case 'string':
          if (key.toLowerCase().includes('email')) {
            value = '"{{faker \'internet.email\'}}"';
          } else if (key.toLowerCase().includes('name')) {
            value = '"{{faker \'person.fullName\'}}"';
          } else if (key.toLowerCase().includes('id')) {
            value = '"{{faker \'datatype.uuid\'}}"';
          } else {
            value = '"{{faker \'lorem.words\'}}"';
          }
          break;
        case 'number':
        case 'integer':
          value = '{{faker \'datatype.number\'}}';
          break;
        case 'boolean':
          value = '{{faker \'datatype.boolean\'}}';
          break;
        default:
          value = '"{{faker \'lorem.word\'}}"';
      }
      
      return `"${key}": ${value}`;
    });

    return `{${properties.join(', ')}}`;
  }

  // Start Mockoon environment
  async startEnvironment(environmentFile) {
    try {
      const process = spawn('mockoon-cli', ['start', '--data', environmentFile], {
        stdio: 'pipe'
      });

      return new Promise((resolve, reject) => {
        let output = '';
        
        process.stdout.on('data', (data) => {
          output += data.toString();
          if (output.includes('Server started')) {
            resolve(process);
          }
        });

        process.stderr.on('data', (data) => {
          console.error('Mockoon error:', data.toString());
        });

        process.on('error', (error) => {
          reject(error);
        });

        setTimeout(() => {
          if (!output.includes('Server started')) {
            reject(new Error('Mockoon failed to start within timeout'));
          }
        }, 10000);
      });
    } catch (error) {
      console.error('Failed to start Mockoon environment:', error);
      throw error;
    }
  }

  // Stop Mockoon environment
  async stopEnvironment(environmentId) {
    const instance = this.mockoonInstances.get(environmentId);
    if (instance) {
      instance.kill();
      this.mockoonInstances.delete(environmentId);
      return true;
    }
    return false;
  }

  // Check if Mockoon CLI is available
  async checkMockoonAvailability() {
    return new Promise((resolve) => {
      exec('mockoon-cli --version', (error, stdout) => {
        if (error) {
          resolve({ available: false, error: error.message });
        } else {
          resolve({ available: true, version: stdout.trim() });
        }
      });
    });
  }
}

module.exports = MockoonManager;
