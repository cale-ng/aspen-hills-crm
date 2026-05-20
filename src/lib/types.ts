// Core domain types for the Aspen Hills CRM.
// Mirrors the spec in docs/aspen_hills_crm_spec.md.

export type PipelineStage =
  | "Qualifying"
  | "Pitching"
  | "Proposal Sent"
  | "Negotiating"
  | "Closed Won"
  | "Closed Lost";

export const PIPELINE_STAGES: PipelineStage[] = [
  "Qualifying",
  "Pitching",
  "Proposal Sent",
  "Negotiating",
  "Closed Won",
  "Closed Lost",
];

export type FitLevel = "high" | "medium" | "low";

export const FIT_META: Record<
  FitLevel,
  { label: string; color: string }
> = {
  high: { label: "Strong Fit", color: "#10b981" },
  medium: { label: "Good Fit", color: "#f59e0b" },
  low: { label: "Weak Fit", color: "#ef4444" },
};

export const STAGE_META: Record<
  PipelineStage,
  { color: string; tint: string }
> = {
  Qualifying:     { color: "#94a3b8", tint: "rgba(148,163,184,0.12)" },
  Pitching:       { color: "#f59e0b", tint: "rgba(245,158,11,0.12)" },
  "Proposal Sent":{ color: "#3b82f6", tint: "rgba(59,130,246,0.12)" },
  Negotiating:    { color: "#8b5cf6", tint: "rgba(139,92,246,0.12)" },
  "Closed Won":   { color: "#10b981", tint: "rgba(16,185,129,0.12)" },
  "Closed Lost":  { color: "#ef4444", tint: "rgba(239,68,68,0.12)" },
};

export interface EquityTrigger {
  verdict: "ask" | "consider" | "skip";
  confidence: "high" | "medium" | "low";
  score: number;
  strongYesSignals: string[];
  strongNoSignals: string[];
  summary: string;
  askTiming: string;
  alternativeIfSkip: string;
}

export interface EquityRecommendation {
  percentageLow: number;
  percentageHigh: number;
  vestingYears: number;
  cliffMonths: number;
  structure: string;
  rationale: string;
}

export interface PricingEstimate {
  buildPhaseMonthly: number;
  steadyStateMonthly: number;
  buildPhaseDuration: number;
  hoursPerMonth: { build: number; steady: number };
  scopeComplexity: "light" | "moderate" | "heavy";
  rationale: string;
  annualValue: number;
  ftComparison: number;
  savingsVsFT: number;
  equityTrigger: EquityTrigger;
  equityRecommendation: EquityRecommendation;
  warnings: string[];
}

export type ContextKind =
  | "transcript"
  | "email"
  | "job_description"
  | "deck"
  | "document"
  | "image"
  | "other";

export const CONTEXT_KIND_META: Record<
  ContextKind,
  { label: string; icon: string }
> = {
  transcript:      { label: "Meeting transcript", icon: "🎙" },
  email:           { label: "Email",              icon: "✉" },
  job_description: { label: "Job description",    icon: "📋" },
  deck:            { label: "Pitch deck",         icon: "🎴" },
  document:        { label: "Document",           icon: "📄" },
  image:           { label: "Image",              icon: "🖼" },
  other:           { label: "Other",              icon: "📎" },
};

export const CONTEXT_KINDS: ContextKind[] = [
  "transcript",
  "email",
  "job_description",
  "deck",
  "document",
  "image",
  "other",
];

export interface Attachment {
  id: string;
  opportunityId: string;
  name: string;
  mimeType: string | null;
  sizeBytes: number | null;
  storagePath: string | null;
  isReference: boolean;
  kind: ContextKind;
  tag: string | null;
  note: string | null;
  extractedText: string | null;
  createdAt: string;
}

export interface AttachmentRow {
  id: string;
  opportunity_id: string;
  name: string;
  mime_type: string | null;
  size_bytes: number | null;
  storage_path: string | null;
  is_reference: boolean;
  kind: ContextKind;
  tag: string | null;
  note: string | null;
  extracted_text: string | null;
  created_at: string;
}

export function rowToAttachment(row: AttachmentRow): Attachment {
  return {
    id: row.id,
    opportunityId: row.opportunity_id,
    name: row.name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    storagePath: row.storage_path,
    isReference: row.is_reference,
    kind: row.kind,
    tag: row.tag,
    note: row.note,
    extractedText: row.extracted_text,
    createdAt: row.created_at,
  };
}

export interface Opportunity {
  id: string;
  company: string;
  /** @deprecated Legacy free-text contact field. Prefer contactName/email/phone. */
  contact: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  industry: string | null;
  /** Kept on the record for AI extraction; no longer in the manual intake form. */
  revenue: string | null;
  currentPain: string | null;
  scopeNotes: string | null;
  notes: string | null;
  fit: FitLevel;
  retainerEst: string | null;
  stage: PipelineStage;
  pitch: string | null;
  pricing: PricingEstimate | null;
  createdAt: string;
  updatedAt: string;
  attachments?: Attachment[];
}

// Shape returned by Supabase (snake_case). Used inside the data layer.
export interface OpportunityRow {
  id: string;
  company: string;
  contact: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  industry: string | null;
  revenue: string | null;
  current_pain: string | null;
  scope_notes: string | null;
  notes: string | null;
  fit: FitLevel;
  retainer_est: string | null;
  stage: PipelineStage;
  pitch: string | null;
  pricing: PricingEstimate | null;
  created_at: string;
  updated_at: string;
}

export function rowToOpportunity(row: OpportunityRow): Opportunity {
  return {
    id: row.id,
    company: row.company,
    contact: row.contact,
    contactName: row.contact_name,
    email: row.email,
    phone: row.phone,
    website: row.website,
    industry: row.industry ?? null,
    revenue: row.revenue,
    currentPain: row.current_pain,
    scopeNotes: row.scope_notes,
    notes: row.notes,
    fit: row.fit,
    retainerEst: row.retainer_est,
    stage: row.stage,
    pitch: row.pitch,
    pricing: row.pricing,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
