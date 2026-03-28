import { SecretClient } from "@azure/keyvault-secrets";
import { DefaultAzureCredential } from "@azure/identity";

const vaultUri = process.env.KEY_VAULT_URI;

export async function getSecret(secretName) {
  // Skip Key Vault if not in Azure environment
  if (!process.env.AZURE_CLIENT_ID && !process.env.MSI_ENDPOINT) {
    console.log("Key Vault: not in Azure environment, using env var");
    return null;
  }
  try {
    const credential = new DefaultAzureCredential();
    const client = new SecretClient(vaultUri, credential);
    const secret = await client.getSecret(secretName);
    console.log("Key Vault secret retrieved successfully");
    return secret.value;
  } catch (error) {
    console.log("Key Vault unavailable, using env var fallback");
    return null;
  }
}