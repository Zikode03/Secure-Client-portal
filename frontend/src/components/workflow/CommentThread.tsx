import { useMemo, useState } from "react";
import type { DocumentComment, Role } from "../../types/portal";
import { cn } from "../../utils/cn";
import { formatDateTimeLabel } from "../../utils/formatters";
import { Button } from "../ui/Button";
import { TextAreaField } from "../ui/TextAreaField";

interface CommentThreadProps {
  comments: DocumentComment[];
  currentRole: Role;
  currentAuthor: string;
  onSubmitComment?: (message: string) => { ok: boolean; message: string };
  composerLabel?: string;
  composerPlaceholder?: string;
  emptyDescription?: string;
  emptyTitle?: string;
  helperText?: string;
  submitLabel?: string;
}

export function CommentThread({
  comments,
  composerLabel = "Add a document-specific comment",
  composerPlaceholder = "Keep the feedback tied to the file so the next person in the workflow has the full context.",
  currentAuthor,
  currentRole,
  emptyDescription = "No one has commented on this document yet. Any note left here stays attached to the exact file being reviewed.",
  emptyTitle = "No comments yet",
  helperText,
  onSubmitComment,
  submitLabel = "Post comment",
}: CommentThreadProps) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const emptyState = useMemo(() => comments.length === 0, [comments.length]);

  function handleSubmit() {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      setError("Write a clear note before sending it to the document thread.");
      return;
    }

    if (onSubmitComment) {
      const result = onSubmitComment(trimmedMessage);
      if (!result.ok) {
        setError(result.message);
        return;
      }
    }
    setMessage("");
    setError("");
  }

  return (
    <div className="space-y-4">
      {emptyState ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
          <p className="font-medium text-slate-700">{emptyTitle}</p>
          <p className="mt-1">{emptyDescription}</p>
        </div>
      ) : (
        comments.map((comment) => (
          <article
            className={cn(
              "rounded-3xl border p-4",
              comment.role === "accountant"
                ? "border-brand-100 bg-brand-50/70"
                : "border-slate-200 bg-white",
            )}
            key={comment.id}
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-slate-950">{comment.author}</p>
              <span className="rounded-full bg-white/80 px-2 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
                {comment.role}
              </span>
              <span className="text-sm text-slate-400">
                {formatDateTimeLabel(comment.createdAt)}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">{comment.message}</p>
          </article>
        ))
      )}

      <div className="space-y-4 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
        <TextAreaField
          error={error}
          label={composerLabel}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={composerPlaceholder}
          value={message}
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            {helperText ?? `Posting as ${currentAuthor} (${currentRole})`}
          </p>
          <Button onClick={handleSubmit}>{submitLabel}</Button>
        </div>
      </div>
    </div>
  );
}
