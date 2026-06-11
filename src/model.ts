import OpenAI from "openai";
import "dotenv/config";

export const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

let currentModel = process.env.OPENAI_MODEL || "gpt-4o-mini";

export function setModel(model: string) {
  currentModel = model;
}

export function getModel() {
  return currentModel;
}
