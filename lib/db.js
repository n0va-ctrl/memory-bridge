import { containers } from "@/lib/cosmos";

export async function saveConversation(userId, userMessage, aiMessage) {
  try {
    await containers.conversations.items.create({
      id: Date.now().toString(),
      userId,
      userMessage,
      aiMessage,
      timestamp: new Date().toISOString(),
    });

    console.log("✅ Saved to Cosmos DB");
  } catch (error) {
    console.error("❌ Cosmos DB error:", error);
  }
}