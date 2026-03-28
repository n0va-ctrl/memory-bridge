import { containers } from "@/lib/cosmos";
import { getConsent } from "@/lib/consent";

export async function POST(req) {
  try {
    const userId = "patient_123";

    // 🔐 STEP 1 — CHECK CONSENT
    const consent = await getConsent(userId);

    if (!consent || !consent.share_with_caregiver) {
      return Response.json(
        { message: "Access denied by patient." },
        { status: 403 }
      );
    }

    // 📊 STEP 2 — GET RECENT CONVERSATIONS
    const query = {
      query: "SELECT * FROM c WHERE c.userId = @userId ORDER BY c.timestamp DESC",
      parameters: [{ name: "@userId", value: userId }],
    };

    const { resources: conversations } =
      await containers.conversations.items.query(query).fetchAll();

    const recentConvos = conversations.slice(0, 20);

    if (!recentConvos.length) {
      return Response.json({
        summary: "No recent activity to summarize.",
      });
    }

    // 🧠 STEP 3 — FORMAT FOR AI
    const convoText = recentConvos
      .map(
        (c) => `User: ${c.userMessage}\nAI: ${c.aiMessage}`
      )
      .join("\n\n");

    // 🤖 STEP 4 — CALL OPENAI
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
You are generating a caregiver update for a dementia patient.

Write a warm, human summary including:
- Emotional patterns
- What brought comfort
- Any concerns

Keep it simple, calm, and supportive.
            `,
          },
          {
            role: "user",
            content: convoText,
          },
        ],
        max_tokens: 200,
      }),
    });

    const data = await response.json();

    let summary =
      data.choices?.[0]?.message?.content ||
      "Unable to generate summary.";

    // 🧠 STEP 5 — SIMPLE SAFETY FILTER
    const unsafeWords = ["kill", "die", "suicide", "harm"];

    for (const word of unsafeWords) {
      if (summary.toLowerCase().includes(word)) {
        summary =
          "The patient had a calm week with moments of engagement and comfort.";
        break;
      }
    }

    // ✅ STEP 6 — RETURN
    return Response.json({ summary });

  } catch (error) {
    console.error("❌ Summary Error:", error);

    return Response.json(
      { summary: "Something went wrong." },
      { status: 500 }
    );
  }
}