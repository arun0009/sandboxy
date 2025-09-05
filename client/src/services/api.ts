import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export interface ApiSpec {
  id: string;
  name: string;
  version: string;
  description: string;
  endpoint_count: number;
  created_at: string;
}

export interface MockEndpoint {
  id: string;
  spec_id: string;
  path: string;
  method: string;
  response_schema: string;
  response_data: string;
  status_code: number;
  delay_ms: number;
  is_active: boolean;
  created_at: string;
}

export interface ApiLog {
  id: string;
  method: string;
  path: string;
  requestData: any;
  responseData: any;
  statusCode: number;
  responseTime: number;
  timestamp: string;
  specName: string;
}

export interface Analytics {
  timeframe: string;
  summary: {
    totalRequests: number;
    avgResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
  };
  methodDistribution: Array<{ method: string; count: number }>;
  statusDistribution: Array<{ status_code: number; count: number }>;
  popularEndpoints: Array<{ endpoint: string; count: number; avg_response_time: number }>;
  hourlyDistribution: Array<{ hour: string; count: number }>;
}

export const apiService = {
  // Specifications
  async getSpecs(): Promise<ApiSpec[]> {
    const response = await api.get('/specs');
    return response.data;
  },

  async getSpec(id: string): Promise<ApiSpec & { endpoints: MockEndpoint[] }> {
    const response = await api.get(`/specs/${id}`);
    return response.data;
  },

  async importSpec(data: { name: string; url?: string; spec?: any }): Promise<any> {
    const response = await api.post('/specs', data);
    return response.data;
  },

  async deleteSpec(id: string): Promise<void> {
    await api.delete(`/specs/${id}`);
  },

  async generateScenarios(id: string): Promise<any> {
    const response = await api.post(`/specs/${id}/scenarios`);
    return response.data;
  },

  // Mock data and logs
  async getMockData(params?: { endpoint_id?: string; limit?: number; offset?: number }): Promise<any[]> {
    const response = await api.get('/data', { params });
    return response.data;
  },

  async getLogs(params?: { limit?: number; offset?: number; method?: string; status_code?: number }): Promise<ApiLog[]> {
    const response = await api.get('/data/logs', { params });
    return response.data;
  },

  async getAnalytics(timeframe: string = '24h'): Promise<Analytics> {
    const response = await api.get('/data/analytics', { params: { timeframe } });
    return response.data;
  },

  async getResourceData(resourceId: string): Promise<any> {
    const response = await api.get(`/data/resource/${resourceId}`);
    return response.data;
  },

  async getGenerationModes(): Promise<any> {
    const response = await api.get('/data/generation-modes');
    return response.data;
  },

  // AI services
  async generateData(schema: any, context?: any, generationMode?: string): Promise<any> {
    const response = await api.post('/ai/generate-data', { schema, context, generationMode });
    return response.data;
  },

  async generateTestScenarios(specId: string, endpoints: any[]): Promise<any> {
    const response = await api.post('/ai/generate-scenarios', { specId, endpoints });
    return response.data;
  },

  async getAiScenarios(specId: string): Promise<any[]> {
    const response = await api.get(`/ai/scenarios/${specId}`);
    return response.data;
  },

  async analyzeApi(specId: string): Promise<any> {
    const response = await api.get(`/ai/analyze/${specId}`);
    return response.data;
  },

  async enhanceResponse(endpointId: string, baseResponse: any, context?: any): Promise<any> {
    const response = await api.post('/ai/enhance-response', { endpointId, baseResponse, context });
    return response.data;
  },

  // Mock API calls (for testing the mock endpoints)
  async callMockEndpoint(method: string, path: string, data?: any): Promise<any> {
    const mockApi = axios.create({
      baseURL: 'http://localhost:3001/api/mock',
      timeout: 10000,
    });

    const config: any = {
      method: method.toLowerCase(),
      url: path,
    };

    if (data && ['post', 'put', 'patch'].includes(method.toLowerCase())) {
      config.data = data;
    } else if (data && method.toLowerCase() === 'get') {
      config.params = data;
    }

    const response = await mockApi(config);
    return response.data;
  },
};

export default api;
