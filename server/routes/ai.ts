import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import MockDataGenerator from '../services/mockDataGenerator';
import { OpenAPISchema, GenerationContext, GenerationMode } from '../../common/types';

const router = express.Router();
const dataGenerator = new MockDataGenerator();

interface GenerateDataRequest {
  schema: OpenAPISchema;
  context?: GenerationContext;
  generationMode?: 'ai' | 'advanced';
}

interface GenerateScenariosRequest {
  endpoints: Array<{
    method: string;
    path: string;
  }>;
  generationMode?: 'ai' | 'advanced';
}

interface EnhanceResponseRequest {
  schema?: OpenAPISchema;
  baseResponse: any;
  context?: GenerationContext;
}

// Check if OpenAI is available
const isAIAvailable = (): boolean => {
  return !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== '');
};

// Generate smart mock data for an endpoint
router.post('/generate-data', async (req: Request<{}, any, GenerateDataRequest>, res: Response) => {
  try {
    const { schema, context = {}, generationMode = 'advanced' } = req.body;
    
    if (!schema) {
      return res.status(400).json({ error: 'Schema is required' });
    }
    
    // Check if AI is requested but not available
    let actualMode = generationMode;
    if (generationMode === 'ai' && !isAIAvailable()) {
      console.warn('AI generation requested but OpenAI API key not configured. Falling back to advanced mode.');
      actualMode = 'advanced';
    }
    
    const generatedData = await dataGenerator.generateData(schema, context, actualMode);
    
    res.json({
      data: generatedData,
      generatedAt: new Date().toISOString(),
      generationMode: actualMode,
      requestedMode: generationMode,
      aiAvailable: isAIAvailable(),
      context
    });
    
  } catch (error) {
    console.error('Data generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generate test scenarios for multiple endpoints
router.post('/generate-scenarios', async (req: Request<{}, any, GenerateScenariosRequest>, res: Response) => {
  try {
    const { endpoints, generationMode = 'advanced' } = req.body;
    
    if (!endpoints || !Array.isArray(endpoints)) {
      return res.status(400).json({ 
        error: 'Endpoints array is required' 
      });
    }
    
    const scenarios: any[] = [];
    
    for (const endpoint of endpoints) {
      try {
        const endpointScenarios = await dataGenerator.generateTestScenarios({ type: 'object' }, 3);
        
        scenarios.push({
          endpoint: `${endpoint.method} ${endpoint.path}`,
          scenarios: endpointScenarios
        });
      } catch (error) {
        console.error(`Error generating scenarios for ${endpoint.path}:`, error);
        scenarios.push({
          endpoint: `${endpoint.method} ${endpoint.path}`,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    const scenarioId = uuidv4();
    
    res.json({
      id: scenarioId,
      scenarios,
      generationMode,
      generatedAt: new Date().toISOString(),
      message: 'Scenarios generated successfully'
    });
    
  } catch (error) {
    console.error('Scenario generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate scenarios',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Smart response enhancement based on context
router.post('/enhance-response', async (req: Request<{}, any, EnhanceResponseRequest>, res: Response) => {
  try {
    const { schema, baseResponse, context = {} } = req.body;
    
    if (!baseResponse) {
      return res.status(400).json({ 
        error: 'Base response is required' 
      });
    }
    
    // Generate enhanced response using provided schema or base response structure
    let enhancedResponse: any;
    if (schema) {
      enhancedResponse = await dataGenerator.generateData(schema, context, isAIAvailable() ? 'ai' : 'advanced');
    } else {
      // Enhance based on existing response structure - fallback to basic generation
      enhancedResponse = await dataGenerator.generateData({
        type: 'object',
        properties: {
          message: { type: 'string' },
          data: { type: 'object' },
          timestamp: { type: 'string' }
        }
      }, {
        ...context,
        generationMode: isAIAvailable() ? 'ai' : 'advanced'
      });
    }
    
    res.json({
      original: baseResponse,
      enhanced: enhancedResponse,
      context,
      enhancedAt: new Date().toISOString(),
      message: 'Response enhanced - consider using Mockoon templating for dynamic responses'
    });
    
  } catch (error) {
    console.error('Response enhancement error:', error);
    res.status(500).json({ 
      error: 'Failed to enhance response',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Check AI service status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const aiAvailable = isAIAvailable();
    const modes = [{ id: 'ai', name: 'AI Generation', available: !!process.env.OPENAI_API_KEY }, { id: 'advanced', name: 'Advanced Generation', available: true }];
    
    res.json({
      aiAvailable,
      openaiConfigured: !!process.env.OPENAI_API_KEY,
      openaiModel: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      availableModes: modes,
      defaultMode: 'advanced'
    });
  } catch (error) {
    console.error('AI status check error:', error);
    res.status(500).json({ 
      error: 'Failed to check AI status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generate mock data from schema endpoint
router.post('/generate-from-schema', async (req: Request, res: Response) => {
  try {
    const { schema } = req.body;
    
    if (!schema) {
      return res.status(400).json({ error: 'Schema is required' });
    }
    
    // Extract the actual schema from the API response wrapper
    const actualSchema = schema.data || schema;
    
    // Use MockDataGenerator to generate data from schema
    const generator = new MockDataGenerator();
    const mockData = await generator.generateData(actualSchema);
    
    res.json(mockData);
  } catch (error) {
    console.error('Error generating mock data from schema:', error);
    res.status(500).json({ 
      error: 'Failed to generate mock data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
