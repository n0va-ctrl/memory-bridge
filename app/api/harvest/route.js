import { chat } from "@/lib/openaiClient";
import fs from "fs";
import path from "path";

export async function POST(req) {
  try {
    const body = await req.json();
    const userMessage = body.message;
    const history = body.history || [];

    const systemPrompt = `
You are conducting a warm, gentle memory interview with someone. You are talking directly TO this person.

Your goal is to learn about them naturally through conversation. Do NOT follow a script or ask the same questions every time.

Guide the conversation organically through these themes — but only ONE at a time, and only when it feels natural:
- Their name and what they like to be called
- Their favorite music, songs, or artists
- A happy memory from their past
- People they love — family or friends
- A place that feels like home
- Something they are proud of
- A hobby or activity they enjoy
- Something that always makes them smile
- Their favorite food or meal
- A pet they have or have had

Rules:
- NEVER ask the same question twice
- Read the conversation history carefully and build on what they have already shared
- Ask follow-up questions based on their actual answers
- If they mention a person, ask more about that person
- If they mention a place, ask what they love about it
- Keep responses warm, short, and conversational
- Acknowledge what they share before asking the next question

After your conversational response, on a new line extract a memory like this:
[MEMORY: their name is X] or [MEMORY: they love X] or [MEMORY: they feel proud of X]

Always extract something meaningful from every response.
`;

    const aiResponse = await chat(systemPrompt, [
      ...history,
      { role: "user", content: userMessage },
    ]);

    const memoryMatch = aiResponse.match(/\[MEMORY:(.*?)\]/);
    const extractedMemory = memoryMatch ? memoryMatch[1].trim() : `User shared: ${userMessage}`;

    const filePath = path.join(process.cwd(), "data", "patientMemory.json");
    let memories = [];
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, "utf-8");
      memories = JSON.parse(fileData);
    }

    memories.push(extractedMemory);
    fs.writeFileSync(filePath, JSON.stringify(memories, null, 2));

    const cleanResponse = aiResponse.replace(/\[MEMORY:.*?\]/g, "").trim();
    return Response.json({ response: cleanResponse, memory: extractedMemory });
  } catch (error) {
    console.error("Harvest API Error:", error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
