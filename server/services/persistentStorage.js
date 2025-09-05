const fs = require('fs').promises;
const path = require('path');

class PersistentStorage {
  constructor() {
    this.dataDir = path.join(__dirname, '../data');
    this.specsFile = path.join(this.dataDir, 'specs.json');
    this.mockDataFile = path.join(this.dataDir, 'mockData.json');
    this.environmentsFile = path.join(this.dataDir, 'environments.json');
    
    this.ensureDataDirectory();
  }

  async ensureDataDirectory() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        console.error('Error creating data directory:', error);
      }
    }
  }

  async loadSpecs() {
    try {
      const data = await fs.readFile(this.specsFile, 'utf8');
      const parsed = JSON.parse(data);
      return new Map(Object.entries(parsed));
    } catch (error) {
      if (error.code === 'ENOENT') {
        return new Map(); // File doesn't exist, return empty Map
      }
      console.error('Error loading specs:', error);
      return new Map();
    }
  }

  async saveSpecs(specsMap) {
    try {
      const obj = Object.fromEntries(specsMap);
      await fs.writeFile(this.specsFile, JSON.stringify(obj, null, 2));
    } catch (error) {
      console.error('Error saving specs:', error);
    }
  }

  async loadMockData() {
    try {
      const data = await fs.readFile(this.mockDataFile, 'utf8');
      const parsed = JSON.parse(data);
      return new Map(Object.entries(parsed));
    } catch (error) {
      if (error.code === 'ENOENT') {
        return new Map(); // File doesn't exist, return empty Map
      }
      console.error('Error loading mock data:', error);
      return new Map();
    }
  }

  async saveMockData(mockDataMap) {
    try {
      const obj = Object.fromEntries(mockDataMap);
      await fs.writeFile(this.mockDataFile, JSON.stringify(obj, null, 2));
    } catch (error) {
      console.error('Error saving mock data:', error);
    }
  }

  async loadEnvironments() {
    try {
      const data = await fs.readFile(this.environmentsFile, 'utf8');
      const parsed = JSON.parse(data);
      return new Map(Object.entries(parsed));
    } catch (error) {
      if (error.code === 'ENOENT') {
        return new Map(); // File doesn't exist, return empty Map
      }
      console.error('Error loading environments:', error);
      return new Map();
    }
  }

  async saveEnvironments(environmentsMap) {
    try {
      const obj = Object.fromEntries(environmentsMap);
      await fs.writeFile(this.environmentsFile, JSON.stringify(obj, null, 2));
    } catch (error) {
      console.error('Error saving environments:', error);
    }
  }

  // Helper methods for individual operations
  async getSpec(id) {
    const specs = await this.loadSpecs();
    return specs.get(id);
  }

  async setSpec(id, spec) {
    const specs = await this.loadSpecs();
    specs.set(id, spec);
    await this.saveSpecs(specs);
  }

  async deleteSpec(id) {
    const specs = await this.loadSpecs();
    const deleted = specs.delete(id);
    if (deleted) {
      await this.saveSpecs(specs);
    }
    return deleted;
  }

  async getMockData(key) {
    const mockData = await this.loadMockData();
    return mockData.get(key);
  }

  async setMockData(key, data) {
    const mockData = await this.loadMockData();
    mockData.set(key, data);
    await this.saveMockData(mockData);
  }

  async deleteMockData(key) {
    const mockData = await this.loadMockData();
    const deleted = mockData.delete(key);
    if (deleted) {
      await this.saveMockData(mockData);
    }
    return deleted;
  }

  async getEnvironment(id) {
    const environments = await this.loadEnvironments();
    return environments.get(id);
  }

  async setEnvironment(id, environment) {
    const environments = await this.loadEnvironments();
    environments.set(id, environment);
    await this.saveEnvironments(environments);
  }

  async deleteEnvironment(id) {
    const environments = await this.loadEnvironments();
    const deleted = environments.delete(id);
    if (deleted) {
      await this.saveEnvironments(environments);
    }
    return deleted;
  }

  // Batch operations for better performance
  async getAllSpecs() {
    return await this.loadSpecs();
  }

  async getAllMockData() {
    return await this.loadMockData();
  }

  async getAllEnvironments() {
    return await this.loadEnvironments();
  }

  // Clear all data (useful for testing)
  async clearAll() {
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

module.exports = PersistentStorage;
