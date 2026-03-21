import { DefaultAzureCredential } from "@azure/identity";

const credential = new DefaultAzureCredential();
const token = await credential.getToken("https://ai.azure.com/.default");

const res = await fetch(
  "https://f1-dataagent-resource.services.ai.azure.com/api/projects/f1-dataagent/assistants/asst_xz9vZduthosO1PCOpWtGqg94?api-version=v1",
  { headers: { "Authorization": `Bearer ${token.token}` } }
);
const data = await res.json();
console.log("tools:", JSON.stringify(data.tools, null, 2));
