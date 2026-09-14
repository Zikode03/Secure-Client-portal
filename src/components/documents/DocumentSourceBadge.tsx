import { formatDocumentSource, type DocumentSource } from "./documentSource";

interface DocumentSourceBadgeProps {
  source: DocumentSource;
}

const sourceClass: Record<DocumentSource, string> = {
  monthly_pack: "bg-violet-50 text-violet-700 ring-violet-100",
  request: "bg-amber-50 text-amber-700 ring-amber-100",
  direct_upload: "bg-slate-100 text-slate-600 ring-slate-200",
};

export function DocumentSourceBadge({ source }: DocumentSourceBadgeProps) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[0.7rem] font-semibold ring-1 ring-inset ${sourceClass[source]}`}>
      {formatDocumentSource(source)}
    </span>
  );
}
