import { CosmosClient } from "@azure/cosmos";

const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;

const client = new CosmosClient({ endpoint, key });

// ✅ MUST match Azure EXACTLY (with space)
const database = client.database("memory bridge");

// Export containers
export const containers = {
  conversations: database.container("conversations"),
  consent: database.container("consent"),
};