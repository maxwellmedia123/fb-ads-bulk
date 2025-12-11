"use client";

import { useEffect, useState } from "react";
import { useAccount } from "@/lib/context/AccountContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { MediaUploader } from "@/components/MediaUploader";

interface MediaAsset {
  id: string;
  name: string;
  type: "IMAGE" | "VIDEO";
  r2Url: string;
  tags: string[];
  createdAt: string;
  fileSizeBytes?: number;
}

export default function MediaPage() {
  const { activeAccount } = useAccount();
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | "IMAGE" | "VIDEO">("");
  const [showUploader, setShowUploader] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaAsset | null>(null);

  useEffect(() => {
    if (activeAccount) {
      fetchMedia();
    }
  }, [activeAccount, search, typeFilter]);

  const fetchMedia = async () => {
    if (!activeAccount) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({ accountId: activeAccount.id });
      if (search) params.append("search", search);
      if (typeFilter) params.append("type", typeFilter);

      const response = await fetch(`/api/media?${params}`);
      if (response.ok) {
        const data = await response.json();
        setMedia(data.media || []);
      }
    } catch (error) {
      console.error("Error fetching media:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this media?")) return;

    try {
      const response = await fetch(`/api/media?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setMedia(media.filter((m) => m.id !== id));
        setSelectedMedia(null);
      }
    } catch (error) {
      console.error("Error deleting media:", error);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown size";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  if (!activeAccount) {
    return (
      <Card>
        <div className="text-center py-12">
          <p className="text-gray-500">
            Please select an ad account to view media
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Media Library</h1>
          <p className="text-gray-600 mt-1">
            Upload and manage images and videos for your ads
          </p>
        </div>
        <Button onClick={() => setShowUploader(true)}>
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Upload Media
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by name or tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as "" | "IMAGE" | "VIDEO")}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">All Types</option>
          <option value="IMAGE">Images</option>
          <option value="VIDEO">Videos</option>
        </select>
      </div>

      {/* Media Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading media...</div>
      ) : media.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No media uploaded yet
            </h3>
            <p className="text-gray-500 mb-6">
              Upload images and videos to use in your ads
            </p>
            <Button onClick={() => setShowUploader(true)}>Upload Media</Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {media.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedMedia(item)}
              className="group relative bg-white rounded-lg border border-gray-200 overflow-hidden cursor-pointer hover:border-blue-500 hover:shadow-md transition-all"
            >
              {/* Thumbnail */}
              <div className="aspect-square bg-gray-100 relative">
                {item.type === "IMAGE" ? (
                  <img
                    src={item.r2Url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg
                      className="w-12 h-12 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                )}

                {/* Type badge */}
                <div className="absolute top-2 left-2">
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded ${
                      item.type === "VIDEO"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {item.type}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="p-3">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {item.name}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(item.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <Modal
        isOpen={showUploader}
        onClose={() => setShowUploader(false)}
        title="Upload Media"
        size="lg"
      >
        <MediaUploader
          accountId={activeAccount.id}
          onUploadComplete={() => {
            setShowUploader(false);
            fetchMedia();
          }}
          onClose={() => setShowUploader(false)}
        />
      </Modal>

      {/* Media Detail Modal */}
      <Modal
        isOpen={!!selectedMedia}
        onClose={() => setSelectedMedia(null)}
        title={selectedMedia?.name || "Media Details"}
        size="lg"
      >
        {selectedMedia && (
          <div className="space-y-4">
            {/* Preview */}
            <div className="bg-gray-100 rounded-lg overflow-hidden">
              {selectedMedia.type === "IMAGE" ? (
                <img
                  src={selectedMedia.r2Url}
                  alt={selectedMedia.name}
                  className="w-full max-h-96 object-contain"
                />
              ) : (
                <video
                  src={selectedMedia.r2Url}
                  controls
                  className="w-full max-h-96"
                />
              )}
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Type</p>
                <p className="font-medium">{selectedMedia.type}</p>
              </div>
              <div>
                <p className="text-gray-500">Size</p>
                <p className="font-medium">
                  {formatFileSize(selectedMedia.fileSizeBytes)}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Uploaded</p>
                <p className="font-medium">
                  {new Date(selectedMedia.createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Tags</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedMedia.tags.length > 0 ? (
                    selectedMedia.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded"
                      >
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400">No tags</span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="danger"
                onClick={() => handleDelete(selectedMedia.id)}
              >
                Delete
              </Button>
              <Button variant="secondary" onClick={() => setSelectedMedia(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
