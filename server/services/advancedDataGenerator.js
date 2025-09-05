// Simplified data generator - Mockoon handles most data generation
// This class now focuses only on AI-enhanced data generation

const { faker } = require('@faker-js/faker');

class AIDataEnhancer {
  constructor() {
    this.isAIAvailable = this.checkAIAvailability();
  }
  
  checkAIAvailability() {
    return process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== '';
  }

  setupFactories() {
    // User factory with realistic data
    this.userFactory = {
      build: () => ({
        id: faker.string.uuid(),
        email: faker.internet.email(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        phone: faker.phone.number(),
        address: faker.location.streetAddress(),
        createdAt: faker.date.between({ from: new Date('2020-01-01'), to: new Date() }),
        isActive: faker.datatype.boolean(),
        role: faker.helpers.arrayElement(['admin', 'user', 'moderator', 'guest'])
      })
    };
    
    // Product factory
    this.productFactory = {
      build: () => ({
        id: faker.string.uuid(),
        name: faker.commerce.productName(),
        slug: faker.lorem.slug(),
        price: faker.number.float({ min: 10, max: 1000, precision: 0.01 }),
        category: faker.commerce.department(),
        description: faker.lorem.paragraph(),
        inStock: faker.datatype.boolean(),
        tags: faker.lorem.words(3).split(' ')
      })
    };
    
    // API Response factory
    this.apiResponseFactory = {
      build: () => ({
        success: faker.datatype.boolean({ probability: 0.8 }),
        message: faker.helpers.arrayElement(['Success', 'Created', 'Updated', 'Deleted', 'Error', 'Not Found']),
        timestamp: new Date().toISOString(),
        requestId: faker.string.uuid(),
        data: null // Will be populated based on context
      })
    };
  }

  // Main generation method using modern libraries
  async generateFromSchema(schema, context = {}) {
    try {
      // First try factory-based generation for common patterns
      const factoryResult = this.tryFactoryGeneration(schema, context);
      if (factoryResult) {
        return factoryResult;
      }
      
      // Enhance schema with format hints and examples for better generation
      const enhancedSchema = this.enhanceSchemaWithFormats(schema, context);
      
      // Generate using json-schema-faker with modern faker
      const generated = jsf.generate(enhancedSchema);
      
      return this.postProcessData(generated, context);
    } catch (error) {
      console.error('Advanced data generation error:', error);
      return this.fallbackGeneration(schema);
    }
  }
  
  tryFactoryGeneration(schema, context) {
    // Check if this looks like a common pattern we have factories for
    if (schema.properties) {
      const props = Object.keys(schema.properties);
      
      // User-like object
      if (props.some(p => ['email', 'firstName', 'lastName', 'name'].includes(p))) {
        return this.userFactory.build();
      }
      
      // Product-like object
      if (props.some(p => ['name', 'price', 'category', 'product'].includes(p))) {
        return this.productFactory.build();
      }
      
      // API response-like object
      if (props.some(p => ['success', 'message', 'data', 'status'].includes(p))) {
        const response = this.apiResponseFactory.build();
        response.data = context.sampleData || {};
        return response;
      }
    }
    
    return null;
  }

  enhanceSchemaWithFormats(schema, context) {
    if (!schema || typeof schema !== 'object') return schema;

    const enhanced = JSON.parse(JSON.stringify(schema));

    if (enhanced.properties) {
      Object.keys(enhanced.properties).forEach(key => {
        const prop = enhanced.properties[key];
        
        // Add format hints and examples using faker
        if (prop.type === 'string' && !prop.format) {
          const formatInfo = this.detectFormatAndExample(key);
          prop.format = formatInfo.format;
          if (!prop.example && formatInfo.example) {
            prop.example = formatInfo.example;
          }
        }
        
        // Add realistic examples for other types
        if (!prop.example && !prop.examples) {
          prop.example = this.generateExampleForProperty(key, prop);
        }
        
        // Recursively enhance nested objects
        if (prop.type === 'object' && prop.properties) {
          enhanced.properties[key] = this.enhanceSchemaWithFormats(prop, context);
        }
        
        // Enhance array items
        if (prop.type === 'array' && prop.items) {
          enhanced.properties[key].items = this.enhanceSchemaWithFormats(prop.items, context);
        }
      });
    }

    return enhanced;
  }

  detectFormatAndExample(propertyName) {
    const name = propertyName.toLowerCase();
    
    // Email patterns
    if (name.includes('email')) {
      return { format: 'email', example: faker.internet.email() };
    }
    
    // Date/time patterns
    if (name.includes('date') || name.includes('time') || name.includes('created') || name.includes('updated')) {
      return { format: 'date-time', example: faker.date.between({ from: new Date('2020-01-01'), to: new Date() }).toISOString() };
    }
    
    // URL patterns
    if (name.includes('url') || name.includes('uri') || name.includes('link') || name.includes('website')) {
      return { format: 'uri', example: faker.internet.url() };
    }
    
    // UUID/ID patterns
    if (name.includes('uuid') || (name.includes('id') && !name.includes('video') && !name.includes('audio'))) {
      return { format: 'uuid', example: faker.string.uuid() };
    }
    
    // Phone patterns
    if (name.includes('phone') || name.includes('mobile') || name.includes('tel')) {
      return { format: 'phone', example: faker.phone.number() };
    }
    
    // API Key patterns
    if (name.includes('key') || name.includes('token') || name.includes('secret')) {
      return { format: 'password', example: faker.string.alphanumeric(32) };
    }
    
    // Color patterns
    if (name.includes('color') || name.includes('colour')) {
      return { format: 'color', example: faker.color.rgb() };
    }
    
    // IP patterns
    if (name.includes('ip') || name.includes('address') && name.includes('ip')) {
      return { format: 'ipv4', example: faker.internet.ip() };
    }
    
    // MAC address patterns
    if (name.includes('mac')) {
      return { format: 'mac', example: faker.internet.mac() };
    }
    
    // Slug patterns
    if (name.includes('slug') || name.includes('handle')) {
      return { format: null, example: faker.lorem.slug() };
    }
    
    return { format: null, example: null };
  }

  generateExampleForProperty(propertyName, propertySchema) {
    const name = propertyName.toLowerCase();
    const type = propertySchema.type;
    
    if (type === 'string') {
      // Generate contextual string examples using faker
      if (name.includes('name') && !name.includes('user') && !name.includes('file')) {
        if (name.includes('first')) return faker.person.firstName();
        if (name.includes('last')) return faker.person.lastName();
        if (name.includes('company')) return faker.company.name();
        if (name.includes('product')) return faker.commerce.productName();
        return faker.person.fullName();
      }
      if (name.includes('title') || name.includes('job')) return faker.person.jobTitle();
      if (name.includes('description') || name.includes('summary')) return faker.lorem.paragraph();
      if (name.includes('address')) return faker.location.streetAddress();
      if (name.includes('city')) return faker.location.city();
      if (name.includes('state') || name.includes('province')) return faker.location.state();
      if (name.includes('country')) return faker.location.country();
      if (name.includes('zip') || name.includes('postal')) return faker.location.zipCode();
      if (name.includes('currency')) return faker.finance.currencyCode();
      if (name.includes('domain')) return faker.internet.domainName();
      if (name.includes('skill') || name.includes('technology')) return faker.hacker.noun();
      if (name.includes('language') || name.includes('programming')) return faker.helpers.arrayElement(['JavaScript', 'Python', 'Java', 'C++', 'Go', 'Rust']);
      if (name.includes('type') || name.includes('kind')) return faker.person.jobType();
      if (name.includes('status')) return faker.helpers.arrayElement(['active', 'inactive', 'pending', 'archived']);
      if (name.includes('priority')) return faker.helpers.arrayElement(['low', 'medium', 'high', 'urgent']);
      if (name.includes('category')) return faker.commerce.department();
      if (name.includes('file') || name.includes('document')) return faker.system.fileName();
      if (name.includes('mime')) return faker.system.mimeType();
      if (name.includes('agent')) return faker.internet.userAgent();
      return faker.lorem.word();
    }
    
    if (type === 'number' || type === 'integer') {
      if (name.includes('price') || name.includes('cost') || name.includes('amount')) {
        return faker.number.float({ min: 10, max: 1000, precision: 0.01 });
      }
      if (name.includes('rating') || name.includes('score')) {
        return faker.number.float({ min: 1, max: 5, precision: 0.1 });
      }
      if (name.includes('age')) return faker.number.int({ min: 18, max: 80 });
      if (name.includes('count') || name.includes('quantity') || name.includes('total')) {
        return faker.number.int({ min: 1, max: 100 });
      }
      if (name.includes('port')) return faker.number.int({ min: 1000, max: 65535 });
      if (name.includes('percent') || name.includes('percentage')) {
        return faker.number.float({ min: 0, max: 100, precision: 0.1 });
      }
      return faker.number.int({ min: 1, max: 1000 });
    }
    
    if (type === 'boolean') {
      return faker.datatype.boolean();
    }
    
    if (type === 'array') {
      return [];
    }
    
    if (type === 'object') {
      return {};
    }
    
    return null;
  }

  postProcessData(data, context) {
    if (!data || typeof data !== 'object') return data;
    
    // Convert any function values to actual generated values and enhance with context
    const processValue = (value, key = null) => {
      if (typeof value === 'function') {
        return value();
      }
      if (Array.isArray(value)) {
        return value.map((item, index) => processValue(item, `${key}[${index}]`));
      }
      if (value && typeof value === 'object') {
        const processed = {};
        Object.keys(value).forEach(objKey => {
          processed[objKey] = processValue(value[objKey], objKey);
        });
        return processed;
      }
      
      // Enhance specific values based on context
      if (key && typeof value === 'string') {
        if (key.toLowerCase().includes('created') && value.includes('T')) {
          // Ensure created dates are in the past
          return faker.date.between({ from: new Date('2020-01-01'), to: new Date() }).toISOString();
        }
        if (key.toLowerCase().includes('updated') && value.includes('T')) {
          // Ensure updated dates are more recent than created
          return faker.date.between({ from: new Date('2023-01-01'), to: new Date() }).toISOString();
        }
      }
      
      return value;
    };
    
    return processValue(data);
  }

  fallbackGeneration(schema) {
    if (!schema) return {};
    
    if (schema.type === 'object' && schema.properties) {
      const result = {};
      Object.keys(schema.properties).forEach(key => {
        result[key] = this.generateSimpleValue(schema.properties[key]);
      });
      return result;
    }
    
    return this.generateSimpleValue(schema);
  }

  generateSimpleValue(schema, propertyName = null) {
    if (!schema.type) return null;
    
    switch (schema.type) {
      case 'string':
        // Use property name context for better fallback values
        if (propertyName) {
          const example = this.generateExampleForProperty(propertyName, schema);
          if (example) return example;
        }
        return faker.lorem.word();
      case 'number':
        return faker.number.float({ min: 1, max: 100, precision: 0.01 });
      case 'integer':
        return faker.number.int({ min: 1, max: 100 });
      case 'boolean':
        return faker.datatype.boolean();
      case 'array':
        return [];
      case 'object':
        return {};
      default:
        return null;
    }
  }

  // Generate test scenarios with advanced patterns using factories and modern libraries
  async generateTestScenarios(schema, count = 5) {
    const scenarios = [];
    
    for (let i = 0; i < count; i++) {
      try {
        let scenario;
        let scenarioType;
        
        if (i === 0) {
          // First scenario: typical/realistic data using factories when possible
          scenario = await this.generateFromSchema(schema, { type: 'realistic' });
          scenarioType = 'realistic';
        } else if (i === 1) {
          // Second scenario: edge case data with boundary values
          scenario = await this.generateEdgeCaseData(schema);
          scenarioType = 'edge_case';
        } else if (i === 2) {
          // Third scenario: minimal valid data
          scenario = await this.generateMinimalData(schema);
          scenarioType = 'minimal';
        } else {
          // Remaining scenarios: varied realistic data
          scenario = await this.generateFromSchema(schema, { type: 'varied' });
          scenarioType = 'varied';
        }
        
        scenarios.push({
          id: i + 1,
          name: `Scenario ${i + 1}`,
          description: this.getScenarioDescription(scenarioType),
          data: scenario,
          type: scenarioType
        });
      } catch (error) {
        console.error(`Error generating scenario ${i + 1}:`, error);
        scenarios.push({
          id: i + 1,
          name: `Scenario ${i + 1}`,
          description: 'Fallback scenario due to generation error',
          data: this.fallbackGeneration(schema),
          type: 'fallback'
        });
      }
    }
    
    return scenarios;
  }
  
  async generateEdgeCaseData(schema) {
    // Generate edge cases with boundary values
    const edgeCase = await this.generateFromSchema(schema, { type: 'edge_case' });
    
    // Override with specific edge case values
    if (edgeCase && typeof edgeCase === 'object') {
      Object.keys(edgeCase).forEach(key => {
        const prop = schema.properties?.[key];
        if (prop) {
          if (prop.type === 'string') {
            // Random edge cases for strings
            const edgeCases = ['', 'a', 'A'.repeat(255), '特殊字符', '🚀🎉', 'null', 'undefined'];
            edgeCase[key] = faker.helpers.arrayElement(edgeCases);
          } else if (prop.type === 'number' || prop.type === 'integer') {
            // Boundary values for numbers
            const edgeCases = [0, -1, 1, 999999, -999999];
            edgeCase[key] = faker.helpers.arrayElement(edgeCases);
          }
        }
      });
    }
    
    return edgeCase;
  }
  
  async generateMinimalData(schema) {
    // Generate only required fields with minimal values
    if (!schema.properties) return {};
    
    const minimal = {};
    const required = schema.required || [];
    
    required.forEach(key => {
      const prop = schema.properties[key];
      if (prop) {
        minimal[key] = this.generateMinimalValue(prop, key);
      }
    });
    
    return minimal;
  }
  
  generateMinimalValue(schema, propertyName) {
    switch (schema.type) {
      case 'string':
        return schema.minLength ? 'a'.repeat(schema.minLength) : 'test';
      case 'number':
        return schema.minimum !== undefined ? schema.minimum : 1;
      case 'integer':
        return schema.minimum !== undefined ? schema.minimum : 1;
      case 'boolean':
        return false;
      case 'array':
        return [];
      case 'object':
        return {};
      default:
        return this.generateExampleForProperty(propertyName, schema);
    }
  }
  
  getScenarioDescription(type) {
    const descriptions = {
      realistic: 'Realistic data with typical values',
      edge_case: 'Edge cases with boundary and special values',
      minimal: 'Minimal valid data with only required fields',
      varied: 'Varied realistic data for testing diversity',
      fallback: 'Simple fallback data due to generation issues'
    };
    
    return descriptions[type] || 'Generated test data';
  }
}

module.exports = AIDataEnhancer;
