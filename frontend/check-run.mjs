import { DefaultAzureCredential } from "@azure/identity";

const [threadId, runId] = process.argv.slice(2);
if (!threadId || !runId) {
  console.error("Usage: node check-run.mjs <threadId> <runId>");
  process.exit(1);
}

const credential = new DefaultAzureCredential();
const token = await credential.getToken("https://ai.azure.com/.default");

const res = await fetch(
  `https://f1-dataagent-resource.services.ai.azure.com/api/projects/f1-dataagent/threads/${threadId}/runs/${runId}?api-version=v1`,
  { headers: { "Authorization": `Bearer ${token.token}` } }
);
const data = await res.json();
console.log("status:", data.status);
console.log("requiredAction:", JSON.stringify(data.required_action, null, 2));
