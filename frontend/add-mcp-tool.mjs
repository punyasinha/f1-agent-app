import { DefaultAzureCredential } from "@azure/identity";

const ENDPOINT = "https://f1-dataagent-resource.services.ai.azure.com/api/projects/f1-dataagent";
const AGENT_ID = "asst_xz9vZduthosO1PCOpWtGqg94";
const MCP_URL = process.argv[2];

if (!MCP_URL) {
  console.error("Usage: node add-mcp-tool.mjs <your-cloudflare-url>");
  process.exit(1);
}

// Get token using DefaultAzureCredential
const credential = new DefaultAzureCredential();
const token = await credential.getToken("https://ai.azure.com/.default");

const response = await fetch(`${ENDPOINT}/assistants/${AGENT_ID}?api-version=v1`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token.token}`,
  },
  body: JSON.stringify({
    tools: [
      {
        type: "mcp",
        server_label: "postgres_mcp",
        server_url: `${MCP_URL}/mcp`,
        allowed_tools: ["list_tables", "query_sql"],
        require_approval: { never: {} },
      },
    ],
  }),
});

const data = await response.json();

if (!response.ok) {
  console.error("Failed:", JSON.stringify(data, null, 2));
  process.exit(1);
}

console.log("Agent updated successfully!");
console.log(`MCP server: ${MCP_URL}/mcp`);
console.log(`Tools: ${JSON.stringify(data.tools, null, 2)}`);
