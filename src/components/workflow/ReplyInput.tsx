import { useState } from "react";
import { Button } from "../ui/Button";
import { TextAreaField } from "../ui/TextAreaField";

interface ReplyInputProps {
  onSubmit: (message: string) => Promise<{ ok: boolean; message: string }>;
  placeholder?: string;
  label?: string;
  isLoading?: boolean;
}

export function ReplyInput({
  onSubmit,
  placeholder = "Type your reply here...",
  label = "Reply to this request",
  isLoading = false,
}: ReplyInputProps) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      setError("Please write a message before submitting.");
      return;
    }

    setLoading(true);
    try {
      const result = await onSubmit(trimmedMessage);
      if (result.ok) {
        setMessage("");
        setError("");
      } else {
        setError(result.message || "Failed to submit reply");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  const isSubmitting = loading || isLoading;

  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <TextAreaField
        label={label}
        placeholder={placeholder}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        error={error}
        disabled={isSubmitting}
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {message.length > 0 ? `${message.length} characters` : "Share your thoughts"}
        </p>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !message.trim()}
          variant="primary"
        >
          {isSubmitting ? "Sending..." : "Send reply"}
        </Button>
      </div>
    </div>
  );
}
