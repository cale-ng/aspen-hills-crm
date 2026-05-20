import { NextResponse } from "next/server";
import { listAttachments, uploadAttachment } from "@/lib/attachments";
import { CONTEXT_KINDS, type ContextKind } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const items = await listAttachments(id);
    return NextResponse.json(items);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data body." },
      { status: 400 }
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing `file` field." }, { status: 400 });
  }

  const rawKind = (form.get("kind") as string | null) ?? "other";
  if (!CONTEXT_KINDS.includes(rawKind as ContextKind)) {
    return NextResponse.json(
      { error: `Invalid kind: ${rawKind}` },
      { status: 400 }
    );
  }
  const kind = rawKind as ContextKind;

  const tag = (form.get("tag") as string | null) || null;
  const note = (form.get("note") as string | null) || null;

  try {
    const attachment = await uploadAttachment({
      opportunityId: id,
      file,
      kind,
      tag,
      note,
    });
    return NextResponse.json(attachment, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status =
      message.includes("too large") || message.includes("Invalid") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
