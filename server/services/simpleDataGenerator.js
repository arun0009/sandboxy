// Simple data generator for mock responses
// Fallback when advanced libraries aren't available

const { faker } = require('@faker-js/faker');

class SimpleDataGenerator {
  constructor() {
    this.isAIAvailable = this.checkAIAvailability();
  }
  
  checkAIAvailability() {
    return process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== '';
  }

  // Main generation method
  async generateFromSchema(schema, context = {}) {
    try {
      return this.generateFromSchemaSync(schema, context);
    } catch (error) {
      console.error('Simple data generation error:', error);
      return this.fallbackGeneration(schema);
    }
  }

  generateFromSchemaSync(schema, context = {}) {
    if (!schema) return {};
    
    if (schema.$ref) {
      // Try to resolve $ref references
      const refPath = schema.$ref.replace('#/', '').split('/');
      let resolvedSchema = context.specData?.spec_data;
      
      for (const segment of refPath) {
        if (resolvedSchema && resolvedSchema[segment]) {
          resolvedSchema = resolvedSchema[segment];
        } else {
          // Fallback if reference can't be resolved
          return { 
            id: this.generateId(), 
            name: "Mock Item", 
            status: "active",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
        }
      }
      
      return this.generateFromSchemaSync(resolvedSchema, context);
    }
    
    if (schema.type === 'array') {
      const itemSchema = schema.items || {};
      const count = Math.min(3, Math.max(1, Math.floor(Math.random() * 3) + 1));
      const items = [];
      for (let i = 0; i < count; i++) {
        // For string arrays, use the parent property name for contextual generation
        if (itemSchema.type === 'string' && context.parentPropertyName) {
          // Test direct call to contextual generation
          if (context.parentPropertyName === 'photoUrls') {
            console.log(`DIRECT FIX: Generating URL for photoUrls`);
            items.push('https://images.unsplash.com/photo-1552053831-71594a27632d?w=400');
          } else {
            items.push(this.generateContextualValueByName(context.parentPropertyName));
          }
        } else {
          items.push(this.generateFromSchemaSync(itemSchema, context));
        }
      }
      return items;
    }
    
    if (schema.type === 'object' || schema.properties) {
      const result = {};
      const properties = schema.properties || {};
      
      Object.entries(properties).forEach(([key, propSchema]) => {
        // Pass the property name as parentPropertyName for array generation
        const childContext = { ...context, parentPropertyName: key };
        console.log(`Processing property: ${key}, type: ${propSchema.type}, context:`, childContext);
        result[key] = this.generateFromSchemaSync(propSchema, childContext);
      });
      
      // Add some default values if no properties
      if (Object.keys(result).length === 0) {
        result.id = this.generateId();
        result.name = `Mock ${context.path?.split('/').pop() || 'Item'}`;
        result.status = "active";
        result.createdAt = new Date().toISOString();
        result.updatedAt = new Date().toISOString();
      }
      
      return result;
    }
    
    // Handle primitive types
    return this.generatePrimitiveValue(schema, context.parentPropertyName);
  }

  generatePrimitiveValue(schema, propertyName = null) {
    switch (schema.type) {
      case 'string':
        if (propertyName) {
          return this.generateContextualValueByName(propertyName);
        }
        return this.generateStringValue(schema);
      case 'integer':
      case 'number':
        return this.generateNumberValue(schema);
      case 'boolean':
        return Math.random() > 0.5;
      default:
        return schema.example || `mock ${schema.type || 'value'}`;
    }
  }

  generateStringValue(schema) {
    if (schema.enum) return schema.enum[Math.floor(Math.random() * schema.enum.length)];
    if (schema.example) return schema.example;
    
    // Generate based on format
    switch (schema.format) {
      case 'email':
        return this.generateEmail();
      case 'date-time':
        return new Date().toISOString();
      case 'date':
        return new Date().toISOString().split('T')[0];
      case 'uuid':
        return this.generateId();
      case 'uri':
      case 'url':
        return 'https://example.com';
      default:
        return this.generateContextualString(schema);
    }
  }

  generateNumberValue(schema) {
    if (schema.example !== undefined) return schema.example;
    
    const min = schema.minimum || 0;
    const max = schema.maximum || 1000;
    
    if (schema.type === 'integer') {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    } else {
      return Math.round((Math.random() * (max - min) + min) * 100) / 100;
    }
  }

  generateContextualString(schema) {
    // Simple contextual string generation
    const words = [
      'awesome', 'fantastic', 'amazing', 'incredible', 'wonderful',
      'great', 'excellent', 'superb', 'outstanding', 'remarkable'
    ];
    
    const adjective = words[Math.floor(Math.random() * words.length)];
    const noun = ['item', 'product', 'service', 'resource', 'entity'][Math.floor(Math.random() * 5)];
    
    return `${adjective} ${noun}`;
  }

  generateEmail() {
    const names = ['john', 'jane', 'bob', 'alice', 'charlie', 'diana'];
    const domains = ['example.com', 'test.org', 'demo.net', 'sample.io'];
    
    const name = names[Math.floor(Math.random() * names.length)];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    
    return `${name}@${domain}`;
  }

  generateId() {
    // Simple UUID-like generator
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  fallbackGeneration(schema) {
    if (!schema) return {};
    
    if (schema.type === 'object' && schema.properties) {
      const result = {};
      Object.entries(schema.properties).forEach(([key, propSchema]) => {
        result[key] = this.generateSimpleValue(propSchema, key);
      });
      return result;
    }
    
    return this.generateSimpleValue(schema);
  }

  generateSimpleValue(schema, propertyName = null) {
    if (!schema.type) return null;
    
    switch (schema.type) {
      case 'string':
        if (propertyName) {
          return this.generateContextualValueByName(propertyName);
        }
        return 'mock string';
      case 'number':
        return Math.round(Math.random() * 100 * 100) / 100;
      case 'integer':
        return Math.floor(Math.random() * 100);
      case 'boolean':
        return Math.random() > 0.5;
      case 'array':
        // Generate sample array data instead of empty array
        const itemSchema = schema.items || { type: 'string' };
        const count = Math.min(3, Math.max(1, Math.floor(Math.random() * 3) + 1));
        const items = [];
        for (let i = 0; i < count; i++) {
          // For array items, use the parent property name to determine context
          // This ensures photoUrls generates URLs, not generic strings
          if (itemSchema.type === 'string' && propertyName) {
            console.log(`FALLBACK: Generating for property "${propertyName}"`);
            if (propertyName === 'photoUrls') {
              console.log(`FALLBACK: Direct URL generation for photoUrls`);
              const urls = [
                'https://images.unsplash.com/photo-1552053831-71594a27632d?w=400',
                'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400',
                'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400'
              ];
              items.push(urls[Math.floor(Math.random() * urls.length)]);
            } else {
              const contextualValue = this.generateContextualValueByName(propertyName);
              items.push(contextualValue);
            }
          } else {
            items.push(this.generateSimpleValue(itemSchema, propertyName));
          }
        }
        return items;
      case 'object':
        if (schema.properties) {
          const result = {};
          Object.entries(schema.properties).forEach(([key, propSchema]) => {
            result[key] = this.generateSimpleValue(propSchema, key);
          });
          return result;
        }
        return {};
      default:
        return null;
    }
  }

  generateContextualValueByName(name) {
    const lowerName = name.toLowerCase();
    
    // URL patterns
    if (lowerName.includes('url') || lowerName.includes('link') || lowerName.includes('uri')) {
      if (lowerName.includes('photo') || lowerName.includes('image') || lowerName.includes('avatar')) {
        return faker.image.url({ width: 400, height: 300 });
      }
      if (lowerName.includes('video')) {
        return faker.internet.url() + '/video/' + faker.system.fileName({ extensionCount: 1 }).replace(/\.[^/.]+$/, '.mp4');
      }
      return faker.internet.url();
    }
    
    // Email patterns
    if (lowerName.includes('email')) {
      return faker.internet.email();
    }
    
    // Phone patterns
    if (lowerName.includes('phone') || lowerName.includes('mobile')) {
      return faker.phone.number();
    }
    
    // Name patterns
    if (lowerName.includes('name')) {
      if (lowerName.includes('first')) return faker.person.firstName();
      if (lowerName.includes('last')) return faker.person.lastName();
      if (lowerName.includes('full') || lowerName.includes('user')) return faker.person.fullName();
      if (lowerName.includes('company')) return faker.company.name();
      if (lowerName.includes('product')) return faker.commerce.productName();
      if (lowerName.includes('tag')) return faker.lorem.word();
      if (lowerName.includes('category')) return faker.commerce.department();
      return faker.lorem.words(2);
    }
    
    // ID patterns
    if (lowerName.includes('id')) {
      if (lowerName.includes('uuid')) return faker.string.uuid();
      return faker.number.int({ min: 1, max: 100000 });
    }
    
    // Date patterns - smart date generation
    if (lowerName.includes('date') || lowerName.includes('time')) {
      if (lowerName.includes('birth')) return faker.date.birthdate().toISOString();
      if (lowerName.includes('created') || lowerName.includes('start')) return faker.date.past().toISOString();
      if (lowerName.includes('updated') || lowerName.includes('modified')) return faker.date.recent().toISOString();
      if (lowerName.includes('future') || lowerName.includes('end')) return faker.date.future().toISOString();
      return faker.date.recent().toISOString();
    }
    
    // Other patterns
    if (lowerName.includes('title')) return faker.lorem.sentence();
    if (lowerName.includes('description') || lowerName.includes('summary')) return faker.lorem.paragraph();
    if (lowerName.includes('status')) return faker.helpers.arrayElement(['active', 'inactive', 'pending', 'completed', 'draft']);
    if (lowerName.includes('price') || lowerName.includes('cost')) return faker.commerce.price();
    if (lowerName.includes('color')) return faker.color.human();
    if (lowerName.includes('address')) return faker.location.streetAddress();
    if (lowerName.includes('city')) return faker.location.city();
    if (lowerName.includes('country')) return faker.location.country();
    
    // Fallback
    return faker.lorem.words(2);
  }

  randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  // Generate test scenarios
  async generateTestScenarios(schema, count = 3) {
    const scenarios = [];
    
    for (let i = 0; i < count; i++) {
      try {
        const scenario = await this.generateFromSchema(schema, { type: 'test' });
        scenarios.push({
          id: i + 1,
          name: `Test Scenario ${i + 1}`,
          description: `Generated test data scenario ${i + 1}`,
          data: scenario,
          type: 'test'
        });
      } catch (error) {
        console.error(`Error generating scenario ${i + 1}:`, error);
        scenarios.push({
          id: i + 1,
          name: `Fallback Scenario ${i + 1}`,
          description: 'Fallback scenario due to generation error',
          data: this.fallbackGeneration(schema),
          type: 'fallback'
        });
      }
    }
    
    return scenarios;
  }
}

module.exports = SimpleDataGenerator;
