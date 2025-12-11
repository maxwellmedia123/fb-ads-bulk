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

  const handleUpload = async () => {
    if (files.length === 0) {
      setError("Please select at least one file");
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress({ current: 0, total: files.length });

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress({ current: i + 1, total: files.length });

        const formData = new FormData();
        formData.append("file", file);
        formData.append("accountId", accountId);
        formData.append("name", getNameFromFile(file));
        formData.append("tags", ""); // No tags

        const response = await fetch("/api/media", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || `Upload failed for ${file.name}`);
        }
      }

      onUploadComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
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
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-700">
              Uploading...
            </span>
            <span className="text-sm text-blue-600">
              {uploadProgress.current} / {uploadProgress.total}
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
            />
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
