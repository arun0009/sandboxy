import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Smart API Sandbox - End-to-End Mock Workflow', () => {
  let baseURL: string;
  
  test.beforeAll(async () => {
    baseURL = 'http://localhost:3001';
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Smart API Sandbox');
  });

  test('should import API specification and enable mocking', async ({ page }) => {
    // Step 1: Import the petstore API spec
    await page.click('#import-spec-btn');
    
    // Wait for modal to appear
    await expect(page.locator('#specModal')).toBeVisible();
    
    // Fill in the form
    await page.fill('#specName', 'Test Petstore API');
    
    // Load the spec file content
    const specPath = path.join(__dirname, '../sample-specs/petstore-api.json');
    const specContent = fs.readFileSync(specPath, 'utf8');
    
    // Since we can't upload files easily in this test, let's use the API directly
    // First close the modal
    await page.click('#close-modal-btn');
    
    // Import spec via API
    const response = await page.request.post('/api/specs', {
      data: {
        name: 'Test Petstore API',
        spec: JSON.parse(specContent)
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const specData = await response.json();
    expect(specData.name).toBe('Test Petstore API');
    expect(specData.endpointCount).toBeGreaterThan(0);
    
    console.log('Spec imported successfully:', specData);
  });

  test('should handle POST request with smart data generation', async ({ page, request }) => {
    // First import the spec
    const specPath = path.join(__dirname, '../sample-specs/petstore-api.json');
    const specContent = fs.readFileSync(specPath, 'utf8');
    
    await request.post('/api/specs', {
      data: {
        name: 'Test Petstore API',
        spec: JSON.parse(specContent)
      }
    });

    // Test POST request to create a pet
    const petData = {
      name: 'Fluffy',
      breed: 'Golden Retriever',
      age: 3,
      status: 'available'
    };

    const postResponse = await request.post('/api/mock/pets', {
      data: petData
    });

    expect(postResponse.ok()).toBeTruthy();
    const createdPet = await postResponse.json();
    
    console.log('POST Response:', createdPet);
    
    // Verify the response structure
    expect(createdPet.name).toBe('Fluffy');
    expect(createdPet.breed).toBe('Golden Retriever');
    expect(createdPet.age).toBe(3);
    expect(createdPet.status).toBe('available');
    expect(createdPet.id).toBeDefined();
    expect(createdPet.createdAt).toBeDefined();
    expect(createdPet._mock).toBeDefined();
    expect(createdPet._mock.method).toBe('POST');
    expect(createdPet._mock.endpoint).toBe('/pets');
    
    return createdPet;
  });

  test('should persist data between POST and GET requests', async ({ page, request }) => {
    // Import spec first
    const specPath = path.join(__dirname, '../sample-specs/petstore-api.json');
    const specContent = fs.readFileSync(specPath, 'utf8');
    
    await request.post('/api/specs', {
      data: {
        name: 'Test Petstore API',
        spec: JSON.parse(specContent)
      }
    });

    // Step 1: POST a new pet
    const petData = {
      name: 'Buddy',
      breed: 'Labrador',
      age: 2,
      status: 'available'
    };

    const postResponse = await request.post('/api/mock/pets', {
      data: petData
    });

    expect(postResponse.ok()).toBeTruthy();
    const createdPet = await postResponse.json();
    console.log('Created Pet:', createdPet);

    // Step 2: GET the same endpoint and verify data persistence
    const getResponse = await request.get('/api/mock/pets');
    expect(getResponse.ok()).toBeTruthy();
    
    const retrievedData = await getResponse.json();
    console.log('Retrieved Data:', retrievedData);
    
    // The mock system should return the previously POSTed data
    expect(retrievedData.name).toBe('Buddy');
    expect(retrievedData.breed).toBe('Labrador');
    expect(retrievedData.age).toBe(2);
    expect(retrievedData.status).toBe('available');
    expect(retrievedData._mock.stateful).toBe(true);
  });

  test('should handle parameterized routes (GET /pets/{petId})', async ({ page, request }) => {
    // Import spec
    const specPath = path.join(__dirname, '../sample-specs/petstore-api.json');
    const specContent = fs.readFileSync(specPath, 'utf8');
    
    await request.post('/api/specs', {
      data: {
        name: 'Test Petstore API',
        spec: JSON.parse(specContent)
      }
    });

    // Test GET request with parameter
    const getResponse = await request.get('/api/mock/pets/123');
    expect(getResponse.ok()).toBeTruthy();
    
    const petData = await getResponse.json();
    console.log('Pet by ID:', petData);
    
    // Should generate mock data based on schema
    expect(petData.id).toBeDefined();
    expect(petData.name).toBeDefined();
    expect(petData._mock).toBeDefined();
    expect(petData._mock.endpoint).toBe('/pets/123');
    expect(petData._mock.method).toBe('GET');
  });

  test('should integrate with smart data generation services', async ({ page, request }) => {
    // Test the data generation services directly
    const basicGenResponse = await request.post('/api/data/generate', {
      data: {
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            age: { type: 'integer', minimum: 18, maximum: 65 }
          }
        },
        count: 1
      }
    });

    expect(basicGenResponse.ok()).toBeTruthy();
    const generatedData = await basicGenResponse.json();
    console.log('Generated Data:', generatedData);
    
    expect(generatedData).toHaveLength(1);
    expect(generatedData[0].name).toBeDefined();
    expect(generatedData[0].email).toContain('@');
    expect(generatedData[0].age).toBeGreaterThanOrEqual(18);
  });

  test('should display error for non-existent endpoints', async ({ page, request }) => {
    const response = await request.get('/api/mock/nonexistent');
    expect(response.status()).toBe(404);
    
    const errorData = await response.json();
    console.log('Error Response:', errorData);
    
    expect(errorData.error).toBe('Mock endpoint not found');
    expect(errorData.message).toContain('No mock available for GET /nonexistent');
  });

  test('UI should allow testing endpoints through the interface', async ({ page }) => {
    // Import spec first via API
    const specPath = path.join(__dirname, '../sample-specs/petstore-api.json');
    const specContent = fs.readFileSync(specPath, 'utf8');
    
    await page.request.post('/api/specs', {
      data: {
        name: 'Test Petstore API',
        spec: JSON.parse(specContent)
      }
    });

    // Open the quick tester
    await page.click('#quick-test-btn');
    await expect(page.locator('#testerSection')).toBeVisible();

    // Fill in test form
    await page.selectOption('#testMethod', 'POST');
    await page.fill('#testPath', '/api/mock/pets');
    await page.fill('#testBody', JSON.stringify({
      name: 'UI Test Pet',
      breed: 'Beagle',
      age: 4,
      status: 'available'
    }));

    // Send the request
    await page.click('#send-test-request-btn');

    // Wait for response and verify
    await page.waitForTimeout(2000); // Give time for the request
    
    const responseText = await page.locator('#testResponse').textContent();
    console.log('UI Test Response:', responseText);
    
    expect(responseText).toContain('UI Test Pet');
    expect(responseText).toContain('Beagle');
    expect(responseText).toContain('"method": "POST"');
  });

  test('should show imported specs in the UI', async ({ page }) => {
    // Import spec via API
    const specPath = path.join(__dirname, '../sample-specs/petstore-api.json');
    const specContent = fs.readFileSync(specPath, 'utf8');
    
    await page.request.post('/api/specs', {
      data: {
        name: 'UI Test Petstore',
        spec: JSON.parse(specContent)
      }
    });

    // Click view specs button
    await page.click('#view-specs-btn');
    await expect(page.locator('#specsSection')).toBeVisible();

    // Wait for specs to load
    await page.waitForTimeout(1000);
    
    // Check if the spec appears in the list
    const specsContent = await page.locator('#specsList').textContent();
    console.log('Specs List Content:', specsContent);
    
    expect(specsContent).toContain('UI Test Petstore');
  });

  test('comprehensive workflow: Import → POST → GET → Verify persistence', async ({ page, request }) => {
    console.log('🚀 Starting comprehensive workflow test...');
    
    // Step 1: Import API specification
    const specPath = path.join(__dirname, '../sample-specs/petstore-api.json');
    const specContent = fs.readFileSync(specPath, 'utf8');
    
    const importResponse = await request.post('/api/specs', {
      data: {
        name: 'Comprehensive Test API',
        spec: JSON.parse(specContent)
      }
    });
    
    expect(importResponse.ok()).toBeTruthy();
    const specData = await importResponse.json();
    console.log('Step 1 - Spec imported:', specData.name);

    // Step 2: POST data with smart generation
    const testPet = {
      name: 'Comprehensive Test Pet',
      breed: 'German Shepherd',
      age: 5,
      status: 'available'
    };

    const postResponse = await request.post('/api/mock/pets', {
      data: testPet
    });

    expect(postResponse.ok()).toBeTruthy();
    const createdPet = await postResponse.json();
    console.log('Step 2 - Pet created:', createdPet.name, 'ID:', createdPet.id);

    // Step 3: GET the data back and verify persistence
    const getResponse = await request.get('/api/mock/pets');
    expect(getResponse.ok()).toBeTruthy();
    
    const retrievedPet = await getResponse.json();
    console.log('Step 3 - Pet retrieved:', retrievedPet.name);

    // Step 4: Verify data integrity
    expect(retrievedPet.name).toBe(testPet.name);
    expect(retrievedPet.breed).toBe(testPet.breed);
    expect(retrievedPet.age).toBe(testPet.age);
    expect(retrievedPet.status).toBe(testPet.status);
    expect(retrievedPet._mock.stateful).toBe(true);
    
    console.log('Step 4 - Data integrity verified');

    // Step 5: Test parameterized GET
    const paramGetResponse = await request.get(`/api/mock/pets/${createdPet.id}`);
    expect(paramGetResponse.ok()).toBeTruthy();
    
    const paramPet = await paramGetResponse.json();
    console.log('Step 5 - Parameterized GET works:', paramPet._mock.endpoint);

    console.log('Comprehensive workflow test completed successfully!');
  });
});
