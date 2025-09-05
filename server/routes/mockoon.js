const express = require('express');
const { v4: uuidv4 } = require('uuid');
const MockoonService = require('../services/mockoonService');

const router = express.Router();
const mockoonService = new MockoonService();

// Check Mockoon availability
router.get('/status', async (req, res) => {
  try {
    const isAvailable = await mockoonService.checkMockoonAvailability();
    const runningInstances = mockoonService.getRunningInstances();
    
    res.json({
      available: isAvailable,
      runningInstances: runningInstances.length,
      instances: runningInstances
    });
  } catch (error) {
    console.error('Error checking Mockoon status:', error);
    res.status(500).json({ error: 'Failed to check Mockoon status' });
  }
});

// Create and start Mockoon environment from OpenAPI spec
router.post('/environments', async (req, res) => {
  try {
    res.json({
      message: 'Mockoon environment creation is now handled by the specs service',
      info: 'Upload an OpenAPI spec via /api/specs to automatically create a Mockoon environment',
      suggestion: 'Use POST /api/specs with your OpenAPI specification file'
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Service error' });
  }
});

// Stop Mockoon environment
router.delete('/environments/:environmentId', async (req, res) => {
  try {
    const { environmentId } = req.params;
    
    const stopped = await mockoonService.stopMockoonInstance(environmentId);
    
    if (stopped) {
      res.json({ 
        message: 'Mockoon environment stopped successfully',
        environmentId 
      });
    } else {
      res.status(404).json({ error: 'Mockoon environment not found or already stopped' });
    }
    
  } catch (error) {
    console.error('Error stopping Mockoon environment:', error);
    res.status(500).json({ 
      error: 'Failed to stop Mockoon environment',
      details: error.message 
    });
  }
});

// List all Mockoon environments
router.get('/environments', async (req, res) => {
  try {
    const runningInstances = mockoonService.getRunningInstances();
    
    res.json({ 
      message: 'Environment listing now handled by specs service',
      runningInstances: runningInstances.length,
      instances: runningInstances,
      suggestion: 'Use GET /api/specs to see all imported specifications and their Mockoon environments'
    });
    
  } catch (error) {
    console.error('Error listing Mockoon environments:', error);
    res.status(500).json({ error: 'Failed to list Mockoon environments' });
  }
});

// Get specific Mockoon environment
router.get('/environments/:environmentId', async (req, res) => {
  try {
    const { environmentId } = req.params;
    
    // Check if process is still running
    const isRunning = mockoonService.mockoonInstances.has(environmentId);
    
    res.json({
      environmentId,
      actualStatus: isRunning ? 'running' : 'stopped',
      message: 'Environment details now managed by specs service',
      suggestion: 'Use GET /api/specs to see detailed environment information'
    });
    
  } catch (error) {
    console.error('Error getting Mockoon environment:', error);
    res.status(500).json({ error: 'Failed to get Mockoon environment' });
  }
});

// Restart Mockoon environment
router.post('/environments/:environmentId/restart', async (req, res) => {
  try {
    const { environmentId } = req.params;
    
    res.json({
      message: 'Environment restart functionality moved to specs service',
      environmentId,
      suggestion: 'Use the specs service endpoints to manage Mockoon environments',
      info: 'Environment lifecycle is now managed through /api/specs endpoints'
    });
    
  } catch (error) {
    console.error('Error restarting Mockoon environment:', error);
    res.status(500).json({ 
      error: 'Failed to restart Mockoon environment',
      details: error.message 
    });
  }
});

module.exports = router;
