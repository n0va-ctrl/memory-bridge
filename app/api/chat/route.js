import { containers } from "@/lib/cosmos";
import { getConsent } from "@/lib/consent";
import { checkSafety } from "@/lib/contentSafety";
import fs from "fs";
import path from "path";

export async function POST(req) {
  try {
    const body = await req.json();
    const userMessage = body.message;
    const userId = "patient_123";

    // 🚨 DISTRESS DETECTION
    const distressPhrases = [
      "don't want to be here",
      "dont want to be here",
      "want to die",
      "end my life",
      "kill myself",
      "no reason to live",
      "give up",
      "can't go on",
      "cant go on",
      "not worth living",
      "wish i was dead"
    ];
    const isDistressed = distressPhrases.some(phrase =>
      userMessage.toLowerCase().includes(phrase)
    );
    if (isDistressed) {
      const alertPath = path.join(process.cwd(), "data", "alerts.json");
      let alerts = [];
      if (fs.existsSync(alertPath)) {
        alerts = JSON.parse(fs.readFileSync(alertPath, "utf-8"));
      }
      alerts.push({
        message: userMessage,
        timestamp: new Date().toISOString(),
        userId
      });
      fs.writeFileSync(alertPath, JSON.stringify(alerts, null, 2));

      return Response.json({
        message: "I hear you, and I'm so glad you told me. You matter so much. Let's stay together right now — can you tell me one person who loves you?",
        alert: true
      });
    }

    // 🛡️ CONTENT SAFETY CHECK
    const isFlagged = await checkSafety(userMessage);
    if (isFlagged) {
      return Response.json({
        message: "I want to make sure we have a safe and supportive conversation. I'm here for you — can you tell me something that made you smile recently?",
        alert: true
      });
    }

    // 🔐 CHECK CONSENT
    const consent = await getConsent(userId);
    if (!consent || !consent.allow_ai_processing) {
      return Response.json(
        { message: "Consent required before processing." },
        { status: 403 }
      );
    }

    // 🧠 LOAD MEMORIES
    const memoryQuery = {
      query: "SELECT * FROM c WHERE c.userId = @userId",
      parameters: [{ name: "@userId", value: userId }],
    };
    const { resources: memories } = await containers.memories.items
      .query(memoryQuery)
      .fetchAll();
    const memoryContext = memories.length
      ? memories.map((m) => `- ${m.content}`).join("\n")
      : "No memories yet.";

    // 🤖 CALL AZURE OPENAI
    const response = await fetch(process.env.AZURE_OPENAI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.AZURE_OPENAI_KEY,
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: `
You are a compassionate AI companion for someone experiencing memory decline.
Use these personal memories to personalize your responses:
${memoryContext}

Guidelines:
- Be warm, calm, and patient
- Use familiar references from their memories when relevant
- Keep responses short and simple
- Never correct the user or make them feel confused
- If they seem sad or lost, gently redirect to a happy memory
- If the user shares something meaningful, extract it like: [MEMORY: ...]
            `,
          },
          { role: "user", content: userMessage },
        ],
        max_tokens: 150,
      }),
    });

    const data = await response.json();
    let aiMessage =
      data.choices?.[0]?.message?.content ||
      "I'm here with you. Tell me more.";

    // 🧠 EXTRACT AND SAVE NEW MEMORY TO COSMOS
    const memoryMatch = aiMessage.match(/\[MEMORY:(.*?)\]/);
    if (memoryMatch) {
      const newMemory = memoryMatch[1].trim();
      await containers.memories.items.create({
        userId,
        content: newMemory,
        timestamp: new Date().toISOString(),
      });
    }

    // 🧠 CONTENT SAFETY FILTER ON AI OUTPUT
    const unsafeWords = ["kill", "die", "suicide", "harm"];
    for (const word of unsafeWords) {
      if (aiMessage.toLowerCase().includes(word)) {
        aiMessage = "I'm here to support you. Let's talk about something that makes you feel safe and comfortable.";
        break;
      }
    }

    // 🧹 CLEAN MEMORY TAG FROM RESPONSE
    aiMessage = aiMessage.replace(/\[MEMORY:.*?\]/, "").trim();

    // 💾 SAVE TO COSMOS DB
    await containers.conversations.items.create({
      userId,
      userMessage,
      aiMessage,
      timestamp: new Date().toISOString(),
    });

    return Response.json({ message: aiMessage });

  } catch (error) {
    console.error("❌ Chat API Error:", error);
    return Response.json(
      { message: "Something went wrong." },
      { status: 500 }
    );
  }
}