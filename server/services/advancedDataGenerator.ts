// Advanced data generator using Faker.js with schema-aware generation
// This class handles the "advanced" mode generation with realistic, contextual data

import { faker } from '@faker-js/faker';

interface FormatInfo {
  format: string | null;
  example: any;
}

interface TestScenario {
  id: number;
  name: string;
  description: string;
  data: any;
  type: string;
}

export class AdvancedDataGenerator {
  public isAIAvailable: boolean;

  constructor() {
    this.isAIAvailable = this.checkAIAvailability();
  }
  
  checkAIAvailability(): boolean {
    return !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== '');
  }


  // Main generation method - purely schema-driven
  async generateFromSchema(schema: any, context: any = {}): Promise<any> {
    try {
      // Enhance schema with format hints and examples for better generation
      const enhancedSchema = this.enhanceSchemaWithFormats(schema, context);
      
      // Generate using enhanced schema with faker
      const generated = this.generateFromEnhancedSchema(enhancedSchema);
      
      return this.postProcessData(generated, context);
    } catch (error) {
      console.error('Advanced data generation error:', error);
      return this.fallbackGeneration(schema);
    }
  }

  private generateFromEnhancedSchema(schema: any, propertyName?: string): any {
    if (!schema) return {};
    
    // Handle schema composition (allOf, oneOf, anyOf)
    if (schema.allOf) {
      // Merge all schemas and generate from the combined schema
      const merged = this.mergeSchemas(schema.allOf);
      return this.generateFromEnhancedSchema(merged, propertyName);
    }
    
    if (schema.oneOf || schema.anyOf) {
      // Pick one schema randomly
      const options = schema.oneOf || schema.anyOf;
      const chosen = faker.helpers.arrayElement(options);
      return this.generateFromEnhancedSchema(chosen, propertyName);
    }
    
    // Handle $ref (should be resolved by caller, but just in case)
    if (schema.$ref) {
      console.warn('Unresolved $ref found:', schema.$ref);
      return {};
    }
    
    // Handle const values
    if (schema.const !== undefined) {
      return schema.const;
    }
    
    // Handle default values
    if (schema.default !== undefined) {
      return schema.default;
    }
    
    // Handle examples
    if (schema.example !== undefined) {
      return schema.example;
    }
    
    if (schema.examples && Array.isArray(schema.examples) && schema.examples.length > 0) {
      return faker.helpers.arrayElement(schema.examples);
    }
    
    // Handle enums
    if (schema.enum && Array.isArray(schema.enum) && schema.enum.length > 0) {
      return faker.helpers.arrayElement(schema.enum);
    }
    
    if (schema.type === 'object' && schema.properties) {
      const result: any = {};
      const required = schema.required || [];
      
      Object.entries(schema.properties).forEach(([key, prop]: [string, any]) => {
        // Skip readOnly properties in request generation
        if (prop.readOnly && !required.includes(key)) {
          return;
        }
        
        // Generate required properties and some optional ones
        if (required.includes(key) || faker.datatype.boolean({ probability: 0.7 })) {
          result[key] = this.generateFromEnhancedSchema(prop, key);
        }
      });
      return result;
    }
    
    if (schema.type === 'array' && schema.items) {
      const minItems = schema.minItems || 1;
      const maxItems = schema.maxItems || 3;
      const count = faker.number.int({ min: minItems, max: Math.max(minItems, maxItems) });
      
      const items = Array.from({ length: count }, () => 
        this.generateFromEnhancedSchema(schema.items, propertyName)
      );
      
      // Handle uniqueItems constraint
      if (schema.uniqueItems && schema.items.type === 'string') {
        return [...new Set(items)];
      }
      
      return items;
    }
    
    return this.generateSimpleValue(schema, propertyName);
  }
  
  private mergeSchemas(schemas: any[]): any {
    const merged: any = { type: 'object', properties: {}, required: [] };
    
    schemas.forEach(schema => {
      if (schema.type === 'object' && schema.properties) {
        Object.assign(merged.properties, schema.properties);
      }
      if (schema.required) {
        merged.required = [...new Set([...merged.required, ...schema.required])];
      }
      // Merge other schema properties
      Object.keys(schema).forEach(key => {
        if (!['properties', 'required', 'type'].includes(key)) {
          merged[key] = schema[key];
        }
      });
    });
    
    return merged;
  }

  enhanceSchemaWithFormats(schema: any, context: any): any {
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

  detectFormatAndExample(propertyName: string): FormatInfo {
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

  generateExampleForProperty(propertyName: string, propertySchema: any): any {
    const name = propertyName.toLowerCase();
    const type = propertySchema.type;
    
    if (type === 'string') {
      // Generate contextual string examples using faker
      if (name.includes('name') && !name.includes('user') && !name.includes('file')) {
        if (name.includes('first')) return faker.person.firstName();
        if (name.includes('last')) return faker.person.lastName();
        if (name.includes('company')) return faker.company.name();
        if (name.includes('product')) return faker.commerce.productName();
        // For generic 'name' fields, use appropriate context
        if (name === 'name') return faker.person.firstName(); // Good for pets, people, etc.
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
      if (name.includes('status')) {
        // Context-aware status generation
        if (propertySchema.enum) {
          return faker.helpers.arrayElement(propertySchema.enum);
        }
        return faker.helpers.arrayElement(['active', 'inactive', 'pending', 'archived']);
      }
      if (name.includes('priority')) return faker.helpers.arrayElement(['low', 'medium', 'high', 'urgent']);
      if (name.includes('category')) return faker.commerce.department();
      if (name.includes('file') || name.includes('document')) return faker.system.fileName();
      if (name.includes('mime')) return faker.system.mimeType();
      if (name.includes('agent')) return faker.internet.userAgent();
      return faker.lorem.word();
    }
    
    if (type === 'number' || type === 'integer') {
      if (name.includes('price') || name.includes('cost') || name.includes('amount')) {
        return faker.number.float({ min: 10, max: 1000, fractionDigits: 2 });
      }
      if (name.includes('rating') || name.includes('score')) {
        return faker.number.float({ min: 1, max: 5, fractionDigits: 1 });
      }
      if (name.includes('age')) return faker.number.int({ min: 18, max: 80 });
      if (name.includes('count') || name.includes('quantity') || name.includes('total')) {
        return faker.number.int({ min: 1, max: 100 });
      }
      if (name.includes('port')) return faker.number.int({ min: 1000, max: 65535 });
      if (name.includes('percent') || name.includes('percentage')) {
        return faker.number.float({ min: 0, max: 100, fractionDigits: 1 });
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

  postProcessData(data: any, context: any): any {
    if (!data || typeof data !== 'object') return data;
    
    // Convert any function values to actual generated values and enhance with context
    const processValue = (value: any, key: string | null = null): any => {
      if (typeof value === 'function') {
        return value();
      }
      if (Array.isArray(value)) {
        return value.map((item, index) => processValue(item, `${key}[${index}]`));
      }
      if (value && typeof value === 'object') {
        const processed: any = {};
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

  fallbackGeneration(schema: any): any {
    if (!schema) return {};
    
    if (schema.type === 'object' && schema.properties) {
      const result: any = {};
      Object.keys(schema.properties).forEach(key => {
        result[key] = this.generateSimpleValue(schema.properties[key]);
      });
      return result;
    }
    
    return this.generateSimpleValue(schema);
  }

  generateSimpleValue(schema: any, propertyName: string | null = null): any {
    if (!schema.type) return null;
    
    switch (schema.type) {
      case 'string':
        // Handle string constraints
        let value: string;
        
        if (propertyName) {
          const example = this.generateExampleForProperty(propertyName, schema);
          if (example) value = example;
          else value = faker.lorem.word();
        } else {
          value = faker.lorem.word();
        }
        
        // Apply string constraints
        if (schema.minLength && value.length < schema.minLength) {
          value = value.padEnd(schema.minLength, 'x');
        }
        if (schema.maxLength && value.length > schema.maxLength) {
          value = value.substring(0, schema.maxLength);
        }
        if (schema.pattern) {
          // For patterns, try to generate a matching string or fallback
          try {
            // Simple pattern matching for common cases
            if (schema.pattern.includes('[0-9]')) {
              value = faker.string.numeric(schema.minLength || 5);
            } else if (schema.pattern.includes('[a-zA-Z]')) {
              value = faker.string.alpha(schema.minLength || 5);
            }
          } catch (e) {
            // Keep the original value if pattern matching fails
          }
        }
        
        return value;
        
      case 'number':
        const min = schema.minimum !== undefined ? schema.minimum : 1;
        const max = schema.maximum !== undefined ? schema.maximum : 100;
        let numValue = faker.number.float({ 
          min: schema.exclusiveMinimum ? min + 0.01 : min,
          max: schema.exclusiveMaximum ? max - 0.01 : max,
          fractionDigits: 2 
        });
        
        if (schema.multipleOf) {
          numValue = Math.round(numValue / schema.multipleOf) * schema.multipleOf;
        }
        
        return numValue;
        
      case 'integer':
        const intMin = schema.minimum !== undefined ? schema.minimum : 1;
        const intMax = schema.maximum !== undefined ? schema.maximum : 100;
        let intValue = faker.number.int({ 
          min: schema.exclusiveMinimum ? intMin + 1 : intMin,
          max: schema.exclusiveMaximum ? intMax - 1 : intMax
        });
        
        if (schema.multipleOf) {
          intValue = Math.round(intValue / schema.multipleOf) * schema.multipleOf;
        }
        
        return intValue;
        
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
  async generateTestScenarios(schema: any, count: number = 5): Promise<TestScenario[]> {
    const scenarios: TestScenario[] = [];
    
    for (let i = 0; i < count; i++) {
      try {
        let scenario: any;
        let scenarioType: string;
        
        if (i === 0) {
          // First scenario: typical/realistic data
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
  
  async generateEdgeCaseData(schema: any): Promise<any> {
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
  
  async generateMinimalData(schema: any): Promise<any> {
    // Generate only required fields with minimal values
    if (!schema.properties) return {};
    
    const minimal: any = {};
    const required = schema.required || [];
    
    required.forEach((key: string) => {
      const prop = schema.properties[key];
      if (prop) {
        minimal[key] = this.generateMinimalValue(prop, key);
      }
    });
    
    return minimal;
  }
  
  generateMinimalValue(schema: any, propertyName: string): any {
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
  
  getScenarioDescription(type: string): string {
    const descriptions: { [key: string]: string } = {
      realistic: 'Realistic data with typical values',
      edge_case: 'Edge cases with boundary and special values',
      minimal: 'Minimal valid data with only required fields',
      varied: 'Varied realistic data for testing diversity',
      fallback: 'Simple fallback data due to generation issues'
    };
    
    return descriptions[type] || 'Generated test data';
  }
}

export default AdvancedDataGenerator;
