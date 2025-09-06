import { faker } from '@faker-js/faker';
import AIDataEnhancer from './aiDataEnhancer.js';
import AdvancedDataGenerator from './advancedDataGenerator.js';
import { OpenAPISchema, GenerationContext, GenerationMode, TestScenario } from '../../common/types';

export class SmartDataGenerator {
  private aiEnhancer: AIDataEnhancer;
  private advancedGenerator: AdvancedDataGenerator;
  private defaultMode: 'ai' | 'advanced';

  constructor() {
    this.aiEnhancer = new AIDataEnhancer();
    this.advancedGenerator = new AdvancedDataGenerator();
    this.defaultMode = 'advanced'; // 'ai' or 'advanced'
  }

  // Generate data based on JSON schema with mode selection
  async generateFromSchema(schema: OpenAPISchema, context: GenerationContext = {}, specData?: any): Promise<any> {
    try {
      console.log('SmartDataGenerator.generateFromSchema called with schema:', schema);
      
      // Handle null or undefined schema
      if (!schema) {
        console.log('Schema is null/undefined, using fallback generation');
        return this.fallbackGeneration(schema);
      }
      
      // Resolve $ref if present
      if (schema.$ref && specData) {
        const resolvedSchema = this.resolveReference(schema.$ref, specData);
        if (resolvedSchema) {
          return await this.generateFromSchema(resolvedSchema, context, specData);
        }
      }
      
      // If schema has no type but has properties, assume it's an object
      if (!schema.type && schema.properties) {
        schema.type = 'object';
      }
      
      // If schema has no type but has items, assume it's an array
      if (!schema.type && schema.items) {
        schema.type = 'array';
      }
      
      // Determine generation mode
      const mode = context.generationMode || this.defaultMode;
      console.log('Generation mode:', mode, 'for schema type:', schema.type);
      
      // Route to appropriate generator based on mode
      switch (mode) {
        case 'ai':
          if (this.aiEnhancer.isAIAvailable) {
            return await this.aiEnhancer.enhanceDataWithAI(schema, context);
          }
          // Fallback to advanced if AI not available
          return await this.advancedGenerator.generateFromSchema(schema, context);
          
        case 'advanced':
        default:
          return await this.advancedGenerator.generateFromSchema(schema, context);
      }
    } catch (error) {
      console.error('Data generation error:', error);
      return this.fallbackGeneration(schema);
    }
  }


  // Generate data from schema using Faker.js with full constraint support
  private generateFromSchemaWithFaker(schema: OpenAPISchema, context: GenerationContext = {}, fakerInstance: typeof faker, specData?: any): any {
    if (!schema) return {};

    if (schema.type === 'object' && schema.properties) {
      const result: Record<string, any> = {};
      const required = schema.required || [];
      const propertyKeys = Object.keys(schema.properties);
      
      // Generate required properties first
      required.forEach(key => {
        if (schema.properties![key] && !schema.properties![key].readOnly) {
          result[key] = this.generateValueWithFaker(schema.properties![key], key, fakerInstance, specData);
        }
      });
      
      // Generate optional properties (with some probability)
      propertyKeys.forEach(key => {
        if (!required.includes(key) && !schema.properties![key].readOnly && Math.random() > 0.3) { // 70% chance for optional props
          const prop = schema.properties![key];
          result[key] = this.generateValueWithFaker(prop, key, fakerInstance, specData);
        }
      });
      
      // Respect minProperties and maxProperties
      const currentPropCount = Object.keys(result).length;
      if (schema.minProperties && currentPropCount < schema.minProperties) {
        // Add more properties to meet minimum
        const remainingProps = propertyKeys.filter(key => !(key in result) && !schema.properties![key].readOnly);
        const needed = schema.minProperties - currentPropCount;
        for (let i = 0; i < Math.min(needed, remainingProps.length); i++) {
          const key = remainingProps[i];
          result[key] = this.generateValueWithFaker(schema.properties![key], key, fakerInstance, specData);
        }
      }
      
      if (schema.maxProperties && currentPropCount > schema.maxProperties) {
        // Remove excess properties (keep required ones)
        const optionalKeys = Object.keys(result).filter(key => !required.includes(key));
        const toRemove = currentPropCount - schema.maxProperties;
        for (let i = 0; i < Math.min(toRemove, optionalKeys.length); i++) {
          delete result[optionalKeys[i]];
        }
      }
      
      return result;
    }

    if (schema.type === 'array' && schema.items) {
      const minItems = schema.minItems || 1;
      const maxItems = schema.maxItems || 3;
      const count = fakerInstance.number.int({ min: minItems, max: Math.max(minItems, maxItems) });
      const items: any[] = [];
      for (let i = 0; i < count; i++) {
        items.push(this.generateValueWithFaker(schema.items, '', fakerInstance, specData));
      }
      
      // Handle uniqueItems constraint
      if (schema.uniqueItems && items.length > 1) {
        const uniqueItems = Array.from(new Set(items.map(item => JSON.stringify(item)))).map(item => JSON.parse(item));
        return uniqueItems.slice(0, Math.max(minItems, uniqueItems.length));
      }
      
      return items;
    }

    return this.generateValueWithFaker(schema, '', fakerInstance, specData);
  }

