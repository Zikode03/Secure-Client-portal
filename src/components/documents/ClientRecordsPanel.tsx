import {FinancialArchiveExplorer,type ArchiveSelection} from "./FinancialArchiveExplorer";
import { useCallback, useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { RecordActions } from "../ui/RecordActions";
import { formatStatusLabel } from "../../utils/formatters";
import { formatDocumentType } from "./documentTypeLabel";
import type { DocumentRecord } from "../../types/portal";
import "./documentLibrary.css";
interface Pack {id: string; year: number; month: number; status: string}
interface Props {documents: DocumentRecord[]; packs: Pack[]; category: string; status: "loading" | "ready" | "error"; onRetry: () => void; onOpen: (document: DocumentRecord) => void; onManagePacks: () => void; onLink?: (document: DocumentRecord) => void}
export function ClientRecordsPanel({documents,category,status,onRetry,onOpen,onManagePacks,onLink}:Props) {
  const [page,setPage]=useState(1);
  const [archiveSelection,setArchiveSelection]=useState<ArchiveSelection>({ids:[],leaf:false,clientId:""});
  const selectArchive=useCallback((selection:ArchiveSelection)=>setArchiveSelection(current=>current.leaf===selection.leaf&&current.ids.join("|")===selection.ids.join("|")?current:selection),[]);
  const categoryRecords = documents.filter(document => category === "packs" || formatDocumentType(document.documentType).toLowerCase() === formatDocumentType(category).toLowerCase());
  const matches=categoryRecords.filter(document=>archiveSelection.ids.includes(document.id));
  const pages=Math.max(1,Math.ceil(matches.length/10));
  useEffect(() => setPage(1),[category]);
  useEffect(() => {if(page>pages)setPage(pages);},[page,pages]);
  return <section className="client-document-library" aria-label="Client documents and historical records">
    <div className="doc-library-summary"><div><h2 className="text-lg font-semibold">{category === "packs" ? "Client documents" : formatDocumentType(category)}</h2><p className="mt-1 text-sm text-slate-500">Current and historical periods. Historical filing confirmations are recorded separately from reviews completed in Secure Client.</p></div><Button size="sm" variant="secondary" onClick={onManagePacks}>Manage monthly packs</Button></div>
    {status === "loading" ? <p className="p-5 text-sm text-slate-500" role="status">Loading client documents…</p> : status === "error" ? <div className="p-5" role="alert"><p className="mb-3 text-sm text-slate-600">Client records could not be loaded. Retry to retrieve the saved documents.</p><Button size="sm" onClick={onRetry}>Retry records</Button></div> : <>
      <FinancialArchiveExplorer records={categoryRecords} clients={documents.length?[{id:documents[0].clientId,name:documents[0].clientName}]:[]} fixedClientId={documents[0]?.clientId} onSelection={selectArchive}/>
      {archiveSelection.leaf ? <>
      {matches.length ? <div className="doc-library-table-scroll"><table className="doc-library-table"><caption className="sr-only">Client documents across all periods</caption><thead><tr><th scope="col">Document</th><th scope="col">Period</th><th scope="col">Status</th><th scope="col" className="doc-library-action-cell">Actions</th></tr></thead><tbody>{matches.slice((page-1)*10,page*10).map(document => <tr key={document.id}><td><button className="doc-library-file-name" onClick={() => onOpen(document)} type="button">{document.fileName}</button><p className="doc-library-file-meta">{formatDocumentType(document.documentType)}</p></td><td>{document.monthLabel}</td><td>{document.isHistoricallyFiled ? "Historically filed" : formatStatusLabel(document.status)}</td><td className="doc-library-action-cell"><RecordActions iconOnly label={`Actions for ${document.fileName}`} actions={[{label:"Open",onSelect:()=>onOpen(document)},...(!document.documentSlotId && ["uploaded","draft"].includes(document.status) && onLink ? [{label:"Link to monthly checklist",onSelect:()=>onLink(document)}] : [])]} /></td></tr>)}</tbody></table></div> : <p className="p-5 text-sm text-slate-500">{category === "packs" ? "No documents have been saved for this client." : "No documents of this type have been saved for this client."}</p>}
      {pages>1 ? <nav aria-label="Client document pages" className="doc-library-pagination"><span>{matches.length} documents</span><div><Button size="sm" variant="secondary" disabled={page===1} onClick={()=>setPage(value=>value-1)}>Previous</Button><span>Page {page} of {pages}</span><Button size="sm" variant="secondary" disabled={page===pages} onClick={()=>setPage(value=>value+1)}>Next</Button></div></nav> : null}
      </> : null}
    </>}
  </section>;
}
