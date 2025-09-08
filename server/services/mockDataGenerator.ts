import jsf from "json-schema-faker";
import { faker } from "@faker-js/faker/locale/en";
import OpenAI from "openai";
import { OpenAPIV3 } from "openapi-types";
import {
  OpenAPISchema,
  GenerationContext,
  TestScenario,
} from "../../common/types";

// Helper types
type Faker = typeof faker;
type SchemaOrRef = OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;

// Reference guard
function isReference(schema: SchemaOrRef): schema is OpenAPIV3.ReferenceObject {
  return "$ref" in schema;
}

// Extend JSON Schema Faker with Faker.js
jsf.extend("faker", () => faker);

// Configure JSON Schema Faker
jsf.option({
  useDefaultValue: true,
  alwaysFakeOptionals: true,
  fixedProbabilities: true,
  useExamplesValue: true,
});

// --- Pattern Matcher System ---
type PatternMatcher = {
  test: (propertyName: string) => boolean;
  generate: (faker: Faker, context?: string) => any;
};

const PROPERTY_MATCHERS: PatternMatcher[] = [];

export function registerCustomPattern(
  test: RegExp | ((propertyName: string) => boolean),
  generate: (faker: Faker, context?: string) => any
) {
  const matcher: PatternMatcher = {
    test:
      typeof test === "function"
        ? test
        : (prop: string) => test.test(prop.toLowerCase()),
    generate,
  };
  PROPERTY_MATCHERS.push(matcher);
}

function registerDefaultPatterns() {
  const defs: [RegExp, (f: Faker, c?: string) => any][] = [
    // Email
    [/email|mail/, (f) => f.internet.email()],

    // Names
    [/^name$/, (f) => f.person.fullName()],
    [/firstname/, (f) => f.person.firstName()],
    [/lastname/, (f) => f.person.lastName()],
    [/username/, (f) => f.internet.username()],

    // Phones
    [/phone|mobile|tel/, (f) => f.phone.number()],

    // Addresses
    [/address/, (f) => f.location.streetAddress()],
    [/street/, (f) => f.location.street()],
    [/city/, (f) => f.location.city()],
    [/country/, (f) => f.location.country()],
    [/postal/, (f) => f.location.zipCode()],

    // URLs
    [/url|link|website/, (f) => f.internet.url()],

    // IDs
    [/id$/, (f, ctx) =>
      ctx?.includes("integer") ? f.number.int({ min: 1, max: 999999 }) : f.string.uuid()
    ],
    [/uuid/, (f) => f.string.uuid()],

    // Dates
    [/date/, (f) => f.date.recent().toISOString()],
    [/created/, (f) => f.date.past().toISOString()],
    [/updated/, (f) => f.date.recent().toISOString()],
    [/birth/, (f) => f.date.birthdate().toISOString()],

    // Commerce
    [/price/, (f) => parseFloat(f.commerce.price())],
    [/product/, (f) => f.commerce.productName()],
    [/department/, (f) => f.commerce.department()],
    [/company/, (f) => f.company.name()],

    // Lorem
    [/description/, (f) => f.lorem.paragraph()],
    [/content/, (f) => f.lorem.paragraphs()],
    [/title/, (f) => f.lorem.sentence()],

    // Tags
    [/^tag$/, (f) => f.lorem.word()],
    [/tags/, (f) => f.lorem.words(3).split(" ")],

    // Images
    [/photo|image|picture/, (f) => f.image.url()],
    [/avatar/, (f) => f.image.avatar()],
  ];

  defs.forEach(([regex, gen]) => registerCustomPattern(regex, gen));
}

registerDefaultPatterns();

// --- Mock Data Generator ---
export class MockDataGenerator {
  private openai?: OpenAI;
  private defaultMode: "ai" | "advanced";

