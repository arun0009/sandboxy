import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
const dbFile = path.join(dataDir, 'db.json');

// Helper function to ensure directory exists
async function ensureDir(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }
}

// Define the database schema
type Spec = {
  id: string;
  name: string;
  content: any;
  createdAt: string;
  updatedAt: string;
};

type Mock = {
  id: string;
  specId: string;
  endpoint: string;
  method: string;
  response: any;
  statusCode: number;
  createdAt: string;
  updatedAt: string;
};

type Settings = {
  autoMock: boolean;
  defaultDelay: number;
};

type Database = {
  specs: Spec[];
  mocks: Mock[];
  settings: Settings;
};

const defaultData: Database = {
  specs: [],
  mocks: [],
  settings: {
    autoMock: true,
    defaultDelay: 100,
  },
};

let db: Database | null = null;

// Initialize the database
async function initDB() {
  try {
    await ensureDir(dataDir);
    
    try {
      const data = await fs.readFile(dbFile, 'utf-8');
      db = JSON.parse(data);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist, create with default data
        db = { ...defaultData };
        await saveDB();
      } else {
        throw error;
      }
    }
    
    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

// Save database to file
async function saveDB() {
  if (!db) throw new Error('Database not initialized');
  await fs.writeFile(dbFile, JSON.stringify(db, null, 2), 'utf-8');
}

// Database operations
const database = {
  init: initDB,
  
  // Helper methods for specs
  async getSpecs() {
    if (!db) await initDB();
    return db?.specs || [];
  },
  
  async getSpecById(id: string) {
    if (!db) await initDB();
    return db?.specs.find(spec => spec.id === id);
  },
  
  async saveSpec(spec: Omit<Spec, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) {
    if (!db) await initDB();
    if (!db) throw new Error('Database not initialized');
    
    const now = new Date().toISOString();
    const newSpec: Spec = {
      ...spec,
      id: spec.id || randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    
    // Remove existing spec with same ID if it exists
    db.specs = db.specs.filter(s => s.id !== newSpec.id);
    db.specs.push(newSpec);
    
    await saveDB();
    return newSpec;
  },
  
  // Helper methods for mocks
  async getMocks(specId?: string) {
    if (!db) await initDB();
    if (!specId) return db?.mocks || [];
    return (db?.mocks || []).filter(mock => mock.specId === specId);
  },
  
  async saveMock(mock: Omit<Mock, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) {
    if (!db) await initDB();
    if (!db) throw new Error('Database not initialized');
    
    const now = new Date().toISOString();
    const newMock: Mock = {
      ...mock,
      id: mock.id || randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    
    // Remove any existing mock for the same endpoint and method
    db.mocks = db.mocks.filter(
      m => !(m.endpoint === mock.endpoint && m.method === mock.method && m.specId === mock.specId)
    );
    
    db.mocks.push(newMock);
    await saveDB();
    return newMock;
  },

  // Delete methods
  async deleteSpec(id: string) {
    if (!db) await initDB();
    if (!db) throw new Error('Database not initialized');
    
    const initialLength = db.specs.length;
    db.specs = db.specs.filter(spec => spec.id !== id);
    
    if (db.specs.length === initialLength) {
      throw new Error('Spec not found');
    }
    
    // Also delete related mocks
    db.mocks = db.mocks.filter(mock => mock.specId !== id);
    
    await saveDB();
    return { deleted: true };
  },

  async deleteMock(id: string) {
    if (!db) await initDB();
    if (!db) throw new Error('Database not initialized');
    
    const initialLength = db.mocks.length;
    db.mocks = db.mocks.filter(mock => mock.id !== id);
    
    if (db.mocks.length === initialLength) {
      throw new Error('Mock not found');
    }
    
    await saveDB();
    return { deleted: true };
  },
  
  // Settings methods
  async getSettings() {
    if (!db) await initDB();
    return db?.settings || defaultData.settings;
  },
  
  async updateSettings(updates: Partial<Settings>) {
    if (!db) await initDB();
    if (!db) throw new Error('Database not initialized');
    
    db.settings = {
      ...db.settings,
      ...updates,
    };
    
    await saveDB();
    return db.settings;
  },
};

export default database;
