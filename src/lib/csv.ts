// Tiny CSV export helper. Browser-only.
export function toCSV<T extends Record<string, unknown>>(
  rows: T[],
  columns?: { key: keyof T; header?: string }[],
): string {
  if (!rows.length) return "";
  const cols =
    columns ??
    (Object.keys(rows[0]) as (keyof T)[]).map((k) => ({ key: k, header: String(k) }));
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = cols.map((c) => escape(c.header ?? String(c.key))).join(",");
  const body = rows
    .map((r) => cols.map((c) => escape(r[c.key])).join(","))
    .join("\n");
  return head + "\n" + body;
}

export function downloadCSV(filename: string, csv: string) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportRowsAsCSV<T extends Record<string, unknown>>(
  filename: string,
  rows: T[],
  columns?: { key: keyof T; header?: string }[],
) {
  downloadCSV(filename, toCSV(rows, columns));
}
