import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { faker } from '@faker-js/faker';
import SmartDataGenerator from '../services/dataGenerator.js';
import PersistentStorage from '../services/persistentStorage.js';
import { OpenAPISpec, SpecData } from '../../types';

const router = express.Router();

// Initialize advanced data generator
const dataGenerator = new SmartDataGenerator();
const storage = new PersistentStorage();

// Load persistent data on startup
let specs: Map<string, SpecData> = new Map();
let mockData: Map<string, any> = new Map();

// Initialize data loading
async function initializeData() {
  try {
    specs = await storage.loadSpecs();
    mockData = await storage.loadMockData();
    console.log(`Mock route initialized with ${specs.size} specs`);
  } catch (error) {
    console.error('Error loading persistent data in mock route:', error);
  }
}

initializeData();

// Get specs from the specs module
function getSpecs(): Map<string, SpecData> {
  return specs;
}

interface MatchingRoute {
  path: string;
  operation: any;
}

// Helper function to find matching route
function findMatchingRoute(method: string, path: string, specData: SpecData): MatchingRoute | null {
  const paths = specData.spec_data?.paths || {};
  
  // Try exact match first
  if (paths[path] && (paths[path] as any)[method.toLowerCase()]) {
    return { path, operation: (paths[path] as any)[method.toLowerCase()] };
  }
  
  // Try parameter matching (e.g., /pet/{petId} matches /pet/123)
  for (const [specPath, methods] of Object.entries(paths)) {
    if ((methods as any)[method.toLowerCase()]) {
      // Convert OpenAPI path parameters to regex
      const regexPath = specPath.replace(/\{[^}]+\}/g, '([^/]+)');
      const regex = new RegExp(`^${regexPath}$`);
      
      if (regex.test(path)) {
        return { path: specPath, operation: (methods as any)[method.toLowerCase()] };
      }
    }
  }
  
  return null;
}

// Generate mock response based on OpenAPI schema
function generateMockResponse(operation: any, method: string, path: string, specData: SpecData | null = null): any {
  const responses = operation.responses || {};
  const successResponse = responses['200'] || responses['201'] || responses['default'];
  
  if (!successResponse) {
    return { message: `Mock response for ${method} ${path}` };
  }
  
  const schema = successResponse.content?.['application/json']?.schema;
  
  if (!schema) {
    return { message: `Mock response for ${method} ${path}` };
  }
  
  return generateFromSchemaWithContext(schema, method, path, specData);
}

// Generate data from OpenAPI schema with context
function generateFromSchemaWithContext(schema: any, method: string, path: string, specData: SpecData | null = null, propertyName: string | null = null): any {
  if (!schema) return {};
  
  if (schema.$ref) {
    // Resolve $ref references
    const refPath = schema.$ref.replace('#/', '').split('/');
    let resolvedSchema = specData?.spec_data;
    
    for (const segment of refPath) {
      if (resolvedSchema && (resolvedSchema as any)[segment]) {
        resolvedSchema = (resolvedSchema as any)[segment];
      } else {
        // Fallback if reference can't be resolved
        return { id: Math.floor(Math.random() * 1000), name: "Mock Item", status: "active" };
      }
    }
    
    return generateFromSchemaWithContext(resolvedSchema, method, path, specData, propertyName);
  }
  
  if (schema.type === 'array') {
    const itemSchema = schema.items || {};
    const count = Math.min(3, Math.max(1, Math.floor(Math.random() * 3) + 1));
    const items = [];
    for (let i = 0; i < count; i++) {
      if (itemSchema.type === 'string' && propertyName) {
        items.push(generateContextualValue(propertyName));
      } else {
        items.push(generateFromSchemaWithContext(itemSchema, method, path, specData, propertyName));
      }
    }
    return items;
  }
  
  if (schema.type === 'object' || schema.properties) {
    const result: any = {};
    const properties = schema.properties || {};
    
    Object.entries(properties).forEach(([key, propSchema]) => {
      result[key] = generateFromSchemaWithContext(propSchema, method, path, specData, key);
    });
    
    // Add some default values if no properties
    if (Object.keys(result).length === 0) {
      result.id = Math.floor(Math.random() * 1000);
      result.name = `Mock ${path.split('/').pop() || 'Item'}`;
      result.status = "active";
    }
    
    return result;
  }
  
  // Handle primitive types
  switch (schema.type) {
    case 'string':
      if (schema.enum) return schema.enum[0];
      if (schema.format === 'email') return faker.internet.email();
      if (schema.format === 'date-time') return new Date().toISOString();
      if (propertyName) return generateContextualValue(propertyName);
      return schema.example || faker.lorem.words({ min: 1, max: 2 });
    case 'integer':
    case 'number':
      if (propertyName && propertyName.toLowerCase().includes('id')) {
        return Math.floor(Math.random() * 100000) + 1; // Generate unique ID for any ID field
      }
      return schema.example || Math.floor(Math.random() * 100);
    case 'boolean':
      return schema.example !== undefined ? schema.example : faker.datatype.boolean();
    default:
      return schema.example || faker.lorem.word();
  }
}

