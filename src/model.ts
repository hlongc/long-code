import OpenAI from "openai";
import "dotenv/config";

export const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

export const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";