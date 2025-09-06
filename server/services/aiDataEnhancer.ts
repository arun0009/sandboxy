// AI Data Enhancer - Only handles AI-powered data generation
// Mockoon handles all standard mocking, this adds AI intelligence when available

import OpenAI from 'openai';
import { OpenAPISchema, GenerationContext, AIEnhancementResult } from '../../types';

interface AIScenario {
  id: number;
  name: string;
  description: string;
  type: string;
  data: any;
  generatedBy: string;
}

interface AIStatus {
  available: boolean;
  model: string;
  features: string[];
}

export class AIDataEnhancer {
  public readonly isAIAvailable: boolean;
  private openai: OpenAI | null;

  constructor() {
    this.isAIAvailable = this.checkAIAvailability();
    this.openai = this.isAIAvailable ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    }) : null;
  }
  
  private checkAIAvailability(): boolean {
    return !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== '');
  }

  // AI-enhanced data generation for complex scenarios
  async enhanceDataWithAI(schema: OpenAPISchema, context: GenerationContext = {}): Promise<any> {
    if (!this.isAIAvailable || !this.openai) {
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
      if (!aiResponse) {
        throw new Error('No response from AI');
      }
      
      return JSON.parse(aiResponse);
      
    } catch (error) {
      console.error('AI data enhancement error:', error);
      throw error;
    }
  }

  private buildAIPrompt(schema: OpenAPISchema, context: GenerationContext): string {
    let prompt = `Generate realistic mock data for this JSON schema:\n\n${JSON.stringify(schema, null, 2)}\n\n`;
    
    if (context.businessDomain) {
      prompt += `Business domain: ${context.businessDomain}\n`;
    }
    
    if (context.endpoint) {
      prompt += `API endpoint: ${context.endpoint}\n`;
    }
    
    if (context.method) {
      prompt += `HTTP method: ${context.method}\n`;
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
  async generateAIScenarios(schema: OpenAPISchema, count: number = 3): Promise<AIScenario[]> {
    if (!this.isAIAvailable) {
      return [];
    }

    const scenarios: AIScenario[] = [];
    const scenarioTypes = [
      { type: 'realistic', description: 'Typical production data' },
      { type: 'edge_case', description: 'Boundary values and edge cases' },
      { type: 'stress_test', description: 'High-volume or complex data' }
    ];

    for (let i = 0; i < Math.min(count, scenarioTypes.length); i++) {
      try {
        const scenarioType = scenarioTypes[i];
        const data = await this.enhanceDataWithAI(schema, {
          businessDomain: scenarioType.description,
          scenarioType: scenarioType.type as any
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
  getStatus(): AIStatus {
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

export default AIDataEnhancer;
