import { containers } from "@/lib/cosmos";

export async function getConsent(userId) {
  try {
    const querySpec = {
      query: "SELECT * FROM c WHERE c.userId = @userId",
      parameters: [
        {
          name: "@userId",
          value: userId,
        },
      ],
    };

    const { resources } = await containers.consent.items
      .query(querySpec)
      .fetchAll();

    // Return first match or null
    return resources.length > 0 ? resources[0] : null;

  } catch (error) {
    console.error("❌ Consent fetch error:", error);
    return null;
  }
}
