import { AIProjectClient } from "@azure/ai-projects";
import { DefaultAzureCredential } from "@azure/identity";

const client = AIProjectClient.fromEndpoint(
  "https://f1-dataagent-resource.services.ai.azure.com/api/projects/f1-dataagent",
  new DefaultAzureCredential()
);

const agent = await client.agents.getAgent("asst_xz9vZduthosO1PCOpWtGqg94");
console.log(JSON.stringify(agent, null, 2));
