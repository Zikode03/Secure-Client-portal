import type { ReviewLineItem } from "../../services/invoiceReviewScanner";
import { Button } from "../ui/Button";

const columns: Array<[keyof ReviewLineItem, string]> = [["description", "Description"], ["quantity", "Quantity"], ["unitPrice", "Unit price"], ["discount", "Discount amount"], ["netTotal", "Net total before VAT"]];
export function InvoiceLineItems({ lines, confirmed, onChange, onConfirm }: {
  lines: ReviewLineItem[]; confirmed: boolean; onChange: (lines: ReviewLineItem[]) => void; onConfirm: (value: boolean) => void;
}) {
  return <section aria-label="Invoice line items" className="space-y-3 rounded-xl border border-slate-200 p-3">
    <div className="flex items-center justify-between gap-2"><h4 className="text-sm font-semibold">Line-item checks</h4>
      <Button size="sm" variant="ghost" disabled={lines.length >= 100} onClick={() => onChange([...lines, { description: "", quantity: "", unitPrice: "", discount: "", netTotal: "" }])}>Add line</Button></div>
    <p className="text-xs leading-5 text-slate-500">Record every row before VAT. Enter the discount as an amount, with 0 for none. Leave tax-inclusive or unclear rows for manual verification.</p>
    {lines.map((line, index) => <div key={index} className="space-y-2 border-t border-slate-100 pt-3">
      <div className="flex justify-between text-xs font-medium"><span>Line {index + 1}</span><button type="button" className="text-slate-500 underline" onClick={() => onChange(lines.filter((_, row) => row !== index))}>Remove line {index + 1}</button></div>
      <div className="grid gap-2 sm:grid-cols-2">{columns.map(([field, label]) => <label key={field} className="text-xs text-slate-600">{label}
        <input aria-label={`Line ${index + 1} ${label.toLowerCase()}`} value={line[field]} maxLength={field === "description" ? 200 : 18} inputMode={field === "description" ? "text" : "decimal"} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" onChange={event => onChange(lines.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: event.target.value } : row))} />
      </label>)}</div>
    </div>)}
    <label className="flex gap-2 text-xs leading-5 text-slate-600"><input type="checkbox" checked={confirmed} disabled={!lines.length} onChange={event => onConfirm(event.target.checked)} />I checked every line against the original. All rows are included, and unit prices and line totals exclude VAT.</label>
  </section>;
}
