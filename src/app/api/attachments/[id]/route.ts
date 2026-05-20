import { NextResponse } from "next/server";
import { deleteAttachment, signedUrlFor } from "@/lib/attachments";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET returns a short-lived signed URL for viewing/downloading the file.
 * Used by the Files tab's "View" action.
 */
export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const url = await signedUrlFor(id, 300);
    if (!url) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    await deleteAttachment(id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
