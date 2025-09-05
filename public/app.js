// Check system status on load
document.addEventListener('DOMContentLoaded', function() {
    checkMockoonStatus();
    checkAIStatus();
    setupEventListeners();
    loadSpecs();
});

function setupEventListeners() {
    // Import/View specs buttons
    const importBtn = document.getElementById('import-spec-btn');
    const viewBtn = document.getElementById('view-specs-btn');
    const mockoonBtn = document.getElementById('mockoon-status-btn');
    const logsBtn = document.getElementById('monitor-btn');
    const quickTestBtn = document.getElementById('quick-test-btn');
    const sendTestBtn = document.getElementById('send-test-request-btn');
    const hideBtn = document.getElementById('hide-tester-btn');
    const closeBtn = document.getElementById('close-modal-btn');
    const specForm = document.getElementById('specForm');
    const modal = document.getElementById('specModal');
    
    if (importBtn) importBtn.addEventListener('click', openSpecModal);
    if (viewBtn) viewBtn.addEventListener('click', loadSpecs);
    if (mockoonBtn) mockoonBtn.addEventListener('click', checkMockoonStatus);
    if (logsBtn) logsBtn.addEventListener('click', viewLogs);
    if (quickTestBtn) quickTestBtn.addEventListener('click', showEndpointTester);
    if (sendTestBtn) sendTestBtn.addEventListener('click', sendTestRequest);
    if (hideBtn) hideBtn.addEventListener('click', hideTester);
    if (closeBtn) closeBtn.addEventListener('click', closeSpecModal);
    if (specForm) specForm.addEventListener('submit', handleSpecUpload);
    
    // Modal click-outside-to-close
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeSpecModal();
            }
        });
    }
}

// Modal functions
function openSpecModal() {
    document.getElementById('specModal').style.display = 'block';
}

function closeSpecModal() {
    document.getElementById('specModal').style.display = 'none';
}

// API testing functions
function testApi() {
    sendRequest();
}

function sendRequest() {
    testCustomAPI();
}

// View logs function
function viewLogs() {
    // Close other sections first for accordion behavior
    closeAllDynamicSections();
    
    // Create a simple logs display
    const logsSection = document.createElement('div');
    logsSection.id = 'logsSection';
    logsSection.className = 'section dynamic-section';
    logsSection.innerHTML = `
        <div class="section-header">
            <h2>System Logs</h2>
            <button class="close-section-btn" onclick="closeDynamicSection('logsSection')">&times;</button>
        </div>
        <div id="logsContent" class="response-area">
            <div class="response-header">
                <span class="response-status">Loading logs...</span>
            </div>
        </div>
    `;
    
    // Add to container
    document.querySelector('.container').appendChild(logsSection);
    
    // Fetch actual logs
    fetch('/api/data/logs')
        .then(response => response.json())
        .then(logs => {
            const logsContent = document.getElementById('logsContent');
            logsContent.innerHTML = `
                <div class="response-header">
                    <span class="response-status success">System Logs</span>
                    <small style="color: #6c757d;">${new Date().toLocaleTimeString()}</small>
                </div>
                <div class="response-json">${JSON.stringify(logs, null, 2)}</div>
            `;
        })
        .catch(error => {
            const logsContent = document.getElementById('logsContent');
            logsContent.innerHTML = `
                <div class="response-header">
                    <span class="response-status error">Error Loading Logs</span>
                </div>
                <div class="response-json" style="color: #dc3545;">
                    Error: ${error.message}
                </div>
            `;
        });
}

async function testAPI(endpoint, method = 'GET', body = null) {
    try {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };
        
        if (body && method !== 'GET') {
            options.body = JSON.stringify(body);
        }
        
        const response = await fetch(endpoint, options);
        const data = await response.json();
        
        displayResponse({
            status: response.status,
            statusText: response.statusText,
            data: data
        });
    } catch (error) {
        displayResponse({
            error: error.message
        });
    }
}

async function testCustomAPI() {
    // These elements don't exist anymore - use tester elements instead
    const endpoint = document.getElementById('testPath')?.value || '/api/specs';
    const method = document.getElementById('testMethod')?.value || 'GET';
    const bodyText = document.getElementById('testBody')?.value || '';
    
    let body = null;
    if (bodyText.trim() && method !== 'GET') {
        try {
            body = JSON.parse(bodyText);
        } catch (e) {
            displayResponse({ error: 'Invalid JSON in request body' });
            return;
        }
    }
    
    await testAPI(endpoint, method, body);
}


