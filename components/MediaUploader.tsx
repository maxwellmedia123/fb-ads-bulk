"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "./ui/Button";

interface MediaUploaderProps {
  accountId: string;
  initialFiles?: File[];
  onUploadComplete: () => void;
  onClose: () => void;
}

export function MediaUploader({
  accountId,
  initialFiles = [],
  onUploadComplete,
  onClose,
}: MediaUploaderProps) {
  const [files, setFiles] = useState<File[]>(initialFiles);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [byteProgress, setByteProgress] = useState<{ loaded: number; total: number } | null>(null);

  // Handle initial files from drag-drop on page
  useEffect(() => {
    if (initialFiles.length > 0) {
      setFiles(initialFiles);
    }
  }, [initialFiles]);

  // Get name from filename (without extension)
  const getNameFromFile = (file: File): string => {
    return file.name.replace(/\.[^/.]+$/, "");
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (file) =>
        file.type.startsWith("image/") || file.type.startsWith("video/")
    );

    if (droppedFiles.length > 0) {
      setFiles(droppedFiles);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(selectedFiles);
  };

  // Threshold for multipart uploads (10MB)
  const MULTIPART_THRESHOLD = 10 * 1024 * 1024;
  // Number of concurrent chunk uploads
  const CONCURRENT_UPLOADS = 8;

  // Track progress across all chunks
  const chunkProgressRef = { current: new Map<number, number>() };

  // Upload a single chunk and return ETag
  const uploadChunk = (
    url: string,
    chunk: Blob,
    partNumber: number,
    totalSize: number
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          chunkProgressRef.current.set(partNumber, event.loaded);

          // Sum all chunk progress
          let totalLoaded = 0;
          chunkProgressRef.current.forEach((loaded) => {
            totalLoaded += loaded;
          });

          setByteProgress({ loaded: totalLoaded, total: totalSize });
          const percent = Math.round((totalLoaded / totalSize) * 100);
          const loadedMB = (totalLoaded / 1024 / 1024).toFixed(1);
          const totalMB = (totalSize / 1024 / 1024).toFixed(1);
          setUploadStatus(`Uploading: ${loadedMB}MB / ${totalMB}MB (${percent}%) - ${CONCURRENT_UPLOADS} parallel streams`);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Get ETag from response headers (needed for completing multipart upload)
          const etag = xhr.getResponseHeader("ETag");
          console.log(`[Chunk ${partNumber}] Complete! ETag: ${etag}`);
          resolve(etag || "");
        } else {
          console.error(`[Chunk ${partNumber}] Failed! Status: ${xhr.status}`);
          reject(new Error(`Chunk ${partNumber} failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener("error", () => {
        console.error(`[Chunk ${partNumber}] Network error`);
        reject(new Error(`Network error uploading chunk ${partNumber}`));
      });

      xhr.addEventListener("timeout", () => {
        console.error(`[Chunk ${partNumber}] Timeout`);
        reject(new Error(`Chunk ${partNumber} timed out`));
      });

      xhr.open("PUT", url);
      xhr.timeout = 300000; // 5 minute timeout per chunk
      xhr.send(chunk);
    });
  };

  // Upload file using multipart (chunked, parallel)
  const uploadMultipart = async (file: File, accountId: string): Promise<void> => {
    console.log(`[Multipart] Starting multipart upload for ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`);

    // Reset chunk progress tracking
    chunkProgressRef.current.clear();

    // Step 1: Start multipart upload
    setUploadStatus(`Starting multipart upload for ${file.name}...`);
    const startResponse = await fetch("/api/media/multipart/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId,
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
      }),
    });

    if (!startResponse.ok) {
      const data = await startResponse.json();
      throw new Error(data.error || "Failed to start multipart upload");
    }

    const { uploadId, r2Key, type, partUrls, chunkSize } = await startResponse.json();
    console.log(`[Multipart] Got ${partUrls.length} part URLs, chunk size: ${chunkSize / 1024 / 1024}MB`);

    // Step 2: Upload chunks in parallel
    const parts: { ETag: string; PartNumber: number }[] = [];
    const uploadQueue = [...partUrls];
    const inProgress: Promise<void>[] = [];

    const processChunk = async (partInfo: { partNumber: number; url: string }) => {
      const start = (partInfo.partNumber - 1) * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);

      console.log(`[Multipart] Uploading part ${partInfo.partNumber} (${(chunk.size / 1024 / 1024).toFixed(1)}MB)`);

      const etag = await uploadChunk(partInfo.url, chunk, partInfo.partNumber, file.size);
      parts.push({ ETag: etag, PartNumber: partInfo.partNumber });
    };

    // Process chunks with concurrency limit
    while (uploadQueue.length > 0 || inProgress.length > 0) {
      // Start new uploads up to concurrency limit
      while (inProgress.length < CONCURRENT_UPLOADS && uploadQueue.length > 0) {
        const partInfo = uploadQueue.shift()!;
        const promise = processChunk(partInfo).then(() => {
          const index = inProgress.indexOf(promise);
          if (index > -1) inProgress.splice(index, 1);
        });
        inProgress.push(promise);
      }

      // Wait for at least one to complete
      if (inProgress.length > 0) {
        await Promise.race(inProgress);
      }
    }

    console.log(`[Multipart] All ${parts.length} parts uploaded`);

    // Step 3: Complete multipart upload
    setUploadStatus(`Completing upload for ${file.name}...`);
    const completeResponse = await fetch("/api/media/multipart/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId,
        r2Key,
        uploadId,
        parts,
        name: getNameFromFile(file),
        type,
        contentType: file.type,
        fileSize: file.size,
      }),
    });

    if (!completeResponse.ok) {
      const data = await completeResponse.json();
      throw new Error(data.error || "Failed to complete multipart upload");
    }

    console.log(`[Multipart] Upload complete!`);
  };

  // Upload small file directly (single PUT)
  const uploadDirect = async (file: File, accountId: string): Promise<void> => {
    // Get presigned upload URL
    const urlResponse = await fetch("/api/media/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId,
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
      }),
    });

    if (!urlResponse.ok) {
      const data = await urlResponse.json();
      throw new Error(data.error || `Failed to get upload URL for ${file.name}`);
    }

    const { uploadUrl, r2Key, type } = await urlResponse.json();

    // Upload directly
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          setByteProgress({ loaded: event.loaded, total: event.total });
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadStatus(`Uploading: ${(event.loaded / 1024 / 1024).toFixed(1)}MB / ${(event.total / 1024 / 1024).toFixed(1)}MB (${percent}%)`);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Upload failed with status ${xhr.status}`));
      });

      xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
      xhr.addEventListener("timeout", () => reject(new Error("Upload timed out")));

      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.timeout = 600000;
      xhr.send(file);
    });

    // Complete upload
    const completeResponse = await fetch("/api/media/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId,
        r2Key,
        name: getNameFromFile(file),
        type,
        contentType: file.type,
        fileSize: file.size,
      }),
    });

    if (!completeResponse.ok) {
      const data = await completeResponse.json();
      throw new Error(data.error || `Failed to complete upload for ${file.name}`);
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError("Please select at least one file");
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress({ current: 0, total: files.length });
    setByteProgress(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress({ current: i + 1, total: files.length });
        setByteProgress(null);

        const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);
        const useMultipart = file.size > MULTIPART_THRESHOLD;

        console.log(`\n========== Uploading file ${i + 1}/${files.length}: ${file.name} (${fileSizeMB}MB) ==========`);
        console.log(`Using ${useMultipart ? "MULTIPART" : "DIRECT"} upload`);

        const startTime = Date.now();

        if (useMultipart) {
          // Large file: use multipart upload with parallel chunks
          await uploadMultipart(file, accountId);
        } else {
          // Small file: direct upload
          setUploadStatus(`Uploading ${file.name}...`);
          await uploadDirect(file, accountId);
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        const speed = (file.size / 1024 / 1024 / parseFloat(duration)).toFixed(1);
        console.log(`========== File ${file.name} completed in ${duration}s (${speed} MB/s) ==========\n`);
      }

      setUploadStatus("All uploads complete!");
      onUploadComplete();
    } catch (err) {
      console.error(`[Upload Error]`, err);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      setByteProgress(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"}
          ${files.length > 0 ? "bg-gray-50" : ""}
        `}
      >
        {files.length > 0 ? (
          <div className="space-y-3">
            <div className="text-sm font-medium text-gray-900">
              {files.length} file(s) selected
            </div>
            <div className="max-h-48 overflow-y-auto">
              <div className="flex flex-wrap gap-2 justify-center">
                {files.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-2 bg-white border rounded text-sm"
                  >
                    {file.type.startsWith("video/") ? (
                      <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                    <span className="truncate max-w-[150px]">{getNameFromFile(file)}</span>
                    <span className="text-gray-400 text-xs">
                      ({(file.size / 1024 / 1024).toFixed(1)} MB)
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => setFiles([])}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Clear selection
            </button>
          </div>
        ) : (
          <>
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-600">
              Drag and drop images or videos here, or
            </p>
            <label className="mt-2 inline-block">
              <span className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm cursor-pointer hover:bg-gray-50">
                Browse files
              </span>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
            <p className="mt-3 text-xs text-gray-500">
              Files will be named automatically based on their filename
            </p>
          </>
        )}
      </div>

      {/* Upload Progress */}
      {uploadProgress && (
        <div className="bg-blue-50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-700">
              File {uploadProgress.current} / {uploadProgress.total}
            </span>
          </div>

          {/* Status message */}
          {uploadStatus && (
            <div className="text-xs text-blue-600 font-mono bg-blue-100 p-2 rounded">
              {uploadStatus}
            </div>
          )}

          {/* Byte progress bar for current file */}
          {byteProgress && (
            <div>
              <div className="flex justify-between text-xs text-blue-600 mb-1">
                <span>{(byteProgress.loaded / 1024 / 1024).toFixed(1)} MB</span>
                <span>{(byteProgress.total / 1024 / 1024).toFixed(1)} MB</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-150"
                  style={{ width: `${(byteProgress.loaded / byteProgress.total) * 100}%` }}
                />
              </div>
              <div className="text-center text-xs text-blue-600 mt-1">
                {Math.round((byteProgress.loaded / byteProgress.total) * 100)}%
              </div>
            </div>
          )}

          {/* Overall file progress */}
          <div className="text-xs text-gray-500">
            Overall: {uploadProgress.current} of {uploadProgress.total} files
          </div>
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="secondary" onClick={onClose} disabled={isUploading}>
          Cancel
        </Button>
        <Button
          onClick={handleUpload}
          isLoading={isUploading}
          disabled={files.length === 0}
        >
          Upload {files.length > 0 ? `(${files.length})` : ""}
        </Button>
      </div>
    </div>
  );
}
