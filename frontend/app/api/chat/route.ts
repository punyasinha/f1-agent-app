import { AIProjectClient } from "@azure/ai-projects";
import { DefaultAzureCredential } from "@azure/identity";
import { NextResponse } from "next/server";

const client = AIProjectClient.fromEndpoint(
  process.env.AZURE_FOUNDRY_ENDPOINT!,
  new DefaultAzureCredential()
);

const agentId = process.env.AZURE_AGENT_ID!;

export async function POST(req: Request) {
  try {
    const { message, threadId } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    // Reuse existing thread or start a new one
    const thread = threadId
      ? { id: threadId as string }
      : await client.agents.threads.create();

    // Add the user's message to the thread
    await client.agents.messages.create(thread.id, "user", message);

    // createAndPoll returns a PollerLike directly (not a Promise) — call pollUntilDone() on it
    // timeout after 60s so the frontend never hangs indefinitely
    const run = await client.agents.runs.createAndPoll(thread.id, agentId).pollUntilDone({
      abortSignal: AbortSignal.timeout(60_000),
    });

    if (run.status !== "completed") {
      console.error("Run did not complete:", run.status, run.lastError);
      return NextResponse.json(
        { error: `Agent run failed with status: ${run.status}` },
        { status: 500 }
      );
    }

    // Get latest messages — first is the agent's reply
    const messagesPage = client.agents.messages.list(thread.id, { order: "desc" });
    let reply = "";
    for await (const msg of messagesPage) {
      const textBlock = msg.content.find((c): c is typeof c & { type: "text"; text: { value: string } } =>
        c.type === "text"
      );
      if (textBlock) reply = textBlock.text.value;
      break; // only need the latest message
    }

    return NextResponse.json({ reply, threadId: thread.id });
  } catch (err) {
    console.error("Chat API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
