import jsf from 'json-schema-faker';
import { faker } from '@faker-js/faker/locale/en';
import OpenAI from 'openai';
import { OpenAPIV3 } from 'openapi-types';
import { OpenAPISchema, GenerationContext, GenerationMode, TestScenario, AIEnhancementResult } from '../../common/types';

type Faker = typeof faker;

// Helper types to handle SchemaObject and its variants
type SchemaOrRef = OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;
type ArraySchemaObject = OpenAPIV3.ArraySchemaObject & { type: 'array' };
type NonArraySchemaObject = OpenAPIV3.NonArraySchemaObject & { type?: Exclude<OpenAPIV3.NonArraySchemaObjectType, 'array'> };

// Helper function to check if a schema is a reference
function isReference(schema: SchemaOrRef): schema is OpenAPIV3.ReferenceObject {
  return '$ref' in schema;
}

// Extend JSON Schema Faker with Faker.js
jsf.extend('faker', () => faker);

// Configure JSON Schema Faker
jsf.option({
  useDefaultValue: true,
  alwaysFakeOptionals: true,
  fixedProbabilities: true,
  useExamplesValue: true,
});

// Generic context-aware property name mappings
const PROPERTY_PATTERNS: Record<string, (faker: Faker, context?: string) => any> = {
  // Email patterns
  email: (f) => f.internet.email(),
  mail: (f) => f.internet.email(),
  
  // Name patterns - generic
  name: (f) => f.person.fullName(),
  firstname: (f) => f.person.firstName(),
  lastname: (f) => f.person.lastName(),
  username: (f) => f.internet.username(),
  
  // Phone patterns
  phone: (f) => f.phone.number(),
  mobile: (f) => f.phone.number(),
  tel: (f) => f.phone.number(),
  
  // Address patterns
  address: (f) => f.location.streetAddress(),
  street: (f) => f.location.street(),
  city: (f) => f.location.city(),
  country: (f) => f.location.country(),
  postal: (f) => f.location.zipCode(),
  
  // URL patterns - generic
  url: (f) => f.internet.url(),
  link: (f) => f.internet.url(),
  website: (f) => f.internet.url(),
  
  // ID patterns - type-aware
  id: (f, context) => {
    if (context?.includes('integer') || context?.includes('int64')) {
      return f.number.int({ min: 1, max: 999999 });
    }
    return f.string.uuid();
  },
  uuid: (f) => f.string.uuid(),
  
  // Date patterns
  date: (f) => f.date.recent().toISOString(),
  created: (f) => f.date.past().toISOString(),
  updated: (f) => f.date.recent().toISOString(),
  birth: (f) => f.date.birthdate().toISOString(),
  
  // Commerce patterns
  price: (f) => parseFloat(f.commerce.price()),
  product: (f) => f.commerce.productName(),
  department: (f) => f.commerce.department(),
  company: (f) => f.company.name(),
  
  // Lorem patterns
  description: (f) => f.lorem.paragraph(),
  content: (f) => f.lorem.paragraphs(),
  title: (f) => f.lorem.sentence(),
  
  // Tag patterns - generic
  tag: (f) => f.lorem.word(),
  tags: (f) => f.lorem.words(3).split(' '),
  
  // Image patterns - generic
  photo: (f) => f.image.url(),
  image: (f) => f.image.url(),
  picture: (f) => f.image.url(),
  avatar: (f) => f.image.avatar(),
};

export class MockDataGenerator {
  private openai?: OpenAI;
  private defaultMode: 'ai' | 'advanced';

