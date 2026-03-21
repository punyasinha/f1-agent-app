import { AIProjectClient } from "@azure/ai-projects";
import { DefaultAzureCredential } from "@azure/identity";

const client = AIProjectClient.fromEndpoint(
  "https://f1-dataagent-resource.services.ai.azure.com/api/projects/f1-dataagent",
  new DefaultAzureCredential()
);

const agents = [];
for await (const agent of client.agents.listAgents()) {
  agents.push(agent);
}
console.log("Total agents found:", agents.length);
console.log(JSON.stringify(agents, null, 2));
