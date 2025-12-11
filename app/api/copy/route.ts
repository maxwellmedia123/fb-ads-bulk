import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// GET - Fetch copy templates for an account
export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("accountId");
  const id = searchParams.get("id");

  if (id) {
    // Fetch single template
    try {
      const template = await prisma.copyTemplate.findUnique({
        where: { id },
      });

      if (!template) {
        return NextResponse.json(
          { error: "Template not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ template });
    } catch (error) {
      console.error("Error fetching template:", error);
      return NextResponse.json(
        { error: "Failed to fetch template" },
        { status: 500 }
      );
    }
  }

  if (!accountId) {
    return NextResponse.json(
      { error: "Account ID required" },
      { status: 400 }
    );
  }

  try {
    const templates = await prisma.copyTemplate.findMany({
      where: { adAccountId: accountId },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

// POST - Create new copy template
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      accountId,
      name,
      primaryText1,
      primaryText2,
      primaryText3,
      primaryText4,
      primaryText5,
      headline1,
      headline2,
      headline3,
      headline4,
      headline5,
      description,
      link,
      displayLink,
      utmParameters,
      callToAction,
    } = body;

    if (!accountId || !name || !primaryText1 || !headline1 || !link) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const template = await prisma.copyTemplate.create({
      data: {
        adAccountId: accountId,
        name,
        primaryText1,
        primaryText2,
        primaryText3,
        primaryText4,
        primaryText5,
        headline1,
        headline2,
        headline3,
        headline4,
        headline5,
        description,
        link,
        displayLink,
        utmParameters,
        callToAction: callToAction || "LEARN_MORE",
      },
    });

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Error creating template:", error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}

// PUT - Update copy template
export async function PUT(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Template ID required" },
        { status: 400 }
      );
    }

    // Remove accountId from update data
    delete updateData.accountId;

    const template = await prisma.copyTemplate.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Error updating template:", error);
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    );
  }
}

// DELETE - Delete copy template
export async function DELETE(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Template ID required" },
      { status: 400 }
    );
  }

  try {
    await prisma.copyTemplate.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting template:", error);
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    );
  }
}
