import {fireEvent,render,screen,waitFor} from "@testing-library/react";
import {beforeEach,expect,it,vi} from "vitest";
import {FinancialArchiveExplorer} from "../components/documents/FinancialArchiveExplorer";
import {apiGetJson} from "./fixtures/apiTransportFixture";
vi.mock("../services/apiClient",async original=>({...await original<typeof import("../services/apiClient")>(),hasApiBaseUrl:()=>true,apiGetJson:vi.fn()}));
const records=[{id:"nov",clientId:"a",monthLabel:"November 2025",status:"under_review"},{id:"feb",clientId:"a",monthLabel:"February 2026",status:"accepted"},{id:"foreign",clientId:"b",monthLabel:"November 2025",status:"uploaded"},{id:"permanent",clientId:"a",monthLabel:"",status:"filed",archiveScope:"permanent" as const},{id:"annual",clientId:"a",monthLabel:"",status:"filed",archiveScope:"annual" as const,archiveYear:2026}];
beforeEach(()=>{vi.mocked(apiGetJson).mockReset();vi.mocked(apiGetJson).mockImplementation(async path=>path.includes("/profiles/")?{clientId:"a",financialYearEndMonth:2,updatedAtUtc:"2026-11-18T00:00:00Z"}:[]);});
it("starts with clients and scopes a March–February financial archive without mixing clients",async()=>{
 const selection=vi.fn();render(<FinancialArchiveExplorer records={records} clients={[{id:"a",name:"Business A"},{id:"b",name:"Business B"}]} onSelection={selection}/>);
 expect(screen.queryByRole("button",{name:/^FY2026/})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole("button",{name:/^Business A/}));
 await screen.findByText("Financial year ends in February");
 fireEvent.click(screen.getByRole("button",{name:/^FY2026/}));
 expect(screen.getByRole("button",{name:/^March 2025/})).toBeInTheDocument();
 expect(screen.getByRole("button",{name:/^February 2026/})).toBeInTheDocument();
 fireEvent.click(screen.getByRole("button",{name:/^November 2025/}));
 await waitFor(()=>expect(selection).toHaveBeenLastCalledWith({clientId:"a",leaf:true,ids:["nov"]}));
 expect(await screen.findByText("No monthly requirements configured for this period.")).toBeInTheDocument();
});
it("keeps permanent and annual records out of monthly folders",async()=>{
 const selection=vi.fn();render(<FinancialArchiveExplorer records={records} clients={[{id:"a",name:"Business A"}]} fixedClientId="a" onSelection={selection}/>);
 await screen.findByText("Financial year ends in February");
 fireEvent.click(screen.getByRole("button",{name:/^Permanent records/}));
 await waitFor(()=>expect(selection).toHaveBeenLastCalledWith({clientId:"a",leaf:true,ids:["permanent"]}));
 fireEvent.click(screen.getByRole("button",{name:"Financial records"}));
 fireEvent.click(screen.getByRole("button",{name:/^FY2026/}));
 fireEvent.click(screen.getByRole("button",{name:/^Annual financial records/}));
 await waitFor(()=>expect(selection).toHaveBeenLastCalledWith({clientId:"a",leaf:true,ids:["annual"]}));
});
