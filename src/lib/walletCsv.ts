// src/lib/walletCsv.ts
//
// "Download" on the Transactions page: the list as it is currently filtered, as a CSV that opens cleanly in
// Excel / Sheets. Text columns are guarded against spreadsheet formula injection (a reference or label that
// starts with = + - @ would otherwise be evaluated as a formula when the file is opened).
import { txnMeta, statusMeta } from "./walletTxn";

interface TxnRow {
  created_at: string;
  type: string;
  amount: number | string;
  balance_after?: number | string | null;
  status: string;
  reference?: string | null;
}

function textCell(value: string): string {
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function buildTransactionsCsv(rows: TxnRow[]): string {
  const header = ["Date", "Time", "Category", "Amount (USD)", "Status", "Balance after (USD)", "Reference"];
  const lines = rows.map((t) => {
    const d = new Date(t.created_at);
    return [
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`,
      textCell(txnMeta(t.type).label),
      Number(t.amount).toFixed(2),
      textCell(statusMeta(t.status).label),
      t.balance_after === null || t.balance_after === undefined ? "" : Number(t.balance_after).toFixed(2),
      textCell(t.reference ?? ""),
    ].join(",");
  });
  // BOM so Excel reads it as UTF-8.
  return "\uFEFF" + [header.join(","), ...lines].join("\r\n");
}

export function downloadTextFile(filename: string, text: string, mime = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