// Helper function for contextual value generation - works for any API
function generateContextualValue(propertyName: string): any {
  const lowerName = propertyName.toLowerCase();
  
  // ID patterns - handle any ID field
  if (lowerName.includes('id') && (lowerName.endsWith('id') || lowerName.startsWith('id'))) {
    return Math.floor(Math.random() * 100000) + 1;
  }
  
  // URL patterns - generic for any API
  if (lowerName.includes('url') || lowerName.includes('link') || lowerName.includes('uri')) {
    // Photo/image URLs
    if (lowerName.includes('photo') || lowerName.includes('image') || lowerName.includes('avatar') || lowerName.includes('picture')) {
      return faker.image.url({ width: 400, height: 300 });
    }
    // Video URLs
    if (lowerName.includes('video')) {
      return faker.internet.url() + '/video/' + faker.system.fileName({ extensionCount: 1 }).replace(/\.[^/.]+$/, '.mp4');
    }
    // API URLs
    if (lowerName.includes('api') || lowerName.includes('endpoint')) {
      return faker.internet.url() + '/api/v1/' + faker.lorem.word();
    }
    // Website URLs
    if (lowerName.includes('website') || lowerName.includes('homepage')) {
      return faker.internet.url();
    }
    // Generic URLs
    return faker.internet.url();
  }
  
  // Email patterns
  if (lowerName.includes('email')) {
    return faker.internet.email();
  }
  
  // Phone patterns
  if (lowerName.includes('phone') || lowerName.includes('mobile') || lowerName.includes('tel')) {
    return faker.phone.number();
  }
  
  // Address patterns
  if (lowerName.includes('address')) {
    return faker.location.streetAddress();
  }
  if (lowerName.includes('city')) {
    return faker.location.city();
  }
  if (lowerName.includes('country')) {
    return faker.location.country();
  }
  if (lowerName.includes('zipcode') || lowerName.includes('postal')) {
    return faker.location.zipCode();
  }
  
  // Name patterns - generic for any entity
  if (lowerName.includes('name')) {
    if (lowerName.includes('first') || lowerName.includes('given')) {
      return faker.person.firstName();
    }
    if (lowerName.includes('last') || lowerName.includes('family') || lowerName.includes('surname')) {
      return faker.person.lastName();
    }
    if (lowerName.includes('full') || (lowerName.includes('user') || lowerName.includes('person') || lowerName.includes('author'))) {
      return faker.person.fullName();
    }
    if (lowerName.includes('company') || lowerName.includes('organization') || lowerName.includes('business')) {
      return faker.company.name();
    }
    if (lowerName.includes('product') || lowerName.includes('item')) {
      return faker.commerce.productName();
    }
    if (lowerName.includes('tag')) {
      return faker.lorem.word();
    }
    if (lowerName.includes('category')) {
      return faker.commerce.department();
    }
    return faker.lorem.words(2);
  }
  
  // ID patterns
  if (lowerName.includes('id') || lowerName === 'uuid') {
    if (lowerName.includes('uuid') || lowerName.includes('guid')) {
      return faker.string.uuid();
    }
    return faker.number.int({ min: 1, max: 100000 });
  }
  
  // Status patterns
  if (lowerName.includes('status') || lowerName.includes('state')) {
    return faker.helpers.arrayElement(['active', 'inactive', 'pending', 'completed', 'draft', 'published', 'archived']);
  }
  
  // Description patterns
  if (lowerName.includes('description') || lowerName.includes('summary') || lowerName.includes('content') || lowerName.includes('bio')) {
    return faker.lorem.paragraph();
  }
  
  // Title patterns
  if (lowerName.includes('title') || lowerName.includes('heading')) {
    return faker.lorem.sentence();
  }
  
  // Price/Money patterns
  if (lowerName.includes('price') || lowerName.includes('cost') || lowerName.includes('amount') || lowerName.includes('fee')) {
    return faker.commerce.price();
  }
  
  // Date patterns - smart date generation
  if (lowerName.includes('date') || lowerName.includes('time')) {
    if (lowerName.includes('birth') || lowerName.includes('born')) {
      return faker.date.birthdate().toISOString();
    }
    if (lowerName.includes('created') || lowerName.includes('start')) {
      return faker.date.past().toISOString();
    }
    if (lowerName.includes('updated') || lowerName.includes('modified') || lowerName.includes('last')) {
      return faker.date.recent().toISOString();
    }
    if (lowerName.includes('future') || lowerName.includes('end') || lowerName.includes('expire')) {
      return faker.date.future().toISOString();
    }
    return faker.date.recent().toISOString();
  }
  
  // Color patterns
  if (lowerName.includes('color') || lowerName.includes('colour')) {
    return faker.color.human();
  }
  
  // Username patterns
  if (lowerName.includes('username') || lowerName.includes('handle')) {
    return faker.internet.username();
  }
  
  // Generate random string for any unmatched property
  return faker.lorem.words({ min: 1, max: 3 });
}

