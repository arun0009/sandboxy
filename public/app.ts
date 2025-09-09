import {
  APIResponse,
  SpecData,
  BackendSpecData,
  EndpointData,
  GenerationModesResponse,
  FetchResult,
  getElementByIdSafe,
  EventHandler,
  AsyncEventHandler,
  HTTPMethod,
  StatusBadgeType,
  Result,
  Ok,
  Err,
  ValidationRule,
  ValidationResult,
  TypedStorage,
  withTimeout,
  debounce,
  isHTTPMethod,
  TypedEventEmitter,
  SpecId,
  EndpointPath,
} from './types.js';

// Event types for the application
type AppEvents = {
  specImported: SpecData;
  specDeleted: SpecId;
  endpointTested: { method: HTTPMethod; path: EndpointPath; result: FetchResult };
  statusUpdated: { service: string; status: StatusBadgeType };
};

class APISandboxApp extends TypedEventEmitter<AppEvents> {
  private readonly baseURL: string = '/api'; // Base URL for all API requests
  private readonly requestTimeout = 10000; // 10 seconds
  private readonly debouncedSearch = debounce(this.performSearch.bind(this), 300);
  private currentSpecId: string | null = null; // Track current spec being viewed

  constructor() {
    super();
    this.init();
  }

  private init(): void {
    document.addEventListener('DOMContentLoaded', () => {
      this.checkAIStatus();
      this.setupEventListeners();
      this.loadSpecs();
    });
  }

  private setupEventListeners(): void {
    const eventMappings: ReadonlyArray<readonly [string, EventHandler | AsyncEventHandler]> = [
      ['import-spec-btn', this.openSpecModal.bind(this)],
      ['view-specs-btn', this.loadSpecs.bind(this)],
      ['close-modal-btn', this.closeSpecModal.bind(this)],
      ['send-test-request-btn', this.sendTestRequest.bind(this)],
      ['hide-tester-btn', this.hideTester.bind(this)],
    ] as const;

    eventMappings.forEach(([id, handler]) => {
      const element = getElementByIdSafe(id, 'button');
      if (element) {
        element.addEventListener('click', handler as EventListener);
      }
    });

    const specForm = getElementByIdSafe('specForm', 'form');
    if (specForm) {
      specForm.addEventListener('submit', this.handleSpecUpload.bind(this));
    }

    const modal = getElementByIdSafe('specModal', 'div');
    if (modal) {
      modal.addEventListener('click', (e: MouseEvent) => {
        if (e.target === modal) {
          this.closeSpecModal();
        }
      });
    }
  }

  private openSpecModal(): void {
    const modal = getElementByIdSafe('specModal', 'div');
    if (modal) {
      modal.style.display = 'block';
    }
  }

