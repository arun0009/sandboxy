// TypeScript type definitions for API Sandbox (monorepo: frontend and backend)

// HTTP Methods as literal types
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

// Status badge types
export type StatusBadgeType = 'success' | 'warning' | 'error';

// Generic API Response with proper typing
export interface APIResponse<T = any> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly message?: string;
  readonly status?: number;
  readonly statusText?: string;
}

// Branded types for better type safety
export type SpecId = string & { readonly __brand: 'SpecId' };
export type EndpointPath = string & { readonly __brand: 'EndpointPath' };
export type APIVersion = string & { readonly __brand: 'APIVersion' };

// Spec data for frontend display
export interface SpecData {
  readonly id: SpecId;
  readonly name: string;
  readonly version: APIVersion;
  readonly endpoint_count: number;
  readonly created_at: string;
  readonly endpoints?: readonly EndpointData[];
}

// Spec data for backend storage (formerly SpecData in your index.ts)
export interface BackendSpecData {
  readonly spec_id: string;
  readonly spec_name: string;
  readonly spec_data: OpenAPISpec;
  readonly created_at: string;
  readonly updated_at: string;
}

// Endpoint data with method constraints
export interface EndpointData {
  readonly method: HTTPMethod;
  readonly path: EndpointPath;
  readonly summary?: string;
  readonly description?: string;
}

// Mockoon status with discriminated unions
export type MockoonStatus = 
  | { readonly available: true; readonly runningInstances: number; readonly error?: never }
  | { readonly available: false; readonly runningInstances: 0; readonly error: string };

// Generation modes with strict typing
export interface GenerationMode {
  readonly id: string; // Changed from 'ai' | 'advanced' | 'basic' to match your index.ts
  readonly name: string;
  readonly description: string;
  readonly available: boolean;
}

export interface GenerationModesResponse {
  readonly modes: readonly GenerationMode[];
}

// Test request options with method-specific body typing
export type TestRequestOptions<M extends HTTPMethod = HTTPMethod> = {
  readonly method: M;
  readonly path: EndpointPath;
} & (M extends 'GET' | 'HEAD' | 'DELETE' 
  ? { readonly body?: never }
  : { readonly body?: string });

// Fetch result with generic data typing
export interface FetchResult<T = any> {
  readonly status: number;
  readonly data: T;
}

// OpenAPI Schema and Specification Types (from your index.ts)
export interface OpenAPISchema {
  type?: string;
  properties?: Record<string, OpenAPISchema>;
  items?: OpenAPISchema;
  example?: any;
  enum?: any[];
  $ref?: string;
  format?: string;
  required?: string[];
  
  // String validation
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  
  // Number validation
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: boolean;
  exclusiveMaximum?: boolean;
  multipleOf?: number;
  
  // Array validation
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  
  // Object validation
  minProperties?: number;
  maxProperties?: number;
  additionalProperties?: boolean | OpenAPISchema;
  
  // General validation
  const?: any;
  default?: any;
  title?: string;
  description?: string;
  readOnly?: boolean;
  writeOnly?: boolean;
  deprecated?: boolean;
  
  // Composition
  allOf?: OpenAPISchema[];
  oneOf?: OpenAPISchema[];
  anyOf?: OpenAPISchema[];
  not?: OpenAPISchema;
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
  [method: string]: Operation | undefined;
}

