const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { faker } = require('@faker-js/faker');
const SmartDataGenerator = require('../services/dataGenerator');
const PersistentStorage = require('../services/persistentStorage');
const router = express.Router();

// Initialize advanced data generator
const dataGenerator = new SmartDataGenerator();
const storage = new PersistentStorage();

// Load persistent data on startup
let specs, mockData;
(async () => {
  specs = await storage.loadSpecs();
  mockData = await storage.loadMockData();
})();

// Import specs from specs.js module
const specsModule = require('./specs');

// Get specs from the specs module
function getSpecs() {
  // Access the specs Map from the specs module
  try {
    const specsRoute = require('./specs');
    // Since we can't directly access the Map, we'll create our own storage
    // This will be populated when specs are imported
    return specs;
  } catch (error) {
    return new Map();
  }
}

// Helper function to find matching route
function findMatchingRoute(method, path, specData) {
  const paths = specData.spec_data?.paths || {};
  
  // Try exact match first
  if (paths[path] && paths[path][method.toLowerCase()]) {
    return { path, operation: paths[path][method.toLowerCase()] };
  }
  
  // Try parameter matching (e.g., /pet/{petId} matches /pet/123)
  for (const [specPath, methods] of Object.entries(paths)) {
    if (methods[method.toLowerCase()]) {
      // Convert OpenAPI path parameters to regex
      const regexPath = specPath.replace(/\{[^}]+\}/g, '([^/]+)');
      const regex = new RegExp(`^${regexPath}$`);
      
      if (regex.test(path)) {
        return { path: specPath, operation: methods[method.toLowerCase()] };
      }
    }
  }
  
  return null;
}

// Generate mock response based on OpenAPI schema
function generateMockResponse(operation, method, path, specData = null) {
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
function generateFromSchemaWithContext(schema, method, path, specData = null, propertyName = null) {
  if (!schema) return {};
  
  if (schema.$ref) {
    // Resolve $ref references
    const refPath = schema.$ref.replace('#/', '').split('/');
    let resolvedSchema = specData?.spec_data;
    
    for (const segment of refPath) {
      if (resolvedSchema && resolvedSchema[segment]) {
        resolvedSchema = resolvedSchema[segment];
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
    const result = {};
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
      if (schema.format === 'email') return 'mock@example.com';
      if (schema.format === 'date-time') return new Date().toISOString();
      if (propertyName) return generateContextualValue(propertyName);
      return schema.example || 'mock string';
    case 'integer':
    case 'number':
      return schema.example || Math.floor(Math.random() * 100);
    case 'boolean':
      return schema.example || true;
    default:
      return schema.example || `mock ${schema.type || 'value'}`;
  }
}

// Helper function for contextual value generation - works for any API
function generateContextualValue(propertyName) {
  const lowerName = propertyName.toLowerCase();
  
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
    return faker.internet.userName();
  }
  
  return `mock ${propertyName}`;
}

// Helper function to randomly choose from an array
function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Generate data from OpenAPI schema
function generateFromSchema(schema, method, path, specData = null) {
  if (!schema) return {};
  
  if (schema.$ref) {
    // Resolve $ref references
    const refPath = schema.$ref.replace('#/', '').split('/');
    let resolvedSchema = specData?.spec_data;
    
    for (const segment of refPath) {
      if (resolvedSchema && resolvedSchema[segment]) {
        resolvedSchema = resolvedSchema[segment];
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
    const result = {};
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
      if (schema.format === 'email') return 'mock@example.com';
      if (schema.format === 'date-time') return new Date().toISOString();
      return schema.example || 'mock string';
    case 'integer':
    case 'number':
      return schema.example || Math.floor(Math.random() * 100);
    case 'boolean':
      return schema.example || true;
    default:
      return schema.example || `mock ${schema.type || 'value'}`;
  }
}

// Handle all mock API requests
router.all('/*', async (req, res) => {
  try {
    const { method } = req;
    const requestPath = req.path;
    
    console.log(`Mock API request: ${method} ${requestPath}`);
    
    // Find the spec that contains this endpoint
    let matchingSpec = null;
    let matchingRoute = null;
    
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
        tip: 'Make sure you have imported an API specification that includes this endpoint'
      });
    }
    
    // Handle stateful operations - improved key generation logic
    // For POST/PUT/PATCH: use base path (e.g., /pet)
    // For GET: try both specific path and base path
    const basePath = requestPath.replace(/\/[a-f0-9-]{36}$/i, '').replace(/\/\d+$/, ''); // Remove UUID or numeric ID
    const baseDataKey = basePath || requestPath;
    
    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      // Generate proper response based on the response schema, not just the request body
      const mockResponse = generateMockResponse(matchingRoute.operation, method, requestPath, matchingSpec);
      
      // Merge request data with generated response to maintain stateful behavior
      const storedData = {
        ...mockResponse,
        ...req.body,
        id: req.body.id || mockResponse.id || uuidv4(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      mockData.set(baseDataKey, storedData);
      await storage.saveMockData(mockData);
      console.log(`Stored data for key: ${baseDataKey}`, storedData);
      
      // Return the full response with generated fields
      const response = {
        ...storedData,
        _mock: {
          endpoint: requestPath,
          method: method,
          spec: matchingSpec.name,
          timestamp: new Date().toISOString(),
          stateful: true
        }
      };
      
      const statusCode = method === 'POST' ? 201 : 200;
      return res.status(statusCode).json(response);
    }
    
    // Generate response
    let responseData;
    
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
        spec: matchingSpec.name,
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
      message: error.message,
      path: req.path,
      method: req.method
    });
  }
});

// Export function to register specs
router.registerSpec = function(specId, specData) {
  specs.set(specId, specData);
  console.log(`Registered spec for mocking: ${specData.name} (${specId})`);
};

module.exports = router;
