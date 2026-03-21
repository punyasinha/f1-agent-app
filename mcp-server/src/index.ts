import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { z } from "zod";
import { listTablesTool, querySqlTool } from "./tools.js";

const PORT = parseInt(process.env.PORT ?? "8080", 10);

// ── Create a fresh McpServer per request ──────────────────────────────────────
// McpServer can only connect to one transport at a time, so we create
// a new instance for each incoming request (stateless design).

function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "f1-postgres-mcp",
    version: "1.0.0",
  });

  server.tool(
    listTablesTool.name,
    listTablesTool.description,
    {},
    async () => {
      const text = await listTablesTool.execute({});
      return { content: [{ type: "text", text }] };
    }
  );

  server.tool(
    querySqlTool.name,
    querySqlTool.description,
    { sql: z.string().describe("A read-only SELECT query to run against the F1 database.") },
    async ({ sql }) => {
      const text = await querySqlTool.execute({ sql });
      return { content: [{ type: "text", text }] };
    }
  );

  return server;
}

// ── HTTP Server ───────────────────────────────────────────────────────────────

const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  // Health check — used by Azure Container Apps liveness probe
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  // MCP endpoint — new server instance per request
  if (req.url === "/mcp" || req.url?.startsWith("/mcp?")) {
    console.log(`[${new Date().toISOString()}] MCP request from Foundry`);

    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless — each request is independent
    });

    res.on("close", () => {
      console.log(`[${new Date().toISOString()}] MCP connection closed`);
      transport.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res);
    console.log(`[${new Date().toISOString()}] MCP request handled`);
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

httpServer.listen(PORT, () => {
  console.log(`F1 MCP server listening on port ${PORT}`);
  console.log(`  Health: http://localhost:${PORT}/health`);
  console.log(`  MCP:    http://localhost:${PORT}/mcp`);
});
