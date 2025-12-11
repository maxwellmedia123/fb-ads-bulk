"use client";

import { useEffect, useState } from "react";
import { useAccount } from "@/lib/context/AccountContext";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

interface MediaAsset {
  id: string;
  name: string;
  type: "IMAGE" | "VIDEO";
  r2Url: string;
}

interface LaunchedAd {
  id: string;
  fbAdId?: string;
  fbAdSetId: string;
  fbAdSetName?: string;
  customName?: string;
  primaryText: string;
  headline: string;
  description?: string;
  link: string;
  callToAction: string;
  status: "PENDING" | "LAUNCHED" | "FAILED" | "PAUSED";
  launchPaused: boolean;
  launchedAt?: string;
  errorMessage?: string;
  createdAt: string;
  media: MediaAsset[];
}

export default function AdsPage() {
  const { activeAccount } = useAccount();
  const [ads, setAds] = useState<LaunchedAd[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedAd, setSelectedAd] = useState<LaunchedAd | null>(null);
  const [pagination, setPagination] = useState<{
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  } | null>(null);

  useEffect(() => {
    if (activeAccount) {
      fetchAds();
    }
  }, [activeAccount, statusFilter]);

  const fetchAds = async (offset = 0) => {
    if (!activeAccount) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        accountId: activeAccount.id,
        offset: offset.toString(),
      });
      if (statusFilter) params.append("status", statusFilter);

      const response = await fetch(`/api/ads?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAds(data.ads || []);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Error fetching ads:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "LAUNCHED":
        return "bg-green-100 text-green-700";
      case "PENDING":
        return "bg-yellow-100 text-yellow-700";
      case "FAILED":
        return "bg-red-100 text-red-700";
      case "PAUSED":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (!activeAccount) {
    return (
      <Card>
        <div className="text-center py-12">
          <p className="text-gray-500">
            Please select an ad account to view ad history
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
          <h1 className="text-2xl font-bold text-gray-900">Ad History</h1>
          <p className="text-gray-600 mt-1">
            View and manage your launched ads
          </p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">All Status</option>
          <option value="LAUNCHED">Launched</option>
          <option value="PENDING">Pending</option>
          <option value="FAILED">Failed</option>
          <option value="PAUSED">Paused</option>
        </select>
      </div>

      {/* Ads List */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading ads...</div>
      ) : ads.length === 0 ? (
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
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No ads launched yet
            </h3>
            <p className="text-gray-500">
              Ads you launch will appear here
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {ads.map((ad) => (
            <Card
              key={ad.id}
              className="cursor-pointer hover:border-gray-300"
              onClick={() => setSelectedAd(ad)}
            >
              <div className="flex items-start gap-4">
                {/* Thumbnail */}
                <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {ad.media[0] ? (
                    ad.media[0].type === "IMAGE" ? (
                      <img
                        src={ad.media[0].r2Url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
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
                            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                          />
                        </svg>
                      </div>
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No media
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900 truncate">
                      {ad.customName || ad.headline}
                    </h3>
                    <span
                      className={`px-2 py-0.5 text-xs rounded ${getStatusColor(ad.status)}`}
                    >
                      {ad.status}
                    </span>
                    {ad.launchPaused && (
                      <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                        PAUSED
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {ad.primaryText}
                  </p>

                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>
                      {ad.launchedAt
                        ? `Launched ${new Date(ad.launchedAt).toLocaleString()}`
                        : `Created ${new Date(ad.createdAt).toLocaleString()}`}
                    </span>
                    {ad.fbAdId && <span>Ad ID: {ad.fbAdId}</span>}
                  </div>

                  {ad.status === "FAILED" && ad.errorMessage && (
                    <p className="text-xs text-red-600 mt-2">
                      Error: {ad.errorMessage}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Implement reuse
                    alert("Reuse functionality coming soon!");
                  }}
                >
                  Reuse
                </Button>
              </div>
            </Card>
          ))}

          {/* Pagination */}
          {pagination && pagination.hasMore && (
            <div className="text-center">
              <Button
                variant="secondary"
                onClick={() =>
                  fetchAds(pagination.offset + pagination.limit)
                }
              >
                Load More
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Ad Detail Modal */}
      <Modal
        isOpen={!!selectedAd}
        onClose={() => setSelectedAd(null)}
        title="Ad Details"
        size="lg"
      >
        {selectedAd && (
          <div className="space-y-4">
            {/* Media */}
            {selectedAd.media[0] && (
              <div className="bg-gray-100 rounded-lg overflow-hidden">
                {selectedAd.media[0].type === "IMAGE" ? (
                  <img
                    src={selectedAd.media[0].r2Url}
                    alt=""
                    className="w-full max-h-64 object-contain"
                  />
                ) : (
                  <video
                    src={selectedAd.media[0].r2Url}
                    controls
                    className="w-full max-h-64"
                  />
                )}
              </div>
            )}

            {/* Status */}
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 text-sm rounded ${getStatusColor(selectedAd.status)}`}
              >
                {selectedAd.status}
              </span>
              {selectedAd.fbAdId && (
                <span className="text-sm text-gray-500">
                  FB Ad ID: {selectedAd.fbAdId}
                </span>
              )}
            </div>

            {/* Copy */}
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">
                  Headline
                </p>
                <p className="text-gray-900">{selectedAd.headline}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">
                  Primary Text
                </p>
                <p className="text-gray-900 whitespace-pre-wrap">
                  {selectedAd.primaryText}
                </p>
              </div>

              {selectedAd.description && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">
                    Description
                  </p>
                  <p className="text-gray-900">{selectedAd.description}</p>
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">
                  Link
                </p>
                <a
                  href={selectedAd.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline break-all"
                >
                  {selectedAd.link}
                </a>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">
                  Call to Action
                </p>
                <p className="text-gray-900">
                  {selectedAd.callToAction.replace("_", " ")}
                </p>
              </div>
            </div>

            {/* Error */}
            {selectedAd.errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {selectedAd.errorMessage}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="secondary"
                onClick={() => setSelectedAd(null)}
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  // TODO: Implement reuse functionality
                  alert("Reuse functionality coming soon!");
                }}
              >
                Reuse Creative
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
