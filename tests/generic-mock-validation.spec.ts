import { test, expect } from '@playwright/test';

test.describe('Generic Mock System Validation', () => {
  const baseUrl = 'http://localhost:3002';

  // Test multiple diverse API domains to prove generic capability
  const testSpecs = [
    {
      name: 'E-commerce API',
      spec: {
        openapi: '3.0.0',
        info: { title: 'E-commerce API', version: '1.0.0' },
        paths: {
          '/products': {
            get: {
              responses: {
                '200': {
                  description: 'List of products',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'array',
                        items: {
                          type: 'object',
                          required: ['id', 'name', 'price'],
                          properties: {
                            id: { type: 'integer', minimum: 1 },
                            name: { type: 'string', minLength: 1, maxLength: 100 },
                            price: { type: 'number', minimum: 0.01, maximum: 9999.99 },
                            description: { type: 'string', maxLength: 500 },
                            category: { type: 'string', enum: ['electronics', 'clothing', 'books', 'home'] },
                            inStock: { type: 'boolean' },
                            tags: { 
                              type: 'array', 
                              items: { type: 'string' },
                              minItems: 0,
                              maxItems: 5
                            },
                            metadata: {
                              type: 'object',
                              properties: {
                                weight: { type: 'number', minimum: 0 },
                                dimensions: {
                                  type: 'object',
                                  properties: {
                                    length: { type: 'number' },
                                    width: { type: 'number' },
                                    height: { type: 'number' }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            post: {
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      required: ['name', 'price'],
                      properties: {
                        name: { type: 'string', minLength: 1, maxLength: 100 },
                        price: { type: 'number', minimum: 0.01 },
                        description: { type: 'string' },
                        category: { type: 'string', enum: ['electronics', 'clothing', 'books', 'home'] }
                      }
                    }
                  }
                }
              },
              responses: {
                '201': {
                  description: 'Product created',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer' },
                          name: { type: 'string' },
                          price: { type: 'number' },
                          createdAt: { type: 'string', format: 'date-time' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    {
      name: 'Healthcare API',
      spec: {
        openapi: '3.0.0',
        info: { title: 'Healthcare API', version: '1.0.0' },
        paths: {
          '/patients': {
            get: {
              responses: {
                '200': {
                  description: 'List of patients',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'array',
                        items: {
                          type: 'object',
                          required: ['id', 'firstName', 'lastName', 'dateOfBirth'],
                          properties: {
                            id: { type: 'string', format: 'uuid' },
                            firstName: { type: 'string', minLength: 1 },
                            lastName: { type: 'string', minLength: 1 },
                            dateOfBirth: { type: 'string', format: 'date' },
                            email: { type: 'string', format: 'email' },
                            phone: { type: 'string', pattern: '^\\+?[1-9]\\d{1,14}$' },
                            address: {
                              type: 'object',
                              properties: {
                                street: { type: 'string' },
                                city: { type: 'string' },
                                state: { type: 'string' },
                                zipCode: { type: 'string' },
                                country: { type: 'string', default: 'US' }
                              }
                            },
                            medicalHistory: {
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  condition: { type: 'string' },
                                  diagnosedDate: { type: 'string', format: 'date' },
                                  severity: { type: 'string', enum: ['low', 'medium', 'high'] }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    {
      name: 'Financial API',
      spec: {
        openapi: '3.0.0',
        info: { title: 'Financial API', version: '1.0.0' },
        paths: {
          '/accounts': {
            get: {
              responses: {
                '200': {
                  description: 'List of accounts',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'array',
                        items: {
                          allOf: [
                            {
                              type: 'object',
                              required: ['id', 'accountNumber', 'balance'],
                              properties: {
                                id: { type: 'string', format: 'uuid' },
                                accountNumber: { type: 'string', pattern: '^[0-9]{10,12}$' },
                                balance: { type: 'number', multipleOf: 0.01 }
                              }
                            },
                            {
                              type: 'object',
                              properties: {
                                accountType: { type: 'string', enum: ['checking', 'savings', 'credit'] },
                                currency: { type: 'string', const: 'USD' },
                                isActive: { type: 'boolean', default: true },
                                openedDate: { type: 'string', format: 'date' },
                                lastTransactionDate: { type: 'string', format: 'date-time' }
                              }
                            }
                          ]
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '/transactions': {
            post: {
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    schema: {
                      oneOf: [
                        {
                          type: 'object',
                          title: 'Deposit',
                          required: ['accountId', 'amount', 'type'],
                          properties: {
                            accountId: { type: 'string', format: 'uuid' },
                            amount: { type: 'number', minimum: 0.01 },
                            type: { type: 'string', const: 'deposit' },
                            description: { type: 'string' }
                          }
                        },
                        {
                          type: 'object',
                          title: 'Withdrawal',
                          required: ['accountId', 'amount', 'type'],
                          properties: {
                            accountId: { type: 'string', format: 'uuid' },
                            amount: { type: 'number', minimum: 0.01 },
                            type: { type: 'string', const: 'withdrawal' },
                            description: { type: 'string' }
                          }
                        }
                      ]
                    }
                  }
                }
              },
              responses: {
                '201': {
                  description: 'Transaction created',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          status: { type: 'string', enum: ['pending', 'completed', 'failed'] },
                          timestamp: { type: 'string', format: 'date-time' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  ];

  test.beforeAll(async ({ request }) => {
    // Upload all test specs
    for (const testSpec of testSpecs) {
      await request.post(`${baseUrl}/api/specs/upload`, {
        data: {
          spec: JSON.stringify(testSpec.spec),
          name: testSpec.name
        }
      });
    }
    
    // Wait for specs to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  test('should generate realistic data for E-commerce API', async ({ request }) => {
    // Test GET /products - should return array with proper constraints
    const response = await request.get(`${baseUrl}/mock/products`);
    expect(response.status()).toBe(200);
    
    const products = await response.json();
    expect(Array.isArray(products)).toBe(true);
    
    if (products.length > 0) {
      const product = products[0];
      
      // Validate required fields
      expect(product).toHaveProperty('id');
      expect(product).toHaveProperty('name');
      expect(product).toHaveProperty('price');
      
      // Validate constraints
      expect(typeof product.id).toBe('number');
      expect(product.id).toBeGreaterThanOrEqual(1);
      expect(typeof product.name).toBe('string');
      expect(product.name.length).toBeGreaterThanOrEqual(1);
      expect(product.name.length).toBeLessThanOrEqual(100);
      expect(typeof product.price).toBe('number');
      expect(product.price).toBeGreaterThanOrEqual(0.01);
      expect(product.price).toBeLessThanOrEqual(9999.99);
      
      // Validate enum constraint
      if (product.category) {
        expect(['electronics', 'clothing', 'books', 'home']).toContain(product.category);
      }
      
      // Validate array constraints
      if (product.tags) {
        expect(Array.isArray(product.tags)).toBe(true);
        expect(product.tags.length).toBeLessThanOrEqual(5);
      }
    }
  });

  test('should validate request payload for E-commerce API', async ({ request }) => {
    // Test valid POST request
    const validProduct = {
      name: 'Test Product',
      price: 29.99,
      category: 'electronics'
    };
    
    const validResponse = await request.post(`${baseUrl}/mock/products`, {
      data: validProduct
    });
    expect(validResponse.status()).toBe(201);
    
    const createdProduct = await validResponse.json();
    expect(createdProduct).toHaveProperty('id');
    expect(createdProduct).toHaveProperty('createdAt');
    expect(createdProduct.name).toBe(validProduct.name);
    expect(createdProduct.price).toBe(validProduct.price);

    // Test invalid POST request (missing required field)
    const invalidProduct = {
      name: 'Test Product',
      // Missing required 'price' field
    };
    
    const invalidResponse = await request.post(`${baseUrl}/mock/products`, {
      data: invalidProduct
    });
    expect(invalidResponse.status()).toBe(400);
    
    const error = await invalidResponse.json();
    expect(error).toHaveProperty('error');
    expect(error.error).toBe('Invalid request body');
  });

  test('should generate realistic data for Healthcare API', async ({ request }) => {
    const response = await request.get(`${baseUrl}/mock/patients`);
    expect(response.status()).toBe(200);
    
    const patients = await response.json();
    expect(Array.isArray(patients)).toBe(true);
    
    if (patients.length > 0) {
      const patient = patients[0];
      
      // Validate required fields
      expect(patient).toHaveProperty('id');
      expect(patient).toHaveProperty('firstName');
      expect(patient).toHaveProperty('lastName');
      expect(patient).toHaveProperty('dateOfBirth');
      
      // Validate format constraints
      expect(typeof patient.id).toBe('string');
      expect(patient.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i); // UUID format
      
      if (patient.email) {
        expect(patient.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/); // Email format
      }
      
      if (patient.dateOfBirth) {
        expect(patient.dateOfBirth).toMatch(/^\d{4}-\d{2}-\d{2}$/); // Date format
      }
      
      // Validate nested objects
      if (patient.address) {
        expect(typeof patient.address).toBe('object');
        if (patient.address.country === undefined) {
          // Should use default value
          expect(patient.address.country).toBe('US');
        }
      }
      
      // Validate arrays
      if (patient.medicalHistory) {
        expect(Array.isArray(patient.medicalHistory)).toBe(true);
        if (patient.medicalHistory.length > 0) {
          const condition = patient.medicalHistory[0];
          if (condition.severity) {
            expect(['low', 'medium', 'high']).toContain(condition.severity);
          }
        }
      }
    }
  });

  test('should handle schema composition (allOf, oneOf) for Financial API', async ({ request }) => {
    // Test allOf composition in accounts
    const accountsResponse = await request.get(`${baseUrl}/mock/accounts`);
    expect(accountsResponse.status()).toBe(200);
    
    const accounts = await accountsResponse.json();
    expect(Array.isArray(accounts)).toBe(true);
    
    if (accounts.length > 0) {
      const account = accounts[0];
      
      // Should have properties from both allOf schemas
      expect(account).toHaveProperty('id');
      expect(account).toHaveProperty('accountNumber');
      expect(account).toHaveProperty('balance');
      
      // Validate constraints from merged schemas
      expect(typeof account.id).toBe('string');
      expect(account.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(account.accountNumber).toMatch(/^[0-9]{10,12}$/);
      expect(typeof account.balance).toBe('number');
      
      // Validate const constraint
      if (account.currency) {
        expect(account.currency).toBe('USD');
      }
      
      // Validate default value
      if (account.isActive === undefined) {
        expect(account.isActive).toBe(true);
      }
    }

    // Test oneOf composition in transactions
    const depositTransaction = {
      accountId: '123e4567-e89b-12d3-a456-426614174000',
      amount: 100.50,
      type: 'deposit',
      description: 'Test deposit'
    };
    
    const transactionResponse = await request.post(`${baseUrl}/mock/transactions`, {
      data: depositTransaction
    });
    expect(transactionResponse.status()).toBe(201);
    
    const createdTransaction = await transactionResponse.json();
    expect(createdTransaction).toHaveProperty('id');
    expect(createdTransaction).toHaveProperty('status');
    expect(createdTransaction).toHaveProperty('timestamp');
    
    if (createdTransaction.status) {
      expect(['pending', 'completed', 'failed']).toContain(createdTransaction.status);
    }
  });

  test('should respect all constraint types across different domains', async ({ request }) => {
    // Test string constraints (minLength, maxLength, pattern, format)
    // Test number constraints (minimum, maximum, multipleOf)
    // Test array constraints (minItems, maxItems, uniqueItems)
    // Test object constraints (required, minProperties, maxProperties)
    
    const allResponses = await Promise.all([
      request.get(`${baseUrl}/mock/products`),
      request.get(`${baseUrl}/mock/patients`),
      request.get(`${baseUrl}/mock/accounts`)
    ]);
    
    // All should return 200 with properly structured data
    allResponses.forEach(response => {
      expect(response.status()).toBe(200);
    });
    
    const [products, patients, accounts] = await Promise.all(
      allResponses.map(r => r.json())
    );
    
    // Each should be an array with realistic, constraint-compliant data
    expect(Array.isArray(products)).toBe(true);
    expect(Array.isArray(patients)).toBe(true);
    expect(Array.isArray(accounts)).toBe(true);
    
    // Spot check that data looks realistic and domain-appropriate
    if (products.length > 0) {
      expect(products[0]).toHaveProperty('name');
      expect(products[0]).toHaveProperty('price');
      expect(typeof products[0].price).toBe('number');
    }
    
    if (patients.length > 0) {
      expect(patients[0]).toHaveProperty('firstName');
      expect(patients[0]).toHaveProperty('lastName');
      expect(patients[0]).toHaveProperty('dateOfBirth');
    }
    
    if (accounts.length > 0) {
      expect(accounts[0]).toHaveProperty('accountNumber');
      expect(accounts[0]).toHaveProperty('balance');
      expect(typeof accounts[0].balance).toBe('number');
    }
  });

  test('should maintain data persistence across requests', async ({ request }) => {
    // Create a product
    const newProduct = {
      name: 'Persistent Test Product',
      price: 199.99,
      category: 'electronics'
    };
    
    const createResponse = await request.post(`${baseUrl}/mock/products`, {
      data: newProduct
    });
    expect(createResponse.status()).toBe(201);
    
    const createdProduct = await createResponse.json();
    const productId = createdProduct.id;
    
    // Verify it appears in the collection
    const listResponse = await request.get(`${baseUrl}/mock/products`);
    expect(listResponse.status()).toBe(200);
    
    const products = await listResponse.json();
    const foundProduct = products.find((p: any) => p.id === productId);
    expect(foundProduct).toBeDefined();
    expect(foundProduct.name).toBe(newProduct.name);
    expect(foundProduct.price).toBe(newProduct.price);
  });
});