  constructor() {
    this.defaultMode = 'advanced';
    
    // Initialize OpenAI if API key is available
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  // Main generation method
  async generateData(schema: OpenAPISchema, context: GenerationContext = {}, mode?: 'ai' | 'advanced'): Promise<any> {
    const generationMode = mode || this.defaultMode;
    
    console.log(`MockDataGenerator.generateData called with schema:`, schema);
    console.log(`Generation mode: ${generationMode} for schema type: ${schema.type}`);
    
    if (generationMode === 'ai' && this.openai) {
      try {
        return await this.generateWithAI(schema, context);
      } catch (error) {
        console.warn('AI generation failed, falling back to advanced mode:', error);
        return this.generateAdvanced(schema, context);
      }
    }
    
    return this.generateAdvanced(schema, context);
  }

  // Advanced generation using Faker.js with full constraint support
  private generateAdvanced(schema: OpenAPISchema, context: GenerationContext = {}): any {
    if (!schema) return {};

    if (schema.type === 'object' && schema.properties) {
      const result: Record<string, any> = {};
      const required = schema.required || [];
      const propertyKeys = Object.keys(schema.properties);
      
      // Generate required properties first
      required.forEach((key: string) => {
        if (schema.properties![key] && !schema.properties![key].readOnly) {
          result[key] = this.generateValue(schema.properties![key], key);
        }
      });
      
      // Generate ALL optional properties for nested objects to ensure complete data
      propertyKeys.forEach(key => {
        if (!required.includes(key) && !schema.properties![key].readOnly) {
          const prop = schema.properties![key];
          result[key] = this.generateValue(prop, key);
        }
      });
      
      return result;
    }
    
    return this.generateValue(schema, '');
  }

  // Generate value with contextual awareness
  private generateValue(schema: OpenAPISchema, propertyName: string = ''): any {
    // Handle constants only (skip examples and defaults for random generation)
    if (schema.const !== undefined) return schema.const;

    // Handle enums
    if (schema.enum && schema.enum.length > 0) {
      return faker.helpers.arrayElement(schema.enum);
    }

    // Handle arrays
    if (schema.type === 'array') {
      const minItems = schema.minItems || 1;
      const maxItems = schema.maxItems || 5;
      const itemCount = faker.number.int({ min: minItems, max: maxItems });
      
      const items: any[] = [];
      for (let i = 0; i < itemCount; i++) {
        if (schema.items) {
          items.push(this.generateValue(schema.items as OpenAPISchema, propertyName));
        }
      }
      
      return schema.uniqueItems ? [...new Set(items)] : items;
    }

    // Handle objects
    if (schema.type === 'object') {
      if (schema.properties) {
        return this.generateAdvanced(schema);
      }
      return {};
    }

    // Handle primitive types with contextual patterns
    const lowerPropertyName = propertyName.toLowerCase();
    
    // Smart pattern matching - prioritize more specific matches
    const patterns = Object.keys(PROPERTY_PATTERNS);
    
    // First, try exact matches
    let matchedPattern = patterns.find(pattern => 
      lowerPropertyName === pattern.toLowerCase()
    );
    
    // Then try word boundary matches (e.g., "photo" in "photoUrls")
    if (!matchedPattern) {
      matchedPattern = patterns.find(pattern => {
        const patternLower = pattern.toLowerCase();
        // Match if pattern appears at start of property name or after non-letter
        return lowerPropertyName.startsWith(patternLower) || 
               lowerPropertyName.includes(patternLower) && 
               (lowerPropertyName.indexOf(patternLower) === 0 || 
                !/[a-z]/.test(lowerPropertyName.charAt(lowerPropertyName.indexOf(patternLower) - 1)));
      });
    }
    
    // Finally, fall back to simple substring matching
    if (!matchedPattern) {
      matchedPattern = patterns.find(pattern => 
        lowerPropertyName.includes(pattern.toLowerCase())
      );
    }
    
    if (matchedPattern) {
      const contextInfo = `${schema.type || ''} ${schema.format || ''} ${propertyName}`.toLowerCase();
      return PROPERTY_PATTERNS[matchedPattern](faker, contextInfo);
    }

    // Handle by type and format
    switch (schema.type) {
      case 'string':
        return this.generateString(schema, propertyName);
      case 'number':
      case 'integer':
        return this.generateNumber(schema);
      case 'boolean':
        return faker.datatype.boolean();
      default:
        return null;
    }
  }

  private generateString(schema: OpenAPISchema, propertyName: string): string {
    const { format, minLength = 1, maxLength = 50, pattern } = schema;
    
    // Handle specific formats
    switch (format) {
      case 'email':
        return faker.internet.email();
      case 'uri':
      case 'url':
        return faker.internet.url();
      case 'uuid':
        return faker.string.uuid();
      case 'date':
        return faker.date.recent().toISOString().split('T')[0];
      case 'date-time':
        return faker.date.recent().toISOString();
      case 'time':
        return faker.date.recent().toTimeString().split(' ')[0];
      case 'password':
        return faker.internet.password();
      case 'byte':
        return Buffer.from(faker.lorem.words()).toString('base64');
      case 'binary':
        return faker.string.hexadecimal({ length: 16 });
      default:
        // Generate string within length constraints
        const targetLength = Math.min(maxLength, Math.max(minLength, 10));
        
        if (pattern) {
          // For patterns, generate a simple string that might match
          return faker.lorem.words().substring(0, targetLength);
        }
        
        return faker.lorem.words().substring(0, targetLength);
    }
  }

  private generateNumber(schema: OpenAPISchema): number {
    const { minimum, maximum, exclusiveMinimum, exclusiveMaximum, multipleOf } = schema;
    
    let min = minimum ?? 0;
    let max = maximum ?? 1000;
    
    if (typeof exclusiveMinimum === 'number') {
      min = schema.type === 'integer' ? exclusiveMinimum + 1 : exclusiveMinimum + 0.01;
    }
    if (typeof exclusiveMaximum === 'number') {
      max = schema.type === 'integer' ? exclusiveMaximum - 1 : exclusiveMaximum - 0.01;
    }
    
    let value = schema.type === 'integer' 
      ? faker.number.int({ min: Math.ceil(min), max: Math.floor(max) })
      : faker.number.float({ min, max, fractionDigits: 2 });
    
    if (multipleOf) {
      value = Math.round(value / multipleOf) * multipleOf;
    }
    
    return value;
  }

  // AI-powered generation
  private async generateWithAI(schema: OpenAPISchema, context: GenerationContext): Promise<any> {
    if (!this.openai) {
      throw new Error('OpenAI not initialized');
    }

    const prompt = this.buildAIPrompt(schema, context);
    
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a data generator that creates realistic mock data based on OpenAPI schemas. Return only valid JSON without any explanation.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in AI response');
      }

      return JSON.parse(content);
    } catch (error) {
      console.error('AI generation error:', error);
      throw error;
    }
  }

  private buildAIPrompt(schema: OpenAPISchema, context: GenerationContext): string {
    return `Generate realistic mock data for this OpenAPI schema:
${JSON.stringify(schema, null, 2)}

Context: ${JSON.stringify(context, null, 2)}

Requirements:
- Generate realistic, contextually appropriate data
- Follow all schema constraints (required fields, data types, formats)
- Make the data feel authentic for a real application
- Return only the JSON data, no explanations`;
  }

  // Generate test scenarios
  async generateTestScenarios(schema: OpenAPISchema, count: number = 3): Promise<TestScenario[]> {
    const scenarios: TestScenario[] = [];
    
    for (let i = 0; i < count; i++) {
      const data = await this.generateData(schema, {});
      scenarios.push({
        id: i + 1,
        name: `Test Scenario ${i + 1}`,
        data,
        type: 'generated',
        generatedAt: new Date().toISOString()
      });
    }
    
    return scenarios;
  }
}

