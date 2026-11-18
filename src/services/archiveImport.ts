export function suggestArchivePath(path: string) {
 const period=path.match(/(?<!\d)((?:19|20)\d{2})[/_ .-]+(0?[1-9]|1[0-2])(?!\d)/);
 const text=path.toLowerCase();
 const category=text.includes("bank")?"bank_statement":text.includes("receipt")?"receipts":text.includes("invoice")?"invoices":(text.includes("payroll")||text.includes("payslip"))?"payroll_summary":text.includes("tax")?"tax_working_papers":"general";
 return {year:period?Number(period[1]):null,month:period?Number(period[2]):null,category,sourcePath:path};
}
