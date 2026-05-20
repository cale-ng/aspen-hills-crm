import { NextResponse } from "next/server";
import { agentReply, type AgentMessage } from "@/lib/agent";

type Ctx = { params: Promise<{ id: string }> };

interface RequestBody {
  messages: AgentMessage[];
}

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.messages || !Array.isArray(body.messages)) {
    return NextResponse.json(
      { error: "Body must include a `messages` array." },
      { status: 400 }
    );
  }

  try {
    const result = await agentReply(id, body.messages);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
