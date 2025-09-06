// Advanced TypeScript type definitions for the API Sandbox frontend

// HTTP Methods as literal types
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

// Status badge types
export type StatusBadgeType = 'success' | 'warning' | 'error';

// Generic API Response with proper typing
export interface APIResponse<T = unknown> {
  readonly status?: number;
  readonly statusText?: string;
  readonly data?: T;
  readonly error?: string;
}

// Branded types for better type safety
export type SpecId = string & { readonly __brand: 'SpecId' };
export type EndpointPath = string & { readonly __brand: 'EndpointPath' };
export type APIVersion = string & { readonly __brand: 'APIVersion' };

// Spec data with strict typing
export interface SpecData {
  readonly id: SpecId;
  readonly name: string;
  readonly version: APIVersion;
  readonly endpoint_count: number;
  readonly created_at: string;
  readonly endpoints?: readonly EndpointData[];
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
  readonly id: 'ai' | 'advanced' | 'basic';
  readonly name: string;
  readonly available: boolean;
  readonly description?: string;
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
export interface FetchResult<T = unknown> {
  readonly status: number;
  readonly data: T;
}

// Advanced DOM utilities with better type safety

// Element type mapping for better inference
type ElementTypeMap = {
  button: HTMLButtonElement;
  input: HTMLInputElement;
  select: HTMLSelectElement;
  textarea: HTMLTextAreaElement;
  div: HTMLDivElement;
  form: HTMLFormElement;
  span: HTMLSpanElement;
};

// Type-safe element getter with overloads
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

// Utility function to create Results
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
