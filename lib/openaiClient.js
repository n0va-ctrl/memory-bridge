import OpenAI from "openai";
import { getSecret } from "@/lib/keyVault";

let clientInstance = null;

async function getClient() {
  if (clientInstance) return clientInstance;
  
  // Try Key Vault first, fall back to env var
  const apiKey = await getSecret("openai-key") || process.env.AZURE_OPENAI_KEY;
  
  clientInstance = new OpenAI({
    apiKey: apiKey,
    baseURL: process.env.AZURE_OPENAI_ENDPOINT + "openai/deployments/memory-bridge-gpt/",
    defaultQuery: { "api-version": "2025-01-01-preview" },
  });
  
  return clientInstance;
}

export async function chat(systemPrompt, messages) {
  try {
    const client = await getClient();
    const response = await client.chat.completions.create({
      model: "memory-bridge-gpt",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      max_tokens: 400,
      temperature: 0.7,
    });
    return response.choices[0].message.content;
  } catch (error) {
    console.error("OpenAI Error:", error);
    return "I'm having trouble responding right now.";
  }
}