function showSpecUpload() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); display: flex; align-items: center;
        justify-content: center; z-index: 1000;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 2rem; border-radius: 12px; max-width: 500px; width: 90%;">
            <h3 style="margin-bottom: 1rem; color: #4f46e5;">Import API Specification</h3>
            <div style="margin-bottom: 1rem;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Spec Name:</label>
                <input type="text" id="specName" placeholder="My API" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px;">
            </div>
            <div style="margin-bottom: 1rem;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Upload JSON File:</label>
                <input type="file" id="specFile" accept=".json" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px;">
            </div>
            <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                <button id="cancel-upload-btn" style="padding: 0.75rem 1.5rem; border: 2px solid #e5e7eb; background: white; border-radius: 8px; cursor: pointer;">Cancel</button>
                <button id="upload-spec-btn" style="padding: 0.75rem 1.5rem; background: #4f46e5; color: white; border: none; border-radius: 8px; cursor: pointer;">Import</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners to modal buttons
    document.getElementById('cancel-upload-btn').addEventListener('click', function() {
        modal.remove();
    });
    document.getElementById('upload-spec-btn').addEventListener('click', uploadSpec);
}

async function uploadSpec() {
    const name = document.getElementById('specName').value;
    const fileInput = document.getElementById('specFile');
    const file = fileInput.files[0];
    
    if (!name || !file) {
        alert('Please provide both name and file');
        return;
    }
    
    try {
        const text = await file.text();
        const spec = JSON.parse(text);
        
        await testAPI('/api/specs', 'POST', {
            name: name,
            spec: spec,
            source: 'file'
        });
        
        // Close modal
        const modal = document.querySelector('[style*="position: fixed"]');
        if (modal) modal.remove();
    } catch (error) {
        displayResponse({ error: 'Invalid JSON file: ' + error.message });
    }
}

async function checkMockoonStatus() {
    try {
        const response = await fetch('/api/mockoon/status');
        const data = await response.json();
        
        const badge = document.getElementById('mockoon-status');
        
        // Create status section if it doesn't exist
        let statusSection = document.getElementById('mockoonStatusSection');
        if (!statusSection) {
            statusSection = document.createElement('div');
            statusSection.id = 'mockoonStatusSection';
            statusSection.className = 'section dynamic-section';
            statusSection.innerHTML = `
                <div class="section-header">
                    <h2>Mockoon Status</h2>
                    <button class="close-section-btn" onclick="closeDynamicSection('mockoonStatusSection')">&times;</button>
                </div>
                <div id="mockoonStatusContent" class="response-area"></div>
            `;
            
            // Insert after the cards section
            const cardsSection = document.querySelector('.cards');
            cardsSection.parentNode.insertBefore(statusSection, cardsSection.nextSibling);
        }
        
        const statusContent = document.getElementById('mockoonStatusContent');
        
        if (response.ok) {
            // Update badge based on running instances, not just availability
            if (badge) {
                if (data.runningInstances > 0) {
                    badge.textContent = 'Running';
                    badge.className = 'status-badge success';
                } else {
                    badge.textContent = 'Available';
                    badge.className = 'status-badge warning';
                }
            }
            statusContent.innerHTML = `
                <div class="response-header">
                    <span class="response-status ${data.runningInstances > 0 ? 'success' : 'warning'}">Mock Server Status</span>
                    <small style="color: #6c757d;">${new Date().toLocaleTimeString()}</small>
                </div>
                <div class="response-json">${JSON.stringify(data, null, 2)}</div>
            `;
        } else {
            if (badge) {
                badge.textContent = 'Error';
                badge.className = 'status-badge warning';
            }
            statusContent.innerHTML = `
                <div class="response-header">
                    <span class="response-status error">Mock Server Error</span>
                </div>
                <div class="response-json" style="color: #dc3545;">
                    Error: ${data.error || 'Unknown error'}
                </div>
            `;
        }
    } catch (error) {
        const badge = document.getElementById('mockoon-status');
        const statusContent = document.getElementById('mockoonStatusContent');
        
        if (badge) {
            badge.textContent = 'Unavailable';
            badge.className = 'status-badge warning';
        }
        
        if (statusContent) {
            statusContent.innerHTML = `
                <div class="response-header">
                    <span class="response-status error">Connection Failed</span>
                </div>
                <div class="response-json" style="color: #dc3545;">
                    Error: ${error.message}
                </div>
            `;
        }
    }
}

async function checkAIStatus() {
    try {
        const response = await fetch('/api/data/generation-modes');
        const data = await response.json();
        const badge = document.getElementById('ai-status');
        
        const aiMode = data.modes?.find(m => m.id === 'ai');
        if (aiMode && aiMode.available) {
            badge.textContent = 'AI + Fallback';
            badge.className = 'status-badge success';
        } else {
            badge.textContent = 'Basic Only';
            badge.className = 'status-badge warning';
        }
    } catch (error) {
        const badge = document.getElementById('ai-status');
        badge.textContent = 'Error';
        badge.className = 'status-badge warning';
    }
}