  // Generate individual values using Faker.js with smart patterns
  private generateValueWithFaker(schema: OpenAPISchema, propertyName: string = '', fakerInstance: typeof faker, specData?: any): any {
    // Handle $ref resolution first
    if (schema.$ref && specData) {
      const resolvedSchema = this.resolveReference(schema.$ref, specData);
      if (resolvedSchema) {
        return this.generateValueWithFaker(resolvedSchema, propertyName, fakerInstance, specData);
      } else {
        // If $ref resolution fails, use fallback
        return this.fallbackGeneration(schema);
      }
    }

    // Handle schema composition first
    if (schema.allOf) {
      return this.handleAllOf(schema.allOf, propertyName, fakerInstance, specData);
    }
    if (schema.oneOf) {
      return this.handleOneOf(schema.oneOf, propertyName, fakerInstance, specData);
    }
    if (schema.anyOf) {
      return this.handleAnyOf(schema.anyOf, propertyName, fakerInstance, specData);
    }

    // Respect schema constants
    if (schema.const !== undefined) {
      return schema.const;
    }

    // Respect schema examples
    if (schema.example !== undefined) {
      return schema.example;
    }

    // Respect schema defaults
    if (schema.default !== undefined && Math.random() > 0.7) { // 30% chance to use default
      return schema.default;
    }

    // Respect schema enums
    if (schema.enum) {
      return schema.enum[Math.floor(Math.random() * schema.enum.length)];
    }

    const name = propertyName.toLowerCase();

    switch (schema.type) {
      case 'string':
        return this.generateStringWithFaker(name, schema, fakerInstance);
      case 'number':
        return this.generateNumberWithFaker(name, schema, fakerInstance);
      case 'integer':
        return this.generateIntegerWithFaker(name, schema, fakerInstance);
      case 'boolean':
        return fakerInstance.datatype.boolean();
      case 'array':
        if (schema.items) {
          const minItems = schema.minItems || 1;
          const maxItems = schema.maxItems || 3;
          const count = fakerInstance.number.int({ min: minItems, max: Math.max(minItems, maxItems) });
          const items: any[] = [];
          for (let i = 0; i < count; i++) {
            items.push(this.generateValueWithFaker(schema.items, propertyName, fakerInstance, specData));
          }
          
          // Handle uniqueItems constraint
          if (schema.uniqueItems && items.length > 1) {
            const uniqueItems = Array.from(new Set(items.map(item => JSON.stringify(item)))).map(item => JSON.parse(item));
            return uniqueItems.slice(0, Math.max(minItems, uniqueItems.length));
          }
          
          return items;
        }
        return [];
      case 'object':
        return schema.properties ? this.generateFromSchemaWithFaker(schema, {}, fakerInstance, specData) : {};
      default:
        // For undefined types, infer from property name or use fallback
        return this.generateByPropertyName(name, fakerInstance);
    }
  }

  // Smart string generation with Faker.js respecting schema constraints
  private generateStringWithFaker(name: string, schema: OpenAPISchema, fakerInstance: typeof faker): string {
    // Handle format-specific generation
    if (schema.format) {
      switch (schema.format) {
        case 'email':
          return fakerInstance.internet.email();
        case 'uri':
        case 'url':
          return fakerInstance.internet.url();
        case 'uuid':
          return fakerInstance.string.uuid();
        case 'date':
          return fakerInstance.date.recent().toISOString().split('T')[0];
        case 'date-time':
          return fakerInstance.date.recent().toISOString();
        case 'password':
          return fakerInstance.internet.password();
        case 'byte':
          return fakerInstance.string.alphanumeric(8);
        case 'binary':
          return fakerInstance.string.binary();
      }
    }
    
    // Generate based on constraints
    let result = this.generateStringByPropertyName(name, fakerInstance);
    
    // Respect minLength and maxLength
    if (schema.minLength || schema.maxLength) {
      const minLen = schema.minLength || 1;
      const maxLen = schema.maxLength || 50;
      
      if (result.length < minLen) {
        result = result.padEnd(minLen, fakerInstance.string.alpha());
      } else if (result.length > maxLen) {
        result = result.substring(0, maxLen);
      }
    }
    
    // Respect pattern (basic implementation)
    if (schema.pattern) {
      try {
        // For common patterns, generate appropriate data
        if (schema.pattern.includes('[0-9]')) {
          result = fakerInstance.string.numeric(8);
        } else if (schema.pattern.includes('[a-zA-Z]')) {
          result = fakerInstance.string.alpha(8);
        }
      } catch (e) {
        // If pattern is complex, use the generated result as-is
      }
    }
    
    return result;
  }
  
