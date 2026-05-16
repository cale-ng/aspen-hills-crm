import type { Opportunity } from "./types";

// Seed data lifted from docs/aspen_hills_crm_spec.md.
// Used to populate the database on first run (and as a fallback
// for local UI development before Supabase env vars are set).
export const SEED_OPPORTUNITIES: Opportunity[] = [
  {
    id: "belove-001",
    company: "Be LOVE™",
    contact: "Taylor · taylor@drink.love",
    website: "drink.love",
    industry: "Functional Beverage / Electrolytes",
    revenue: "Early growth — Target, HEB, Life Time distribution",
    currentPain:
      "Hiring full-time Supply Chain Manager (~$120-150K) to own end-to-end supply chain: MRP, S&OP, procurement, inventory strategy, vendor management, SKU rationalization, production planning. 8+ SKUs across two product lines. Retail footprint at Target/HEB creating real ops pressure.",
    scopeNotes:
      "Full fractional ops team from Aspen Hills covers SCM + coordinator layer from day one at fraction of FT cost. AI tooling explicitly called out in JD — strong model alignment.",
    notes:
      "Founded by Kurt Seidensticker (Vital Proteins founder, Ghost Energy/Koia investor) and Leslie Scofield (Toms, Aviator Nation, Summit Series). Austin-based. Progressive Grocer Best New Product 2025. Contact: taylor@drink.love",
    fit: "high",
    retainerEst: "7500",
    stage: "Pitching",
    pitch: null,
    pricing: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "husk-001",
    company: "Husk",
    contact: "Sarah Goldschmid · Co-Founder · sarah@drinkhusk.com",
    website: "drinkhusk.com",
    industry: "Functional Food / Fiber Supplements",
    revenue: "Pre-launch",
    currentPain:
      "Launching clean label fiber powder drink mix. Need co-packer identification for pilot run plus fractional operational support. Found Aspen Hills via Startup CPG Slack channel.",
    scopeNotes:
      "Dual scope: (1) co-packer sourcing for pilot launch, (2) ongoing fractional ops support post-launch. Pre-launch = build from scratch opportunity.",
    notes:
      "Inbound via Aspen Hills website contact form. Co-founder outreach = direct decision-maker access. Pre-launch stage is prime equity ask territory.",
    fit: "high",
    retainerEst: null,
    stage: "Qualifying",
    pitch: null,
    pricing: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
