import { faker } from '@faker-js/faker';
import AIDataEnhancer from './aiDataEnhancer.js';
import { OpenAPISchema, GenerationContext, GenerationMode, TestScenario } from '../../types';

export class SmartDataGenerator {
  private aiEnhancer: AIDataEnhancer;
  private defaultMode: 'ai' | 'advanced';

  constructor() {
    this.aiEnhancer = new AIDataEnhancer();
    this.defaultMode = 'advanced'; // 'ai' or 'advanced'
  }

  // Generate data based on JSON schema with mode selection
  async generateFromSchema(schema: OpenAPISchema, context: GenerationContext = {}): Promise<any> {
    try {
      console.log('SmartDataGenerator.generateFromSchema called with schema type:', schema?.type);
      // Determine generation mode
      const mode = context.generationMode || this.defaultMode;
      console.log('Generation mode:', mode);
      
      // Route to appropriate generator based on mode
      switch (mode) {
        case 'ai':
          if (this.aiEnhancer.isAIAvailable) {
            return await this.aiEnhancer.enhanceDataWithAI(schema, context);
          }
          // Fallback to advanced if AI not available
          return await this.generateAdvanced(schema, context);
          
        case 'advanced':
        default:
          return await this.generateAdvanced(schema, context);
      }
    } catch (error) {
      console.error('Data generation error:', error);
      return this.fallbackGeneration(schema);
    }
  }

  // Advanced generation - using Faker.js directly
  private async generateAdvanced(schema: OpenAPISchema, context: GenerationContext = {}): Promise<any> {
    try {
      return this.generateFromSchemaWithFaker(schema, context, faker);
    } catch (error) {
      console.error('Advanced data generation error:', error);
      return this.fallbackGeneration(schema);
    }
  }

  // Generate data from schema using Faker.js
  private generateFromSchemaWithFaker(schema: OpenAPISchema, context: GenerationContext = {}, fakerInstance: typeof faker): any {
    if (!schema) return {};

    if (schema.type === 'object' && schema.properties) {
      const result: Record<string, any> = {};
      Object.keys(schema.properties).forEach(key => {
        const prop = schema.properties![key];
        result[key] = this.generateValueWithFaker(prop, key, fakerInstance);
      });
      return result;
    }

    if (schema.type === 'array' && schema.items) {
      const count = Math.min(3, Math.max(1, Math.floor(Math.random() * 3) + 1));
      const items: any[] = [];
      for (let i = 0; i < count; i++) {
        items.push(this.generateValueWithFaker(schema.items, '', fakerInstance));
      }
      return items;
    }

    return this.generateValueWithFaker(schema, '', fakerInstance);
  }

  // Generate individual values using Faker.js with smart patterns
  private generateValueWithFaker(schema: OpenAPISchema, propertyName: string = '', fakerInstance: typeof faker): any {
    if (schema.example !== undefined) {
      return schema.example;
    }

    if (schema.enum) {
      return schema.enum[Math.floor(Math.random() * schema.enum.length)];
    }

    const name = propertyName.toLowerCase();

    switch (schema.type) {
      case 'string':
        return this.generateStringWithFaker(name, fakerInstance);
      case 'number':
      case 'integer':
        return this.generateNumberWithFaker(name, fakerInstance);
      case 'boolean':
        return fakerInstance.datatype.boolean();
      case 'array':
        if (schema.items) {
          const count = Math.min(3, Math.max(1, Math.floor(Math.random() * 3) + 1));
          const items: any[] = [];
          for (let i = 0; i < count; i++) {
            items.push(this.generateValueWithFaker(schema.items, propertyName, fakerInstance));
          }
          return items;
        }
        return [];
      case 'object':
        return schema.properties ? this.generateFromSchemaWithFaker(schema, {}, fakerInstance) : {};
      default:
        return null;
    }
  }

  // Smart string generation with Faker.js
  private generateStringWithFaker(name: string, fakerInstance: typeof faker): string {
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

  // Smart number generation with Faker.js
  private generateNumberWithFaker(name: string, fakerInstance: typeof faker): number {
    // Age patterns
    if (name.includes('age')) return fakerInstance.number.int({ min: 1, max: 100 });
    
    // Price patterns
    if (name.includes('price') || name.includes('cost') || name.includes('amount')) {
      return parseFloat(fakerInstance.commerce.price());
    }
    
    // Rating patterns
    if (name.includes('rating') || name.includes('score')) {
      return fakerInstance.number.float({ min: 1, max: 5, fractionDigits: 1 });
    }
    
    // Count patterns
    if (name.includes('count') || name.includes('quantity') || name.includes('total')) {
      return fakerInstance.number.int({ min: 1, max: 100 });
    }
    
    // ID patterns
    if (name.includes('id')) return fakerInstance.number.int({ min: 1, max: 100000 });
    
    // Default
    return fakerInstance.number.int({ min: 1, max: 1000 });
  }

  // Fallback generation for when schema-based fails
  private fallbackGeneration(schema: OpenAPISchema): any {
    if (schema?.type === 'object') {
      return { message: 'Generated mock data', timestamp: new Date().toISOString() };
    }
    return { data: 'mock value' };
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
