import { NextResponse } from "next/server";
import { createOpportunity, type OpportunityInput } from "@/lib/mutations";

export async function POST(req: Request) {
  let body: OpportunityInput;
  try {
    body = (await req.json()) as OpportunityInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const opportunity = await createOpportunity(body);
    return NextResponse.json(opportunity, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.toLowerCase().includes("required") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
