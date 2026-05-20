import { NextResponse } from "next/server";
import { classifyEmail, fileEmail, parseEmail } from "@/lib/email";

interface PostBody {
  /** Raw pasted email content (headers + body, or just body). */
  raw: string;
  /** When set, skip auto-file logic and file under this opportunity. */
  forceOpportunityId?: string;
  /** When true, create a new opportunity from extracted email fields and file there. */
  createNew?: boolean;
}

const AUTO_FILE_CONFIDENCE = new Set(["high"]);

export async function POST(req: Request) {
  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.raw || !body.raw.trim()) {
    return NextResponse.json(
      { error: "`raw` (email content) is required." },
      { status: 400 }
    );
  }

  try {
    const parsed = parseEmail(body.raw);
    const classification = await classifyEmail(parsed);

    // User-driven override: file under a specific opp, or create a new one.
    if (body.forceOpportunityId || body.createNew) {
      const result = await fileEmail(parsed, classification, {
        opportunityId: body.forceOpportunityId,
        createNew: body.createNew,
      });
      return NextResponse.json({
        status: "filed",
        classification,
        result,
      });
    }

    // Auto-file at high confidence with a matched opportunity.
    if (
      AUTO_FILE_CONFIDENCE.has(classification.confidence) &&
      classification.opportunityId
    ) {
      const result = await fileEmail(parsed, classification);
      return NextResponse.json({
        status: "filed",
        classification,
        result,
      });
    }

    // Otherwise return for user confirmation.
    return NextResponse.json({
      status: "needs_confirmation",
      classification,
      parsed: {
        subject: parsed.subject,
        from: parsed.from,
        to: parsed.to,
        date: parsed.date,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
