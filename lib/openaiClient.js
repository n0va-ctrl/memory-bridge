import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_KEY,
  baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}openai/deployments/memory-bridge-gpt/`,
  defaultQuery: { "api-version": "2025-01-01-preview" },
});

export async function chat(systemPrompt, messages) {
  try {
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
