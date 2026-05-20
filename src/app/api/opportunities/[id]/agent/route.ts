import { NextResponse } from "next/server";
import {
  agentReply,
  clearMessages,
  listMessages,
  type AttachmentRef,
} from "@/lib/agent";

type Ctx = { params: Promise<{ id: string }> };

interface PostBody {
  content: string;
  attachments?: AttachmentRef[];
}

/** Return the full conversation history for this opportunity. */
export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const messages = await listMessages(id);
    return NextResponse.json({ messages });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Append a user message to the conversation, get the agent's reply,
 * persist both, and return them.
 */
export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.content || !body.content.trim()) {
    return NextResponse.json(
      { error: "`content` is required." },
      { status: 400 }
    );
  }

  try {
    const result = await agentReply({
      opportunityId: id,
      content: body.content,
      attachments: body.attachments ?? null,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Clear the entire conversation for this opportunity. */
export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    await clearMessages(id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
