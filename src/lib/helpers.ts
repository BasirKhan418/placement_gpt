// utils/helpers.ts
export function sanitizeColumnName(name: string): string {
  let clean = name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
  if (/^\d/.test(clean)) {
    clean = "col_" + clean; // prefix if starts with digit
  }
  return clean;
}