  // Generate string based on property name patterns
  private generateStringByPropertyName(name: string, fakerInstance: typeof faker): string {
    // Email patterns
    if (name.includes('email')) return fakerInstance.internet.email();
    
    // Name patterns
    if (name.includes('firstname') || name === 'first_name') return fakerInstance.person.firstName();
    if (name.includes('lastname') || name === 'last_name') return fakerInstance.person.lastName();
    if (name === 'name' || name === 'fullname') return fakerInstance.person.fullName();
    
    // Address patterns
    if (name.includes('address')) return fakerInstance.location.streetAddress();
    if (name.includes('city')) return fakerInstance.location.city();
    if (name.includes('state')) return fakerInstance.location.state();
    if (name.includes('zip') || name.includes('postal')) return fakerInstance.location.zipCode();
    if (name.includes('country')) return fakerInstance.location.country();
    
    // Phone patterns
    if (name.includes('phone') || name.includes('mobile')) return fakerInstance.phone.number();
    
    // Company patterns
    if (name.includes('company')) return fakerInstance.company.name();
    
    // Product patterns
    if (name.includes('product')) return fakerInstance.commerce.productName();
    
    // ID patterns
    if (name.includes('id') || name.includes('uuid')) return fakerInstance.string.uuid();
    
    // Description patterns
    if (name.includes('description') || name.includes('bio')) return fakerInstance.lorem.paragraph();
    if (name.includes('title')) return fakerInstance.lorem.sentence();
    
    // URL patterns
    if (name.includes('url') || name.includes('website')) {
      if (name.includes('photo') || name.includes('image')) {
        return fakerInstance.image.url();
      }
      return fakerInstance.internet.url();
    }
    
    // Status patterns
    if (name.includes('status')) {
      return fakerInstance.helpers.arrayElement(['active', 'inactive', 'pending', 'completed', 'draft']);
    }
    
    // Category patterns
    if (name.includes('category')) {
      return fakerInstance.commerce.department();
    }
    
    // Default
    return fakerInstance.lorem.words();
  }

  // Smart number generation with Faker.js respecting schema constraints
  private generateNumberWithFaker(name: string, schema: OpenAPISchema, fakerInstance: typeof faker): number {
    const min = schema.minimum !== undefined ? schema.minimum : (name.includes('price') ? 0.01 : 0);
    const max = schema.maximum !== undefined ? schema.maximum : (name.includes('price') ? 9999.99 : 1000000);
    
    // Handle exclusive bounds
    const actualMin = schema.exclusiveMinimum ? min + 0.01 : min;
    const actualMax = schema.exclusiveMaximum ? max - 0.01 : max;
    
    // Generate based on property name patterns with constraints
    let result: number;
    
    if (name.includes('price') || name.includes('cost') || name.includes('amount')) {
      result = fakerInstance.number.float({ min: actualMin, max: actualMax, fractionDigits: 2 });
    } else if (name.includes('rating') || name.includes('score')) {
      result = fakerInstance.number.float({ min: Math.max(actualMin, 0), max: Math.min(actualMax, 5), fractionDigits: 1 });
    } else if (name.includes('percentage') || name.includes('percent')) {
      result = fakerInstance.number.float({ min: Math.max(actualMin, 0), max: Math.min(actualMax, 100), fractionDigits: 2 });
    } else {
      result = fakerInstance.number.float({ min: actualMin, max: actualMax, fractionDigits: 2 });
    }
    
    // Respect multipleOf constraint
    if (schema.multipleOf) {
      result = Math.round(result / schema.multipleOf) * schema.multipleOf;
    }
    
    return result;
  }
  
