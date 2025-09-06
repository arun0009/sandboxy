import express, { Request, Response } from 'express';
import { GenerationMode } from '../../common/types';

const router = express.Router();

// Get all stored mock data - now handled by Mockoon data buckets
router.get('/', async (req: Request, res: Response) => {
  try {
    res.json({
      message: 'Mock data is now stored in Mockoon data buckets',
      info: 'Data persistence is handled by individual Mockoon environments',
      suggestion: 'Check your Mockoon environment endpoints directly for stateful data'
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Service error' });
  }
});

// Get API call logs - simplified response
router.get('/logs', async (req: Request, res: Response) => {
  try {
    res.json({
      message: 'API logging is now handled by Mockoon',
      info: 'Each Mockoon environment maintains its own request/response logs',
      suggestion: 'Check Mockoon CLI output or environment logs for detailed request information'
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Service error' });
  }
});

// Get analytics data - simplified response
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const { timeframe = '24h' } = req.query;
    
    res.json({
      message: 'Analytics are now handled by Mockoon environments',
      timeframe,
      info: 'Each Mockoon environment provides its own analytics and request tracking',
      suggestion: 'Use Mockoon CLI or GUI to view detailed analytics for each environment'
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Service error' });
  }
});

// Get stored data for a specific resource - simplified response
router.get('/resource/:resourceId', async (req: Request, res: Response) => {
  try {
    const { resourceId } = req.params;
    
    res.json({
      message: 'Resource data is now stored in Mockoon data buckets',
      resourceId,
      info: 'Use the appropriate Mockoon environment endpoint to access resource data',
      suggestion: 'Check /api/specs to find the correct Mockoon environment for your resource'
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Service error' });
  }
});

// Get available data generation modes
router.get('/generation-modes', async (req: Request, res: Response) => {
  try {
    const modes: GenerationMode[] = [
      {
        id: 'advanced',
        name: 'Advanced Generation',
        description: 'Enhanced mock data with Faker.js and smart patterns',
        available: true
      },
      {
        id: 'ai',
        name: 'AI-Enhanced Generation',
        description: 'AI-powered contextual data generation',
        available: !!process.env.OPENAI_API_KEY
      }
    ];

    res.json({
      modes,
      default: 'advanced',
      info: 'Data generation modes control how mock responses are created from OpenAPI schemas'
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Service error' });
  }
});

export default router;
