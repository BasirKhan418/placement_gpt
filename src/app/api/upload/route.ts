import { openDb } from "@/lib/db";
import * as XLSX from "xlsx";
import { sanitizeColumnName } from "@/lib/helpers";

// Shape of a parsed row from Excel
export interface RowData {
  [key: string]: string | number | null; // Excel can contain different types
  silo: string;
}

export async function POST(req: Request): Promise<Response> {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return new Response("No file uploaded", { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Parse Excel workbook
  const workbook = XLSX.read(buffer, { type: "buffer" });

  const db = await openDb();

  await db.exec("DROP TABLE IF EXISTS placements");

  const allHeaders: Set<string> = new Set();
  const allRows: RowData[] = [];

  // Collect rows from all sheets except "Silo Information"
  for (const sheetName of workbook.SheetNames) {
    if (sheetName === "Silo Information") continue;

    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(
      workbook.Sheets[sheetName]
    );

    if (rows.length === 0) continue;

    rows.forEach((row) => {
      const rowData: RowData = { ...row, silo: sheetName };
      allRows.push(rowData);
      Object.keys(row).forEach((key) => allHeaders.add(key));
    });
  }

  // Build schema dynamically with sanitized names
  const headers: string[] = [...allHeaders];
  const sanitizedHeaders = headers.map(sanitizeColumnName);
  const cols = sanitizedHeaders.map((h) => `${h} TEXT`).join(", ");

  await db.exec(`
    CREATE TABLE IF NOT EXISTS placements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ${cols},
      silo TEXT
    )
  `);

  // Insert data
  for (const row of allRows) {
    const values = headers.map((h) => row[h] ?? null);

    await db.run(
      `INSERT INTO placements (${sanitizedHeaders.join(", ")}, silo) VALUES (${sanitizedHeaders
        .map(() => "?")
        .join(", ")}, ?)`,
      [...values, row.silo]
    );
  }

  return Response.json({
    message: "Excel imported successfully",
    rows: allRows.length,
  });
}

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const silo = searchParams.get("silo"); // optional filter

  const db = await openDb();

  let rows: RowData[];
  if (silo) {
    rows = await db.all("SELECT * FROM placements WHERE silo = ?", [silo]);
  } else {
    rows = await db.all("SELECT * FROM placements");
  }

  return Response.json({success: true, long: rows.length, data: rows});
}
