import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as yaml from 'js-yaml';
import dotenv from 'dotenv';
import PersistentStorage from '../services/persistentStorage.js';
import mockRouter from './mock.js';
import { SpecData, BackendSpecData, MockoonEnvironment, APIResponse, OpenAPISpec, HTTPMethod, SpecId, APIVersion, EndpointPath, isHTTPMethod } from '../../common/types';

// Load environment variables from .env file
dotenv.config();

const router = express.Router();
const storage = new PersistentStorage();

// Load configuration from environment variables
const config = {
  defaultDelay: parseInt(process.env.MOCK_DELAY || '0', 10),
  defaultMockMode: ['ai', 'advanced'].includes(process.env.MOCK_MODE as any) ? process.env.MOCK_MODE as 'ai' | 'advanced' : 'advanced',
  enableMockMetadata: process.env.ENABLE_MOCK_METADATA !== 'false',
  seedData: process.env.SEED_DATA === 'true',
};

// Get all specs
router.get('/', async (req: Request, res: Response<APIResponse<SpecData[]>>) => {
  try {
    const specs = await storage.getAllSpecs();
    const displaySpecs: SpecData[] = Array.from(specs.entries()).map(([id, spec]) => ({
      id: id as SpecId,
      name: spec.spec_name,
      version: spec.spec_data.info.version as APIVersion,
      endpoint_count: Object.keys(spec.spec_data.paths).reduce((count, path) => count + Object.keys(spec.spec_data.paths[path]).length, 0),
      created_at: spec.created_at,
      endpoints: Object.entries(spec.spec_data.paths || {}).flatMap(([path, methods]) =>
        Object.keys(methods || {})
          .filter(method => isHTTPMethod(method.toUpperCase()))
          .map(method => ({
            method: method.toUpperCase() as HTTPMethod,
            path: path as EndpointPath,
            summary: (methods as any)[method]?.summary || '',
            description: (methods as any)[method]?.description || '',
          }))
      ),
    }));
    res.json({
      success: true,
      data: displaySpecs,
    });
  } catch (error) {
    console.error('Error fetching specs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch specs',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get a specific spec
router.get('/:specId', async (req: Request, res: Response<APIResponse<BackendSpecData>>) => {
  try {
    const spec = await storage.getSpec(req.params.specId);
    if (!spec) {
      return res.status(404).json({
        success: false,
        error: 'Spec not found',
      });
    }
    res.json({
      success: true,
      data: spec,
    });
  } catch (error) {
    console.error('Error fetching spec:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch spec',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Create or update a spec
router.post('/', async (req: Request, res: Response<APIResponse<BackendSpecData>>) => {
  try {
    const { spec_name, spec_data, url, is_yaml } = req.body;
    if (!spec_name || (!spec_data && !url)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: spec_name and either spec_data or url',
      });
    }

    let finalSpecData: OpenAPISpec;
    if (url) {
      const response = await fetch(url);
      if (!response.ok) {
        return res.status(400).json({
          success: false,
          error: 'Failed to fetch specification from URL',
        });
      }
      const contentType = response.headers.get('content-type') || '';
      const responseText = await response.text();
      
      if (contentType.includes('yaml') || contentType.includes('yml') || responseText.trim().startsWith('openapi:')) {
        finalSpecData = yaml.load(responseText) as OpenAPISpec;
      } else {
        finalSpecData = JSON.parse(responseText);
      }
    } else {
      if (is_yaml || (typeof spec_data === 'string' && spec_data.trim().startsWith('openapi:'))) {
        finalSpecData = yaml.load(spec_data) as OpenAPISpec;
      } else {
        finalSpecData = spec_data;
      }
    }

    if (!finalSpecData) {
      return res.status(400).json({
        success: false,
        error: 'No valid specification data provided',
      });
    }

    const specId = req.body.spec_id || uuidv4();
    const now = new Date().toISOString();

    const spec: BackendSpecData = {
      spec_id: specId,
      spec_name,
      spec_data: finalSpecData,
      created_at: now,
      updated_at: now,
    };

    await storage.setSpec(specId, spec);

    if (mockRouter.registerSpec) {
      await mockRouter.registerSpec(specId, spec);
    }

    res.status(201).json({
      success: true,
      data: spec,
    });
  } catch (error) {
    console.error('Error creating/updating spec:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create/update spec',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Delete a spec
router.delete('/:specId', async (req: Request, res: Response<APIResponse>) => {
  try {
    const deleted = await storage.deleteSpec(req.params.specId);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Spec not found',
      });
    }
    res.json({
      success: true,
      message: 'Spec deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting spec:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete spec',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get all environments
router.get('/environments', async (req: Request, res: Response<APIResponse>) => {
  try {
    const environments = await storage.getAllEnvironments();
    res.json({
      success: true,
      data: Array.from(environments.entries()).map(([id, env]) => ({
        uuid: id,
        name: env.name,
        port: env.port,
        latency: env.latency,
      })),
    });
  } catch (error) {
    console.error('Error fetching environments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch environments',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Create or update an environment
router.post('/environments', async (req: Request, res: Response<APIResponse>) => {
  try {
    const { name, endpointPrefix = '', hostname = 'localhost' } = req.body;
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: name',
      });
    }

    const envId = req.body.uuid || uuidv4();
    const now = new Date().toISOString();

    const environment: MockoonEnvironment = {
      uuid: envId,
      name,
      endpointPrefix,
      latency: config.defaultDelay,
      port: parseInt(process.env.MOCKOON_BASE_PORT || '3001', 10),
      hostname,
      routes: [],
      proxyMode: false,
      proxyHost: '',
      proxyRemovePrefix: false,
      tlsOptions: {},
      cors: true,
      headers: [],
      proxyReqHeaders: [],
      proxyResHeaders: [],
      data: [],
      lastMigration: 1,
    };

    const environments = await storage.loadEnvironments();
    environments.set(envId, environment);
    await storage.saveEnvironments(environments);

    res.status(201).json({
      success: true,
      data: environment,
    });
  } catch (error) {
    console.error('Error creating/updating environment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create/update environment',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Delete an environment
router.delete('/environments/:envId', async (req: Request, res: Response<APIResponse>) => {
  try {
    const environments = await storage.loadEnvironments();
    const deleted = environments.delete(req.params.envId);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Environment not found',
      });
    }
    await storage.saveEnvironments(environments);
    res.json({
      success: true,
      message: 'Environment deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting environment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete environment',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;