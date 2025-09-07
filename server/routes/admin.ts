import express from 'express';
import path from 'path';
import PersistentStorage from '../services/persistentStorage.js';

const router = express.Router();
const storage = new PersistentStorage();

// Serve admin HTML page
router.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'admin.html'));
});

// Get all specs
router.get('/specs', async (req, res) => {
  try {
    const specsMap = await storage.getAllSpecs();
    const specs = Array.from(specsMap.entries()).map(([id, spec]) => ({
      id,
      name: spec.spec_name,
      content: spec.spec_data,
      createdAt: spec.created_at,
      updatedAt: spec.updated_at
    }));
    res.json(specs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch specs' });
  }
});

// Get all mocks
router.get('/mocks', async (req, res) => {
  try {
    const mockDataMap = await storage.getAllMockData();
    const mocks: Array<{
      id: string;
      specId: string;
      endpoint: string;
      method: string;
      response: any;
      statusCode: number;
      createdAt: string;
      updatedAt: string;
    }> = [];
    
    for (const [key, data] of mockDataMap.entries()) {
      if (Array.isArray(data)) {
        data.forEach((item, index) => {
          mocks.push({
            id: `${key}_${index}`,
            specId: key.split('_')[0] || 'unknown',
            endpoint: key.split('_')[1] || '/',
            method: key.split('_')[2] || 'GET',
            response: item,
            statusCode: 200,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        });
      }
    }
    res.json(mocks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch mocks' });
  }
});

// Get settings
router.get('/settings', async (req, res) => {
  try {
    const settings = {
      autoMock: true,
      defaultDelay: 100
    };
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update settings
router.patch('/settings', async (req, res) => {
  try {
    // For now, just return the updated settings
    res.json(req.body);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Delete spec
router.delete('/specs/:id', async (req, res) => {
  try {
    const result = await storage.deleteSpec(req.params.id);
    res.json({ deleted: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete spec' });
  }
});

// Delete mock
router.delete('/mocks/:id', async (req, res) => {
  try {
    const [key] = req.params.id.split('_');
    const result = await storage.deleteMockData(key);
    res.json({ deleted: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete mock' });
  }
});

export default router;
