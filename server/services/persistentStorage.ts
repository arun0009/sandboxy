import { promises as fs } from 'fs';
import path from 'path';
import { SpecData, MockoonEnvironment } from '../../types';

export class PersistentStorage {
  private dataDir: string;
  private specsFile: string;
  private mockDataFile: string;
  private environmentsFile: string;

  constructor() {
    this.dataDir = path.join(__dirname, '../data');
    this.specsFile = path.join(this.dataDir, 'specs.json');
    this.mockDataFile = path.join(this.dataDir, 'mockData.json');
    this.environmentsFile = path.join(this.dataDir, 'environments.json');
    
    this.ensureDataDirectory();
  }

  async ensureDataDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (error: any) {
      if (error.code !== 'EEXIST') {
        console.error('Error creating data directory:', error);
      }
    }
  }

  async loadSpecs(): Promise<Map<string, SpecData>> {
    try {
      const data = await fs.readFile(this.specsFile, 'utf8');
      const parsed = JSON.parse(data);
      return new Map(Object.entries(parsed));
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return new Map(); // File doesn't exist, return empty Map
      }
      console.error('Error loading specs:', error);
      return new Map();
    }
  }

  async saveSpecs(specsMap: Map<string, SpecData>): Promise<void> {
    try {
      const obj = Object.fromEntries(specsMap);
      await fs.writeFile(this.specsFile, JSON.stringify(obj, null, 2));
    } catch (error) {
      console.error('Error saving specs:', error);
    }
  }

  async loadMockData(): Promise<Map<string, any>> {
    try {
      const data = await fs.readFile(this.mockDataFile, 'utf8');
      const parsed = JSON.parse(data);
      return new Map(Object.entries(parsed));
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return new Map(); // File doesn't exist, return empty Map
      }
      console.error('Error loading mock data:', error);
      return new Map();
    }
  }

  async saveMockData(mockDataMap: Map<string, any>): Promise<void> {
    try {
      const obj = Object.fromEntries(mockDataMap);
      await fs.writeFile(this.mockDataFile, JSON.stringify(obj, null, 2));
    } catch (error) {
      console.error('Error saving mock data:', error);
    }
  }

  async loadEnvironments(): Promise<Map<string, MockoonEnvironment>> {
    try {
      const data = await fs.readFile(this.environmentsFile, 'utf8');
      const parsed = JSON.parse(data);
      return new Map(Object.entries(parsed));
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return new Map(); // File doesn't exist, return empty Map
      }
      console.error('Error loading environments:', error);
      return new Map();
    }
  }

  async saveEnvironments(environmentsMap: Map<string, MockoonEnvironment>): Promise<void> {
    try {
      const obj = Object.fromEntries(environmentsMap);
      await fs.writeFile(this.environmentsFile, JSON.stringify(obj, null, 2));
    } catch (error) {
      console.error('Error saving environments:', error);
    }
  }

  // Helper methods for individual operations
  async getSpec(id: string): Promise<SpecData | undefined> {
    const specs = await this.loadSpecs();
    return specs.get(id);
  }

  async setSpec(id: string, spec: SpecData): Promise<void> {
    const specs = await this.loadSpecs();
    specs.set(id, spec);
    await this.saveSpecs(specs);
  }

  async deleteSpec(id: string): Promise<boolean> {
    const specs = await this.loadSpecs();
    const deleted = specs.delete(id);
    if (deleted) {
      await this.saveSpecs(specs);
    }
    return deleted;
  }

  async getMockData(key: string): Promise<any> {
    const mockData = await this.loadMockData();
    return mockData.get(key);
  }

  async setMockData(key: string, data: any): Promise<void> {
    const mockData = await this.loadMockData();
    mockData.set(key, data);
    await this.saveMockData(mockData);
  }

  async deleteMockData(key: string): Promise<boolean> {
    const mockData = await this.loadMockData();
    const deleted = mockData.delete(key);
    if (deleted) {
      await this.saveMockData(mockData);
    }
    return deleted;
  }

  async getEnvironment(id: string): Promise<MockoonEnvironment | undefined> {
    const environments = await this.loadEnvironments();
    return environments.get(id);
  }

  async setEnvironment(id: string, environment: MockoonEnvironment): Promise<void> {
    const environments = await this.loadEnvironments();
    environments.set(id, environment);
    await this.saveEnvironments(environments);
  }

  async deleteEnvironment(id: string): Promise<boolean> {
    const environments = await this.loadEnvironments();
    const deleted = environments.delete(id);
    if (deleted) {
      await this.saveEnvironments(environments);
    }
    return deleted;
  }

  // Batch operations for better performance
  async getAllSpecs(): Promise<Map<string, SpecData>> {
    return await this.loadSpecs();
  }

  async getAllMockData(): Promise<Map<string, any>> {
    return await this.loadMockData();
  }

  async getAllEnvironments(): Promise<Map<string, MockoonEnvironment>> {
    return await this.loadEnvironments();
  }

  // Clear all data (useful for testing)
  async clearAll(): Promise<void> {
    try {
      await Promise.all([
        fs.unlink(this.specsFile).catch(() => {}),
        fs.unlink(this.mockDataFile).catch(() => {}),
        fs.unlink(this.environmentsFile).catch(() => {})
      ]);
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  }
}

export default PersistentStorage;