function displayResponse(data, containerId = 'testResponse') {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
        container.style.display = 'block';
    } else {
        // Fallback: show in tester section
        const testResponse = document.getElementById('testResponse');
        if (testResponse) {
            testResponse.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
            testResponse.style.display = 'block';
        }
    }
}

// Load and display imported specs
function loadSpecs() {
    // Close other sections first for accordion behavior
    closeAllDynamicSections();
    
    const specsSection = document.getElementById('specsSection');
    fetch('/api/specs')
        .then(response => response.json())
        .then(specs => {
            displaySpecs(specs);
            specsSection.style.display = 'block';
            specsSection.style.visibility = 'visible';
        })
        .catch(error => {
            console.error('Error loading specs:', error);
            // Don't show alert on page load if specs section doesn't exist yet
            if (specsSection) {
                alert('Failed to load specifications');
            }
        });
}

// Display specs with their endpoints
function displaySpecs(specs) {
    const container = document.getElementById('specsList');
    
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
    
    // Add event listeners to dynamically created buttons
    container.querySelectorAll('.view-endpoints-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const specId = this.getAttribute('data-spec-id');
            loadSpecDetails(specId);
        });
    });
}

// Load detailed spec information with endpoints
function loadSpecDetails(specId) {
    const endpointsContainer = document.getElementById(`endpoints-${specId}`);
    
    if (endpointsContainer.style.display === 'block') {
        endpointsContainer.style.display = 'none';
        return;
    }
    
    fetch(`/api/specs/${specId}`)
        .then(response => response.json())
        .then(spec => {
            displayEndpoints(spec.endpoints, specId);
            endpointsContainer.style.display = 'block';
        })
        .catch(error => {
            console.error('Error loading spec details:', error);
            alert('Failed to load specification details');
        });
}

// Display endpoints for a spec
function displayEndpoints(endpoints, specId) {
    const container = document.getElementById(`endpoints-${specId}`);
    
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
    
    // Add event listeners to test buttons
    container.querySelectorAll('.test-endpoint-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const method = this.getAttribute('data-method');
            const path = this.getAttribute('data-path');
            testEndpoint(method, path);
        });
    });
}

// Test a specific endpoint
function testEndpoint(method, path) {
    document.getElementById('testMethod').value = method;
    document.getElementById('testPath').value = path;
    document.getElementById('testerSection').style.display = 'block';
    
    // Clear previous response
    const responseContainer = document.getElementById('testResponse');
    responseContainer.innerHTML = '';
    
    // Add sample payload for POST/PUT/PATCH requests
    const bodyTextArea = document.getElementById('testBody');
    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
        bodyTextArea.value = JSON.stringify({
            "name": "Sample Pet",
            "status": "available",
            "category": {
                "id": 1,
                "name": "Dogs"
            },
            "photoUrls": [
                "https://example.com/photo1.jpg",
                "https://example.com/photo2.jpg"
            ],
            "tags": [
                {
                    "id": 1,
                    "name": "friendly"
                },
                {
                    "id": 2,
                    "name": "playful"
                }
            ]
        }, null, 2);
        bodyTextArea.focus();
        responseContainer.innerHTML = `
            <div class="response-header">
                <span class="response-status">Ready to Test</span>
            </div>
            <div style="padding: 12px; color: #6c757d; font-style: italic;">
                💡 Modify the JSON payload above and click "Send Request" to test this POST endpoint.
            </div>
        `;
    } else {
        bodyTextArea.value = '';
        document.getElementById('testPath').focus();
        responseContainer.innerHTML = `
            <div class="response-header">
                <span class="response-status">Ready to Test</span>
            </div>
            <div style="padding: 12px; color: #6c757d; font-style: italic;">
                💡 Click "Send Request" to test this GET endpoint.
            </div>
        `;
    }
}

// Utility functions for accordion behavior
function closeAllDynamicSections() {
    const dynamicSections = document.querySelectorAll('.dynamic-section');
    dynamicSections.forEach(section => section.remove());
    
    // Also hide the built-in tester section
    const testerSection = document.getElementById('testerSection');
    if (testerSection) {
        testerSection.style.display = 'none';
    }
    
    // Hide specs section
    const specsSection = document.getElementById('specsSection');
    if (specsSection) {
        specsSection.style.display = 'none';
    }
}

function closeDynamicSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.remove();
    }
}

