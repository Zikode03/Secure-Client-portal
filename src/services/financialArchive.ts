export type ArchiveScope="monthly"|"annual"|"permanent"|"uncertain";
export interface ArchiveRecord {id:string;clientId:string;monthLabel:string;status:string;archiveScope?:ArchiveScope;archiveYear?:number|null;archiveMonth?:number|null;typeLabel?:string;title?:string}
export const monthNames=Array.from({length:12},(_,index)=>new Intl.DateTimeFormat("en-ZA",{month:"long",timeZone:"UTC"}).format(new Date(Date.UTC(2020,index,1))));
export function recordPeriod(record:ArchiveRecord):{year:number;month:number}|null {
 if(record.archiveScope&&record.archiveScope!=="monthly")return null;
 if(record.archiveYear&&record.archiveMonth)return {year:record.archiveYear,month:record.archiveMonth};
 const year=record.monthLabel.match(/\b(\d{4})\b/)?.[1];
 const month=monthNames.findIndex(name=>record.monthLabel.toLowerCase().startsWith(name.toLowerCase()));
 return year&&month>=0?{year:Number(year),month:month+1}:null;
}
export function recordScope(record:ArchiveRecord):ArchiveScope {return record.archiveScope&&record.archiveScope!=="monthly"?record.archiveScope:recordPeriod(record)?"monthly":"uncertain";}
export function financialYear(year:number,month:number,endMonth:number){return year+(endMonth<12&&month>endMonth?1:0);}
export function financialMonths(endingYear:number,endMonth:number){return Array.from({length:12},(_,index)=>{const date=new Date(Date.UTC(endMonth===12?endingYear:endingYear-1,endMonth%12+index,1));return {year:date.getUTCFullYear(),month:date.getUTCMonth()+1};});}
export function financialRange(endingYear:number,endMonth:number){const months=financialMonths(endingYear,endMonth);return `${monthNames[months[0].month-1].slice(0,3)} ${months[0].year} – ${monthNames[months[11].month-1].slice(0,3)} ${months[11].year}`;}

export function archivePeriodLabel(record:{archiveScope?:string;archiveYear?:number|null;archiveMonth?:number|null},fallback:string){
 if(record.archiveScope==="permanent")return "Permanent records";
 if(record.archiveScope==="uncertain")return "Period needs checking";
 if(record.archiveScope==="annual"&&record.archiveYear)return `FY${record.archiveYear} · Annual records`;
 if(record.archiveYear&&record.archiveMonth)return `${monthNames[record.archiveMonth-1]} ${record.archiveYear}`;
 return fallback;
}
