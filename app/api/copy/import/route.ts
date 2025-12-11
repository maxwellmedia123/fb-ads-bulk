import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import Papa from "papaparse";

interface CSVRow {
  Name?: string;
  "Primary Text 1"?: string;
  "Primary Text 2"?: string;
  "Primary Text 3"?: string;
  "Primary Text 4"?: string;
  "Primary Text 5"?: string;
  "Headline 1"?: string;
  "Headline 2"?: string;
  "Headline 3"?: string;
  "Headline 4"?: string;
  "Headline 5"?: string;
  Description?: string;
  Link?: string;
  "Display Link"?: string;
  "UTM Parameters"?: string;
  CTA?: string;
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const accountId = formData.get("accountId") as string;

    if (!file || !accountId) {
      return NextResponse.json(
        { error: "File and account ID required" },
        { status: 400 }
      );
    }

    // Verify account exists
    const account = await prisma.adAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Parse CSV
    const csvText = await file.text();
    const result = Papa.parse<CSVRow>(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    if (result.errors.length > 0) {
      return NextResponse.json(
        { error: `CSV parsing error: ${result.errors[0].message}` },
        { status: 400 }
      );
    }

    let imported = 0;
    let failed = 0;

    for (const row of result.data) {
      // Validate required fields
      const name = row.Name?.trim();
      const primaryText1 = row["Primary Text 1"]?.trim();
      const headline1 = row["Headline 1"]?.trim();
      const link = row.Link?.trim();

      if (!name || !primaryText1 || !headline1 || !link) {
        failed++;
        continue;
      }

      try {
        await prisma.copyTemplate.create({
          data: {
            adAccountId: accountId,
            name,
            primaryText1,
            primaryText2: row["Primary Text 2"]?.trim() || null,
            primaryText3: row["Primary Text 3"]?.trim() || null,
            primaryText4: row["Primary Text 4"]?.trim() || null,
            primaryText5: row["Primary Text 5"]?.trim() || null,
            headline1,
            headline2: row["Headline 2"]?.trim() || null,
            headline3: row["Headline 3"]?.trim() || null,
            headline4: row["Headline 4"]?.trim() || null,
            headline5: row["Headline 5"]?.trim() || null,
            description: row.Description?.trim() || null,
            link,
            displayLink: row["Display Link"]?.trim() || null,
            utmParameters: row["UTM Parameters"]?.trim() || null,
            callToAction: row.CTA?.trim() || "LEARN_MORE",
          },
        });
        imported++;
      } catch (err) {
        console.error("Error creating template:", err);
        failed++;
      }
    }

    return NextResponse.json({ imported, failed });
  } catch (error) {
    console.error("Error importing templates:", error);
    return NextResponse.json(
      { error: "Failed to import templates" },
      { status: 500 }
    );
  }
}