  // Smart integer generation with Faker.js respecting schema constraints
  private generateIntegerWithFaker(name: string, schema: OpenAPISchema, fakerInstance: typeof faker): number {
    const min = schema.minimum !== undefined ? schema.minimum : 0;
    const max = schema.maximum !== undefined ? schema.maximum : 1000000;
    
    // Handle exclusive bounds
    const actualMin = schema.exclusiveMinimum ? min + 1 : min;
    const actualMax = schema.exclusiveMaximum ? max - 1 : max;
    
    // Generate based on property name patterns with constraints
    let result: number;
    if (name.includes('age')) {
      result = fakerInstance.number.int({ min: Math.max(actualMin, 1), max: Math.min(actualMax, 120) });
    } else if (name.includes('count') || name.includes('quantity') || name.includes('total')) {
      result = fakerInstance.number.int({ min: Math.max(actualMin, 0), max: Math.min(actualMax, 1000) });
    } else if (name.includes('id')) {
      result = fakerInstance.number.int({ min: Math.max(actualMin, 1), max: Math.min(actualMax, 999999) });
    } else if (name.includes('year')) {
      result = fakerInstance.number.int({ min: Math.max(actualMin, 1900), max: Math.min(actualMax, 2030) });
    } else if (name.includes('month')) {
      result = fakerInstance.number.int({ min: Math.max(actualMin, 1), max: Math.min(actualMax, 12) });
    } else if (name.includes('day')) {
      result = fakerInstance.number.int({ min: Math.max(actualMin, 1), max: Math.min(actualMax, 31) });
    } else if (name.includes('port')) {
      result = fakerInstance.number.int({ min: Math.max(actualMin, 1024), max: Math.min(actualMax, 65535) });
    } else {
      result = fakerInstance.number.int({ min: actualMin, max: actualMax });
    }
    
    // Respect multipleOf constraint
    if (schema.multipleOf) {
      result = Math.round(result / schema.multipleOf) * schema.multipleOf;
    }
    
    return result;
  }
  
  // Handle schema composition - allOf (must satisfy all schemas)
  private handleAllOf(schemas: OpenAPISchema[], propertyName: string, fakerInstance: typeof faker, specData?: any): any {
    // Merge all schemas and generate data that satisfies all constraints
    const mergedSchema: OpenAPISchema = {};
    const mergedProperties: Record<string, OpenAPISchema> = {};
    
    schemas.forEach(schema => {
      if (schema.$ref && specData) {
        schema = this.resolveReference(schema.$ref, specData) || schema;
      }
      
      // Merge type (prefer most specific)
      if (schema.type && !mergedSchema.type) {
        mergedSchema.type = schema.type;
      }
      
      // Merge properties
      if (schema.properties) {
        Object.assign(mergedProperties, schema.properties);
      }
      
      // Merge constraints (use most restrictive)
      if (schema.minLength !== undefined) {
        mergedSchema.minLength = Math.max(mergedSchema.minLength || 0, schema.minLength);
      }
      if (schema.maxLength !== undefined) {
        mergedSchema.maxLength = Math.min(mergedSchema.maxLength || Infinity, schema.maxLength);
      }
      if (schema.minimum !== undefined) {
        mergedSchema.minimum = Math.max(mergedSchema.minimum || -Infinity, schema.minimum);
      }
      if (schema.maximum !== undefined) {
        mergedSchema.maximum = Math.min(mergedSchema.maximum || Infinity, schema.maximum);
      }
      
      // Merge required fields
      if (schema.required) {
        mergedSchema.required = [...(mergedSchema.required || []), ...schema.required];
      }
    });
    
    if (Object.keys(mergedProperties).length > 0) {
      mergedSchema.properties = mergedProperties;
    }
    
    return this.generateValueWithFaker(mergedSchema, propertyName, fakerInstance, specData);
  }
  
  // Handle schema composition - oneOf (must satisfy exactly one schema)
  private handleOneOf(schemas: OpenAPISchema[], propertyName: string, fakerInstance: typeof faker, specData?: any): any {
    // Pick one schema randomly and generate data for it
    const selectedSchema = schemas[fakerInstance.number.int({ min: 0, max: schemas.length - 1 })];
    return this.generateValueWithFaker(selectedSchema, propertyName, fakerInstance, specData);
  }
  
  // Handle schema composition - anyOf (must satisfy at least one schema)
  private handleAnyOf(schemas: OpenAPISchema[], propertyName: string, fakerInstance: typeof faker, specData?: any): any {
    // For simplicity, pick one schema randomly (could be enhanced to satisfy multiple)
    const selectedSchema = schemas[fakerInstance.number.int({ min: 0, max: schemas.length - 1 })];
    return this.generateValueWithFaker(selectedSchema, propertyName, fakerInstance, specData);
  }
  
