"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CONTEXT_KIND_META,
  CONTEXT_KINDS,
  type Attachment,
  type ContextKind,
} from "@/lib/types";

const MAX_FILE_SIZE_MB = 10;

export function FilesTab({ opportunityId }: { opportunityId: string }) {
  const [items, setItems] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [kind, setKind] = useState<ContextKind>("other");
  const [tag, setTag] = useState("");
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/attachments`);
      if (!res.ok) throw new Error(`Load failed (${res.status})`);
      setItems((await res.json()) as Attachment[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [opportunityId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function handleFilesPicked(files: FileList | File[] | null) {
    if (!files || files.length === 0) return;
    const file = Array.from(files)[0];
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`File too large (max ${MAX_FILE_SIZE_MB}MB).`);
      return;
    }
    setPendingFile(file);
    // Suggest a kind based on MIME type.
    if (file.type.startsWith("image/")) setKind("image");
    else if (file.type === "message/rfc822" || file.name.toLowerCase().endsWith(".eml")) setKind("email");
    else if (file.name.toLowerCase().includes("transcript")) setKind("transcript");
    else if (file.name.toLowerCase().includes("jd") || file.name.toLowerCase().includes("job")) setKind("job_description");
    else if (file.name.toLowerCase().endsWith(".pptx") || file.name.toLowerCase().endsWith(".pdf")) setKind("deck");
    else setKind("document");
    setError(null);
  }

  async function handleUpload() {
    if (!pendingFile) return;
    setUploading(true);
    setError(null);

    const form = new FormData();
    form.append("file", pendingFile);
    form.append("kind", kind);
    if (tag.trim()) form.append("tag", tag.trim());
    if (note.trim()) form.append("note", note.trim());

    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/attachments`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body.error || `Upload failed (${res.status})`);
      }
      const created = (await res.json()) as Attachment;
      setItems((prev) => [created, ...prev]);
      setPendingFile(null);
      setTag("");
      setNote("");
      setKind("other");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete ${name}?`)) return;
    try {
      const res = await fetch(`/api/attachments/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        throw new Error(`Delete failed (${res.status})`);
      }
      setItems((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  async function handleView(id: string) {
    try {
      const res = await fetch(`/api/attachments/${id}`);
      if (!res.ok) throw new Error("Could not generate view link.");
      const { url } = (await res.json()) as { url: string };
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Upload zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFilesPicked(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className="rounded-md border border-dashed py-8 px-6 text-center cursor-pointer transition-colors"
        style={{
          borderColor: dragOver ? "var(--accent-primary)" : "var(--border-default)",
          backgroundColor: dragOver ? "rgba(200,224,107,0.06)" : "transparent",
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => handleFilesPicked(e.target.files)}
        />
        <p className="text-sm text-text-secondary">
          {pendingFile ? (
            <>
              Ready to upload:{" "}
              <span className="text-text-primary">{pendingFile.name}</span>{" "}
              <span className="text-text-muted">
                ({(pendingFile.size / 1024).toFixed(0)} KB)
              </span>
            </>
          ) : (
            <>Drag a file here or click to browse</>
          )}
        </p>
        <p className="text-xs text-text-muted mt-1">
          Max {MAX_FILE_SIZE_MB}MB · transcripts, emails (.eml), PDFs, decks, images, text
        </p>
      </div>

      {/* Pending file metadata + upload */}
      {pendingFile && (
        <div className="flex flex-col gap-4 p-4 rounded-md border border-border-subtle bg-bg-elevated">
          <div className="grid grid-cols-2 gap-3">
            <FieldLabel label="Kind">
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as ContextKind)}
                className={inputCls}
              >
                {CONTEXT_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {CONTEXT_KIND_META[k].icon} {CONTEXT_KIND_META[k].label}
                  </option>
                ))}
              </select>
            </FieldLabel>
            <FieldLabel label="Tag (optional)">
              <input
                type="text"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="e.g. intro call · 2026-05-10"
                className={inputCls}
              />
            </FieldLabel>
          </div>
          <FieldLabel label="Note (optional)">
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Short context about what this is, who sent it, why it matters…"
              className={inputCls + " resize-y"}
            />
          </FieldLabel>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setPendingFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="px-3 py-1.5 text-xs uppercase tracking-wider rounded-md text-text-muted border border-border-default"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading}
              className="px-3 py-1.5 text-xs uppercase tracking-wider rounded-md transition-colors disabled:opacity-50"
              style={{
                backgroundColor: "var(--accent-primary)",
                color: "var(--bg-base)",
              }}
            >
              {uploading ? "Uploading…" : "Upload"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div
          className="px-4 py-3 rounded-md text-sm"
          style={{
            color: "#ef4444",
            backgroundColor: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.3)",
          }}
        >
          {error}
        </div>
      )}

      {/* List */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] uppercase tracking-[0.2em] text-text-dim">
          Context library
        </span>
        {loading ? (
          <div className="text-text-muted text-sm py-8 text-center">Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-text-muted text-sm py-8 text-center italic">
            No context uploaded yet.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((a) => (
              <li
                key={a.id}
                className="flex items-start gap-3 p-3 rounded-md border border-border-subtle bg-bg-elevated"
              >
                <div className="text-2xl flex-shrink-0">
                  {CONTEXT_KIND_META[a.kind].icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-sm text-text-primary truncate">{a.name}</span>
                    <span className="text-[10px] uppercase tracking-wider text-text-muted">
                      {CONTEXT_KIND_META[a.kind].label}
                    </span>
                    {a.tag && (
                      <span className="text-[10px] text-accent">· {a.tag}</span>
                    )}
                  </div>
                  {a.note && (
                    <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                      {a.note}
                    </p>
                  )}
                  <div className="text-[10px] text-text-dim mt-1">
                    {a.sizeBytes ? `${(a.sizeBytes / 1024).toFixed(0)} KB · ` : ""}
                    {new Date(a.createdAt).toLocaleDateString()}
                    {a.extractedText ? " · text extracted" : ""}
                  </div>
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleView(a.id)}
                    className="text-[10px] uppercase tracking-wider text-text-muted hover:text-accent"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleDelete(a.id, a.name)}
                    className="text-[10px] uppercase tracking-wider text-text-muted hover:text-[#ef4444]"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2 rounded-md text-sm bg-bg-base text-text-primary placeholder:text-text-dim border border-border-default focus:border-accent focus:outline-none";

function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] uppercase tracking-[0.2em] text-text-dim">
        {label}
      </span>
      {children}
    </label>
  );
}
