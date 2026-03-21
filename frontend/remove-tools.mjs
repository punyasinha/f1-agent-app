import { AIProjectClient } from "@azure/ai-projects";
import { DefaultAzureCredential } from "@azure/identity";
const client = AIProjectClient.fromEndpoint(
  "https://f1-dataagent-resource.services.ai.azure.com/api/projects/f1-dataagent",
  new DefaultAzureCredential()
);
await client.agents.updateAgent("asst_xz9vZduthosO1PCOpWtGqg94", { tools: [] });
console.log("Done — agent has no tools now");
