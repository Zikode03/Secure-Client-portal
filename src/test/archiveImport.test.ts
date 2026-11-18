import {expect,it} from "vitest";
import {suggestArchivePath} from "../services/archiveImport";
it("suggests historical month and type without inventing missing periods",()=>{
 expect(suggestArchivePath("2005/03/Bank Statements/statement.pdf")).toMatchObject({year:2005,month:3,category:"bank_statement"});
 expect(suggestArchivePath("2018/Receipt_RCPT-INV-2018-08-A.pdf")).toMatchObject({year:2018,month:8,category:"receipts"});
 expect(suggestArchivePath("2018/Payslip_2018-01.pdf")).toMatchObject({year:2018,month:1,category:"payroll_summary"});
 expect(suggestArchivePath("profile.pdf").year).toBeNull();
});