  constructor() {
    this.defaultMode = "advanced";

    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  async generateData(
    schema: OpenAPISchema,
    context: GenerationContext = {},
    mode?: "ai" | "advanced"
  ): Promise<any> {
    const generationMode = mode || this.defaultMode;

    if (generationMode === "ai" && this.openai) {
      try {
        return await this.generateWithAI(schema, context);
      } catch (err) {
        console.warn("AI generation failed, fallback to advanced:", err);
        return this.generateAdvanced(schema, context);
      }
    }

    return this.generateAdvanced(schema, context);
  }

  // Advanced faker-based generation
  private generateAdvanced(schema: OpenAPISchema, context: GenerationContext = {}): any {
    if (!schema) return {};

    if (schema.type === "object" && schema.properties) {
      const result: Record<string, any> = {};
      const required = schema.required || [];
      const propertyKeys = Object.keys(schema.properties);

      required.forEach((key) => {
        const prop = schema.properties![key];
        if (prop && !prop.readOnly) {
          result[key] = this.generateValue(prop, key);
        }
      });

      // Optional properties
      propertyKeys.forEach((key) => {
        if (!required.includes(key)) {
          const prop = schema.properties![key];
          if (prop && !prop.readOnly) {
            result[key] = this.generateValue(prop, key);
          }
        }
      });

      return result;
    }

    return this.generateValue(schema, "");
  }

  private generateValue(schema: OpenAPISchema, propertyName: string = ""): any {
    if (schema.const !== undefined) return schema.const;
    if (schema.enum && schema.enum.length > 0) {
      return faker.helpers.arrayElement(schema.enum);
    }

    if (schema.type === "array" && schema.items) {
      const minItems = schema.minItems ?? 1;
      const maxItems = schema.maxItems ?? 5;
      return Array.from(
        { length: faker.number.int({ min: minItems, max: maxItems }) },
        () => this.generateValue(schema.items as OpenAPISchema, propertyName)
      );
    }

    if (schema.type === "object" && schema.properties) {
      return this.generateAdvanced(schema);
    }

    const contextInfo = `${schema.type || ""} ${schema.format || ""} ${propertyName}`.toLowerCase();

    for (const matcher of PROPERTY_MATCHERS) {
      if (matcher.test(propertyName.toLowerCase())) {
        return matcher.generate(faker, contextInfo);
      }
    }

    switch (schema.type) {
      case "string":
        return this.generateString(schema);
      case "number":
      case "integer":
        return this.generateNumber(schema);
      case "boolean":
        return faker.datatype.boolean();
      default:
        return null;
    }
  }

  private generateString(schema: OpenAPISchema): string {
    const { format, minLength = 1, maxLength = 50 } = schema;

    switch (format) {
      case "email":
        return faker.internet.email();
      case "uri":
      case "url":
        return faker.internet.url();
      case "uuid":
        return faker.string.uuid();
      case "date":
        return faker.date.recent().toISOString().split("T")[0];
      case "date-time":
        return faker.date.recent().toISOString();
      case "time":
        return faker.date.recent().toTimeString().split(" ")[0];
      case "password":
        return faker.internet.password();
      case "byte":
        return Buffer.from(faker.lorem.words()).toString("base64");
      case "binary":
        return faker.string.hexadecimal({ length: 16 });
      default:
        return faker.lorem.words().substring(0, Math.min(maxLength, 10));
    }
  }

  private generateNumber(schema: OpenAPISchema): number {
    const { minimum, maximum, exclusiveMinimum, exclusiveMaximum, multipleOf } = schema;

    let min = minimum ?? 0;
    let max = maximum ?? 1000;

    if (typeof exclusiveMinimum === "number") {
      min = schema.type === "integer" ? exclusiveMinimum + 1 : exclusiveMinimum + 0.01;
    }
    if (typeof exclusiveMaximum === "number") {
      max = schema.type === "integer" ? exclusiveMaximum - 1 : exclusiveMaximum - 0.01;
    }

    let value =
      schema.type === "integer"
        ? faker.number.int({ min: Math.ceil(min), max: Math.floor(max) })
        : faker.number.float({ min, max, fractionDigits: 2 });

    if (multipleOf) {
      value = Math.round(value / multipleOf) * multipleOf;
    }

    return value;
  }

  private async generateWithAI(schema: OpenAPISchema, context: GenerationContext): Promise<any> {
    if (!this.openai) throw new Error("OpenAI not initialized");

    const prompt = `Generate realistic mock data for this OpenAPI schema:\n${JSON.stringify(
      schema,
      null,
      2
    )}\nContext: ${JSON.stringify(
      context,
      null,
      2
    )}\nRequirements:\n- Generate realistic data\n- Follow schema constraints\n- Return only JSON`;

    const resp = await this.openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a mock data generator." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const content = resp.choices[0]?.message?.content;
    if (!content) throw new Error("No AI response");
    return JSON.parse(content);
  }

  async generateTestScenarios(
    schema: OpenAPISchema,
    count: number = 3
  ): Promise<TestScenario[]> {
    const scenarios: TestScenario[] = [];
    for (let i = 0; i < count; i++) {
      const data = await this.generateData(schema);
      scenarios.push({
        id: i + 1,
        name: `Test Scenario ${i + 1}`,
        data,
        type: "generated",
        generatedAt: new Date().toISOString(),
      });
    }
    return scenarios;
  }
}

// --- JSON Schema Converter ---
function convertToJsonSchema(schema: SchemaOrRef): any {
  if (isReference(schema)) return schema;

  const jsonSchema: any = { ...schema };
  if (schema.allOf) jsonSchema.allOf = schema.allOf.map(convertToJsonSchema);
  if (schema.oneOf) jsonSchema.oneOf = schema.oneOf.map(convertToJsonSchema);
  if (schema.anyOf) jsonSchema.anyOf = schema.anyOf.map(convertToJsonSchema);
  if (schema.type === "array" && schema.items) {
    jsonSchema.items = convertToJsonSchema(schema.items as SchemaOrRef);
  }
  if (schema.properties) {
    jsonSchema.properties = Object.entries(schema.properties).reduce(
      (acc, [k, v]) => {
        acc[k] = convertToJsonSchema(v as OpenAPIV3.SchemaObject);
        return acc;
      },
      {} as Record<string, any>
    );
  }
  return jsonSchema;
}

// --- Convenience Helpers ---
export async function generateMockData(schema: OpenAPIV3.SchemaObject): Promise<any> {
  const generator = new MockDataGenerator();
  return generator.generateData(schema);
}

export async function generateExampleRequest(schema: OpenAPIV3.SchemaObject): Promise<any> {
  return generateMockData(schema);
}

export async function generateExampleResponse(schema: OpenAPIV3.SchemaObject): Promise<any> {
  return generateMockData(schema);
}

export default MockDataGenerator;
