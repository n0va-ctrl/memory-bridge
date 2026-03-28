import { containers } from "@/lib/cosmos";
import { getConsent } from "@/lib/consent";

export async function POST(req) {
  try {
    const body = await req.json();
    const userMessage = body.message;

    const userId = "patient_123"; // keep consistent

    // 🔐 STEP 1 — CHECK CONSENT
    const consent = await getConsent(userId);

    if (!consent || !consent.allow_ai_processing) {
      return Response.json(
        { message: "Consent required before processing." },
        { status: 403 }
      );
    }

    // 🧠 STEP 1.5 — LOAD MEMORIES
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

    // 🤖 STEP 2 — Call Azure OpenAI
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

Use these personal memories:
${memoryContext}

Guidelines:
- Be warm and calm
- Use familiar references
- Keep responses simple
- Never correct the user

If the user shares something meaningful, extract it like:
[MEMORY: ...]
            `,
          },
          { role: "user", content: userMessage },
        ],
        max_tokens: 150,
      }),
    });

    const data = await response.json();

    // 🧠 STEP 3 — Extract AI response
    let aiMessage =
      data.choices?.[0]?.message?.content ||
      "Sorry, I couldn't process that.";

    // 🧠 STEP 3.5 — EXTRACT MEMORY
    const memoryMatch = aiMessage.match(/\[MEMORY:(.*?)\]/);

    if (memoryMatch) {
      const newMemory = memoryMatch[1].trim();

      await containers.memories.items.create({
        userId,
        content: newMemory,
        timestamp: new Date().toISOString(),
      });
    }

    // 🧠 STEP 4 — CONTENT SAFETY FILTER
    const unsafeWords = ["kill", "die", "suicide", "harm"];

    for (const word of unsafeWords) {
      if (aiMessage.toLowerCase().includes(word)) {
        aiMessage =
          "I'm here to support you. Let's talk about something that makes you feel safe and comfortable.";
        break;
      }
    }

    // 🧹 STEP 5 — CLEAN MEMORY TAG FROM RESPONSE
    aiMessage = aiMessage.replace(/\[MEMORY:.*?\]/, "").trim();

    // 💾 STEP 6 — Save to Cosmos DB (conversations)
    await containers.conversations.items.create({
      userId,
      userMessage,
      aiMessage,
      timestamp: new Date().toISOString(),
    });

    // ✅ STEP 7 — Return response
    return Response.json({ message: aiMessage });

  } catch (error) {
    console.error("❌ API Error:", error);

    return Response.json(
      { message: "Something went wrong." },
      { status: 500 }
    );
  }
}