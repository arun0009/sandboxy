// OpenAPI Schema Types
export interface OpenAPISchema {
  type?: string;
  properties?: Record<string, OpenAPISchema>;
  items?: OpenAPISchema;
  example?: any;
  enum?: any[];
  $ref?: string;
  format?: string;
  required?: string[];
}

export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  paths: Record<string, PathItem>;
  components?: {
    schemas?: Record<string, OpenAPISchema>;
  };
}

export interface PathItem {
  get?: Operation;
  post?: Operation;
  put?: Operation;
  patch?: Operation;
  delete?: Operation;
}

export interface Operation {
  operationId?: string;
  summary?: string;
  description?: string;
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses: Record<string, Response>;
  tags?: string[];
}

export interface Parameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  required?: boolean;
  schema: OpenAPISchema;
}

export interface RequestBody {
  content: Record<string, MediaType>;
  required?: boolean;
}

export interface Response {
  description: string;
  content?: Record<string, MediaType>;
}

export interface MediaType {
  schema: OpenAPISchema;
}

// Data Generation Types
export interface GenerationContext {
  generationMode?: 'ai' | 'advanced';
  scenarioType?: 'realistic' | 'edge_case' | 'varied';
  endpoint?: string;
  method?: string;
  businessDomain?: string;
  existingData?: any;
}

export interface GenerationMode {
  id: string;
  name: string;
  description: string;
  available: boolean;
}

export interface TestScenario {
  id: number;
  name: string;
  data: any;
  type: string;
  generatedAt: string;
}

// Mockoon Types
export interface MockoonEnvironment {
  uuid: string;
  lastMigration: number;
  name: string;
  endpointPrefix: string;
  latency: number;
  port: number;
  hostname: string;
  routes: MockoonRoute[];
  proxyMode: boolean;
  proxyHost: string;
  proxyRemovePrefix: boolean;
  tlsOptions: any;
  cors: boolean;
  headers: any[];
  proxyReqHeaders: any[];
  proxyResHeaders: any[];
  data: any[];
}

export interface MockoonRoute {
  uuid: string;
  documentation: string;
  method: string;
  endpoint: string;
  responses: MockoonResponse[];
  enabled: boolean;
  responseMode: string;
}

export interface MockoonResponse {
  uuid: string;
  body: string;
  latency: number;
  statusCode: number;
  label: string;
  headers: any[];
  bodyType: string;
  filePath: string;
  databucketID: string;
  sendFileAsBody: boolean;
  rules: any[];
  rulesOperator: string;
  disableTemplating: boolean;
  fallbackTo404: boolean;
  default: boolean;
}

// API Response Types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface SpecData {
  spec_id: string;
  spec_name: string;
  spec_data: OpenAPISpec;
  created_at: string;
  updated_at: string;
}

export interface MockData {
  [key: string]: any;
}

// AI Enhancement Types
export interface AIEnhancementResult {
  enhanced: boolean;
  data: any;
  confidence?: number;
  reasoning?: string;
}
