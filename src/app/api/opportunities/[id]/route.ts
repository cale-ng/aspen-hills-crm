import { NextResponse } from "next/server";
import {
  deleteOpportunity,
  updateOpportunity,
  type OpportunityInput,
} from "@/lib/mutations";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;

  let body: Partial<OpportunityInput>;
  try {
    body = (await req.json()) as Partial<OpportunityInput>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const opportunity = await updateOpportunity(id, body);
    return NextResponse.json(opportunity);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    await deleteOpportunity(id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
