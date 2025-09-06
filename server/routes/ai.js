const express = require('express');
const { v4: uuidv4 } = require('uuid');
const SmartDataGenerator = require('../services/dataGenerator');

const router = express.Router();
const dataGenerator = new SmartDataGenerator();

// Check if OpenAI is available
const isAIAvailable = () => {
  return process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== '';
};

// Generate smart mock data for an endpoint
router.post('/generate-data', async (req, res) => {
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
    
    const generatedData = await dataGenerator.generateFromSchema(schema, {
      ...context,
      generationMode: actualMode,
      useAI: actualMode === 'ai' && isAIAvailable()
    });
    
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
      details: error.message 
    });
  }
});

// Generate test scenarios for multiple endpoints
router.post('/generate-scenarios', async (req, res) => {
  try {
    const { endpoints, generationMode = 'advanced' } = req.body;
    
    if (!endpoints || !Array.isArray(endpoints)) {
      return res.status(400).json({ 
        error: 'Endpoints array is required' 
      });
    }
    
    const scenarios = [];
    
    for (const endpoint of endpoints) {
      try {
        const endpointScenarios = await dataGenerator.generateTestScenarios(
          null, // No spec data needed for basic scenario generation
          endpoint,
          generationMode
        );
        
        scenarios.push({
          endpoint: `${endpoint.method} ${endpoint.path}`,
          scenarios: endpointScenarios
        });
      } catch (error) {
        console.error(`Error generating scenarios for ${endpoint.path}:`, error);
        scenarios.push({
          endpoint: `${endpoint.method} ${endpoint.path}`,
          error: error.message
        });
      }
    }
    
    const scenarioId = uuidv4();
    
    res.json({
      id: scenarioId,
      scenarios,
      generationMode,
      generatedAt: new Date().toISOString(),
      message: 'Scenarios generated - storage now handled by Mockoon data buckets'
    });
    
  } catch (error) {
    console.error('Scenario generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate scenarios',
      details: error.message 
    });
  }
});

// Get AI-generated scenarios
router.get('/scenarios/:specId', async (req, res) => {
  try {
    const { specId } = req.params;
    
    res.json({
      message: 'Scenario storage now handled by Mockoon data buckets',
      specId,
      info: 'Generated scenarios are stored within Mockoon environments',
      suggestion: 'Use the /api/specs endpoint to access your Mockoon environments and their data buckets'
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Service error' });
  }
});

// Analyze API usage patterns and suggest improvements
router.get('/analyze/:specId', async (req, res) => {
  try {
    const { specId } = req.params;
    
    res.json({
      message: 'API analysis now handled by Mockoon environments',
      specId,
      info: 'Usage statistics and data patterns are tracked within each Mockoon environment',
      suggestion: 'Check Mockoon CLI logs or GUI for detailed analytics and usage patterns',
      analyzedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze API',
      details: error.message 
    });
  }
});

// Smart response enhancement based on context
router.post('/enhance-response', async (req, res) => {
  try {
    const { schema, baseResponse, context = {} } = req.body;
    
    if (!baseResponse) {
      return res.status(400).json({ 
        error: 'Base response is required' 
      });
    }
    
    // Generate enhanced response using provided schema or base response structure
    let enhancedResponse;
    if (schema) {
      enhancedResponse = await dataGenerator.generateFromSchema(schema, {
        ...context,
        useAI: isAIAvailable(),
        existingData: baseResponse
      });
    } else {
      // Enhance based on existing response structure - fallback to basic generation
      enhancedResponse = await dataGenerator.generateFromSchema({
        type: 'object',
        properties: {
          message: { type: 'string' },
          data: { type: 'object' },
          timestamp: { type: 'string' }
        }
      }, {
        ...context,
        useAI: isAIAvailable()
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
      details: error.message 
    });
  }
});

function generateInsights(usageStats, dataPatterns) {
  const insights = [];
  
  // Analyze usage patterns
  const totalCalls = usageStats.reduce((sum, stat) => sum + stat.call_count, 0);
  const avgResponseTime = usageStats.reduce((sum, stat) => sum + (stat.avg_response_time || 0), 0) / usageStats.length;
  
  if (totalCalls === 0) {
    insights.push({
      type: 'warning',
      title: 'No API Usage Detected',
      description: 'This API specification has not been used yet. Consider testing the endpoints to validate the mock responses.',
      priority: 'medium'
    });
  }
  
  // Find most used endpoints
  const mostUsed = usageStats.filter(stat => stat.call_count > 0).slice(0, 3);
  if (mostUsed.length > 0) {
    insights.push({
      type: 'info',
      title: 'Most Popular Endpoints',
      description: `Top endpoints: ${mostUsed.map(e => `${e.method} ${e.path} (${e.call_count} calls)`).join(', ')}`,
      priority: 'low'
    });
  }
  
  // Identify slow endpoints
  const slowEndpoints = usageStats.filter(stat => stat.avg_response_time > 1000);
  if (slowEndpoints.length > 0) {
    insights.push({
      type: 'warning',
      title: 'Slow Response Times Detected',
      description: `These endpoints have high response times: ${slowEndpoints.map(e => `${e.method} ${e.path} (${Math.round(e.avg_response_time)}ms)`).join(', ')}`,
      priority: 'high'
    });
  }
  
  // Check error rates
  const highErrorEndpoints = usageStats.filter(stat => stat.error_count > stat.call_count * 0.1);
  if (highErrorEndpoints.length > 0) {
    insights.push({
      type: 'error',
      title: 'High Error Rates',
      description: `These endpoints have high error rates: ${highErrorEndpoints.map(e => `${e.method} ${e.path} (${e.error_count}/${e.call_count} errors)`).join(', ')}`,
      priority: 'high'
    });
  }
  
  // Analyze data patterns
  const endpointsWithData = dataPatterns.filter(dp => dp.stored_records > 0);
  if (endpointsWithData.length > 0) {
    insights.push({
      type: 'success',
      title: 'Stateful Data Available',
      description: `${endpointsWithData.length} endpoints have stored data, enabling realistic stateful testing.`,
      priority: 'low'
    });
  }
  
  return insights;
};

// Check AI service status
router.get('/status', async (req, res) => {
  try {
    const aiAvailable = isAIAvailable();
    const modes = dataGenerator.getAvailableModes();
    
    res.json({
      aiAvailable,
      openaiConfigured: !!process.env.OPENAI_API_KEY,
      openaiModel: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      availableModes: modes,
      defaultMode: dataGenerator.defaultMode
    });
  } catch (error) {
    console.error('AI status check error:', error);
    res.status(500).json({ 
      error: 'Failed to check AI status',
      details: error.message 
    });
  }
});

module.exports = router;
