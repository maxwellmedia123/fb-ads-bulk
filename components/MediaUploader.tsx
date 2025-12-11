"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";

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
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle initial files from drag-drop on page
  useEffect(() => {
    if (initialFiles.length > 0) {
      setFiles(initialFiles);
      setName(initialFiles[0].name.replace(/\.[^/.]+$/, ""));
    }
  }, [initialFiles]);

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
      // Auto-generate name from first file
      if (!name) {
        setName(droppedFiles[0].name.replace(/\.[^/.]+$/, ""));
      }
    }
  }, [name]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(selectedFiles);
    if (selectedFiles.length > 0 && !name) {
      setName(selectedFiles[0].name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleUpload = async () => {
    if (files.length === 0 || !name) {
      setError("Please select a file and provide a name");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("accountId", accountId);
        formData.append("name", files.length > 1 ? `${name}-${file.name}` : name);
        formData.append("tags", tags);

        const response = await fetch("/api/media", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Upload failed");
        }
      }

      onUploadComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
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
          <div className="space-y-2">
            <div className="text-sm text-gray-600">
              {files.length} file(s) selected
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {files.map((file, i) => (
                <div
                  key={i}
                  className="px-3 py-1 bg-white border rounded text-sm"
                >
                  {file.name}
                </div>
              ))}
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
          </>
        )}
      </div>

      {/* Name and Tags */}
      <Input
        label="Name (for search)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g., Summer Campaign Hero Image"
      />

      <Input
        label="Tags (comma-separated)"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="e.g., summer, hero, product"
        helpText="Add tags to help find this media later"
      />

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleUpload}
          isLoading={isUploading}
          disabled={files.length === 0 || !name}
        >
          Upload {files.length > 0 ? `(${files.length})` : ""}
        </Button>
      </div>
    </div>
  );
}
