## F1 Agent App — Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        YOUR BROWSER                             │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │             Chat UI  (Next.js frontend)                 │   │
│   │               localhost:3000                            │   │
│   └────────────────────────┬────────────────────────────────┘   │
└────────────────────────────│────────────────────────────────────┘
                             │  POST /api/chat
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   route.ts  —  THE BRAIN                        │
│              (Next.js server, runs the agentic loop)            │
└────────────┬──────────────────────────────────┬─────────────────┘
             │                                  │
             │  "what should I do?"             │  "call this tool"
             ▼                                  ▼
┌────────────────────────┐          ┌───────────────────────────┐
│    GPT-4o-mini         │          │       MCP Server          │
│  (Azure AI Foundry)    │          │      (Render.com)         │
│                        │          │                           │
│  - Understands English │          │  Tools it exposes:        │
│  - Writes SQL          │          │  • list_tables → schema   │
│  - Synthesizes answers │          │  • query_sql  → run SQL   │
└────────────────────────┘          └─────────────┬─────────────┘
                                                  │  SQL query
                                                  ▼
                                    ┌───────────────────────────┐
                                    │    Neon PostgreSQL        │
                                    │      (f1db database)      │
                                    │                           │
                                    │  14 tables, 1950–2024:    │
                                    │  races, drivers,          │
                                    │  results, circuits...     │
                                    └───────────────────────────┘


THE LOOP (what happens per question):

  1.  You ask:  "Who has the most wins?"
        │
  2.  route.ts → GPT:  "Here's the question. You have 2 tools."
        │
  3.  GPT → route.ts:  "Call list_tables for me"
        │
  4.  route.ts → MCP Server → returns table schema
        │
  5.  route.ts → GPT:  "Here's the schema"
        │
  6.  GPT → route.ts:  "Call query_sql with: SELECT ..."
        │
  7.  route.ts → MCP Server → Neon DB → returns rows
        │
  8.  route.ts → GPT:  "Here are the results"
        │
  9.  GPT → route.ts:  "Lewis Hamilton, 103 wins."  ✓ DONE
        │
  10. You see the answer in the browser
```
