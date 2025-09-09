import express, { Request, Response, Router } from 'express';
import Ajv from 'ajv';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { faker } from '@faker-js/faker';
import MockDataGenerator from '../services/mockDataGenerator';
import PersistentStorage from '../services/persistentStorage.js';
import { BackendSpecData, Operation, GenerationContext } from '../../common/types';

// Load environment variables from .env file
dotenv.config();

const router = express.Router() as Router & { registerSpec?: (specId: string, specData: BackendSpecData) => Promise<void> };
const ajv = new Ajv({ allErrors: true });

// Validate mock mode
const validModes = ['ai', 'advanced'] as const;

// Initialize services
const dataGenerator = new MockDataGenerator();
const storage = new PersistentStorage();

// Load configuration from environment variables
const config = {
  defaultDelay: parseInt(process.env.MOCK_DELAY || '0', 10),
  defaultMockMode: validModes.includes(process.env.MOCK_MODE as any) ? process.env.MOCK_MODE as 'ai' | 'advanced' : 'advanced',
  enableMockMetadata: process.env.ENABLE_MOCK_METADATA !== 'false',
};

// Load persistent data and configuration on startup
let specs: Map<string, BackendSpecData> = new Map();
let mockData: Map<string, any> = new Map();

async function initializeData() {
  try {
    specs = await storage.loadSpecs();
    mockData = await storage.loadMockData();
    console.log(`Mock route initialized with ${specs.size} specs`);
    console.log('Mock configuration:', config);
  } catch (error) {
    console.error('Error loading persistent data in mock route:', error);
  }
}

// Initialize data without seeding to prevent loops
initializeData();

function getSpecs(): Map<string, BackendSpecData> {
  return specs;
}

interface MatchingRoute {
  path: string;
  operation: Operation;
}

function resolveSchemaRef(ref: string, specData: any): any {
  if (!ref || !specData) return null;
  const path = ref.replace('#/', '').split('/');
  let current = specData;
  for (const segment of path) {
    if (current && typeof current === 'object' && segment in current) {
      current = current[segment];
    } else {
      return null;
    }
  }
  return current;
}

function findMatchingRoute(method: string, path: string, specData: BackendSpecData): MatchingRoute | null {
  const paths = specData.spec_data?.paths || {};
  
  if (paths[path] && paths[path][method.toLowerCase()]) {
    return { path, operation: paths[path][method.toLowerCase()]! };
  }
  
  for (const [specPath, methods] of Object.entries(paths)) {
    if (methods[method.toLowerCase()]) {
      const regexPath = specPath.replace(/\{[^}]+\}/g, '([^/]+)');
      const regex = new RegExp(`^${regexPath}$`);
      
      if (regex.test(path)) {
        return { path: specPath, operation: methods[method.toLowerCase()]! };
      }
    }
  }
  
  return null;
}

