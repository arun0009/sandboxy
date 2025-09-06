import {
  APIResponse,
  SpecData,
  BackendSpecData,
  EndpointData,
  MockoonStatus,
  GenerationModesResponse,
  TestRequestOptions,
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
  private readonly baseURL: string = '';
  private readonly requestTimeout = 10000; // 10 seconds
  private readonly debouncedSearch = debounce(this.performSearch.bind(this), 300);

  constructor() {
    super();
    this.init();
  }

  private init(): void {
    document.addEventListener('DOMContentLoaded', () => {
      this.checkMockoonStatus();
      this.checkAIStatus();
      this.setupEventListeners();
      this.loadSpecs();
    });
  }

  private setupEventListeners(): void {
    const eventMappings: ReadonlyArray<readonly [string, EventHandler | AsyncEventHandler]> = [
      ['import-spec-btn', this.openSpecModal.bind(this)],
      ['view-specs-btn', this.loadSpecs.bind(this)],
      ['mockoon-status-btn', this.checkMockoonStatus.bind(this)],
      ['monitor-btn', this.viewLogs.bind(this)],
      ['quick-test-btn', this.showEndpointTester.bind(this)],
      ['send-test-request-btn', this.sendTestRequest.bind(this)],
      ['hide-tester-btn', this.hideTester.bind(this)],
      ['close-modal-btn', this.closeSpecModal.bind(this)],
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

  private viewLogs(): void {
    this.closeAllDynamicSections();

    const logsSection = this.createDynamicSection('logsSection', 'System Logs', `
      <div id="logsContent" class="response-area">
        <div class="response-header">
          <span class="response-status">Loading logs...</span>
        </div>
      </div>
    `);

    const container = document.querySelector('.container');
    if (container) {
      container.appendChild(logsSection);
    }

    this.fetchLogs();
  }

  private async fetchLogs(): Promise<void> {
    try {
      const response = await fetch('/api/data/logs');
      const logs = await response.json();

      const logsContent = getElementByIdSafe('logsContent', HTMLDivElement);
      if (logsContent) {
        logsContent.innerHTML = this.createResponseHTML('System Logs', logs, 'success');
      }
    } catch (error) {
      const logsContent = getElementByIdSafe('logsContent', HTMLDivElement);
      if (logsContent) {
        logsContent.innerHTML = this.createErrorHTML('Error Loading Logs', (error as Error).message);
      }
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

  private async testCustomAPI(): Promise<void> {
    const endpointInput = getElementByIdSafe('testPath', HTMLInputElement);
    const methodSelect = getElementByIdSafe('testMethod', HTMLSelectElement);
    const bodyTextArea = getElementByIdSafe('testBody', HTMLTextAreaElement);

    const endpoint = endpointInput?.value || '/api/specs';
    const method = methodSelect?.value || 'GET';
    const bodyText = bodyTextArea?.value || '';

    let body = null;
    if (bodyText.trim() && method !== 'GET') {
      try {
        body = JSON.parse(bodyText);
      } catch (e) {
        this.displayResponse({ success: false, error: 'Invalid JSON in request body' });
        return;
      }
    }

    await this.testAPI(endpoint as EndpointPath, method as HTTPMethod, body);
  }

  private async checkMockoonStatus(): Promise<Result<MockoonStatus>> {
    try {
      const response = await withTimeout(fetch('/api/mockoon/status'), this.requestTimeout);
      const data = await response.json() as MockoonStatus;

      this.updateMockoonBadge(data, response.ok);
      this.createMockoonStatusSection(data, response.ok);

      const status: StatusBadgeType = data.available && data.runningInstances > 0
        ? 'success'
        : data.available
        ? 'warning'
        : 'error';

      this.emit('statusUpdated', { service: 'mockoon', status });

      return Ok(data);
    } catch (error) {
      this.handleMockoonError(error as Error);
      this.emit('statusUpdated', { service: 'mockoon', status: 'error' });
      return Err(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  private updateMockoonBadge(data: MockoonStatus, isOk: boolean): void {
    const badge = getElementByIdSafe('mockoon-status', 'span');
    if (!badge) return;

    const getBadgeConfig = (status: MockoonStatus, ok: boolean): { text: string; type: StatusBadgeType } => {
      if (!ok) return { text: 'Error', type: 'error' };

      if (status.available) {
        return status.runningInstances > 0
          ? { text: 'Running', type: 'success' }
          : { text: 'Available', type: 'warning' };
      }

      return { text: 'Unavailable', type: 'error' };
    };

    const { text, type } = getBadgeConfig(data, isOk);
    badge.textContent = text;
    badge.className = `status-badge ${type}`;
  }

  private createMockoonStatusSection(data: MockoonStatus, isOk: boolean): void {
    let statusSection = getElementByIdSafe('mockoonStatusSection', HTMLDivElement);
    if (!statusSection) {
      statusSection = this.createDynamicSection(
        'mockoonStatusSection',
        'Mockoon Status',
        '<div id="mockoonStatusContent" class="response-area"></div>'
      );

      const cardsSection = document.querySelector('.cards');
      if (cardsSection?.parentNode) {
        cardsSection.parentNode.insertBefore(statusSection, cardsSection.nextSibling);
      }
    }

    const statusContent = getElementByIdSafe('mockoonStatusContent', HTMLDivElement);
    if (statusContent) {
      if (isOk) {
        const statusClass = data.runningInstances > 0 ? 'success' : 'warning';
        statusContent.innerHTML = this.createResponseHTML('Mock Server Status', data, statusClass);
      } else {
        statusContent.innerHTML = this.createErrorHTML('Mock Server Error', data.error || 'Unknown error');
      }
    }
  }

  private handleMockoonError(error: Error): void {
    const badge = getElementByIdSafe('mockoon-status', HTMLSpanElement);
    if (badge) {
      badge.textContent = 'Unavailable';
      badge.className = 'status-badge warning';
    }

    const statusContent = getElementByIdSafe('mockoonStatusContent', HTMLDivElement);
    if (statusContent) {
      statusContent.innerHTML = this.createErrorHTML('Connection Failed', error.message);
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
      return;
    }

    try {
      const response = await fetch(`/api/specs/${specId}`);
      const result = await response.json() as APIResponse<BackendSpecData>;
      if (result.success && result.data) {
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
      <p><strong>💡 How to test:</strong> Your endpoints are available at <code>/api/mock{path}</code>. Click "Test" to try them!</p>
      ${endpoints.map(endpoint => `
        <div class="endpoint-item">
          <div>
            <span class="method-badge method-${endpoint.method.toLowerCase()}">${endpoint.method}</span>
            <strong>/api/mock${endpoint.path}</strong>
            <small style="color: #6c757d; margin-left: 10px;">(spec: ${endpoint.path})</small>
          </div>
          <button class="test-endpoint-btn" data-method="${endpoint.method}" data-path="/api/mock${endpoint.path}">Test</button>
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
        const path = button.getAttribute('data-path');
        if (method && path) {
          this.testEndpoint(method, path);
        }
      });
    });
  }

  private testEndpoint(method: string, path: string): void {
    const methodSelect = getElementByIdSafe('testMethod', HTMLSelectElement);
    const pathInput = getElementByIdSafe('testPath', HTMLInputElement);
    const testerSection = getElementByIdSafe('testerSection', HTMLDivElement);
    const bodyTextArea = getElementByIdSafe('testBody', HTMLTextAreaElement);
    const responseContainer = getElementByIdSafe('testResponse', HTMLDivElement);

    if (methodSelect) methodSelect.value = method;
    if (pathInput) pathInput.value = path;
    if (testerSection) testerSection.style.display = 'block';

    if (responseContainer) {
      responseContainer.innerHTML = '';
    }

    if (bodyTextArea && ['POST', 'PUT', 'PATCH'].includes(method)) {
      bodyTextArea.value = JSON.stringify(
        {
          name: 'Sample Pet',
          status: 'available',
          category: { id: 1, name: 'Dogs' },
          photoUrls: ['https://example.com/photo1.jpg'],
          tags: [{ id: 1, name: 'friendly' }],
        },
        null,
        2
      );

      bodyTextArea.focus();
      if (responseContainer) {
        responseContainer.innerHTML = this.createReadyToTestHTML('POST');
      }
    } else {
      if (bodyTextArea) bodyTextArea.value = '';
      if (pathInput) pathInput.focus();
      if (responseContainer) {
        responseContainer.innerHTML = this.createReadyToTestHTML('GET');
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
          `✅ Specification "${spec.name}" imported successfully!\n\n📊 Found ${spec.endpoint_count} endpoints\n\n💡 Next steps:\n1. Click "View Imported Specs" to see your endpoints\n2. Use "Quick Test" to test individual endpoints\n3. Your endpoints are now available for testing!`
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

  private createDynamicSection(id: string, title: string, content: string): HTMLDivElement {
    const section = document.createElement('div');
    section.id = id;
    section.className = 'section dynamic-section';
    section.innerHTML = `
      <div class="section-header">
        <h2>${title}</h2>
        <button class="close-section-btn" onclick="window.apiSandbox.closeDynamicSection('${id}')">&times;</button>
      </div>
      ${content}
    `;
    return section;
  }

  private createResponseHTML(title: string, data: any, statusClass: string = 'success'): string {
    return `
      <div class="response-header">
        <span class="response-status ${statusClass}">${title}</span>
        <small style="color: #6c757d;">${new Date().toLocaleTimeString()}</small>
      </div>
      <div class="response-json">${JSON.stringify(data, null, 2)}</div>
    `;
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
      method === 'POST'
        ? '💡 Modify the JSON payload above and click "Send Request" to test this POST endpoint.'
        : '💡 Click "Send Request" to test this GET endpoint.';

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