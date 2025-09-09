import { faker } from "@faker-js/faker/locale/en";

export function petFaker(propertyName: string, contextInfo?: string) {
  const lower = propertyName.toLowerCase();

  if (lower === "name") {
    const dogNames = ["Buddy", "Bella", "Cooper", "Lucy", "Max", "Luna", "Rocky", "Molly"];
    return faker.helpers.arrayElement(dogNames);
  }

  if (lower === "status") {
    return faker.helpers.arrayElement(["available", "pending", "sold"]);
  }

  return undefined; // fallback to default generator
}