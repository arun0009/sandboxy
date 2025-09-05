const OpenAI = require('openai');
const AIDataEnhancer = require('./aiDataEnhancer');

class SmartDataGenerator {
  constructor() {
    this.openai = process.env.OPENAI_API_KEY ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    }) : null;
    this.aiEnhancer = new AIDataEnhancer();
    this.defaultMode = 'advanced'; // 'ai', 'advanced', or 'basic'
  }

  // Generate data based on JSON schema with mode selection
  async generateFromSchema(schema, context = {}) {
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
          // Fallback to basic if AI not available
          return await this.generateBasic(schema, context);
          
        case 'advanced':
        case 'basic':
        default:
          return await this.generateBasic(schema, context);
      }
    } catch (error) {
      console.error('Data generation error:', error);
      return this.fallbackGeneration(schema);
    }
  }

  // Basic generation - simplified without external libraries
  async generateBasic(schema, context = {}) {
    try {
      // Generate simple mock data from schema
      const generated = this.generateFromSchemaBasic(schema);
      
      // Post-process for better realism
      return this.postProcessData(generated, context);
    } catch (error) {
      console.error('Basic data generation error:', error);
      return this.fallbackGeneration(schema);
    }
  }

  // Simple schema-based generation without external libraries
  generateFromSchemaBasic(schema) {
    if (!schema) return {};
    
    if (schema.type === 'object' && schema.properties) {
      const result = {};
      Object.keys(schema.properties).forEach(key => {
        const prop = schema.properties[key];
        result[key] = this.generateValueFromType(prop, key);
      });
      return result;
    }
    
    if (schema.type === 'array' && schema.items) {
      const count = Math.min(3, Math.max(1, Math.floor(Math.random() * 3) + 1));
      const items = [];
      for (let i = 0; i < count; i++) {
        items.push(this.generateValueFromType(schema.items));
      }
      return items;
    }
    
    return this.generateValueFromType(schema);
  }
  
  generateValueFromType(schema, propertyName = '') {
    if (schema.example !== undefined) {
      return schema.example;
    }
    
    switch (schema.type) {
      case 'string':
        return this.generateRealisticString(propertyName, schema);
      case 'number':
      case 'integer':
        return this.generateRealisticNumber(propertyName, schema);
      case 'boolean':
        return Math.random() > 0.5;
      case 'array':
        if (schema.items) {
          const count = Math.min(3, Math.max(1, Math.floor(Math.random() * 3) + 1));
          const items = [];
          for (let i = 0; i < count; i++) {
            // Pass the parent property name for contextual generation of array items
            items.push(this.generateValueFromType(schema.items, propertyName));
          }
          return items;
        }
        return [];
      case 'object':
        return schema.properties ? this.generateFromSchemaBasic(schema) : {};
      default:
        return null;
    }
  }
  
  generateRealisticString(propertyName = '', schema = {}) {
    const name = propertyName.toLowerCase();
    console.log(`generateRealisticString called with propertyName: "${propertyName}" (lowercase: "${name}")`);
    
    // Email patterns
    if (name.includes('email')) {
      const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'company.com', 'techcorp.io', 'startup.co'];
      const firstNames = ['john', 'jane', 'mike', 'sarah', 'david', 'lisa', 'alex', 'emma'];
      const lastNames = ['smith', 'johnson', 'williams', 'brown', 'jones', 'garcia', 'miller', 'davis'];
      const firstName = this.randomChoice(firstNames);
      const lastName = this.randomChoice(lastNames);
      const domain = this.randomChoice(domains);
      return `${firstName}.${lastName}@${domain}`;
    }
    
    // Pet name patterns (context-aware)
    if (name === 'name' && !name.includes('user') && !name.includes('first') && !name.includes('last')) {
      // If this is likely a pet name, use pet names
      return this.randomChoice(['Buddy', 'Max', 'Bella', 'Charlie', 'Lucy', 'Cooper', 'Luna', 'Rocky', 'Daisy', 'Milo', 'Sadie', 'Tucker', 'Molly', 'Bear', 'Sophie']);
    }
    
    // Human name patterns
    if (name.includes('firstname') || name === 'first_name') {
      return this.randomChoice(['John', 'Jane', 'Michael', 'Sarah', 'David', 'Lisa', 'Alex', 'Emma', 'Chris', 'Amy']);
    }
    if (name.includes('lastname') || name === 'last_name') {
      return this.randomChoice(['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez']);
    }
    if (name === 'fullname' || (name.includes('name') && (name.includes('user') || name.includes('owner')))) {
      const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Lisa', 'Alex', 'Emma', 'Chris', 'Amy'];
      const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
      return `${this.randomChoice(firstNames)} ${this.randomChoice(lastNames)}`;
    }
    
    // Pet-specific patterns
    if (name.includes('breed')) {
      return this.randomChoice(['Golden Retriever', 'Labrador', 'German Shepherd', 'Bulldog', 'Poodle', 'Beagle', 'Rottweiler', 'Yorkshire Terrier', 'Boxer', 'Siberian Husky']);
    }
    
    // Company patterns
    if (name.includes('company')) {
      return this.randomChoice(['TechCorp Solutions', 'InnovateLab', 'DataSystems Inc', 'CloudTech LLC', 'StartupCo', 'Enterprise Solutions', 'Digital Dynamics', 'Future Systems']);
    }
    
    // Address patterns
    if (name.includes('address')) {
      const numbers = Math.floor(Math.random() * 9999) + 1;
      const streets = ['Main St', 'Oak Ave', 'Pine Rd', 'Elm Dr', 'Cedar Ln', 'Maple Way'];
      return `${numbers} ${this.randomChoice(streets)}`;
    }
    if (name.includes('city')) {
      return this.randomChoice(['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego']);
    }
    if (name.includes('state')) {
      return this.randomChoice(['CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA']);
    }
    
    // Phone patterns
    if (name.includes('phone') || name.includes('mobile')) {
      return `+1-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`;
    }
    
    // Status patterns
    if (name.includes('status')) {
      return this.randomChoice(['active', 'inactive', 'pending', 'completed', 'draft']);
    }
    
    // Category patterns
    if (name.includes('category')) {
      return this.randomChoice(['Electronics', 'Clothing', 'Books', 'Home & Garden', 'Sports', 'Automotive']);
    }
    
    // ID patterns
    if (name.includes('id') || name.includes('uuid')) {
      return this.generateUUID();
    }
    
    // Description patterns
    if (name.includes('description') || name.includes('summary')) {
      const descriptions = [
        'A comprehensive solution for modern businesses',
        'High-quality product with excellent features',
        'Innovative technology that transforms workflows',
        'User-friendly interface with powerful capabilities',
        'Reliable and efficient system for daily operations'
      ];
      return this.randomChoice(descriptions);
    }
    
    // Title patterns
    if (name.includes('title')) {
      return this.randomChoice(['Software Engineer', 'Product Manager', 'Data Analyst', 'UX Designer', 'Marketing Specialist']);
    }
    
    // URL patterns
    if (name.includes('url') || name.includes('website')) {
      // Special handling for photo/image URLs
      if (name.includes('photo') || name.includes('image')) {
        return this.randomChoice([
          'https://images.unsplash.com/photo-1552053831-71594a27632d?w=400',
          'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400',
          'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400',
          'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400',
          'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400'
        ]);
      }
      const domains = ['example.com', 'company.io', 'startup.co', 'techcorp.com'];
      return `https://www.${this.randomChoice(domains)}`;
    }
    
    // Default enum or random text
    if (schema.enum) {
      return this.randomChoice(schema.enum);
    }
    
    // Final fallback - check if this might be a URL field based on property name
    if (name.includes('url')) {
      if (name.includes('photo') || name.includes('image')) {
        return this.randomChoice([
          'https://images.unsplash.com/photo-1552053831-71594a27632d?w=400',
          'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400',
          'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400'
        ]);
      }
      return 'https://example.com';
    }
    
    return this.randomChoice(['Premium Quality', 'Professional Service', 'Advanced Technology', 'Innovative Solution', 'Reliable System']);
  }
  
  generateRealisticNumber(propertyName = '', schema = {}) {
    const name = propertyName.toLowerCase();
    
    // Age patterns - context aware
    if (name.includes('age')) {
      // If this might be a pet age, use pet age range
      return Math.floor(Math.random() * 15) + 1; // 1-15 years for pets
    }
    
    // Price patterns
    if (name.includes('price') || name.includes('cost') || name.includes('amount')) {
      return Math.round((Math.random() * 1000 + 10) * 100) / 100; // $10.00 - $1010.00
    }
    
    // Rating patterns
    if (name.includes('rating') || name.includes('score')) {
      return Math.round((Math.random() * 4 + 1) * 10) / 10; // 1.0 - 5.0
    }
    
    // Count patterns
    if (name.includes('count') || name.includes('quantity') || name.includes('total')) {
      return Math.floor(Math.random() * 100) + 1; // 1-100
    }
    
    // ID patterns
    if (name.includes('id')) {
      return Math.floor(Math.random() * 100000) + 1;
    }
    
    // Default enum or random number
    if (schema.enum) {
      return this.randomChoice(schema.enum);
    }
    
    return Math.floor(Math.random() * 1000) + 1;
  }
  
  randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
  }
  
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // AI-powered data generation
  async generateWithAI(schema, context) {
    try {
      const prompt = this.buildAIPrompt(schema, context);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a smart API data generator. Generate realistic, contextually appropriate JSON data based on the schema and context provided. Return only valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      const aiData = JSON.parse(response.choices[0].message.content);
      return this.postProcessData(aiData, context);
    } catch (error) {
      console.error('AI generation failed, falling back to schema-based:', error);
      return this.generateFromSchema(schema, { ...context, useAI: false });
    }
  }

  buildAIPrompt(schema, context) {
    let prompt = `Generate realistic data for this JSON schema:\n${JSON.stringify(schema, null, 2)}\n\n`;
    
    if (context.endpoint) {
      prompt += `Endpoint: ${context.endpoint}\n`;
    }
    
    if (context.method) {
      prompt += `HTTP Method: ${context.method}\n`;
    }
    
    if (context.businessDomain) {
      prompt += `Business Domain: ${context.businessDomain}\n`;
    }
    
    if (context.existingData) {
      prompt += `Related existing data: ${JSON.stringify(context.existingData)}\n`;
    }
    
    prompt += '\nGenerate data that is:\n';
    prompt += '- Realistic and contextually appropriate\n';
    prompt += '- Consistent with the business domain\n';
    prompt += '- Properly formatted according to the schema\n';
    prompt += '- Diverse but believable\n';
    
    return prompt;
  }

  // Enhance schema with smart faker patterns
  enhanceSchema(schema, context) {
    if (!schema || typeof schema !== 'object') return schema;

    const enhanced = JSON.parse(JSON.stringify(schema));
    
    this.enhanceProperties(enhanced, context);
    return enhanced;
  }

  enhanceProperties(obj, context, path = '') {
    if (!obj || typeof obj !== 'object') return;

    if (obj.type === 'object' && obj.properties) {
      Object.keys(obj.properties).forEach(key => {
        const property = obj.properties[key];
        const fullPath = path ? `${path}.${key}` : key;
        
        // Add smart faker patterns based on property names
        if (property.type === 'string' && !property.format && !property.enum) {
          property.faker = this.getSmartFakerPattern(key, fullPath, context);
        }
        
        this.enhanceProperties(property, context, fullPath);
      });
    } else if (obj.type === 'array' && obj.items) {
      this.enhanceProperties(obj.items, context, path);
    }
  }

  getSmartFakerPattern(fieldName, path, context) {
    const name = fieldName.toLowerCase();
    
    // Email patterns
    if (name.includes('email')) return 'internet.email';
    
    // Name patterns
    if (name.includes('firstname') || name === 'first_name') return 'person.firstName';
    if (name.includes('lastname') || name === 'last_name') return 'person.lastName';
    if (name === 'name' || name === 'fullname') return 'person.fullName';
    
    // Address patterns
    if (name.includes('address')) return 'location.streetAddress';
    if (name.includes('city')) return 'location.city';
    if (name.includes('state')) return 'location.state';
    if (name.includes('zip') || name.includes('postal')) return 'location.zipCode';
    if (name.includes('country')) return 'location.country';
    
    // Phone patterns
    if (name.includes('phone') || name.includes('mobile')) return 'phone.number';
    
    // Company patterns
    if (name.includes('company')) return 'company.name';
    if (name.includes('department')) return 'commerce.department';
    
    // Product patterns
    if (name.includes('product')) return 'commerce.productName';
    if (name.includes('price') || name.includes('amount')) return 'commerce.price';
    if (name.includes('currency')) return 'finance.currencyCode';
    
    // Date patterns
    if (name.includes('date') || name.includes('time')) return 'date.recent';
    if (name.includes('birthday') || name.includes('birth')) return 'date.birthdate';
    
    // ID patterns
    if (name.includes('id') || name.includes('uuid')) return 'string.uuid';
    
    // Description patterns
    if (name.includes('description') || name.includes('bio')) return 'lorem.paragraph';
    if (name.includes('title')) return 'lorem.sentence';
    
    // URL patterns
    if (name.includes('url') || name.includes('website')) return 'internet.url';
    if (name.includes('avatar') || name.includes('image')) return 'image.avatar';
    
    // Default to lorem words for unknown strings
    return 'lorem.words';
  }

  // Post-process generated data for better realism
  postProcessData(data, context) {
    // Simple post-processing without external dependencies
    return data;
  }

  // Fallback generation for when schema-based fails
  fallbackGeneration(schema) {
    // Ultra-simple fallback
    if (schema?.type === 'object') {
      return { message: 'Generated mock data', timestamp: new Date().toISOString() };
    }
    return { data: 'mock value' };
  }

  // Generate test scenarios for an API with mode support
  async generateTestScenarios(schema, count = 5, mode = 'basic') {
    const scenarios = [];
    
    for (let i = 0; i < count; i++) {
      try {
        const context = {
          generationMode: mode,
          scenarioType: i === 0 ? 'realistic' : i === 1 ? 'edge_case' : 'varied'
        };
        
        const data = await this.generateFromSchema(schema, context);
        
        scenarios.push({
          id: i + 1,
          name: `Scenario ${i + 1}`,
          data,
          type: context.scenarioType,
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
  getAvailableModes() {
    const modes = [
      {
        id: 'basic',
        name: 'Basic Generation',
        description: 'Simple schema-based data generation',
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
  setDefaultMode(mode) {
    if (['ai', 'basic'].includes(mode)) {
      this.defaultMode = mode;
    }
  }
}

module.exports = SmartDataGenerator;
