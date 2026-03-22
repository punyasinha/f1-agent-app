# F1 Data Agent — Project README

A conversational AI app that lets you ask natural language questions about Formula 1 racing history (1950–2024) and get accurate, database-backed answers.

---

## What It Does

You type a question like *"Who has the most race wins of all time?"* and the app:

1. Sends your question to GPT-4o-mini (running on Azure)
2. The model decides which database tools to call
3. The tools query a real PostgreSQL database with full F1 data
4. The model synthesizes the results into a plain English answer

No hardcoded answers — every response is generated live from the database.

---

## How It Works

### The Full Flow

```
You type a question
        ↓
Next.js frontend (browser)
        ↓  HTTP POST /api/chat
Next.js API route (server)
        ↓  Azure AI Foundry SDK
GPT-4o-mini (Azure OpenAI)
        ↓  decides to call a tool
API route calls MCP server
        ↓  SQL query
Neon PostgreSQL (cloud database)
        ↓  results flow back up
GPT-4o-mini writes the answer
        ↓
You see the response
```

### The Agentic Loop

The API route (`frontend/app/api/chat/route.ts`) runs what's called an **agentic loop**: it keeps sending messages back and forth with the model until the model says it's done. Here's the cycle:

1. Send user question + available tools to GPT-4o-mini
2. If the model responds with `finish_reason: "tool_calls"` → call those tools, add the results to the conversation, go back to step 1
3. If the model responds with `finish_reason: "stop"` → return the final text answer

This loop runs up to 10 times per request. In practice, most questions need 2 iterations:
- Iteration 1: model calls `list_tables` to see the schema
- Iteration 2: model calls `query_sql` with the right SQL
- Iteration 3: model writes the answer

---

## The Database

**Host:** Neon (serverless PostgreSQL, free tier)
**Database name:** `f1db`
**Data:** Kaggle F1 World Championship dataset
**Coverage:** 1950–2024

### Tables

| Table | What it contains |
|---|---|
| `races` | Every race: year, circuit, date, name |
| `results` | Race results: position, points, laps, time |
| `drivers` | Driver info: name, nationality, DOB |
| `constructors` | Team info: name, nationality |
| `circuits` | Circuit info: name, location, country |
| `driver_standings` | Championship standings per race |
| `constructor_standings` | Constructor championship standings |
| `constructor_results` | Points per constructor per race |
| `qualifying` | Qualifying session lap times |
| `lap_times` | Individual lap times per driver |
| `pit_stops` | Pit stop data: lap, duration |
| `sprint_results` | Sprint race results |
| `seasons` | Season URLs |
| `status` | Finish status codes (e.g. "Finished", "Retired") |

All column names are `snake_case`. Foreign keys use `_id` suffix (e.g. `driver_id`, `race_id`).

---

## The MCP Server

**MCP** stands for **Model Context Protocol** — it's a standard way to expose tools (functions) that an AI model can call. Think of it as a plugin system for AI agents.

The MCP server is a small Node.js HTTP server that exposes two tools:

### `list_tables`
Returns all table names and their column definitions. The model calls this first to understand the schema before writing SQL.

### `query_sql`
Executes a read-only SELECT query against the database. The model provides the SQL, the server runs it, and returns the results as formatted text.

**Safety:** Only `SELECT` statements are allowed. Trailing semicolons are stripped, and multi-statement queries (`;` in the middle) are rejected.