export interface Operation {
  operationId?: string;
  summary?: string;
  description?: string;
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses: Record<string, Response>;
  tags?: string[];
  'x-mock-delay'?: number;
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

// Mockoon Types (from your index.ts)
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
  responseMode?: 'ai' | 'advanced';
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

// Additional types from your index.ts
export interface GenerationContext {
  generationMode?: 'ai' | 'advanced';
  scenarioType?: 'realistic' | 'edge_case' | 'varied';
  endpoint?: string;
  method?: string;
  businessDomain?: string;
  existingData?: any;
}

export interface TestScenario {
  id: number;
  name: string;
  data: any;
  type: string;
  generatedAt: string;
}

export interface MockData {
  [key: string]: any;
}

export interface AIEnhancementResult {
  enhanced: boolean;
  data: any;
  confidence?: number;
  reasoning?: string;
}

// Frontend DOM utilities
type ElementTypeMap = {
  button: HTMLButtonElement;
  input: HTMLInputElement;
  select: HTMLSelectElement;
  textarea: HTMLTextAreaElement;
  div: HTMLDivElement;
  form: HTMLFormElement;
  span: HTMLSpanElement;
};

export function getElementByIdSafe<K extends keyof ElementTypeMap>(
  id: string,
  tagName: K
): ElementTypeMap[K] | null;
export function getElementByIdSafe<T extends HTMLElement>(
  id: string,
  elementClass: new () => T
): T | null;
export function getElementByIdSafe(id: string): HTMLElement | null;
export function getElementByIdSafe<T extends HTMLElement>(
  id: string,
  typeOrClass?: keyof ElementTypeMap | (new () => T)
): T | null {
  const element = document.getElementById(id);
  if (!element) return null;
  
  if (typeof typeOrClass === 'string') {
    if (element.tagName.toLowerCase() !== typeOrClass) {
      console.warn(`Element ${id} is not a ${typeOrClass} element`);
      return null;
    }
    return element as T;
  }
  
  if (typeOrClass && !(element instanceof typeOrClass)) {
    console.warn(`Element ${id} is not of expected type ${typeOrClass.name}`);
    return null;
  }
  
  return element as T;
}

// Result type for better error handling
export type Result<T, E = Error> = 
  | { readonly success: true; readonly data: T; readonly error?: never }
  | { readonly success: false; readonly data?: never; readonly error: E };

// Utility functions to create Results
export const Ok = <T>(data: T): Result<T> => ({ success: true, data });
export const Err = <E = Error>(error: E): Result<never, E> => ({ success: false, error });

// Event handler types with better constraints
export type EventHandler<T extends Event = Event> = (event: T) => void;
export type AsyncEventHandler<T extends Event = Event> = (event: T) => Promise<void>;

// Form validation types
export interface ValidationRule<T = string> {
  readonly validate: (value: T) => boolean;
  readonly message: string;
}

export type ValidationResult = Result<void, string>;

// API endpoint configuration
export interface EndpointConfig {
  readonly method: HTTPMethod;
  readonly path: EndpointPath;
  readonly headers?: Record<string, string>;
  readonly timeout?: number;
}

// Type-safe local storage wrapper
export class TypedStorage {
  static setItem<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  }
  
  static getItem<T>(key: string): T | null {
    const item = localStorage.getItem(key);
    if (!item) return null;
    
    try {
      return JSON.parse(item) as T;
    } catch {
      return null;
    }
  }
  
  static removeItem(key: string): void {
    localStorage.removeItem(key);
  }
}

// Advanced utility types
export type NonEmptyArray<T> = [T, ...T[]];
export type Prettify<T> = { [K in keyof T]: T[K] } & {};
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

// Type guards
export const isNonEmptyArray = <T>(arr: T[]): arr is NonEmptyArray<T> => arr.length > 0;
export const isHTTPMethod = (method: string): method is HTTPMethod => 
  ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(method);

// Async utilities with proper typing
export const withTimeout = <T>(
  promise: Promise<T>, 
  timeoutMs: number
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
};

// Debounce with proper typing
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  waitMs: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), waitMs);
  };
};

// Type-safe event emitter
export class TypedEventEmitter<TEvents extends Record<string, any>> {
  private listeners = new Map<keyof TEvents, Set<Function>>();
  
  on<K extends keyof TEvents>(event: K, listener: (data: TEvents[K]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }
  
  emit<K extends keyof TEvents>(event: K, data: TEvents[K]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => listener(data));
    }
  }
  
  off<K extends keyof TEvents>(event: K, listener: (data: TEvents[K]) => void): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener);
    }
  }
}