  private closeSpecModal(): void {
    const modal = getElementByIdSafe('specModal', 'div');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  private async testAPI<T = unknown>(
    endpoint: EndpointPath,
    method: HTTPMethod = 'GET',
    body?: unknown
  ): Promise<Result<FetchResult<T>>> {
    try {
      if (!isHTTPMethod(method)) {
        return Err(new Error(`Invalid HTTP method: ${method}`));
      }

      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (body && !['GET', 'HEAD', 'DELETE'].includes(method)) {
        options.body = JSON.stringify(body);
      }

      const fetchPromise = fetch(endpoint, options);
      const response = await withTimeout(fetchPromise, this.requestTimeout);
      const data = await response.json() as T;

      const result: FetchResult<T> = {
        status: response.status,
        data,
      };

      this.displayResponse({
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        data,
      });

      this.emit('endpointTested', { method, path: endpoint, result });

      return Ok(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.displayResponse({ success: false, error: errorMessage });
      return Err(error instanceof Error ? error : new Error(errorMessage));
    }
  }

  private async checkAIStatus(): Promise<void> {
    try {
      const response = await fetch('/api/data/generation-modes');
      const data: GenerationModesResponse = await response.json();
      const badge = getElementByIdSafe('ai-status', HTMLSpanElement);

      if (badge) {
        const aiMode = data.modes?.find((m: any) => m.id === 'ai');
        if (aiMode?.available) {
          badge.textContent = 'AI + Fallback';
          badge.className = 'status-badge success';
        } else {
          badge.textContent = 'Basic Only';
          badge.className = 'status-badge warning';
        }
      }
    } catch (error) {
      const badge = getElementByIdSafe('ai-status', HTMLSpanElement);
      if (badge) {
        badge.textContent = 'Error';
        badge.className = 'status-badge warning';
      }
    }
  }

  private displayResponse(data: APIResponse, containerId: string = 'testResponse'): void {
    const container = getElementByIdSafe(containerId, HTMLDivElement) || getElementByIdSafe('testResponse', HTMLDivElement);

    if (container) {
      container.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
      container.style.display = 'block';
    }
  }

  private async loadSpecs(): Promise<void> {
    this.closeAllDynamicSections();

    const specsSection = getElementByIdSafe('specsSection', HTMLDivElement);

    try {
      const response = await fetch('/api/specs');
      const result = await response.json() as APIResponse<SpecData[]>;
      if (result.success && result.data) {
        this.displaySpecs(result.data);
        if (specsSection) {
          specsSection.style.display = 'block';
          specsSection.style.visibility = 'visible';
        }
      } else {
        throw new Error(result.error || 'Failed to load specifications');
      }
    } catch (error) {
      console.error('Error loading specs:', error);
      if (specsSection) {
        alert('Failed to load specifications');
      }
    }
  }

  private countEndpoints(spec: any): number {
    return Object.keys(spec.paths).reduce((count, path) => count + Object.keys(spec.paths[path]).length, 0);
  }

  private extractEndpoints(spec: any): EndpointData[] {
    const endpoints: EndpointData[] = [];
    for (const [path, methods] of Object.entries(spec.paths)) {
      for (const method of Object.keys(methods as any)) {
        if (isHTTPMethod(method.toUpperCase())) {
          endpoints.push({
            method: method.toUpperCase() as HTTPMethod,
            path: path as EndpointPath,
            summary: (methods as any)[method]?.summary,
            description: (methods as any)[method]?.description,
          });
        }
      }
    }
    return endpoints;
  }

  private displaySpecs(specs: SpecData[]): void {
    const container = getElementByIdSafe('specsList', HTMLDivElement);
    if (!container) return;

    if (specs.length === 0) {
      container.innerHTML = '<p>No API specifications imported yet. Use the "Import Specification" button to get started.</p>';
      return;
    }

    container.innerHTML = specs.map(spec => `
      <div class="spec-item">
        <div class="spec-header">
          <div>
            <div class="spec-title">${spec.name}</div>
            <div class="spec-meta">Version: ${spec.version} | Endpoints: ${spec.endpoint_count} | Created: ${new Date(spec.created_at).toLocaleDateString()}</div>
          </div>
          <button class="view-endpoints-btn" data-spec-id="${spec.id}">View Endpoints</button>
        </div>
        <div id="endpoints-${spec.id}" class="endpoints-list" style="display: none;"></div>
      </div>
    `).join('');

    this.attachEndpointButtonListeners(container);
  }

  private attachEndpointButtonListeners(container: HTMLElement): void {
    container.querySelectorAll('.view-endpoints-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const specId = (e.target as HTMLButtonElement).getAttribute('data-spec-id');
        if (specId) {
          this.loadSpecDetails(specId);
        }
      });
    });
  }

  private async loadSpecDetails(specId: string): Promise<void> {
    const endpointsContainer = getElementByIdSafe(`endpoints-${specId}`, HTMLDivElement);
    if (!endpointsContainer) return;

    if (endpointsContainer.style.display === 'block') {
      endpointsContainer.style.display = 'none';
      this.currentSpecId = null; // Clear current spec when hiding
      return;
    }

    try {
      const response = await fetch(`/api/specs/${specId}`);
      const result = await response.json() as APIResponse<BackendSpecData>;
      if (result.success && result.data) {
        this.currentSpecId = specId; // Set current spec when loading
        const endpoints = this.extractEndpoints(result.data.spec_data);
        this.displayEndpoints(endpoints, specId);
        endpointsContainer.style.display = 'block';
      } else {
        throw new Error(result.error || 'Failed to load specification details');
      }
    } catch (error) {
      console.error('Error loading spec details:', error);
      alert('Failed to load specification details');
    }
  }

  private displayEndpoints(endpoints: EndpointData[], specId: string): void {
    const container = getElementByIdSafe(`endpoints-${specId}`, HTMLDivElement);
    if (!container) return;

    if (endpoints.length === 0) {
      container.innerHTML = '<p>No endpoints found in this specification.</p>';
      return;
    }

    container.innerHTML = `
      <h4>Available Endpoints:</h4>
      <p><strong>How to test:</strong> Your endpoints are available at <code>/api/mock{path}</code>. Click "Test" to try them!</p>
      ${endpoints.map(endpoint => `
        <div class="endpoint-item">
          <div>
            <span class="method-badge method-${endpoint.method.toLowerCase()}">${endpoint.method}</span>
            <strong>/api/mock${endpoint.path}</strong>
            <small style="color: #6c757d; margin-left: 10px;">(spec: ${endpoint.path})</small>
          </div>
          <button class="test-endpoint-btn" data-method="${endpoint.method}" data-original-path="${endpoint.path}" data-full-path="/api/mock${endpoint.path}">Test</button>
        </div>
      `).join('')}
    `;

    this.attachTestButtonListeners(container);
  }

  private attachTestButtonListeners(container: HTMLElement): void {
    container.querySelectorAll('.test-endpoint-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const button = e.target as HTMLButtonElement;
        const method = button.getAttribute('data-method');
        const fullPath = button.getAttribute('data-full-path');
        const originalPath = button.getAttribute('data-original-path');
        if (method && fullPath) {
          this.testEndpoint(method, fullPath, originalPath || undefined);
        }
      });
    });
  }

  private async testEndpoint(method: string, fullPath: string, originalPath?: string): Promise<void> {
    const methodSelect = getElementByIdSafe('testMethod', HTMLSelectElement);
    const pathInput = getElementByIdSafe('testPath', HTMLInputElement);
    const testerSection = getElementByIdSafe('testerSection', HTMLDivElement);
    const bodyTextArea = getElementByIdSafe('testBody', HTMLTextAreaElement);
    const responseContainer = getElementByIdSafe('testResponse', HTMLDivElement);

    if (methodSelect) methodSelect.value = method;
    if (pathInput) pathInput.value = fullPath;
    if (testerSection) {
      testerSection.style.display = 'block';
      // Scroll to the tester section
      testerSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (responseContainer) {
      responseContainer.innerHTML = '';
    }

    if (bodyTextArea && ['POST', 'PUT', 'PATCH'].includes(method)) {
      try {
        console.group('testEndpoint Debug Info');
        
        // Use the tracked current spec ID
        const specId = this.currentSpecId;
        
        console.log('Current specId:', specId);
        
        if (!specId) {
          console.error('No spec currently selected');
          console.groupEnd();
          throw new Error('No specification selected. Please select a spec first by clicking "View Endpoints".');
        }

        // Use the original path (without /api/mock prefix) for schema requests
        const schemaPath = originalPath || fullPath.replace(/^\/api\/mock/, '');
        console.log('Fetching schema for:', { specId, method, schemaPath });
        
        // Make sure path starts with a slash and is properly encoded
        const normalizedPath = schemaPath.startsWith('/') ? schemaPath : `/${schemaPath}`;
        const encodedPath = encodeURIComponent(normalizedPath).replace(/%2F/g, '/');
        // Remove leading slash to prevent double slash in URL
        const cleanPath = encodedPath.startsWith('/') ? encodedPath.substring(1) : encodedPath;
        const url = `${this.baseURL}/specs/${specId}/operations/${method}/${cleanPath}/request-schema`;
        console.log('Fetching schema from URL:', url);
        
        // Fetch the request schema
        let response: Response;
        let schema: any;
        
        try {
          console.log('Sending request to:', url);
          response = await fetch(url);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Schema fetch failed:', { 
              status: response.status, 
              statusText: response.statusText, 
              errorText 
            });
            
            // Try to get a more specific error message
            let errorMessage = `Failed to load schema: ${response.statusText}`;
            try {
              const errorData = JSON.parse(errorText);
              if (errorData.error) {
                errorMessage += ` - ${errorData.error}`;
                if (errorData.availablePaths) {
                  console.log('Available paths in spec:', errorData.availablePaths);
                }
              }
            } catch (e) {
              console.log('Could not parse error response:', e);
            }
            
            throw new Error(errorMessage);
          }
          
          schema = await response.json();
          //console.log('Received schema:', JSON.stringify(schema, null, 2));
          
          // Get the current endpoint info from the form
          const elements = this.getTestFormElements();
          if (!elements.success) {
            throw new Error('Could not access form elements');
          }
          
          const { methodSelect, pathInput } = elements.data;
          const endpointInfo = {
            method: methodSelect.value,
            path: pathInput.value
          };
          
          console.log('Requesting mock data generation from backend for endpoint:', endpointInfo);
          const mockResponse = await fetch('/api/ai/generate-from-schema', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
              schema,
              context: {
                endpoint: `${endpointInfo.method} ${endpointInfo.path}`,
                originalEndpoint: endpointInfo
              }
            })
          });
          
          if (!mockResponse.ok) {
            throw new Error(`Failed to generate mock data: ${mockResponse.statusText}`);
          }
          
          const mockBody = await mockResponse.json();
          console.log('Generated mock data:', mockBody);
          
          // Set the generated data in the textarea
          const mockJson = JSON.stringify(mockBody, null, 2);
          //console.log('Setting textarea value to:', mockJson);
          bodyTextArea.value = mockJson;
          
        } catch (error) {
          console.error('Error generating mock data:', error);
          console.groupEnd();
          throw error;
        }
      } catch (error) {
        console.error('Failed to generate request body:', error);
        bodyTextArea.value = '';
        alert('Failed to generate request body from schema. Please check the console for details.');
      }
      
      bodyTextArea.focus();
      if (responseContainer) {
        responseContainer.innerHTML = this.createReadyToTestHTML(method);
      }
    } else {
      if (bodyTextArea) bodyTextArea.value = '';
      if (pathInput) pathInput.focus();
      if (responseContainer) {
        responseContainer.innerHTML = this.createReadyToTestHTML(method);
      }
    }
  }

  private showEndpointTester(): void {
    this.closeAllDynamicSections();

    const testerSection = getElementByIdSafe('testerSection', HTMLDivElement);
    if (testerSection) {
      testerSection.style.display = 'block';
      testerSection.style.visibility = 'visible';
      testerSection.scrollIntoView({ behavior: 'smooth' });

      const pathInput = getElementByIdSafe('testPath', HTMLInputElement);
      if (pathInput && pathInput.value === '/') {
        pathInput.value = '/api/mock/pets';
      }

      this.setupMethodChangeHandler();
    }
  }

  private setupMethodChangeHandler(): void {
    const methodSelect = getElementByIdSafe('testMethod', HTMLSelectElement);
    const bodyTextarea = getElementByIdSafe('testBody', HTMLTextAreaElement);

    if (methodSelect && bodyTextarea) {
      const updateSampleBody = (): void => {
        const method = methodSelect.value;
        if (['POST', 'PUT', 'PATCH'].includes(method)) {
          if (!bodyTextarea.value.trim()) {
            bodyTextarea.value = JSON.stringify(
              {
                name: 'Fluffy',
                status: 'available',
                category: { id: 1, name: 'Dogs' },
              },
              null,
              2
            );
          }
        } else {
          bodyTextarea.value = '';
        }
      };

      methodSelect.addEventListener('change', updateSampleBody);
      updateSampleBody();
    }
  }

  private hideTester(): void {
    const testerSection = getElementByIdSafe('testerSection', HTMLDivElement);
    if (testerSection) {
      testerSection.style.display = 'none';
    }
  }

  private async sendTestRequest(): Promise<Result<FetchResult>> {
    const elements = this.getTestFormElements();
    if (!elements.success) {
      console.error('Required form elements not found');
      return Err(new Error('Form elements not found'));
    }

    const { methodSelect, pathInput, bodyTextArea, responseContainer } = elements.data;

    const validationResult = this.validateTestForm(methodSelect.value, pathInput.value, bodyTextArea.value);
    if (!validationResult.success) {
      alert(validationResult.error);
      return Err(new Error(validationResult.error));
    }

    const method = methodSelect.value as HTTPMethod;
    const path = pathInput.value as EndpointPath;
    const body = bodyTextArea.value;

    responseContainer.innerHTML = 'Sending request...';

    const result = await this.testAPI(path, method, body ? JSON.parse(body) : undefined);

    if (result.success) {
      const statusClass: StatusBadgeType = result.data.status >= 200 && result.data.status < 300 ? 'success' : 'error';
      const formattedJson = typeof result.data.data === 'string' ? result.data.data : JSON.stringify(result.data.data, null, 2);

      responseContainer.innerHTML = `
        <div class="response-header">
          <span class="response-status ${statusClass}">Status: ${result.data.status}</span>
          <small style="color: #6c757d;">${new Date().toLocaleTimeString()}</small>
        </div>
        <div class="response-json">${formattedJson}</div>
      `;
    } else {
      responseContainer.innerHTML = this.createErrorHTML('Error', result.error.message);
    }

    return result;
  }

  private getTestFormElements(): Result<{
    methodSelect: HTMLSelectElement;
    pathInput: HTMLInputElement;
    bodyTextArea: HTMLTextAreaElement;
    responseContainer: HTMLDivElement;
  }> {
    const methodSelect = getElementByIdSafe('testMethod', 'select');
    const pathInput = getElementByIdSafe('testPath', 'input');
    const bodyTextArea = getElementByIdSafe('testBody', 'textarea');
    const responseContainer = getElementByIdSafe('testResponse', 'div');

    if (!methodSelect || !pathInput || !bodyTextArea || !responseContainer) {
      return Err(new Error('Required form elements not found'));
    }

    return Ok({ methodSelect, pathInput, bodyTextArea, responseContainer });
  }

  private validateTestForm(method: string, path: string, body: string): ValidationResult {
    const rules: ValidationRule[] = [
      {
        validate: (value: string) => value.trim().length > 0,
        message: 'Please enter an endpoint path',
      },
      {
        validate: (value: string) => isHTTPMethod(value),
        message: 'Invalid HTTP method',
      },
    ];

    if (!path.trim()) {
      return { success: false, error: 'Please enter an endpoint path' };
    }

    if (!isHTTPMethod(method)) {
      return { success: false, error: 'Invalid HTTP method' };
    }

    if (body.trim() && !['GET', 'HEAD', 'DELETE'].includes(method)) {
      try {
        JSON.parse(body);
      } catch {
        return { success: false, error: 'Invalid JSON in request body' };
      }
    }

    return { success: true, data: undefined };
  }

  private performSearch(query: string): void {
    console.log('Searching for:', query);
  }

  private async handleSpecUpload(event: Event): Promise<Result<SpecData>> {
    event.preventDefault();

    const formElements = this.getSpecFormElements();
    if (!formElements.success) {
      alert('Form elements not found');
      return Err(new Error('Form elements not found'));
    }

    const { nameInput, fileInput, urlInput } = formElements.data;
    const name = nameInput.value;
    const file = fileInput.files?.[0];
    const url = urlInput.value;

    const validationResult = this.validateSpecForm(name, file, url);
    if (!validationResult.success) {
      alert(validationResult.error);
      return Err(new Error(validationResult.error));
    }

    try {
      let specData: string | undefined;
      let parsedSpecData: any = undefined;
      
      if (file) {
        specData = await file.text();
        
        // Detect file format and parse accordingly
        const fileName = file.name.toLowerCase();
        const isYaml = fileName.endsWith('.yaml') || fileName.endsWith('.yml') || specData.trim().startsWith('openapi:');
        
        if (isYaml) {
          // Send raw YAML string to backend for parsing
          parsedSpecData = specData;
        } else {
          // Parse JSON on frontend
          parsedSpecData = JSON.parse(specData);
        }
      }

      const response = await withTimeout(
        fetch('/api/specs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            spec_name: name, 
            spec_data: parsedSpecData, 
            url,
            is_yaml: file && (file.name.toLowerCase().endsWith('.yaml') || file.name.toLowerCase().endsWith('.yml') || specData?.trim().startsWith('openapi:'))
          }),
        }),
        this.requestTimeout
      );

      const result = await response.json() as APIResponse<BackendSpecData>;

      if (response.ok && result.success && result.data) {
        const spec: SpecData = {
          id: result.data.spec_id as SpecId,
          name: result.data.spec_name,
          version: result.data.spec_data.info.version as any,
          endpoint_count: this.countEndpoints(result.data.spec_data),
          created_at: result.data.created_at,
          endpoints: this.extractEndpoints(result.data.spec_data),
        };

        alert(
          `Specification "${spec.name}" imported successfully!\n\nFound ${spec.endpoint_count} endpoints\n\nNext steps:\n1. Click "View Imported Specs" to see your endpoints\n2. Use "Quick Test" to test individual endpoints\n3. Your endpoints are now available for testing!`
        );

        this.closeSpecModal();

        const specForm = getElementByIdSafe('specForm', 'form');
        if (specForm) specForm.reset();

        TypedStorage.setItem(`spec-${spec.id}`, spec);

        this.emit('specImported', spec);

        this.loadSpecs();
        return Ok(spec);
      } else {
        const errorMessage = `❌ Error: ${result.error || 'Unknown error'}\n\nTip: Make sure your file is valid JSON or YAML format`;
        alert(errorMessage);
        return Err(new Error(result.error || 'Upload failed'));
      }
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = '❌ Failed to upload specification\n\nPlease check the file format and try again';
      alert(errorMessage);
      return Err(error instanceof Error ? error : new Error('Upload failed'));
    }
  }

  private getSpecFormElements(): Result<{
    nameInput: HTMLInputElement;
    fileInput: HTMLInputElement;
    urlInput: HTMLInputElement;
  }> {
    const nameInput = getElementByIdSafe('specName', 'input');
    const fileInput = getElementByIdSafe('specFile', 'input');
    const urlInput = getElementByIdSafe('specUrl', 'input');

    if (!nameInput || !fileInput || !urlInput) {
      return Err(new Error('Form elements not found'));
    }

    return Ok({ nameInput, fileInput, urlInput });
  }

  private validateSpecForm(name: string, file: File | undefined, url: string): ValidationResult {
    if (!name.trim()) {
      return { success: false, error: 'Please provide an API name' };
    }

    if (!file && !url.trim()) {
      return { success: false, error: 'Please provide either a file or URL' };
    }

    if (url && !this.isValidUrl(url)) {
      return { success: false, error: 'Please provide a valid URL' };
    }

    return { success: true, data: undefined };
  }

  private isValidUrl(string: string): boolean {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  }

  private createErrorHTML(title: string, message: string): string {
    return `
      <div class="response-header">
        <span class="response-status error">${title}</span>
      </div>
      <div class="response-json" style="color: #dc3545;">
        Error: ${message}
      </div>
    `;
  }

  private createReadyToTestHTML(method: string): string {
    const message =
      method === 'POST' || method === 'PUT' || method === 'PATCH'
        ? `Modify the JSON payload above and click "Send Request" to test this ${method} endpoint.`
        : `Click "Send Request" to test this GET endpoint.`;

    return `
      <div class="response-header">
        <span class="response-status">Ready to Test</span>
      </div>
      <div style="padding: 12px; color: #6c757d; font-style: italic;">
        ${message}
      </div>
    `;
  }

  public closeAllDynamicSections(): void {
    document.querySelectorAll('.dynamic-section').forEach(section => section.remove());

    const testerSection = getElementByIdSafe('testerSection', HTMLDivElement);
    if (testerSection) testerSection.style.display = 'none';

    const specsSection = getElementByIdSafe('specsSection', HTMLDivElement);
    if (specsSection) specsSection.style.display = 'none';
  }

  public closeDynamicSection(sectionId: string): void {
    const section = document.getElementById(sectionId);
    if (section) {
      section.remove();
    }
  }

}

const apiSandbox = new APISandboxApp();
(window as any).apiSandbox = apiSandbox;

export default APISandboxApp;