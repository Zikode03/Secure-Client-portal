import {expect,it} from "vitest";
import {checklistSummary} from "../services/checklistSummary";
import {filterUnifiedSearchResults,recalculatePack} from "../services/workflowEngine";
import {mapBackendSlotStatus} from "../services/clientMonthlyPackBackend";
import {notificationKind} from "../services/notificationKinds";
import {getScopedClients} from "../utils/permissions";
import type {MonthlyPack,SessionUser,FirmClientAccount,UnifiedSearchResult,UnifiedSearchFilters} from "../types/portal";
it("separates received drafts from approved progress",()=>{
 const slots=[{status:"draft",isRequired:true}];const result=checklistSummary(slots);
 expect(result).toMatchObject({receivedCount:1,approvedCount:0,progressPercent:0,missingCount:0,submissionReady:true});
 expect(recalculatePack({slots} as MonthlyPack).completionMessage).not.toContain("Month is complete");
});
it("excludes optional and exempt items from applicable required progress",()=>{
 expect(checklistSummary([{status:"accepted",isRequired:true},{status:"missing",isRequired:false},{status:"not_applicable",isRequired:true}])).toMatchObject({totalCount:1,approvedCount:1,progressPercent:100,missingCount:0});
 expect(mapBackendSlotStatus("not_applicable",true)).toBe("not_applicable");
});
it("separates missing evidence from incomplete and correction states",()=>{
 expect(checklistSummary([{status:"missing",isRequired:true},{status:"draft",isRequired:true},{status:"pending_signature",isRequired:true},{status:"rejected",isRequired:true}])).toMatchObject({missingCount:1,correctionCount:1,receivedCount:1});
});
it("uses primary and backup IDs without granting frontend scope by display name",()=>{
 const user={id:"backup",role:"accountant",fullName:"Same name",name:"Same",email:"backup@example.invalid",title:"Accountant",company:"Firm",initials:"SN",assignedClientIds:[],clientIds:[]} as SessionUser;
 const clients=[{id:"mine",assignedAccountantUserId:"primary",assignedAccountant:"Other",backupAccountantUserId:"backup"},{id:"foreign",assignedAccountantUserId:"someone-else",assignedAccountant:"Same name"}] as FirmClientAccount[];
 expect(getScopedClients(user,clients).map(client=>client.id)).toEqual(["mine"]);
});
it("successful and unknown updates never become missing-document alerts",()=>{
 expect(notificationKind("document.accepted")).toBe("general_update");
 expect(notificationKind("request.created")).toBe("general_update");
 expect(notificationKind("unknown.event")).toBe("general_update");
 expect(notificationKind("document.missing.reminder")).toBe("missing_documents");
 expect(notificationKind("documents.imported")).toBe("document_update");
});

it("filters historical records by their accounting period rather than upload date",()=>{
 const record={id:"historical",date:"2026-11-18",monthLabel:"July 2018",keywordText:"historical",typeLabel:"Invoice",status:"uploaded"} as UnifiedSearchResult;
 const filters:UnifiedSearchFilters={query:"",clientId:"",month:"",year:"2018",documentType:"",status:"",expiryStatus:"",requiredFlag:"",uploadedBy:"",reviewedBy:""};
 expect(filterUnifiedSearchResults([record],filters)).toHaveLength(1);
 expect(filterUnifiedSearchResults([record],{...filters,year:"2026"})).toHaveLength(0);
 expect(filterUnifiedSearchResults([{...record,monthLabel:"Period not specified"}],filters)).toHaveLength(0);
});
