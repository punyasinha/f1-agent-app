import { AIProjectClient } from "@azure/ai-projects";
import { DefaultAzureCredential } from "@azure/identity";
import { NextResponse } from "next/server";

const credential = new DefaultAzureCredential();

const client = AIProjectClient.fromEndpoint(
  process.env.AZURE_FOUNDRY_ENDPOINT!,
  credential
);

const MCP_URL = process.env.MCP_SERVER_URL ?? "https://f1-mcp-server-7c2z.onrender.com";

const SYSTEM_PROMPT = `You are a Formula 1 data assistant with access to a PostgreSQL database containing F1 World Championship data from 1950 to 2024.

Always call list_tables first to confirm column names, then use query_sql to answer the question. Return concise natural language answers.`;

const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "list_tables",
      description: "Returns all table names and column definitions in the F1 database. Call this first to confirm column names before writing a query.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "query_sql",
      description: "Executes a read-only SELECT query against the F1 PostgreSQL database.",
      parameters: {
        type: "object",
        properties: {
          sql: { type: "string", description: "A read-only SELECT query." },
        },
        required: ["sql"],
      },
    },
  },
];

// Call a tool on the MCP server
async function callMcpTool(name: string, args: Record<string, unknown>): Promise<string> {
  const res = await fetch(`${MCP_URL}/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name, arguments: args },
    }),
  });
  const text = await res.text();
  const jsonStr = text.startsWith("event:") ? text.split("data: ")[1] : text;
  const data = JSON.parse(jsonStr);
  return data.result?.content?.[0]?.text ?? "No result";
}

export async function POST(req: Request) {
  try {
    const { message, threadId } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    // Get Azure OpenAI client from the Foundry project
    const openai = await client.getAzureOpenAIClient({ apiVersion: "2025-01-01-preview" });

    // Build message history — threadId is used as a simple key here
    // For real persistence you'd store messages server-side; for now we rebuild each time
    const messages: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: message },
    ];

    // Agentic loop — keep going until the model stops calling tools
    let reply = "";
    for (let i = 0; i < 10; i++) {
      const response = await openai.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT ?? "gpt-4o-mini",
        messages,
        tools: TOOLS,
        tool_choice: "auto",
      });

      const choice = response.choices[0];
      messages.push(choice.message);

      if (choice.finish_reason === "stop") {
        reply = choice.message.content ?? "";
        break;
      }

      if (choice.finish_reason === "tool_calls") {
        const toolCalls = choice.message.tool_calls ?? [];
        for (const tc of toolCalls) {
          const fn = (tc as any).function;
          const name = fn?.name ?? tc.id;
          const args = JSON.parse(fn?.arguments || "{}");
          console.log("Calling tool:", name, args);
          const output = await callMcpTool(name, args);
          console.log("Tool result length:", output.length);
          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: output,
          });
        }
      }
    }

    return NextResponse.json({ reply, threadId: threadId ?? crypto.randomUUID() });
  } catch (err) {
    console.error("Chat API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