// Convert OpenAPI schema to JSON Schema format
function convertToJsonSchema(schema: SchemaOrRef): any {
  if (isReference(schema)) {
    console.log('Unresolved $ref found:', schema.$ref);
    return schema;
  }

  const jsonSchema: any = { ...schema };
  
  // Handle allOf, oneOf, anyOf
  if (schema.allOf) {
    jsonSchema.allOf = schema.allOf.map(convertToJsonSchema);
  }
  if (schema.oneOf) {
    jsonSchema.oneOf = schema.oneOf.map(convertToJsonSchema);
  }
  if (schema.anyOf) {
    jsonSchema.anyOf = schema.anyOf.map(convertToJsonSchema);
  }
  
  // Handle array items
  if (schema.type === 'array' && schema.items) {
    jsonSchema.items = convertToJsonSchema(schema.items as SchemaOrRef);
  }
  
  // Handle properties
  if (schema.properties) {
    jsonSchema.properties = Object.entries(schema.properties).reduce((acc, [key, prop]) => {
      acc[key] = convertToJsonSchema(prop as OpenAPIV3.SchemaObject);
      return acc;
    }, {} as Record<string, any>);
  }
  
  return jsonSchema;
}

// Export functions for backward compatibility
export async function generateMockData(schema: OpenAPIV3.SchemaObject): Promise<any> {
  const generator = new MockDataGenerator();
  return generator.generateData(schema);
}

export async function generateExampleRequest(schema: OpenAPIV3.SchemaObject): Promise<any> {
  return generateMockData(schema);
}

export async function generateExampleResponse(schema: OpenAPIV3.SchemaObject): Promise<any> {
  return generateMockData(schema);
}

export default MockDataGenerator;
