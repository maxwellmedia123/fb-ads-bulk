import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET = process.env.R2_BUCKET || "fb-ads-library";

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export interface UploadResult {
  url: string;
  key: string;
  bucket: string;
}

/**
 * Upload a file to R2 storage
 * @param buffer - File buffer
 * @param key - Storage key (path)
 * @param contentType - MIME type
 * @returns Upload result with presigned URL
 */
export async function uploadToR2(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<UploadResult> {
  try {
    console.log(`Uploading ${key} to R2...`);
    console.log(`   Bucket: ${R2_BUCKET}`);
    console.log(`   Account ID: ${R2_ACCOUNT_ID}`);
    console.log(`   Size: ${Math.round(buffer.length / 1024)} KB`);
    console.log(`   Has Access Key: ${!!R2_ACCESS_KEY_ID}`);
    console.log(`   Has Secret Key: ${!!R2_SECRET_ACCESS_KEY}`);

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await r2Client.send(command);

    // Generate public URL if R2_PUBLIC_URL is set, otherwise use presigned
    const publicUrl = process.env.R2_PUBLIC_URL
      ? `${process.env.R2_PUBLIC_URL}/${key}`
      : await getPresignedUrl(key);

    console.log(`Uploaded to R2: ${key}`);

    return {
      url: publicUrl,
      key: key,
      bucket: R2_BUCKET,
    };
  } catch (error) {
    console.error("Error uploading to R2:", error);
    console.error("Bucket:", R2_BUCKET);
    console.error("Account ID:", R2_ACCOUNT_ID);
    throw error;
  }
}

/**
 * Upload a base64-encoded file to R2
 * @param base64Data - Base64 string (with or without data URI prefix)
 * @param key - Storage key
 * @param contentType - MIME type
 */
export async function uploadBase64ToR2(
  base64Data: string,
  key: string,
  contentType: string
): Promise<UploadResult> {
  // Remove data URI prefix if present
  const cleanBase64 = base64Data.startsWith("data:")
    ? base64Data.split(",")[1]
    : base64Data;

  const buffer = Buffer.from(cleanBase64, "base64");
  return uploadToR2(buffer, key, contentType);
}

/**
 * Generate a presigned URL for accessing a file in R2
 * @param key - The R2 object key
 * @param expiresIn - URL expiration time in seconds (default: 7 days)
 */
export async function getPresignedUrl(
  key: string,
  expiresIn: number = 604800
): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    });

    const presignedUrl = await getSignedUrl(r2Client, command, { expiresIn });
    return presignedUrl;
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    throw error;
  }
}

/**
 * Generate a presigned URL for uploading a file directly to R2
 * @param key - The R2 object key
 * @param contentType - MIME type of the file
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  try {
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const presignedUrl = await getSignedUrl(r2Client, command, { expiresIn });
    return presignedUrl;
  } catch (error) {
    console.error("Error generating presigned upload URL:", error);
    throw error;
  }
}

/**
 * Get a file from R2
 */
export async function getFromR2(key: string): Promise<Buffer | null> {
  try {
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    });

    const response = await r2Client.send(command);

    if (!response.Body) {
      return null;
    }

    const bytes = await response.Body.transformToByteArray();
    return Buffer.from(bytes);
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "NoSuchKey"
    ) {
      return null;
    }
    throw error;
  }
}

export interface ListedFile {
  key: string;
  url: string;
  lastModified: string;
  size: number;
}

/**
 * List files in R2 with optional prefix
 */
export async function listFilesFromR2(prefix?: string): Promise<ListedFile[]> {
  try {
    const command = new ListObjectsV2Command({
      Bucket: R2_BUCKET,
      Prefix: prefix,
    });

    const response = await r2Client.send(command);

    if (!response.Contents || response.Contents.length === 0) {
      return [];
    }

    const files = await Promise.all(
      response.Contents.map(async (object) => {
        if (!object.Key) return null;

        const presignedUrl = await getPresignedUrl(object.Key);

        return {
          key: object.Key,
          url: presignedUrl,
          lastModified: object.LastModified?.toISOString() || "",
          size: object.Size || 0,
        };
      })
    );

    return files
      .filter((f): f is ListedFile => f !== null)
      .sort(
        (a, b) =>
          new Date(b.lastModified).getTime() -
          new Date(a.lastModified).getTime()
      );
  } catch (error) {
    console.error("Error listing files from R2:", error);
    throw error;
  }
}

/**
 * Delete files from R2
 */
export async function deleteFromR2(keys: string[]): Promise<number> {
  try {
    if (keys.length === 0) {
      return 0;
    }

    const command = new DeleteObjectsCommand({
      Bucket: R2_BUCKET,
      Delete: {
        Objects: keys.map((key) => ({ Key: key })),
        Quiet: false,
      },
    });

    const response = await r2Client.send(command);
    return response.Deleted?.length || 0;
  } catch (error) {
    console.error("Error deleting from R2:", error);
    throw error;
  }
}

// ============== MULTIPART UPLOAD FUNCTIONS ==============

/**
 * Initiate a multipart upload
 * @returns uploadId needed for subsequent part uploads
 */
export async function initiateMultipartUpload(
  key: string,
  contentType: string
): Promise<string> {
  const command = new CreateMultipartUploadCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const response = await r2Client.send(command);
  if (!response.UploadId) {
    throw new Error("Failed to initiate multipart upload");
  }
  return response.UploadId;
}

/**
 * Get a presigned URL for uploading a specific part
 */
export async function getPresignedPartUrl(
  key: string,
  uploadId: string,
  partNumber: number,
  expiresIn: number = 3600
): Promise<string> {
  const command = new UploadPartCommand({
    Bucket: R2_BUCKET,
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
  });

  return getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * Complete a multipart upload
 */
export async function completeMultipartUpload(
  key: string,
  uploadId: string,
  parts: { ETag: string; PartNumber: number }[]
): Promise<void> {
  const command = new CompleteMultipartUploadCommand({
    Bucket: R2_BUCKET,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: parts.sort((a, b) => a.PartNumber - b.PartNumber),
    },
  });

  await r2Client.send(command);
}

/**
 * Abort a multipart upload (cleanup on failure)
 */
export async function abortMultipartUpload(
  key: string,
  uploadId: string
): Promise<void> {
  const command = new AbortMultipartUploadCommand({
    Bucket: R2_BUCKET,
    Key: key,
    UploadId: uploadId,
  });

  await r2Client.send(command);
}

// ============== HELPER FUNCTIONS ==============

/**
 * Slugify a string for use in file paths
 */
function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 50); // Limit length
}

/**
 * Generate a key for a media file
 * Structure: {brand-slug}/{images|videos}/{filename}
 */
export function generateMediaKey(
  accountName: string,
  filename: string,
  type: "images" | "videos"
): string {
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  const brandSlug = slugify(accountName) || "default";
  return `${brandSlug}/${type}/${sanitizedFilename}`;
}
