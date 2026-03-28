import { chat } from "@/lib/openaiClient";
import fs from "fs";
import path from "path";

export async function POST(req) {
  try {
    const body = await req.json();
    const userMessage = body.message;
    const history = body.history || [];

    console.log("=== HARVEST START ===");
    console.log("userMessage:", userMessage);

    const systemPrompt = "You are conducting a warm, gentle memory interview with someone. You are talking directly TO this person.\n" +
      "Your goal is to learn about them naturally through conversation. Do NOT follow a script or ask the same questions every time.\n\n" +
      "Guide the conversation organically through these themes — but only ONE at a time, rotate randomly, and NEVER start with music:\n" +
      "- A happy memory from their childhood\n" +
      "- People they love — family or friends\n" +
      "- A place that feels like home\n" +
      "- Something they are proud of\n" +
      "- A hobby or activity they enjoy\n" +
      "- Something that always makes them smile\n" +
      "- Their favorite food or meal\n" +
      "- A pet they have or have had\n" +
      "- Their favorite music, songs, or artists\n" +
      "- A funny memory that makes them laugh\n\n" +
      "Rules:\n" +
      "- NEVER ask the same question twice\n" +
      "- NEVER ask about music as the first or second question\n" +
      "- If they mention anything in their intro, follow up on THAT instead of changing topic\n" +
      "- Vary your second question every time based on what they shared\n" +
      "- Read the conversation history carefully and build on what they have already shared\n" +
      "- Ask follow-up questions based on their actual answers\n" +
      "- If they mention a person, ask more about that person\n" +
      "- If they mention a place, ask what they love about it\n" +
      "- If they mention a hobby, ask for a specific memory related to it\n" +
      "- Keep responses warm, short, and conversational — 2-3 sentences max\n" +
      "- Acknowledge what they share before asking the next question\n" +
      "- Never ask two questions in one message\n\n" +
      "After your conversational response, on a new line extract a memory like this:\n" +
      "[MEMORY: their name is X] or [MEMORY: they love X] or [MEMORY: they feel proud of X]\n" +
      "Always extract something meaningful from every response.";

    const aiResponse = await chat(systemPrompt, [
      ...history,
      { role: "user", content: userMessage },
    ]);

    console.log("=== HARVEST AI RESPONSE ===");
    console.log(aiResponse);

    const memoryMatch = aiResponse.match(/\[MEMORY:(.*?)\]/);
    let extractedMemory;
    if (memoryMatch) {
      extractedMemory = memoryMatch[1].trim();
    } else {
      const wordCount = userMessage.trim().split(/\s+/).length;
      if (wordCount === 1) {
        extractedMemory = "User's name is " + userMessage.trim();
      } else {
        extractedMemory = "User shared: " + userMessage.trim();
      }
    }

    console.log("=== EXTRACTED MEMORY ===");
    console.log(extractedMemory);

    const filePath = path.join(process.cwd(), "data", "patientMemory.json");
    let memories = [];
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, "utf-8");
      memories = JSON.parse(fileData);
    }

    memories.push(extractedMemory);
    fs.writeFileSync(filePath, JSON.stringify(memories, null, 2));

    console.log("=== MEMORY SAVED ===");
    console.log("Total memories:", memories.length);

    const cleanResponse = aiResponse.replace(/\[MEMORY:.*?\]/g, "").trim();
    return Response.json({ response: cleanResponse, memory: extractedMemory });

  } catch (error) {
    console.error("=== HARVEST ERROR ===");
    console.error(error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}