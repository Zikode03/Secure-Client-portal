import {fireEvent,render,screen} from "@testing-library/react";
import {expect,it,vi} from "vitest";
import {ClientRecordsPanel} from "../components/documents/ClientRecordsPanel";
const document={id:"invoice",clientId:"company",clientName:"Test company",fileName:"Invoice.pdf",documentType:"general",monthLabel:"November 2026",monthlyPackId:"nov",description:"Historical upload",status:"uploaded" as const,uploadedBy:"Staff",uploadedAt:"2026-11-18T08:00:00Z",sizeLabel:"1 KB",keywordTags:[],comments:[],auditTrail:[]};
it("offers an explicit checklist link for an unclassified uploaded document",()=>{
 const onLink=vi.fn();const onOpen=vi.fn();
 render(<ClientRecordsPanel documents={[document]} packs={[]} category="packs" status="ready" onRetry={vi.fn()} onOpen={onOpen} onManagePacks={vi.fn()} onLink={onLink}/>);
 fireEvent.click(screen.getByRole("button",{name:/^Year 2026/}));
 fireEvent.click(screen.getByRole("button",{name:/^November 2026/}));
 fireEvent.click(screen.getByRole("button",{name:"Actions for Invoice.pdf"}));
 fireEvent.click(screen.getByRole("menuitem",{name:"Link to monthly checklist"}));
 expect(onLink).toHaveBeenCalledWith(document);expect(onOpen).not.toHaveBeenCalled();
});
it("does not offer relinking for an approved document",()=>{
 render(<ClientRecordsPanel documents={[{...document,status:"accepted"}]} packs={[]} category="packs" status="ready" onRetry={vi.fn()} onOpen={vi.fn()} onManagePacks={vi.fn()} onLink={vi.fn()}/>);
 fireEvent.click(screen.getByRole("button",{name:/^Year 2026/}));
 fireEvent.click(screen.getByRole("button",{name:/^November 2026/}));
 fireEvent.click(screen.getByRole("button",{name:"Actions for Invoice.pdf"}));
 expect(screen.queryByRole("menuitem",{name:"Link to monthly checklist"})).not.toBeInTheDocument();
});
