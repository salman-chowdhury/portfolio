import fs from "node:fs/promises";
import path from "node:path";
import { Workbook, SpreadsheetFile } from "@oai/artifact-tool";

const [, , input, output] = process.argv;
const data = JSON.parse(await fs.readFile(input, "utf8"));
const book = Workbook.create();
const summary = book.worksheets.add("Job Report");
const ledger = book.worksheets.add("Clean Entries");
const audit = book.worksheets.add("Reconciliation");
const sampleLabel = "Synthetic electrical contractor demo";
const money = '#,##0.00;[Red](#,##0.00);0.00';

function layout(sheet, widths, end, headings, title, note) {
  sheet.showGridLines = false;
  const last = String.fromCharCode(64 + widths.length);
  const area = sheet.getRange(`A1:${last}${end}`);
  area.format.font = { name: "Arial", size: 12, color: "#14283A" };
  area.format.rowHeight = 24;
  area.format.verticalAlignment = "center";
  widths.forEach((width, i) => sheet.getCell(0, i).format.columnWidthPx = width);
  sheet.getRange("A2").values = [[title]];
  sheet.getRange("A2").format.font = { name: "Arial", size: 18, bold: true, color: "#102D43" };
  sheet.getRange("A3").values = [[note]];
  sheet.getRange("A3").format.font = { name: "Arial", size: 11, italic: true, color: "#435D70" };
  const header = sheet.getRange(`A5:${last}5`);
  header.values = [headings];
  header.format.fill = "#17354B";
  header.format.font = { name: "Arial", size: 12, bold: true, color: "#FFFFFF" };
  header.format.horizontalAlignment = "center";
  header.format.rowHeight = 30;
}

const jobs = [...new Set(data.rows.map(row => row[1]))].sort();
const ledgerEnd = 5 + Math.max(1, data.rows.length);
const totalRow = 6 + jobs.length;
layout(summary,[125,145,135,140,155,145,185], totalRow + 3,
       ["Job", "Invoiced AUD", "Labour AUD", "Materials AUD", "Subcontract AUD", "Total cost AUD", "Job contribution AUD"],
       "Weekly electrical job report", `${sampleLabel}  ·  ${data.period.join(" to ")}`);
layout(ledger,[120,110,125,130,135,200,100],ledgerEnd,
       ["Entry ID","Job","Entry date","Category","Amount AUD","Source file","Source line"],
       "Cleaned entries", "One transaction per entry ID. Source file and line retain the audit trail.");
if(data.rows.length) {
  const safe = v => typeof v === "string" && /^[=+\-@]/.test(v) ? "'" + v : v;
  ledger.getRange(`A6:G${ledgerEnd}`).values = data.rows.map(row => row.map(safe));
}
ledger.getRange(`E6:E${ledgerEnd}`).setNumberFormat(money);
ledger.freezePanes.freezeRows(5);

const range = col => `'Clean Entries'!$${col}$6:$${col}$${ledgerEnd}`;
for (const [i, job] of jobs.entries()) {
  const n = i + 6;
  summary.getRange(`A${n}`).values = [[/^[=+\-@]/.test(job) ? "'" + job : job]];
  summary.getRange(`B${n}:G${n}`).formulas = [[
    ...["Invoice","Labour","Materials","Subcontract"].map(type => `=SUMIFS(${range("E")},${range("B")},$A${n},${range("D")},"${type}")`),
    `=SUM(C${n}:E${n})`, `=B${n}-F${n}`]];
  if (i % 2 === 0) summary.getRange(`A${n}:G${n}`).format.fill = "#EEF4F7";
}
summary.getRange(`A${totalRow}`).values = [["Week total"]];
summary.getRange(`B${totalRow}:G${totalRow}`).formulas = [[
  ..."BCDEFG"].map(col => jobs.length ? `=SUM(${col}6:${col}${totalRow-1})` : "=0")];
summary.getRange(`B6:G${totalRow}`).setNumberFormat(money);
summary.getRange(`A${totalRow}:G${totalRow}`).format.fill = "#DFEEE9";
summary.getRange(`A${totalRow}:G${totalRow}`).format.font = {name:"Arial",size:12,bold:true,color:"#14283A"};
summary.getRange(`A${totalRow+2}`).values = [["Job contribution = invoiced less listed job costs, before overheads and GST."]];

const source = Object.entries(data.source_counts);
const exceptionHeader = 9 + source.length;
const end = Math.max(exceptionHeader + data.exceptions.length, exceptionHeader + 1);
layout(audit,[205,95,120,125,335,115],end,
       ["Source file","Input","Kept","Duplicates","Excluded","Difference"],
       "Import reconciliation", "Every source row is kept once, marked as a duplicate, or listed for review.");
for (const [i,[file,count]] of source.entries()) {
  const n = i + 6;
  const orphan = data.exceptions.filter(row=>row[0]===file);
  audit.getRange(`A${n}:E${n}`).values = [[file,count,data.rows.filter(row=>row[5]===file).length,
    orphan.filter(row=>row[3]==="Duplicate").length,orphan.filter(row=>row[3]==="Excluded").length]];
  audit.getRange(`F${n}`).formulas = [[`=B${n}-SUM(C${n}:E${n})`]];
}
const sum = source.length + 6;
audit.getRange(`A${sum}`).values = [["Total"]];
audit.getRange(`B${sum}:F${sum}`).formulas = [["B","C","D","E","F"].map(c=>source.length?`=SUM(${c}6:${c}${sum-1})`:"=0")];
audit.getRange(`A${sum}:F${sum}`).format.fill = "#DFEEE9";
const ex = audit.getRange(`A${exceptionHeader}:E${exceptionHeader}`);
ex.values = [["Source file","Line","Entry ID","Disposition","Reason"]];
ex.format.fill = "#17354B";
ex.format.font = {name:"Arial",size:12,bold:true,color:"#FFFFFF"};
if (data.exceptions.length) audit.getRange(`A${exceptionHeader+1}:E${end}`).values =
  data.exceptions.map(row=>row.map(v=>typeof v==="string"&&/^[=+\-@]/.test(v)?"'"+v:v));

book.recalculate();
const result = summary.getRange(`B${totalRow}:G${totalRow}`).values[0];
const expected = ["Invoice", "Labour", "Materials", "Subcontract"].map(type =>
  data.rows.filter(row=>row[3]===type).reduce((n,row)=>n+Math.round(row[4]*100),0));
const cost = expected.slice(1).reduce((a,b)=>a+b,0);
expected.push(cost,expected[0]-cost);
if(result.some((value,i)=>typeof value!=="number"||Math.round(value*100)!==expected[i])) throw Error("Job totals do not reconcile");
if(audit.getRange(`F${sum}`).values[0][0]!==0 ||
   Object.values(data.source_counts).reduce((a,b)=>a+b,0)!==data.rows.length+data.exceptions.length) throw Error("Input counts do not reconcile");
console.log(JSON.stringify({totals:result,counts:audit.getRange(`B${sum}:F${sum}`).values[0]}));
await fs.mkdir(output,{recursive:true});
for(const [sheet,range,name] of [[summary,`A1:G${totalRow+3}`,"job-report"],[ledger,`A1:G${ledgerEnd}`,"clean-entries"],[audit,`A1:F${end}`,"reconciliation"]]){
  const preview=await book.render({sheetName:sheet.name,range,scale:1.35,format:"png"});
  await fs.writeFile(path.join(output,name+".png"),new Uint8Array(await preview.arrayBuffer()));
}
const file=await SpreadsheetFile.exportXlsx(book);
await file.save(path.join(output,"Contractor_Weekly_Report.xlsx"));
