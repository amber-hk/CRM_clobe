/**
 * Minimal CSV helpers. Handles quoted fields with embedded commas/newlines.
 * Enough for marketing recipient lists; not a general-purpose CSV library.
 */

export type CsvData = { headers: string[]; rows: string[][] };

export function parseCsv(text: string): CsvData {
  const out: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let i = 0;
  let inQuotes = false;

  const push = () => {
    cur.push(field);
    field = "";
  };
  const endRow = () => {
    push();
    if (cur.some((x) => x !== "")) out.push(cur);
    cur = [];
  };

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i += 2;
        continue;
      }
      if (c === '"') {
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      push();
      i++;
      continue;
    }
    if (c === "\n") {
      endRow();
      i++;
      continue;
    }
    if (c === "\r") {
      i++;
      continue;
    }
    field += c;
    i++;
  }
  endRow();

  const [headers = [], ...rows] = out;
  return { headers: headers.map((h) => h.trim()), rows };
}

export function buildCsv(headers: string[], rows: string[][]): string {
  const escape = (v: string) =>
    /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  return [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
}

export function downloadCsv(filename: string, csv: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
