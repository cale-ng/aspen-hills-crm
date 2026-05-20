import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { listOpportunities } from "./data";
import { uploadAttachment } from "./attachments";
import { postAssistantNote } from "./agent";
import { createOpportunity } from "./mutations";
import type { Attachment, Opportunity } from "./types";

const DEFAULT_MODEL = "claude-sonnet-4-6";

export interface ParsedEmail {
  subject: string | null;
  from: { name: string | null; email: string | null };
  to: string | null;
  date: string | null;
  body: string;
  raw: string;
}

export interface EmailClassification {
  opportunityId: string | null;
  confidence: "high" | "medium" | "low";
  reasoning: string;
  summary: string;
  suggestedNextSteps: string[];
  /** When confidence isn't "high", up to 3 other plausible matches for user override. */
  alternatives: { opportunityId: string; company: string; reason: string }[];
  /** True if the model concluded a new opportunity should be created. */
  proposesNew: boolean;
  /** When proposesNew, suggested fields for the new opportunity. */
  newOpportunity: {
    company: string | null;
    contactName: string | null;
    email: string | null;
  } | null;
}

/** Naive RFC822 parser. Good enough for pasted email content; handles common Gmail/Outlook formats. */
export function parseEmail(raw: string): ParsedEmail {
  const trimmed = raw.replace(/\r\n/g, "\n").trim();

  // Split headers from body at the first blank line.
  const splitIdx = trimmed.indexOf("\n\n");
  const headerBlock = splitIdx === -1 ? trimmed : trimmed.slice(0, splitIdx);
  const body = splitIdx === -1 ? "" : trimmed.slice(splitIdx + 2).trim();

  // Fold continuation lines (RFC822 allows headers to wrap with leading whitespace).
  const headers: Record<string, string> = {};
  const lines = headerBlock.split("\n");
  let lastKey: string | null = null;
  for (const line of lines) {
    if (/^[ \t]/.test(line) && lastKey) {
      headers[lastKey] += " " + line.trim();
      continue;
    }
    const m = line.match(/^([A-Za-z-]+):\s*(.*)$/);
    if (m) {
      const key = m[1].toLowerCase();
      headers[key] = m[2];
      lastKey = key;
    }
  }

  // Sometimes there are no headers — entire input is body.
  const hasAnyHeaders =
    "subject" in headers || "from" in headers || "to" in headers;
  const effectiveBody = hasAnyHeaders ? body : trimmed;

  const fromHeader = headers["from"] ?? null;
  const from = parseFromHeader(fromHeader);

  return {
    subject: headers["subject"] ?? null,
    from,
    to: headers["to"] ?? null,
    date: headers["date"] ?? null,
    body: effectiveBody,
    raw,
  };
}

function parseFromHeader(value: string | null): {
  name: string | null;
  email: string | null;
} {
  if (!value) return { name: null, email: null };
  const angleMatch = value.match(/^(.*?)<([^>]+)>$/);
  if (angleMatch) {
    return {
      name: angleMatch[1].trim().replace(/^"|"$/g, "") || null,
      email: angleMatch[2].trim().toLowerCase(),
    };
  }
  if (value.includes("@")) {
    return { name: null, email: value.trim().toLowerCase() };
  }
  return { name: value.trim() || null, email: null };
}

/** Build a compact summary of all opportunities for the classifier. */
function formatOpportunityIndex(opps: Opportunity[]): string {
  if (opps.length === 0) return "No opportunities exist yet.";
  return opps
    .map((o) => {
      const parts = [
        `ID: ${o.id}`,
        `Company: ${o.company}`,
        o.contactName ? `Contact: ${o.contactName}` : null,
        o.email ? `Email: ${o.email}` : null,
        o.industry ? `Industry: ${o.industry}` : null,
        `Stage: ${o.stage}`,
      ].filter(Boolean);
      return parts.join(" | ");
    })
    .join("\n");
}

const SYSTEM_PROMPT = `You are a sales-pipeline triage assistant inside Aspen Hills Advisors' CRM. Cale forwards client emails to you and you decide which existing opportunity (sales lead) the email belongs to — or whether a new opportunity should be created.

Aspen Hills is a fractional supply chain ops firm serving CPG brands ($3M–$15M). Each opportunity in the CRM represents a brand that might become a retainer client.

For every email you see, respond with ONLY a valid JSON object matching this schema (no markdown fences, no commentary):

{
  "opportunityId": "uuid-of-best-match" | null,
  "confidence": "high" | "medium" | "low",
  "reasoning": "1-2 sentences explaining the match decision",
  "summary": "2-4 sentence summary of what's in the email — written for Cale to skim later",
  "suggestedNextSteps": ["action 1", "action 2", "..."],
  "alternatives": [
    { "opportunityId": "uuid", "company": "name", "reason": "why this might be the right match" }
  ],
  "proposesNew": false,
  "newOpportunity": null
}

Rules:
- "high" confidence: the email's company/contact clearly matches an existing opportunity (sender email matches stored contact email, OR company name is unambiguously the same).
- "medium": there's a plausible match but some ambiguity (similar names, missing fields).
- "low": no clear match — return opportunityId: null and proposesNew: true with extracted company/contact fields in newOpportunity.
- "alternatives" can be empty [] when confidence is "high". When "medium" or "low", list up to 3 other plausible candidates.
- "suggestedNextSteps" should be concrete and operator-tone (e.g. "Schedule a 30-min discovery call within the week" not "Follow up"). 2-5 items.
- If the email mentions a different company than any opportunity, set proposesNew: true and fill newOpportunity with what you can extract.
- Be conservative: only "high" confidence when you're really sure.`;

