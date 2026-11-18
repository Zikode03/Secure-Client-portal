import {useState} from "react";
import {apiPutJson} from "../../services/apiClient";
import {monthNames,recordPeriod,type ArchiveScope} from "../../services/financialArchive";
import type {DocumentRecord} from "../../types/portal";
import {Button} from "../ui/Button";
export function OrganiseDocumentDialog({document,onClose,onSaved}:{document:DocumentRecord;onClose:()=>void;onSaved:()=>void}){
 const period=recordPeriod(document);const [scope,setScope]=useState<ArchiveScope>(document.archiveScope??(period?"monthly":"uncertain"));
 const [year,setYear]=useState(String(document.archiveYear??period?.year??""));const [month,setMonth]=useState(String(document.archiveMonth??period?.month??""));const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 async function save(){setBusy(true);setError("");try{await apiPutJson(`/api/documents/${encodeURIComponent(document.id)}/archive-placement`,{scope,year:scope==="monthly"||scope==="annual"?Number(year):null,month:scope==="monthly"?Number(month):null,expectedDocumentVersion:document.versionNumber??1});onSaved();onClose();}catch(reason){setError(reason instanceof Error?reason.message:"The archive location could not be saved.");}finally{setBusy(false);}}
 return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4" onClick={onClose}><section role="dialog" aria-modal="true" aria-labelledby="organise-document-title" className="w-full max-w-lg space-y-4 rounded-xl bg-white p-6 shadow-xl" onClick={event=>event.stopPropagation()}>
 <h2 id="organise-document-title" className="text-lg font-semibold">Organise document</h2><p className="break-words text-sm text-slate-500">{document.fileName}</p><p className="text-sm text-slate-500">Changes its archive location. Review status and monthly checklist requirements remain separate.</p>
 <label className="block text-sm font-medium">Record section<select autoFocus className="mt-1 w-full rounded-lg border border-slate-300 p-2" value={scope} onChange={event=>setScope(event.target.value as ArchiveScope)}><option value="monthly">Monthly financial records</option><option value="annual">Annual financial records</option><option value="permanent">Permanent company records</option><option value="uncertain">Period needs checking</option></select></label>
 {scope==="monthly"||scope==="annual"?<label className="block text-sm font-medium">{scope==="annual"?"Financial year ending in":"Record year"}<input type="number" min={1900} max={9998} className="mt-1 w-full rounded-lg border border-slate-300 p-2" value={year} onChange={event=>setYear(event.target.value)}/></label>:null}
 {scope==="monthly"?<label className="block text-sm font-medium">Month<select className="mt-1 w-full rounded-lg border border-slate-300 p-2" value={month} onChange={event=>setMonth(event.target.value)}><option value="">Choose month</option>{monthNames.map((name,index)=><option key={name} value={index+1}>{name}</option>)}</select></label>:null}
 {error?<p role="alert" className="text-sm text-red-700">{error}</p>:null}<div className="flex justify-end gap-3"><Button variant="secondary" disabled={busy} onClick={onClose}>Cancel</Button><Button disabled={busy||((scope==="monthly"||scope==="annual")&&!year)||(scope==="monthly"&&!month)} onClick={()=>void save()}>{busy?"Saving…":"Save location"}</Button></div>
 </section></div>;
}
