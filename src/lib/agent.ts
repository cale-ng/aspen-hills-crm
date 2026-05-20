import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { getOpportunity, listAttachmentsByOpportunity } from "./data";
import { supabaseServer } from "./supabase/server";
import type { Attachment, Opportunity } from "./types";
import { CONTEXT_KIND_META } from "./types";

const DEFAULT_MODEL = "claude-sonnet-4-6";

function client() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing ANTHROPIC_API_KEY. Add it to .env.local from console.anthropic.com → API Keys."
    );
  }
  return new Anthropic({ apiKey });
}

export interface AttachmentRef {
  id: string;
  name: string;
  kind: string;
  extracted: boolean;
}

export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
}

export interface StoredMessage extends AgentMessage {
  id: string;
  attachments: AttachmentRef[] | null;
  createdAt: string;
}

interface MessageRow {
  id: string;
  opportunity_id: string;
  role: "user" | "assistant";
  content: string;
  attachments: AttachmentRef[] | null;
  created_at: string;
}

function rowToStoredMessage(row: MessageRow): StoredMessage {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    attachments: row.attachments,
    createdAt: row.created_at,
  };
}

export async function listMessages(opportunityId: string): Promise<StoredMessage[]> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("opportunity_messages")
    .select("*")
    .eq("opportunity_id", opportunityId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`listMessages: ${error.message}`);
  return (data as MessageRow[]).map(rowToStoredMessage);
}

async function saveMessage(
  opportunityId: string,
  role: "user" | "assistant",
  content: string,
  attachments: AttachmentRef[] | null = null
): Promise<StoredMessage> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("opportunity_messages")
    .insert({
      opportunity_id: opportunityId,
      role,
      content,
      attachments,
    })
    .select("*")
    .single();

  if (error) throw new Error(`saveMessage: ${error.message}`);
  return rowToStoredMessage(data as MessageRow);
}

/**
 * Append a system-generated assistant message to the opportunity's chat
 * (e.g., the summary + next steps after an email is filed). No Anthropic
 * call — just a persisted note from the agent.
 */
export async function postAssistantNote(
  opportunityId: string,
  content: string
): Promise<StoredMessage> {
  return saveMessage(opportunityId, "assistant", content, null);
}

export async function clearMessages(opportunityId: string): Promise<void> {
  const supabase = supabaseServer();
  const { error } = await supabase
    .from("opportunity_messages")
    .delete()
    .eq("opportunity_id", opportunityId);
  if (error) throw new Error(`clearMessages: ${error.message}`);
}

/**
 * The Aspen Hills business context that frames every agent conversation.
 * Cached in the prompt to minimize cost across messages.
 */
const ASPEN_HILLS_CONTEXT = `You are the Aspen Agent — an AI assistant embedded inside the Aspen Hills Advisors CRM. You help Cale (the founder) move sales opportunities forward.

About Aspen Hills Advisors LLC:
- Fractional supply chain operations and product development firm
- Serves CPG brands in sports nutrition, health/wellness supplements, beverages, and functional foods
- Typical client revenue: $3M–$15M
- Core offering: plug-in fractional Director of Operations team (SCM + coordinator from day one)
- Founder has ~13 years experience across NutriBolt, VShred/SculpNation, YourSuper
- Key differentiators: deep category expertise, embedded team model, fast operational stand-up, strong manufacturer/3PL relationships, AI tooling layered into planning and visibility
- Cost value prop: FT Supply Chain Manager = $120–150K + Coordinator $55–70K within 6–12 months. Aspen Hills delivers both from day one at fraction of FT cost
- Blended rate: $175–275/hr depending on complexity and seniority mix
- Pricing: light scope 15–20h/mo, moderate 20–30h/mo, heavy 30–45h/mo

Your job:
- Answer questions about this specific opportunity using the context provided
- Summarize meeting transcripts when uploaded
- Extract pain points, scope, decision-maker context, and stage signals
- Suggest next steps, smart questions to ask, and risks to flag
- Draft proposals, follow-up emails, and pitches when asked
- Be concise, peer-level, operator-tone — Cale is busy and runs the firm

When summarizing meetings, structure your response as:
1. **Summary** — 2–3 sentence overview
2. **Pain points raised** — bullet list
3. **Scope discussed** — bullet list
4. **Stage signals** — what stage does this conversation suggest?
5. **Action items** — bullet list with owner (Cale / Client)
6. **Suggested next steps** — bullet list of what to do next

For general questions, just answer directly. Keep responses tight — no fluff.`;

