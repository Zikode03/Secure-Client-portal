import {render,screen,within} from "@testing-library/react";
import {expect,it,vi} from "vitest";
import {MonthlyPackChecklist} from "../components/workflow/MonthlyPackChecklist";
import {recalculatePack} from "../services/workflowEngine";
import type {MonthlyPack} from "../types/portal";

it("shows exempt evidence without missing, accepted or upload actions",()=>{
 const pack=recalculatePack({monthLabel:"November 2026",dueDate:"2026-11-30",deadlineStatus:"on_track",progressPercent:0,completedCount:0,totalCount:0,canComplete:false,completionMessage:"",slots:[{id:"exempt",documentType:"Exempt requirement",description:"",status:"not_applicable",month:"November",year:2026,acceptedFiles:[],progress:0,autoName:"",isRequired:true}]} as MonthlyPack);
 render(<MonthlyPackChecklist pack={pack} onUpload={vi.fn()} />);
 expect(screen.getAllByText("Not applicable")).toHaveLength(2);
 expect(screen.getAllByText("Not required")).toHaveLength(2);
 expect(screen.queryByRole("button",{name:/upload/i})).not.toBeInTheDocument();
 const row=screen.getByRole("row",{name:/Exempt requirement/});
 expect(within(row).queryByText("Missing")).not.toBeInTheDocument();
 expect(within(row).queryByText("Accepted")).not.toBeInTheDocument();
 expect(pack.totalCount).toBe(0);
});
