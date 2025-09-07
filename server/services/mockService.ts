import { OpenAPIV3 } from 'openapi-types';
import { generateMockData } from './mockDataGenerator';
import database from './database';

export class MockService {
  private static instance: MockService;
  
  private constructor() {}
  
  public static getInstance(): MockService {
    if (!MockService.instance) {
      MockService.instance = new MockService();
    }
    return MockService.instance;
  }
  
  /**
   * Generate a mock response for the given endpoint and method
   */
  public async generateMockResponse(
    specId: string,
    path: string,
    method: string,
    requestBody?: any
  ): Promise<{
    status: number;
    headers: Record<string, string>;
    body: any;
  }> {
    try {
      // Get the spec from the database
      const spec = await database.getSpecById(specId);
      if (!spec) {
        throw new Error(`Spec with ID ${specId} not found`);
      }
      
      const openApiDoc = spec.content as OpenAPIV3.Document;
      const pathItem = openApiDoc.paths[path];
      
      if (!pathItem) {
        throw new Error(`Path ${path} not found in the OpenAPI spec`);
      }
      
      const operation = pathItem[method.toLowerCase() as keyof typeof pathItem] as OpenAPIV3.OperationObject;
      if (!operation) {
        throw new Error(`Method ${method} not allowed for path ${path}`);
      }
      
      // Get the successful response schema (2xx)
      const successResponse = Object.entries(operation.responses || {}).find(
        ([status]) => status.startsWith('2')
      );
      
      if (!successResponse) {
        throw new Error(`No successful (2xx) response defined for ${method} ${path}`);
      }
      
      const [statusCode, response] = successResponse as [string, OpenAPIV3.ResponseObject];
      const content = response.content?.['application/json'];
      
      if (!content || !content.schema) {
        return {
          status: parseInt(statusCode, 10),
          headers: { 'Content-Type': 'application/json' },
          body: { message: 'No response schema defined' },
        };
      }
      
      // Generate mock data based on the response schema
      const mockData = await generateMockData(content.schema as OpenAPIV3.SchemaObject);
      
      return {
        status: parseInt(statusCode, 10),
        headers: { 'Content-Type': 'application/json' },
        body: mockData,
      };
    } catch (error) {
      console.error('Error generating mock response:', error);
      return {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        body: { error: 'Failed to generate mock response', details: (error as Error).message },
      };
    }
  }
  
  /**
   * Generate an example request body for the given endpoint and method
   */
  public async generateExampleRequest(
    specId: string,
    path: string,
    method: string
  ): Promise<{
    body?: any;
    parameters?: Record<string, any>;
  }> {
    try {
      // Get the spec from the database
      const spec = await database.getSpecById(specId);
      if (!spec) {
        throw new Error(`Spec with ID ${specId} not found`);
      }
      
      const openApiDoc = spec.content as OpenAPIV3.Document;
      const pathItem = openApiDoc.paths[path];
      
      if (!pathItem) {
        throw new Error(`Path ${path} not found in the OpenAPI spec`);
      }
      
      const operation = pathItem[method.toLowerCase() as keyof typeof pathItem] as OpenAPIV3.OperationObject;
      if (!operation) {
        throw new Error(`Method ${method} not allowed for path ${path}`);
      }
      
      const result: {
        body?: any;
        parameters?: Record<string, any>;
      } = {};
      
      // Generate example request body if available
      if (operation.requestBody && 'content' in operation.requestBody) {
        const content = operation.requestBody.content['application/json'];
        if (content?.schema) {
          result.body = await generateMockData(content.schema as OpenAPIV3.SchemaObject);
        }
      }
      
      // Generate example parameters
      if (operation.parameters && operation.parameters.length > 0) {
        result.parameters = {};
        
        for (const param of operation.parameters) {
          const paramObj = param as OpenAPIV3.ParameterObject;
          if ('schema' in paramObj && paramObj.schema) {
            result.parameters[paramObj.name] = await generateMockData(paramObj.schema as OpenAPIV3.SchemaObject);
          } else {
            // For simple parameters without schema
            result.parameters[paramObj.name] = this.getDefaultValueForType(paramObj.in);
          }
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error generating example request:', error);
      return {};
    }
  }
  
  /**
   * Get a default value based on parameter type
   */
  private getDefaultValueForType(type: string): any {
    switch (type) {
      case 'query':
      case 'path':
      case 'header':
        return 'example-value';
      default:
        return null;
    }
  }
}

export default MockService.getInstance();