// Generate data from OpenAPI schema
function generateFromSchema(schema: any, method: string, path: string, specData: SpecData | null = null): any {
  if (!schema) return {};
  
  if (schema.$ref) {
    // Resolve $ref references
    const refPath = schema.$ref.replace('#/', '').split('/');
    let resolvedSchema = specData?.spec_data;
    
    for (const segment of refPath) {
      if (resolvedSchema && (resolvedSchema as any)[segment]) {
        resolvedSchema = (resolvedSchema as any)[segment];
      } else {
        // Fallback if reference can't be resolved
        return { id: Math.floor(Math.random() * 1000), name: "Mock Item", status: "active" };
      }
    }
    
    return generateFromSchema(resolvedSchema, method, path, specData);
  }
  
  if (schema.type === 'array') {
    const itemSchema = schema.items || {};
    const count = Math.min(3, Math.max(1, Math.floor(Math.random() * 3) + 1));
    const items = [];
    for (let i = 0; i < count; i++) {
      items.push(generateFromSchema(itemSchema, method, path, specData));
    }
    return items;
  }
  
  if (schema.type === 'object' || schema.properties) {
    const result: any = {};
    const properties = schema.properties || {};
    
    Object.entries(properties).forEach(([key, propSchema]) => {
      result[key] = generateFromSchemaWithContext(propSchema, method, path, specData, key);
    });
    
    // Add some default values if no properties
    if (Object.keys(result).length === 0) {
      result.id = Math.floor(Math.random() * 1000);
      result.name = `Mock ${path.split('/').pop() || 'Item'}`;
      result.status = "active";
    }
    
    return result;
  }
  
  // Handle primitive types
  switch (schema.type) {
    case 'string':
      if (schema.enum) return schema.enum[0];
      if (schema.format === 'email') return faker.internet.email();
      if (schema.format === 'date-time') return new Date().toISOString();
      return schema.example || faker.lorem.words({ min: 1, max: 2 });
    case 'integer':
    case 'number':
      return schema.example || Math.floor(Math.random() * 100);
    case 'boolean':
      return schema.example !== undefined ? schema.example : faker.datatype.boolean();
    default:
      return schema.example || faker.lorem.word();
  }
}

