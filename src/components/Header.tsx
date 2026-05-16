"use client";

type Props = {
  onNewOpportunity: () => void;
  opportunityCount: number;
};

export function Header({ onNewOpportunity, opportunityCount }: Props) {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-bg-surface">
      <div className="flex items-baseline gap-3">
        <h1
          className="text-xl"
          style={{ fontFamily: "var(--font-playfair)", color: "var(--accent-primary)" }}
        >
          Aspen Hills
        </h1>
        <span className="text-xs uppercase tracking-[0.2em] text-text-muted">
          CRM · {opportunityCount} opportunities
        </span>
      </div>
      <button
        onClick={onNewOpportunity}
        className="px-3 py-1.5 text-xs uppercase tracking-wider rounded-md transition-colors"
        style={{
          backgroundColor: "var(--accent-primary)",
          color: "var(--bg-base)",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = "var(--accent-hover)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.backgroundColor = "var(--accent-primary)")
        }
      >
        + New Opportunity
      </button>
    </header>
  );
}