router.all('/*', async (req: Request, res: Response) => {
  try {
    const { method, query, body } = req;
    const requestPath = req.path;
    
    console.log(`Mock API request: ${method} ${requestPath} ${JSON.stringify(query)}`);
    
    let matchingSpec: BackendSpecData | null = null;
    let matchingRoute: MatchingRoute | null = null;
    
    for (const [specId, specData] of specs.entries()) {
      const route = findMatchingRoute(method, requestPath, specData);
      if (route) {
        matchingSpec = specData;
        matchingRoute = route;
        break;
      }
    }
    
    if (!matchingRoute) {
      await initializeData();
      
      for (const [specId, specData] of specs.entries()) {
        const route = findMatchingRoute(method, requestPath, specData);
        if (route) {
          matchingSpec = specData;
          matchingRoute = route;
          break;
        }
      }
      
      if (!matchingRoute) {
        return res.status(404).json({
          error: 'Mock endpoint not found',
          message: `No mock available for ${method} ${requestPath}`,
        });
      }
    }
    
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      const requestBodySchema = matchingRoute.operation.requestBody?.content?.['application/json']?.schema;
      if (requestBodySchema) {
        try {
          // Create AJV instance with schema resolution
          const ajvWithRefs = new Ajv({ allErrors: true });
          
          // Add the full spec as a schema to resolve references
          if (matchingSpec?.spec_data) {
            ajvWithRefs.addSchema(matchingSpec.spec_data, '#');
          }
          
          const validate = ajvWithRefs.compile(requestBodySchema);
          const valid = validate(body);
          if (!valid) {
            console.log(`Invalid request body for ${method} ${requestPath}:`, validate.errors);
            return res.status(400).json({
              error: 'Invalid request body',
              details: validate.errors,
            });
          }
        } catch (validationError) {
          console.log(`Validation setup failed for ${method} ${requestPath}, skipping validation:`, validationError);
          // Continue without validation if schema resolution fails
        }
      }
    }
    
    if (method === 'DELETE') {
      const baseDataKey = requestPath.replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, '')
        .replace(/\/\d+$/, '');
      if (await storage.getMockData(requestPath)) {
        await storage.deleteMockData(requestPath);
        const collectionKey = baseDataKey;
        let collection = await storage.getMockData(collectionKey) || [];
        if (Array.isArray(collection)) {
          collection = collection.filter((item: any) => item.id !== body.id);
          await storage.setMockData(collectionKey, collection);
        }
        console.log(`Deleted resource at ${requestPath}`);
        return res.status(204).send();
      }
      console.log(`No resource found for DELETE at ${requestPath}`);
      return res.status(404).json({ error: 'Resource not found' });
    }
    
    const mockMode = query.mockMode && validModes.includes(query.mockMode as any)
      ? query.mockMode as 'ai' | 'advanced'
      : config.defaultMockMode;
    
    const basePath = requestPath.replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, '')
      .replace(/\/\d+$/, '');
    const baseDataKey = basePath || requestPath;
    
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      const schema = matchingRoute.operation.responses?.['200']?.content?.['application/json']?.schema ||
                    matchingRoute.operation.responses?.['201']?.content?.['application/json']?.schema;
      const context: GenerationContext = { 
        generationMode: mockMode,
        endpoint: `${method} ${matchingRoute.path}`
      };
      console.log('Generating mock data with context:', context);
      const mockResponse = schema
        ? await dataGenerator.generateData(schema, context, mockMode)
        : { message: `Mock response for ${method} ${requestPath}` };
      
      // Generate ID based on schema type
      let uniqueId = body.id;
      if (!uniqueId && method === 'POST') {
        // Check if schema defines ID type
        let resolvedSchema = schema;
        if (schema?.$ref && matchingSpec?.spec_data) {
          resolvedSchema = resolveSchemaRef(schema.$ref, matchingSpec.spec_data);
        }
        
        const idSchema = resolvedSchema?.properties?.id;
        
        if (idSchema?.type === 'integer') {
          // Generate realistic integer ID using Faker
          uniqueId = faker.number.int({ min: 1, max: 999999 });
        } else if (idSchema?.type === 'string' && idSchema?.format === 'uuid') {
          uniqueId = faker.string.uuid();
        } else {
          // Default to integer for backwards compatibility
          uniqueId = faker.number.int({ min: 1, max: 999999 });
        }
      }
      if (!uniqueId) {
        uniqueId = mockResponse.id || uuidv4();
      }
      
      const storedData = {
        ...mockResponse,
        ...body,
        id: uniqueId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const storageKey = method === 'POST' ? `${baseDataKey}/${uniqueId}` : baseDataKey;
      await storage.setMockData(storageKey, storedData);
      
      if (method === 'POST') {
        const collectionKey = baseDataKey;
        let collection = await storage.getMockData(collectionKey) || [];
        if (!Array.isArray(collection)) {
          collection = [collection];
        }
        collection.push(storedData);
        await storage.setMockData(collectionKey, collection);
      }
      
      console.log(`Stored data for key: ${storageKey}`, storedData);
      
      const response = {
        ...storedData,
        ...(query.mockDebug === 'true' || config.enableMockMetadata ? {
          _mock: {
            endpoint: requestPath,
            method,
            spec: matchingSpec?.spec_name || 'unknown',
            timestamp: new Date().toISOString(),
            stateful: true,
            mode: mockMode,
          },
        } : {}),
      };
      
      const statusCode = method === 'POST' ? 201 : 200;
      
      const delay = matchingRoute.operation['x-mock-delay'] || config.defaultDelay;
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      return res.status(statusCode).json(response);
    }
    
    let responseData: any;
    
    if (method === 'GET') {
      // First try to get the exact resource
      if (await storage.getMockData(requestPath)) {
        responseData = await storage.getMockData(requestPath);
        console.log(`Retrieved stored data for key: ${requestPath}`, responseData);
      } else {
        // Check if this is a collection endpoint (no ID in path)
        const isCollectionEndpoint = !requestPath.match(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) && !requestPath.match(/\/\d+$/);
        
        if (isCollectionEndpoint) {
          // For collection endpoints, return the collection
          const resourcePath = requestPath.split('/')[1];
          const resourceKey = `/${resourcePath}`;
          if (await storage.getMockData(resourceKey)) {
            responseData = await storage.getMockData(resourceKey);
            console.log(`Retrieved collection data for resource key: ${resourceKey}`, responseData);
            
            if (Object.keys(query).length > 0 && Array.isArray(responseData)) {
              responseData = responseData.filter((item: any) => {
                return Object.entries(query).every(([key, value]) => {
                  if (key === 'mockMode' || key === 'mockDebug') return true;
                  if (typeof item[key] === 'string' && typeof value === 'string') {
                    return item[key].toLowerCase().includes(value.toLowerCase());
                  }
                  return item[key] === value || String(item[key]) === value;
                });
              });
              console.log(`Filtered data for ${requestPath} with query ${JSON.stringify(query)}`, responseData);
            }
          }
        }
      }
      
      if (!responseData && (requestPath.match(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) || requestPath.match(/\/\d+$/))) {
        console.log(`No resource found for ${requestPath.match(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) ? 'UUID' : 'numeric ID'} path: ${requestPath}`);
        return res.status(404).json({ error: 'Resource not found' });
      }
      
      // For collection endpoints, only return data if it exists in storage
      if (!responseData && method === 'GET') {
        console.log(`No stored data found for GET ${requestPath}, returning 404`);
        return res.status(404).json({ error: 'No data available for this endpoint' });
      }
    }
    
    if (!responseData) {
      try {
        const schema = matchingRoute.operation.responses?.['200']?.content?.['application/json']?.schema ||
                      matchingRoute.operation.responses?.['201']?.content?.['application/json']?.schema;
        const context: GenerationContext = { 
        generationMode: mockMode,
        endpoint: `${method} ${matchingRoute.path}`
      };
      console.log('Generating mock data with context:', context);
        if (schema) {
          console.log(`Using ${mockMode} generation for ${method} ${requestPath}`);
          responseData = await dataGenerator.generateData(schema, context, mockMode);
          console.log(`Generated mock response for ${method} ${requestPath}`, responseData);
        } else {
          responseData = { message: `Mock response for ${method} ${requestPath}` };
          console.log(`Generated basic mock response for ${method} ${requestPath}`, responseData);
        }
      } catch (error) {
        console.error('Generation failed, falling back to basic:', error);
        responseData = { message: `Mock response for ${method} ${requestPath}` };
      }
    }
    
    const response = {
      ...responseData,
      ...(query.mockDebug === 'true' || config.enableMockMetadata ? {
        _mock: {
          endpoint: requestPath,
          method,
          spec: matchingSpec?.spec_name || 'unknown',
          timestamp: new Date().toISOString(),
          stateful: await storage.getMockData(baseDataKey) !== undefined,
          mode: mockMode,
        },
      } : {}),
    };
    
    const statusCode = method === 'POST' ? 201 : 200;
    
    const delay = matchingRoute.operation['x-mock-delay'] || config.defaultDelay;
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    res.status(statusCode).json(response);
    
  } catch (error) {
    console.error('Mock API error:', error);
    res.status(500).json({
      error: 'Mock API error',
      message: error instanceof Error ? error.message : 'Unknown error',
      path: req.path,
      method: req.method,
    });
  }
});

// Export function to register specs
router.registerSpec = async function(specId: string, specData: BackendSpecData) {
  await storage.setSpec(specId, specData);
  specs.set(specId, specData);
  console.log(`Registered spec for mocking: ${specData.spec_name} (${specId})`);
};

export default router;