function client() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY.");
  return new Anthropic({ apiKey });
}

function stripJsonFences(text: string): string {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fence ? fence[1] : text).trim();
}

export async function classifyEmail(
  parsed: ParsedEmail
): Promise<EmailClassification> {
  const opps = await listOpportunities();
  const anthropic = client();
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  const userContent = [
    `EXISTING OPPORTUNITIES:\n${formatOpportunityIndex(opps)}`,
    "",
    "EMAIL:",
    `Subject: ${parsed.subject ?? "(none)"}`,
    `From: ${parsed.from.name ?? ""} <${parsed.from.email ?? ""}>`,
    `To: ${parsed.to ?? ""}`,
    `Date: ${parsed.date ?? ""}`,
    "",
    parsed.body || "(empty body)",
  ].join("\n");

  const response = await anthropic.messages.create({
    model,
    max_tokens: 1500,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userContent }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  let json: EmailClassification;
  try {
    json = JSON.parse(stripJsonFences(text)) as EmailClassification;
  } catch (err) {
    throw new Error(
      `Classifier returned invalid JSON: ${err instanceof Error ? err.message : err}\n\nRaw: ${text.slice(0, 500)}`
    );
  }

  // Defensive defaults — model occasionally omits fields.
  json.alternatives ??= [];
  json.suggestedNextSteps ??= [];
  json.proposesNew ??= json.opportunityId === null;
  json.newOpportunity ??= null;

  return json;
}

function safeFilename(s: string | null | undefined): string {
  const base = (s || "email").trim().replace(/[^A-Za-z0-9-_ ]/g, "").slice(0, 60);
  return (base || "email") + ".eml";
}

function buildSummaryNote(parsed: ParsedEmail, classification: EmailClassification): string {
  const lines: string[] = [];
  lines.push(
    `📧 **Email filed**${parsed.subject ? `: ${parsed.subject}` : ""}`
  );
  if (parsed.from.email || parsed.from.name) {
    lines.push(
      `From: ${parsed.from.name ?? ""} ${parsed.from.email ? `<${parsed.from.email}>` : ""}`.trim()
    );
  }
  if (parsed.date) lines.push(`Date: ${parsed.date}`);
  lines.push("");
  lines.push("**Summary**");
  lines.push(classification.summary);
  if (classification.suggestedNextSteps.length > 0) {
    lines.push("");
    lines.push("**Suggested next steps**");
    for (const s of classification.suggestedNextSteps) {
      lines.push(`- ${s}`);
    }
  }
  return lines.join("\n");
}

export interface FileEmailResult {
  opportunityId: string;
  attachment: Attachment;
  summary: string;
  suggestedNextSteps: string[];
  createdNewOpportunity: boolean;
}

/**
 * File an email under the given opportunity (or create a new one) and post
 * the agent's summary + next steps as an assistant message in its chat.
 */
export async function fileEmail(
  parsed: ParsedEmail,
  classification: EmailClassification,
  override?: { opportunityId?: string; createNew?: boolean }
): Promise<FileEmailResult> {
  let opportunityId: string | null = override?.opportunityId ?? null;
  let createdNew = false;

  if (!opportunityId && override?.createNew) {
    // Build a new opportunity from extracted fields.
    const newOpp = classification.newOpportunity;
    const companyName =
      newOpp?.company || parsed.from.name || parsed.from.email || "Untitled";
    const created = await createOpportunity({
      company: companyName,
      contactName: newOpp?.contactName ?? parsed.from.name ?? null,
      email: newOpp?.email ?? parsed.from.email ?? null,
      stage: "Qualifying",
      fit: "medium",
    });
    opportunityId = created.id;
    createdNew = true;
  } else if (!opportunityId) {
    // No override → use the classifier's choice. Should only be reached
    // for high-confidence auto-file.
    opportunityId = classification.opportunityId;
  }

  if (!opportunityId) {
    throw new Error(
      "No opportunity selected. Provide opportunityId or createNew."
    );
  }

  // Upload the raw email as a .eml attachment so it's preserved in full.
  const filename = safeFilename(parsed.subject);
  const blob = new Blob([parsed.raw], { type: "message/rfc822" });
  const file = new File([blob], filename, { type: "message/rfc822" });
  const attachment = await uploadAttachment({
    opportunityId,
    file,
    kind: "email",
    tag: parsed.subject ?? null,
    note: parsed.from.email
      ? `From ${parsed.from.name ?? parsed.from.email} <${parsed.from.email}>`
      : parsed.from.name ?? null,
  });

  // Post the agent's summary + next steps to this opportunity's chat.
  await postAssistantNote(opportunityId, buildSummaryNote(parsed, classification));

  return {
    opportunityId,
    attachment,
    summary: classification.summary,
    suggestedNextSteps: classification.suggestedNextSteps,
    createdNewOpportunity: createdNew,
  };
}
