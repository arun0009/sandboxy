const express = require('express');
const { v4: uuidv4 } = require('uuid');
const SwaggerParser = require('swagger-parser');
const yaml = require('js-yaml');
const { broadcastUpdate } = require('../services/websocket');
const MockoonManager = require('../services/mockoonManager');
const PersistentStorage = require('../services/persistentStorage');

const router = express.Router();
const mockoonManager = new MockoonManager();
const storage = new PersistentStorage();

// Load persistent data on startup
let specs, environments;
(async () => {
  specs = await storage.loadSpecs();
  environments = await storage.loadEnvironments();
})();

// Import OpenAPI specification
router.post('/', async (req, res) => {
  try {
    const { name, url, spec } = req.body;

    if (!name || (!url && !spec)) {
      return res.status(400).json({ 
        error: 'Name and either URL or spec data required' 
      });
    }

    let parsedSpec;
    
    if (url) {
      // Parse from URL
      parsedSpec = await SwaggerParser.parse(url);
      
      // Handle OpenAPI 3.0.4 compatibility for URL specs too
      if (parsedSpec.openapi === '3.0.4') {
        parsedSpec.openapi = '3.0.3';
      }
    } else {
      // Parse from provided spec (JSON or YAML)
      let specData = spec;
      
      // If spec is a string, try to parse as YAML first, then JSON
      if (typeof spec === 'string') {
        try {
          // Try YAML first (more common for OpenAPI)
          specData = yaml.load(spec);
        } catch (yamlError) {
          try {
            // Fallback to JSON
            specData = JSON.parse(spec);
          } catch (jsonError) {
            throw new Error('Invalid YAML or JSON format in specification');
          }
        }
      }
      
      // Handle OpenAPI 3.0.4 by converting to 3.0.3 for parser compatibility
      if (specData.openapi === '3.0.4') {
        specData.openapi = '3.0.3';
      }
      
      // Also handle newer versions that might appear
      if (specData.openapi && parseFloat(specData.openapi) > 3.03) {
        specData.openapi = '3.0.3';
      }
      
      parsedSpec = await SwaggerParser.parse(specData);
    }

    const specId = uuidv4();
    
    // Store the specification in memory
    const specData = {
      id: specId,
      name,
      version: parsedSpec.info?.version || '1.0.0',
      description: parsedSpec.info?.description || '',
      spec_data: parsedSpec,
      created_at: new Date().toISOString(),
      endpoint_count: Object.keys(parsedSpec.paths || {}).length
    };
    
    specs.set(specId, specData);
    await storage.saveSpecs(specs);

    // Create Mockoon environment
    const environment = await mockoonManager.createEnvironmentFromSpec(specId, parsedSpec, name);
    environments.set(specId, environment);
    await storage.saveEnvironments(environments);

    // Register spec with mock router for /api/mock/* endpoints
    const mockRouter = require('./mock');
    if (mockRouter.registerSpec) {
      mockRouter.registerSpec(specId, specData);
    }

    // Broadcast update
    broadcastUpdate('spec_imported', { 
      id: specId, 
      name, 
      endpointCount: Object.keys(parsedSpec.paths || {}).length 
    });

    res.json({
      id: specId,
      name,
      version: parsedSpec.info?.version,
      description: parsedSpec.info?.description,
      endpointCount: Object.keys(parsedSpec.paths || {}).length,
      message: 'API specification imported successfully'
    });

  } catch (error) {
    console.error('Spec import error:', error);
    res.status(400).json({ 
      error: 'Failed to import specification',
      details: error.message 
    });
  }
});

// Get all imported specifications
router.get('/', async (req, res) => {
  try {
    const specsList = Array.from(specs.values()).map(spec => ({
      id: spec.id,
      name: spec.name,
      version: spec.version,
      description: spec.description,
      created_at: spec.created_at,
      endpoint_count: spec.endpoint_count
    }));

    res.json(specsList);
  } catch (error) {
    console.error('Error fetching specs:', error);
    res.status(500).json({ error: 'Failed to fetch specifications' });
  }
});

// Get specific specification details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const spec = specs.get(id);
    if (!spec) {
      return res.status(404).json({ error: 'Specification not found' });
    }

    // Extract endpoints from OpenAPI spec
    const endpoints = [];
    const paths = spec.spec_data.paths || {};
    
    Object.entries(paths).forEach(([path, methods]) => {
      Object.entries(methods).forEach(([method, operation]) => {
        if (['get', 'post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) {
          endpoints.push({
            id: uuidv4(),
            spec_id: id,
            path,
            method: method.toUpperCase(),
            summary: operation.summary || '',
            description: operation.description || ''
          });
        }
      });
    });

    res.json({
      ...spec,
      endpoints
    });
  } catch (error) {
    console.error('Error fetching spec:', error);
    res.status(500).json({ error: 'Failed to fetch specification' });
  }
});

// Delete specification
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!specs.has(id)) {
      return res.status(404).json({ error: 'Specification not found' });
    }

    // Stop and remove Mockoon environment
    const environment = environments.get(id);
    if (environment) {
      await mockoonManager.stopEnvironment(environment.environmentId);
      environments.delete(id);
      await storage.saveEnvironments(environments);
    }

    specs.delete(id);
    await storage.saveSpecs(specs);
    broadcastUpdate('spec_deleted', { id });
    res.json({ message: 'Specification deleted successfully' });
  } catch (error) {
    console.error('Error deleting spec:', error);
    res.status(500).json({ error: 'Failed to delete specification' });
  }
});

// Start Mockoon environment for a specification
router.post('/:id/start', async (req, res) => {
  try {
    const { id } = req.params;
    
    const spec = specs.get(id);
    if (!spec) {
      return res.status(404).json({ error: 'Specification not found' });
    }

    const environment = environments.get(id);
    if (!environment) {
      return res.status(404).json({ error: 'Environment not found' });
    }

    // Start Mockoon environment
    const process = await mockoonManager.startEnvironment(environment.environmentFile);
    
    res.json({
      message: 'Mockoon environment started successfully',
      port: environment.port,
      environmentId: environment.environmentId
    });

  } catch (error) {
    console.error('Error starting environment:', error);
    res.status(500).json({ error: 'Failed to start Mockoon environment' });
  }
});

// Get environment status
router.get('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    
    const environment = environments.get(id);
    if (!environment) {
      return res.status(404).json({ error: 'Environment not found' });
    }

    res.json({
      environmentId: environment.environmentId,
      port: environment.port,
      status: 'ready'
    });
  } catch (error) {
    console.error('Error getting environment status:', error);
    res.status(500).json({ error: 'Failed to get environment status' });
  }
});

module.exports = router;