function formatOpportunityContext(opp: Opportunity): string {
  const lines: string[] = [
    `OPPORTUNITY: ${opp.company}`,
    `Stage: ${opp.stage}`,
    `Fit: ${opp.fit}`,
  ];
  if (opp.contactName || opp.contact) {
    lines.push(`Contact: ${opp.contactName ?? opp.contact}`);
  }
  if (opp.email) lines.push(`Email: ${opp.email}`);
  if (opp.phone) lines.push(`Phone: ${opp.phone}`);
  if (opp.website) lines.push(`Website: ${opp.website}`);
  if (opp.industry) lines.push(`Industry: ${opp.industry}`);
  if (opp.revenue) lines.push(`Revenue/Stage: ${opp.revenue}`);
  if (opp.retainerEst) lines.push(`Est. retainer: $${opp.retainerEst}/mo`);
  if (opp.currentPain) lines.push(`\nCURRENT PAIN POINTS:\n${opp.currentPain}`);
  if (opp.scopeNotes)  lines.push(`\nSCOPE NOTES:\n${opp.scopeNotes}`);
  if (opp.notes)       lines.push(`\nADDITIONAL NOTES:\n${opp.notes}`);
  if (opp.pitch)       lines.push(`\nEXISTING PITCH:\n${opp.pitch}`);
  if (opp.pricing) {
    lines.push(
      `\nPRICING ESTIMATE: build $${opp.pricing.buildPhaseMonthly}/mo, steady $${opp.pricing.steadyStateMonthly}/mo, equity verdict: ${opp.pricing.equityTrigger.verdict}`
    );
  }
  return lines.join("\n");
}

function formatAttachmentContext(attachments: Attachment[]): string {
  if (attachments.length === 0) return "\n\nNo context artifacts uploaded yet.";

  const sections: string[] = ["\n\nUPLOADED CONTEXT ARTIFACTS:"];
  for (const a of attachments) {
    const meta = CONTEXT_KIND_META[a.kind];
    const header = [
      `--- ${meta.label.toUpperCase()}: ${a.name}`,
      a.tag ? `Tag: ${a.tag}` : null,
      a.note ? `User note: ${a.note}` : null,
      `Uploaded: ${new Date(a.createdAt).toLocaleString()}`,
    ]
      .filter(Boolean)
      .join("\n");

    sections.push(header);
    if (a.extractedText) {
      sections.push(`\n${a.extractedText}\n`);
    } else {
      sections.push(
        `[Binary file — content not extracted. The user may want to paste the text inline if relevant.]`
      );
    }
    sections.push("---");
  }
  return sections.join("\n");
}

export interface AgentReplyResult {
  userMessage: StoredMessage;
  assistantMessage: StoredMessage;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens: number;
    cacheReadTokens: number;
  };
}

export interface AgentSendInput {
  opportunityId: string;
  content: string;
  attachments?: AttachmentRef[] | null;
}

/**
 * Append a new user message to the opportunity's conversation, call the
 * Anthropic API with the full history + context, save both turns to the DB,
 * and return them.
 */
export async function agentReply(input: AgentSendInput): Promise<AgentReplyResult> {
  const { opportunityId, content, attachments } = input;
  if (!content || !content.trim()) {
    throw new Error("Message content is required.");
  }

  const opp = await getOpportunity(opportunityId);
  if (!opp) throw new Error(`Opportunity ${opportunityId} not found.`);

  // Persist the user message first so it's recorded even if the API call fails.
  const userMessage = await saveMessage(
    opportunityId,
    "user",
    content.trim(),
    attachments && attachments.length > 0 ? attachments : null
  );

  // Build the full history (now includes the just-saved user message).
  const history = await listMessages(opportunityId);

  // Build opportunity context (re-read attachments so any just-uploaded files
  // are included).
  const oppAttachments = await listAttachmentsByOpportunity(opportunityId);
  const opportunityContext =
    formatOpportunityContext(opp) + formatAttachmentContext(oppAttachments);

  const anthropic = client();
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  let response: Anthropic.Message;
  try {
    response = await anthropic.messages.create({
      model,
      max_tokens: 2048,
      system: [
        {
          type: "text",
          text: ASPEN_HILLS_CONTEXT,
          cache_control: { type: "ephemeral" },
        },
        {
          type: "text",
          text: opportunityContext,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: history.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });
  } catch (err) {
    // Roll back the user message so the conversation isn't left dangling.
    const supabase = supabaseServer();
    await supabase
      .from("opportunity_messages")
      .delete()
      .eq("id", userMessage.id);
    throw err;
  }

  const replyText = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  const assistantMessage = await saveMessage(
    opportunityId,
    "assistant",
    replyText
  );

  return {
    userMessage,
    assistantMessage,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cacheCreationTokens: response.usage.cache_creation_input_tokens ?? 0,
      cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
    },
  };
}
