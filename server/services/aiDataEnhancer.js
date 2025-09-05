// AI Data Enhancer - Only handles AI-powered data generation
// Mockoon handles all standard mocking, this adds AI intelligence when available

const OpenAI = require('openai');

class AIDataEnhancer {
  constructor() {
    this.isAIAvailable = this.checkAIAvailability();
    this.openai = this.isAIAvailable ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    }) : null;
  }
  
  checkAIAvailability() {
    return process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== '';
  }

  // AI-enhanced data generation for complex scenarios
  async enhanceDataWithAI(schema, context = {}) {
    if (!this.isAIAvailable) {
      throw new Error('AI enhancement not available - OpenAI API key not configured');
    }

    try {
      const prompt = this.buildAIPrompt(schema, context);
      
      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at generating realistic, contextually appropriate mock data for APIs. Generate JSON data that matches the provided schema and context.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      const aiResponse = completion.choices[0].message.content;
      return JSON.parse(aiResponse);
      
    } catch (error) {
      console.error('AI data enhancement error:', error);
      throw error;
    }
  }

  buildAIPrompt(schema, context) {
    let prompt = `Generate realistic mock data for this JSON schema:\n\n${JSON.stringify(schema, null, 2)}\n\n`;
    
    if (context.businessDomain) {
      prompt += `Business domain: ${context.businessDomain}\n`;
    }
    
    if (context.useCase) {
      prompt += `Use case: ${context.useCase}\n`;
    }
    
    if (context.dataType) {
      prompt += `Data type focus: ${context.dataType}\n`;
    }
    
    prompt += `\nRequirements:
- Generate realistic, production-like data
- Follow the exact schema structure
- Use appropriate data types and formats
- Make data contextually relevant
- Return only valid JSON, no explanations
- Include realistic relationships between fields`;
    
    return prompt;
  }

  // Generate AI-powered test scenarios
  async generateAIScenarios(schema, count = 3) {
    if (!this.isAIAvailable) {
      return [];
    }

    const scenarios = [];
    const scenarioTypes = [
      { type: 'realistic', description: 'Typical production data' },
      { type: 'edge_case', description: 'Boundary values and edge cases' },
      { type: 'stress_test', description: 'High-volume or complex data' }
    ];

    for (let i = 0; i < Math.min(count, scenarioTypes.length); i++) {
      try {
        const scenarioType = scenarioTypes[i];
        const data = await this.enhanceDataWithAI(schema, {
          useCase: scenarioType.description,
          dataType: scenarioType.type
        });

        scenarios.push({
          id: i + 1,
          name: `AI Scenario ${i + 1}`,
          description: scenarioType.description,
          type: scenarioType.type,
          data,
          generatedBy: 'AI'
        });
      } catch (error) {
        console.error(`Failed to generate AI scenario ${i + 1}:`, error);
      }
    }

    return scenarios;
  }

  // Check if AI enhancement is available
  getStatus() {
    return {
      available: this.isAIAvailable,
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      features: this.isAIAvailable ? [
        'Context-aware data generation',
        'Business domain intelligence',
        'Advanced test scenarios',
        'Realistic data relationships'
      ] : []
    };
  }
}

module.exports = AIDataEnhancer;
