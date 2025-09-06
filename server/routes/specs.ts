import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
const SwaggerParser = require('swagger-parser');
import yaml from 'js-yaml';
import { broadcastUpdate } from '../services/websocket.js';
import MockoonManager from '../services/mockoonManager.js';
import PersistentStorage from '../services/persistentStorage.js';
import { OpenAPISpec, SpecData } from '../../types';

const router = express.Router();
const mockoonManager = new MockoonManager();
const storage = new PersistentStorage();

// Load persistent data on startup
let specs: Map<string, SpecData>;
let environments: Map<string, any>;

(async () => {
  specs = await storage.loadSpecs();
  environments = await storage.loadEnvironments();
})();

interface ImportSpecRequest {
  name: string;
  url?: string;
  spec?: string | object;
}

// Import OpenAPI specification
router.post('/', async (req: Request<{}, any, ImportSpecRequest>, res: Response) => {
  try {
    const { name, url, spec } = req.body;

    if (!name || (!url && !spec)) {
      return res.status(400).json({ 
        error: 'Name and either URL or spec data required' 
      });
    }

    let parsedSpec: OpenAPISpec;
    
    if (url) {
      // Parse from URL
      parsedSpec = await (SwaggerParser as any).parse(url) as OpenAPISpec;
      
      // Handle OpenAPI 3.0.4 compatibility for URL specs too
      if (parsedSpec.openapi === '3.0.4') {
        parsedSpec.openapi = '3.0.3';
      }
    } else {
      // Parse from provided spec (JSON or YAML)
      let specData: any = spec;
      
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
      
      parsedSpec = await SwaggerParser.validate(specData) as OpenAPISpec;
    }

    const specId = uuidv4();
    
    // Store the specification in memory
    const specData: SpecData = {
      spec_id: specId,
      spec_name: name,
      spec_data: parsedSpec,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    specs.set(specId, specData);
    await storage.saveSpecs(specs);

    // Create Mockoon environment
    const environment = await mockoonManager.createEnvironmentFromSpec(specId, parsedSpec, name);
    environments.set(specId, environment);
    await storage.saveEnvironments(environments);

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
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get all imported specifications
router.get('/', async (req: Request, res: Response) => {
  try {
    const specsList = Array.from(specs.values()).map(spec => ({
      id: spec.spec_id,
      name: spec.spec_name,
      version: spec.spec_data.info?.version,
      description: spec.spec_data.info?.description,
      created_at: spec.created_at,
      endpoint_count: Object.keys(spec.spec_data.paths || {}).length
    }));

    res.json(specsList);
  } catch (error) {
    console.error('Error fetching specs:', error);
    res.status(500).json({ error: 'Failed to fetch specifications' });
  }
});

// Get specific specification details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const spec = specs.get(id);
    if (!spec) {
      return res.status(404).json({ error: 'Specification not found' });
    }

    // Extract endpoints from OpenAPI spec
    const endpoints: any[] = [];
    const paths = spec.spec_data.paths || {};
    
    Object.entries(paths).forEach(([path, methods]) => {
      Object.entries(methods).forEach(([method, operation]) => {
        if (['get', 'post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) {
          endpoints.push({
            id: uuidv4(),
            spec_id: id,
            path,
            method: method.toUpperCase(),
            summary: (operation as any).summary || '',
            description: (operation as any).description || ''
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
router.delete('/:id', async (req: Request, res: Response) => {
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
router.post('/:id/start', async (req: Request, res: Response) => {
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
router.get('/:id/status', async (req: Request, res: Response) => {
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

export default router;
