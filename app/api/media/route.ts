import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { uploadToR2, generateMediaKey, deleteFromR2 } from "@/lib/r2";

// GET - Fetch media assets for the active account
export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("accountId");
  const search = searchParams.get("search");
  const type = searchParams.get("type");

  if (!accountId) {
    return NextResponse.json(
      { error: "Account ID required" },
      { status: 400 }
    );
  }

  try {
    const where: {
      adAccountId: string;
      name?: { contains: string; mode: "insensitive" };
      type?: "IMAGE" | "VIDEO";
      OR?: { name?: { contains: string; mode: "insensitive" }; tags?: { has: string } }[];
    } = { adAccountId: accountId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { tags: { has: search.toLowerCase() } },
      ];
    }

    if (type === "IMAGE" || type === "VIDEO") {
      where.type = type;
    }

    const media = await prisma.mediaAsset.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ media });
  } catch (error) {
    console.error("Error fetching media:", error);
    return NextResponse.json(
      { error: "Failed to fetch media" },
      { status: 500 }
    );
  }
}

// POST - Upload new media
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const accountId = formData.get("accountId") as string;
    const name = formData.get("name") as string;
    const tagsString = formData.get("tags") as string;

    if (!file || !accountId || !name) {
      return NextResponse.json(
        { error: "File, account ID, and name are required" },
        { status: 400 }
      );
    }

    // Verify account exists
    const account = await prisma.adAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    // Determine media type
    const isVideo = file.type.startsWith("video/");
    const type = isVideo ? "VIDEO" : "IMAGE";

    // Generate R2 key
    const r2Key = generateMediaKey(
      accountId,
      file.name,
      isVideo ? "videos" : "images"
    );

    // Upload to R2
    const buffer = Buffer.from(await file.arrayBuffer());
    const { url } = await uploadToR2(buffer, r2Key, file.type);

    // Parse tags
    const tags = tagsString
      ? tagsString.split(",").map((t) => t.trim().toLowerCase())
      : [];

    // Save to database
    const mediaAsset = await prisma.mediaAsset.create({
      data: {
        adAccountId: accountId,
        name,
        tags,
        type,
        r2Key,
        r2Url: url,
        mimeType: file.type,
        fileSizeBytes: file.size,
      },
    });

    return NextResponse.json({ media: mediaAsset });
  } catch (error) {
    console.error("Error uploading media:", error);
    return NextResponse.json(
      { error: "Failed to upload media" },
      { status: 500 }
    );
  }
}

// DELETE - Delete media asset
export async function DELETE(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Media ID required" }, { status: 400 });
  }

  try {
    const media = await prisma.mediaAsset.findUnique({
      where: { id },
    });

    if (!media) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    // Delete from R2
    await deleteFromR2([media.r2Key]);

    // Delete from database
    await prisma.mediaAsset.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting media:", error);
    return NextResponse.json(
      { error: "Failed to delete media" },
      { status: 500 }
    );
  }
}