**Deployment:** Hosted on [Render.com](https://render.com) (free tier Docker container). URL: `https://f1-mcp-server-7c2z.onrender.com`

Note: Render free tier containers spin down after inactivity. The first request after a period of no traffic may take 30–60 seconds as the container wakes up.

---

## How It Connects to the LLM

The frontend uses the **Azure AI Foundry SDK** (`@azure/ai-projects`) to get a handle to an Azure OpenAI client:

```typescript
const client = AIProjectClient.fromEndpoint(endpoint, credential);
const openai = await client.getAzureOpenAIClient({ apiVersion: "2025-01-01-preview" });
```

Then uses standard OpenAI function calling:

```typescript
const response = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [...],
  tools: [list_tables_tool, query_sql_tool],
  tool_choice: "auto",
});
```

**Authentication:** Uses `DefaultAzureCredential`, which:
- Locally: picks up your `az login` session
- On Azure: uses Managed Identity (no secrets needed)

---

## Project Structure

```
f1-agent-app/
│
├── database/                     # Database setup
│   ├── schema.sql                # Creates all 14 tables
│   └── load-data.sh              # Loads CSV data from Kaggle
│
├── mcp-server/                   # The tool server
│   ├── src/
│   │   ├── index.ts              # HTTP server (Express-like, native Node http)
│   │   ├── tools.ts              # Tool definitions: list_tables, query_sql
│   │   └── db.ts                 # PostgreSQL connection pool
│   ├── Dockerfile                # Multi-stage Docker build
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                     # The web app
│   ├── app/
│   │   ├── api/chat/
│   │   │   └── route.ts          # ★ Core agent logic lives here
│   │   ├── layout.tsx            # Root HTML layout
│   │   ├── page.tsx              # Home page
│   │   └── globals.css           # Tailwind imports
│   ├── components/
│   │   ├── ChatInterface.tsx     # Chat input + message list
│   │   └── Message.tsx           # Individual message bubble
│   ├── .env.local                # Secrets (not in git)
│   ├── next.config.ts            # Next.js config
│   ├── postcss.config.js         # Tailwind PostCSS config (CommonJS)
│   └── package.json
│
├── infra/                        # Azure infrastructure (IaC)
│   ├── main.bicep                # Provisions Container Apps + Registry
│   └── main.parameters.json
│
└── azure.yaml                    # Azure Developer CLI config
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript |
| Styling | Tailwind CSS |
| LLM | GPT-4o-mini via Azure AI Foundry |
| LLM SDK | `@azure/ai-projects`, `@azure/identity` |
| Tool Protocol | MCP (Model Context Protocol) |
| MCP SDK | `@modelcontextprotocol/sdk` |
| MCP Runtime | Node.js + TypeScript |
| Database | PostgreSQL (Neon serverless) |
| DB Driver | `pg` (node-postgres) |
| MCP Hosting | Render.com (Docker) |
| Frontend Hosting | Local / Azure (via azd) |
| Auth | DefaultAzureCredential (`az login` locally) |

---

## Running Locally

### Prerequisites

- Node.js 20+
- Docker (for MCP server)
- Azure CLI (`az login` authenticated)
- A Neon database with F1 data loaded

### 1. Start the MCP server

```bash
cd mcp-server
npm install
POSTGRES_CONNECTION_STRING="postgresql://..." npm run dev
# Server runs on http://localhost:8080
```

Or use Docker:
```bash
docker build -t f1-mcp-server .
docker run -p 8080:8080 -e POSTGRES_CONNECTION_STRING="..." f1-mcp-server
```

### 2. Configure the frontend

```bash
cd frontend
cp .env.local.example .env.local
# Edit .env.local with your values
```

Required values in `.env.local`:
```
AZURE_FOUNDRY_ENDPOINT="https://<your-resource>.services.ai.azure.com/api/projects/<your-project>"
AZURE_OPENAI_DEPLOYMENT="gpt-4o-mini"
MCP_SERVER_URL="http://localhost:8080"   # or Render URL
```

### 3. Run the frontend

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

---

## Environment Variables

### Frontend (`.env.local`)

| Variable | Description |
|---|---|
| `AZURE_FOUNDRY_ENDPOINT` | Azure AI Foundry project endpoint URL |
| `AZURE_OPENAI_DEPLOYMENT` | Model deployment name (e.g. `gpt-4o-mini`) |
| `MCP_SERVER_URL` | MCP server base URL (defaults to Render URL) |
| `AZURE_AGENT_ID` | Foundry agent ID (not currently used by `route.ts`) |

### MCP Server

| Variable | Description |
|---|---|
| `POSTGRES_CONNECTION_STRING` | Full Neon connection string with SSL |
| `PORT` | HTTP port (default: `8080`) |

---

## Deployment

### MCP Server — Render.com

The MCP server is deployed as a Docker container on Render.com free tier. It is currently live at `https://f1-mcp-server-7c2z.onrender.com`.

To redeploy: push to the connected GitHub repo or trigger a manual deploy in the Render dashboard.

### Frontend — Local / Azure

The frontend can be deployed to Azure Static Web Apps, Vercel, or run locally. Azure Container Apps deployment via `azd up` was set up but is currently blocked by tenant inactivity issues.

---

## Design Decisions and Trade-offs

### Why not use Foundry agent runs?

Azure AI Foundry has a native "agent" concept with threads, runs, and built-in MCP support. We initially tried using it but hit a blocker: Foundry's MCP integration requires the app to call `submit_tool_approval` to allow each tool call — and this endpoint has no programmatic bypass. The agent run would get stuck waiting for manual approval.

**Solution:** Use `client.getAzureOpenAIClient()` to get a raw Azure OpenAI client and implement the tool-calling loop directly in `route.ts`. This gives full control over when and how tools are called.

### Why Render.com instead of Azure Container Apps?

Azure Container Apps was the original plan (Bicep + `azd up`). It was blocked by Azure tenant inactivity policy. Render.com is a simpler free alternative for the MCP server, which has no Azure-specific dependencies anyway.

### Why one MCP server instance per request?

The MCP SDK's `StreamableHTTPServerTransport` doesn't support multiple concurrent connections on a single `McpServer` instance. Creating a new server per request is the correct stateless pattern for HTTP-based MCP servers.