// Show endpoint tester
function showEndpointTester() {
    // Close other dynamic sections first for accordion behavior
    closeAllDynamicSections();
    
    const testerSection = document.getElementById('testerSection');
    if (testerSection) {
        testerSection.style.display = 'block';
        testerSection.style.visibility = 'visible';
        
        // Scroll to the tester section for better UX
        testerSection.scrollIntoView({ behavior: 'smooth' });
        
        // Pre-populate with a sample endpoint if empty
        const pathInput = document.getElementById('testPath');
        if (pathInput && pathInput.value === '/') {
            pathInput.value = '/api/mock/pets';
        }
        
        // Add sample body for POST requests
        const methodSelect = document.getElementById('testMethod');
        const bodyTextarea = document.getElementById('testBody');
        
        if (methodSelect && bodyTextarea) {
            const updateSampleBody = () => {
                const method = methodSelect.value;
                if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
                    if (!bodyTextarea.value.trim()) {
                        bodyTextarea.value = JSON.stringify({
                            "name": "Fluffy",
                            "status": "available",
                            "category": {
                                "id": 1,
                                "name": "Dogs"
                            }
                        }, null, 2);
                    }
                } else {
                    bodyTextarea.value = '';
                }
            };
            
            // Update sample body when method changes
            methodSelect.addEventListener('change', updateSampleBody);
            
            // Set initial sample body
            updateSampleBody();
        }
    }
}

// Hide endpoint tester
function hideTester() {
    document.getElementById('testerSection').style.display = 'none';
}

// Send test request from the quick tester
function sendTestRequest() {
    console.log('sendTestRequest called'); // Debug log
    
    const method = document.getElementById('testMethod').value;
    const path = document.getElementById('testPath').value;
    const body = document.getElementById('testBody').value;
    
    console.log('Request details:', { method, path, body }); // Debug log
    
    if (!path || path.trim() === '') {
        alert('Please enter an endpoint path');
        return;
    }
    
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    if (body && method !== 'GET') {
        try {
            // Validate JSON if body is provided
            if (body.trim()) {
                JSON.parse(body);
                options.body = body;
            }
        } catch (error) {
            alert('Invalid JSON in request body');
            return;
        }
    }
    
    const responseContainer = document.getElementById('testResponse');
    responseContainer.innerHTML = 'Sending request...';
    
    console.log('Making fetch request to:', path, 'with options:', options); // Debug log
    
    fetch(path, options)
        .then(response => {
            return response.text().then(text => {
                try {
                    const json = JSON.parse(text);
                    return { status: response.status, data: json };
                } catch {
                    return { status: response.status, data: text };
                }
            });
        })
        .then(result => {
            const statusClass = result.status >= 200 && result.status < 300 ? 'success' : 'error';
            const formattedJson = typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2);
            
            responseContainer.innerHTML = `
                <div class="response-header">
                    <span class="response-status ${statusClass}">Status: ${result.status}</span>
                    <small style="color: #6c757d;">${new Date().toLocaleTimeString()}</small>
                </div>
                <div class="response-json">${formattedJson}</div>
            `;
        })
        .catch(error => {
            responseContainer.innerHTML = `
                <div class="response-header">
                    <span class="response-status error">Error</span>
                    <small style="color: #6c757d;">${new Date().toLocaleTimeString()}</small>
                </div>
                <div class="response-json" style="color: #dc3545;">
                    <strong>Error:</strong> ${error.message}\n\n<em>Make sure the endpoint exists and the server is running.</em>
                </div>
            `;
        });
}

async function handleSpecUpload(event) {
    event.preventDefault();
    
    const formData = new FormData();
    const name = document.getElementById('specName').value;
    const file = document.getElementById('specFile').files[0];
    const url = document.getElementById('specUrl').value;
    
    if (!name) {
        alert('Please provide an API name');
        return;
    }
    
    if (!file && !url) {
        alert('Please provide either a file or URL');
        return;
    }
    
    try {
        let specData;
        
        if (file) {
            specData = await file.text();
        }
        
        const requestBody = {
            name: name,
            spec: specData,
            url: url
        };
        
        const response = await fetch('/api/specs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert(`✅ Specification "${result.name}" imported successfully!\n\n📊 Found ${result.endpointCount} endpoints\n\n💡 Next steps:\n1. Click "View Imported Specs" to see your endpoints\n2. Use "Quick Test" to test individual endpoints\n3. Your endpoints are now available for testing!`);
            closeSpecModal();
            // Reset form
            document.getElementById('specForm').reset();
            // Auto-load specs to show the new one
            loadSpecs();
        } else {
            alert(`❌ Error: ${result.error}\n\nTip: Make sure your file is valid JSON or YAML format`);
        }
    } catch (error) {
        console.error('Upload error:', error);
        alert('❌ Failed to upload specification\n\nPlease check the file format and try again');
    }
}
