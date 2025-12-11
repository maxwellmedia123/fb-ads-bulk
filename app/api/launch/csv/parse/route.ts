import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { parseCSV, validateCSVRows } from "@/lib/csv-parser";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const csvContent = await file.text();
    const rows = parseCSV(csvContent);
    const validation = validateCSVRows(rows);

    return NextResponse.json({
      rows,
      validation: {
        validCount: validation.valid.length,
        invalidCount: validation.invalid.length,
        totalErrors: validation.totalErrors,
        totalWarnings: validation.totalWarnings,
      },
    });
  } catch (error) {
    console.error("Error parsing CSV:", error);
    return NextResponse.json(
      { error: "Failed to parse CSV" },
      { status: 500 }
    );
  }
}