  // Generate value based on property name when type is unknown
  private generateByPropertyName(name: string, fakerInstance: typeof faker): any {
    // Try to infer type from property name
    if (name.includes('email')) return fakerInstance.internet.email();
    if (name.includes('url') || name.includes('website')) return fakerInstance.internet.url();
    if (name.includes('phone')) return fakerInstance.phone.number();
    if (name.includes('date')) return fakerInstance.date.recent().toISOString();
    if (name.includes('id') && name !== 'id') return fakerInstance.string.uuid();
    if (name.includes('count') || name.includes('age') || name.includes('year')) return fakerInstance.number.int({ min: 1, max: 100 });
    if (name.includes('price') || name.includes('amount')) return fakerInstance.number.float({ min: 0.01, max: 999.99, fractionDigits: 2 });
    if (name.includes('active') || name.includes('enabled') || name.includes('visible')) return fakerInstance.datatype.boolean();
    
    // Default to string
    return this.generateStringByPropertyName(name, fakerInstance);
  }

  // Resolve $ref references in OpenAPI schemas
  private resolveReference(ref: string, specData: any): OpenAPISchema | null {
    try {
      console.log('Resolving reference:', ref, 'in specData keys:', Object.keys(specData || {}));
      
      // Remove the '#/' prefix and split the path
      const path = ref.replace('#/', '').split('/');
      let current = specData;
      
      // Navigate through the path
      for (const segment of path) {
        if (current && typeof current === 'object' && segment in current) {
          current = current[segment];
          console.log(`Found segment '${segment}', current keys:`, Object.keys(current || {}));
        } else {
          console.warn(`Could not resolve reference: ${ref} at segment '${segment}'`);
          console.warn('Available keys at this level:', Object.keys(current || {}));
          return null;
        }
      }
      
      console.log('Successfully resolved reference:', ref, 'to:', current);
      return current as OpenAPISchema;
    } catch (error) {
      console.error(`Error resolving reference ${ref}:`, error);
      return null;
    }
  }

  // Fallback generation for when schema-based fails
  private fallbackGeneration(schema: OpenAPISchema): any {
    if (schema?.type === 'object') {
      return { 
        id: faker.number.int({ min: 1, max: 1000 }),
        name: faker.person.fullName(),
        message: 'Generated mock data', 
        timestamp: new Date().toISOString() 
      };
    }
    if (schema?.type === 'array') {
      return [
        { id: faker.number.int({ min: 1, max: 1000 }), name: faker.person.fullName() },
        { id: faker.number.int({ min: 1, max: 1000 }), name: faker.person.fullName() },
        { id: faker.number.int({ min: 1, max: 1000 }), name: faker.person.fullName() }
      ];
    }
    // For undefined/null schemas, generate a reasonable default
    return {
      id: faker.number.int({ min: 1, max: 1000 }),
      name: faker.person.fullName(),
      status: faker.helpers.arrayElement(['active', 'inactive', 'pending']),
      createdAt: faker.date.recent().toISOString(),
      data: 'Generated fallback mock data'
    };
  }

  // Generate test scenarios for an API with mode support
  async generateTestScenarios(schema: OpenAPISchema, count: number = 5, mode: 'ai' | 'advanced' = 'advanced'): Promise<TestScenario[]> {
    const scenarios: TestScenario[] = [];
    
    for (let i = 0; i < count; i++) {
      try {
        const context: GenerationContext = {
          generationMode: mode,
          scenarioType: i === 0 ? 'realistic' : i === 1 ? 'edge_case' : 'varied'
        };
        
        const data = await this.generateFromSchema(schema, context);
        
        scenarios.push({
          id: i + 1,
          name: `Scenario ${i + 1}`,
          data,
          type: context.scenarioType!,
          generatedAt: new Date().toISOString()
        });
      } catch (error) {
        console.error(`Error generating scenario ${i + 1}:`, error);
        scenarios.push({
          id: i + 1,
          name: `Scenario ${i + 1}`,
          data: this.fallbackGeneration(schema),
          type: 'fallback',
          generatedAt: new Date().toISOString()
        });
      }
    }
    
    return scenarios;
  }

  // Get available generation modes
  getAvailableModes(): GenerationMode[] {
    const modes: GenerationMode[] = [
      {
        id: 'advanced',
        name: 'Advanced Generation',
        description: 'Enhanced mock data with Faker.js and smart patterns',
        available: true
      },
      {
        id: 'ai',
        name: 'AI-Powered Generation',
        description: 'Intelligent data generation using OpenAI',
        available: this.aiEnhancer.isAIAvailable
      }
    ];
    
    return modes;
  }

  // Set default generation mode
  setDefaultMode(mode: 'ai' | 'advanced'): void {
    if (['ai', 'advanced'].includes(mode)) {
      this.defaultMode = mode;
    }
  }
}

export default SmartDataGenerator;
