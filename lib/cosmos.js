import { CosmosClient } from "@azure/cosmos";

const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;
const client = new CosmosClient({ endpoint, key });

const database = client.database("memory bridge");

export const containers = {
  conversations: database.container("conversations"),
  consent: database.container("consent"),
  memories: database.container("memories"),
};