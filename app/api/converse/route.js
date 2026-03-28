import { chat } from "@/lib/openaiClient";
import fs from "fs";
import path from "path";

export async function POST(req) {
  try {
    const body = await req.json();
    const userMessage = body.message;
    const mode = body.mode || "normal";
    const history = body.history || [];

    console.log("User interaction:", userMessage, "Mode:", mode);

    const filePath = path.join(process.cwd(), "data", "patientMemory.json");
    let memories = [];
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, "utf-8");
      memories = JSON.parse(fileData);
    }

    const memoryContext = memories.length
      ? `Here are important memories about the user:\n- ${memories.join("\n- ")}`
      : "No memories yet.";

    let toneInstruction = "";
    if (mode === "gentle") {
      toneInstruction = `
GENTLE MODE: 
- Use very short sentences. Maximum 2 sentences per response.
- Speak like a warm grandmother or trusted friend.
- Always start by acknowledging the feeling before anything else.
- Use soft words: "I hear you", "That sounds lovely", "How wonderful".
- Never ask more than one question.
- If the person is sad or upset, sit with them in it first. Do not rush to fix.
- Example response to "I am sad": "Oh, I hear you. I am right here with you — would you like to tell me what is on your heart?"
`;
    } else if (mode === "hard") {
      toneInstruction = `
DIRECT MODE:
- Be clear, calm, and grounding. Use plain simple language.
- Get to the point quickly but stay warm.
- Acknowledge the feeling in one short sentence, then respond practically.
- Responses can be slightly longer and more informative.
- Ask direct, clear questions.
- Example response to "I am sad": "I hear that you are feeling sad. What is going on today?"
`;
    } else {
      toneInstruction = `
NORMAL MODE:
- Be conversational, warm, and natural.
- Balance acknowledging feelings with gentle conversation.
- Responses should feel like talking to a kind, attentive friend.
- Ask one question at a time.
- Example response to "I am sad": "I am sorry to hear that. It is okay to feel that way — do you want to talk about what is on your mind?"
`;
    }

    const systemPrompt = `
You are a compassionate AI companion for someone experiencing memory loss. You are talking directly TO this person, not about them.

${toneInstruction}

When the person tells you their name, remember it is THEIR name. Use it warmly in conversation.
Actively reference specific memories when appropriate.
${memoryContext}

RULES:
- NEVER correct the user
- NEVER mention memory loss or dementia
- NEVER say you cannot respond to something
- NEVER give the same response twice
- Always respond with presence and warmth
- Keep responses short and focused
- Always acknowledge what was just said before moving forward
`;

    const aiResponse = await chat(systemPrompt, [
      ...history,
      { role: "user", content: userMessage },
    ]);

    return Response.json({ response: aiResponse });
  } catch (error) {
    console.error("Converse API Error:", error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}