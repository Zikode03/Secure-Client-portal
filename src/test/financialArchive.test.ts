import {expect,it} from "vitest";
import {financialYear,financialMonths,financialRange,recordPeriod,recordScope,archivePeriodLabel} from "../services/financialArchive";
it("uses each configured year-end and handles December without an off-by-one year",()=>{
 expect(financialYear(2026,3,2)).toBe(2027);expect(financialYear(2026,2,2)).toBe(2026);
 expect(financialRange(2026,2)).toBe("Mar 2025 – Feb 2026");
 expect(financialRange(2026,6)).toBe("Jul 2025 – Jun 2026");
 expect(financialRange(2026,12)).toBe("Jan 2026 – Dec 2026");
 expect(financialMonths(2026,2)).toHaveLength(12);
});
it("never treats upload dates as archive periods and honours explicit record sections",()=>{
 const record={id:"record",clientId:"client",status:"uploaded",monthLabel:"18 Nov 2026"};
 expect(recordPeriod(record)).toBeNull();expect(recordScope(record)).toBe("uncertain");
 expect(recordScope({...record,monthLabel:"March 2005",archiveScope:"permanent"})).toBe("permanent");
 expect(recordPeriod({...record,archiveScope:"monthly",archiveYear:2005,archiveMonth:3})).toEqual({year:2005,month:3});
 expect(archivePeriodLabel({archiveScope:"annual",archiveYear:2015},"March 2026")).toBe("FY2015 · Annual records");
});