// Handle all mock API requests
router.all('/*', async (req: Request, res: Response) => {
  try {
    const { method } = req;
    const requestPath = req.path;
    
    console.log(`Mock API request: ${method} ${requestPath}`);
    
    // Find the spec that contains this endpoint
    let matchingSpec: SpecData | null = null;
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
      // Refresh specs in case they were updated after initialization
      await initializeData();
      
      // Try again after refresh
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
          availableSpecs: Array.from(specs.keys()),
          availableSpecNames: Array.from(specs.values()).map(s => s.spec_name),
          tip: 'Make sure you have imported an API specification that includes this endpoint'
        });
      }
    }
    
    // Handle stateful operations - improved key generation logic
    // For POST/PUT/PATCH: use base path (e.g., /pet)
    // For GET: try both specific path and base path
    const basePath = requestPath.replace(/\/[a-f0-9-]{36}$/i, '').replace(/\/\d+$/, ''); // Remove UUID or numeric ID
    const baseDataKey = basePath || requestPath;
    
    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      // Generate proper response based on the response schema, not just the request body
      const mockResponse = generateMockResponse(matchingRoute.operation, method, requestPath, matchingSpec);
      
      // Generate unique ID for new resources
      const uniqueId = req.body.id || mockResponse.id || Math.floor(Math.random() * 100000) + 1;
      
      // Merge request data with generated response to maintain stateful behavior
      const storedData = {
        ...mockResponse,
        ...req.body,
        id: uniqueId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // For POST requests, use unique key to store multiple items
      const storageKey = method === 'POST' ? `${baseDataKey}/${uniqueId}` : baseDataKey;
      mockData.set(storageKey, storedData);
      
      // Also maintain a collection for GET requests
      if (method === 'POST') {
        const collectionKey = baseDataKey;
        let collection = mockData.get(collectionKey) || [];
        if (!Array.isArray(collection)) {
          collection = [collection]; // Convert single item to array
        }
        collection.push(storedData);
        mockData.set(collectionKey, collection);
      }
      
      await storage.saveMockData(mockData);
      console.log(`Stored data for key: ${baseDataKey}`, storedData);
      
      // Return the full response with generated fields
      const response = {
        ...storedData,
        _mock: {
          endpoint: requestPath,
          method: method,
          spec: matchingSpec?.spec_name || 'unknown',
          timestamp: new Date().toISOString(),
          stateful: true
        }
      };
      
      const statusCode = method === 'POST' ? 201 : 200;
      return res.status(statusCode).json(response);
    }
    
    // Generate response
    let responseData: any;
    
    if (method === 'GET') {
      // Try to find stored data for GET requests
      if (mockData.has(baseDataKey)) {
        responseData = mockData.get(baseDataKey);
        console.log(`Retrieved stored data for key: ${baseDataKey}`, responseData);
      } else {
        // If no exact match, try to find data for the base resource
        const resourcePath = requestPath.split('/')[1]; // e.g., 'pet' from '/pet/123'
        const resourceKey = `/${resourcePath}`;
        if (mockData.has(resourceKey)) {
          responseData = mockData.get(resourceKey);
          console.log(`Retrieved stored data for resource key: ${resourceKey}`, responseData);
        }
      }
    }
    
    if (!responseData) {
      // Generate mock response from schema using advanced data generator
      try {
        const schema = matchingRoute.operation.responses?.['200']?.content?.['application/json']?.schema ||
                      matchingRoute.operation.responses?.['201']?.content?.['application/json']?.schema;
        
        if (schema) {
          console.log(`Using contextual generation for ${method} ${requestPath}`);
          responseData = generateFromSchemaWithContext(schema, method, requestPath, matchingSpec);
          console.log(`Generated contextual mock response for ${method} ${requestPath}`, responseData);
        } else {
          responseData = generateMockResponse(matchingRoute.operation, method, requestPath, matchingSpec);
          console.log(`Generated basic mock response for ${method} ${requestPath}`, responseData);
        }
      } catch (error) {
        console.error('Advanced generation failed, falling back to basic:', error);
        responseData = generateMockResponse(matchingRoute.operation, method, requestPath, matchingSpec);
      }
    }
    
    // Add metadata to response
    const response = {
      ...responseData,
      _mock: {
        endpoint: requestPath,
        method: method,
        spec: matchingSpec?.spec_name || 'unknown',
        timestamp: new Date().toISOString(),
        stateful: mockData.has(baseDataKey)
      }
    };
    
    // Set appropriate status code
    const statusCode = method === 'POST' ? 201 : 200;
    
    res.status(statusCode).json(response);
    
  } catch (error) {
    console.error('Mock API error:', error);
    res.status(500).json({
      error: 'Mock API error',
      message: error instanceof Error ? error.message : 'Unknown error',
      path: req.path,
      method: req.method
    });
  }
});

// Export function to register specs
(router as any).registerSpec = function(specId: string, specData: SpecData) {
  specs.set(specId, specData);
  console.log(`Registered spec for mocking: ${specData.spec_name} (${specId})`);
};

export default router;
