import { petFaker } from "./petFaker";

export type CustomFaker = (prop: string, contextInfo?: string) => any;

const registry: Record<string, CustomFaker[]> = {
  "POST /api/mock/pet": [petFaker],
  "PUT /api/mock/pet": [petFaker],
  // Add more endpoint-specific fakers here
};

export function getCustomFakers(endpoint: string): CustomFaker[] {
  return registry[endpoint] || [];
}