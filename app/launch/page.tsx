"use client";

import { useEffect, useState } from "react";
import { useAccount } from "@/lib/context/AccountContext";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import Link from "next/link";

interface AdSet {
  id: string;
  name: string;
  status: string;
  campaign: { id: string; name: string };
  created_time?: string;
  spend_7d?: number;
}

interface MediaAsset {
  id: string;
  name: string;
  type: "IMAGE" | "VIDEO";
  r2Url: string;
}

interface CopyTemplate {
  id: string;
  name: string;
  primaryText1: string;
  headline1: string;
  description?: string;
  link: string;
  displayLink?: string;
  utmParameters?: string;
  callToAction: string;
}

interface Page {
  id: string;
  fbPageId: string;
  name: string;
  pictureUrl?: string;
}

interface InstagramAccount {
  id: string;
  igAccountId: string;
  username: string;
  pictureUrl?: string;
}

// Page to Instagram account pairings
const PAGE_IG_PAIRINGS: Record<string, string> = {
  // EP pairings
  "Joel Robison Photography": "joelrobison",
  "Expert Photography": "expertphotography",
  "Fotografie Iwona Podlasinska": "iwonapodlasinka",
  // FF pairings
  "FamilyFriends": "realfamilyfriends",
};

// Default page/IG for accounts (by account name pattern)
const DEFAULT_SELECTIONS: Record<string, { page: string; ig: string }> = {
  "FF": { page: "FamilyFriends", ig: "realfamilyfriends" },
};

const CTA_OPTIONS = [
  { value: "LEARN_MORE", label: "Learn More" },
  { value: "SHOP_NOW", label: "Shop Now" },
  { value: "SIGN_UP", label: "Sign Up" },
  { value: "SUBSCRIBE", label: "Subscribe" },
  { value: "DOWNLOAD", label: "Download" },
  { value: "GET_OFFER", label: "Get Offer" },
  { value: "BOOK_NOW", label: "Book Now" },
  { value: "CONTACT_US", label: "Contact Us" },
  { value: "BUY_NOW", label: "Buy Now" },
];

export default function LaunchPage() {
  const { activeAccount } = useAccount();

  // Data
  const [adSets, setAdSets] = useState<AdSet[]>([]);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [templates, setTemplates] = useState<CopyTemplate[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [igAccounts, setIgAccounts] = useState<InstagramAccount[]>([]);

  // Ad set search and refresh
  const [adSetSearch, setAdSetSearch] = useState("");
  const [isRefreshingAdSets, setIsRefreshingAdSets] = useState(false);

  // Media search and view
  const [mediaSearch, setMediaSearch] = useState("");
  const [mediaViewMode, setMediaViewMode] = useState<"grid" | "list">("grid");

  // Selections
  const [selectedAdSets, setSelectedAdSets] = useState<string[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  const [selectedPage, setSelectedPage] = useState("");
  const [selectedIg, setSelectedIg] = useState("");

  // Ad Copy
  const [primaryText, setPrimaryText] = useState("");
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [displayLink, setDisplayLink] = useState("");
  const [callToAction, setCallToAction] = useState("LEARN_MORE");
  const [launchPaused, setLaunchPaused] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isLaunching, setIsLaunching] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    total: number;
    success: number;
    failed: number;
    results?: Array<{
      adSetId: string;
      adSetName?: string;
      success: boolean;
      adId?: string;
      error?: string;
    }>;
  } | null>(null);
  const [showDeleteAdsModal, setShowDeleteAdsModal] = useState(false);
  const [adSetToDeleteFrom, setAdSetToDeleteFrom] = useState<string | null>(null);
  const [adsInAdSet, setAdsInAdSet] = useState<Array<{ id: string; name: string; status: string }>>([]);
  const [isDeletingAds, setIsDeletingAds] = useState(false);
  const [selectedAdsToDelete, setSelectedAdsToDelete] = useState<string[]>([]);

  useEffect(() => {
    if (activeAccount) {
      loadData();
    }
  }, [activeAccount]);

  const loadData = async () => {
    if (!activeAccount) return;

    setIsLoading(true);
    try {
      const [adSetsRes, mediaRes, templatesRes, pagesRes] = await Promise.all([
        fetch(`/api/launch/adsets?accountId=${activeAccount.id}`),
        fetch(`/api/media?accountId=${activeAccount.id}`),
        fetch(`/api/copy?accountId=${activeAccount.id}`),
        fetch(`/api/launch/pages?accountId=${activeAccount.id}`),
      ]);

      if (adSetsRes.ok) {
        const data = await adSetsRes.json();
        setAdSets(data.adSets || []);
      }

      if (mediaRes.ok) {
        const data = await mediaRes.json();
        setMedia(data.media || []);
      }

      if (templatesRes.ok) {
        const data = await templatesRes.json();
        setTemplates(data.templates || []);
      }

      if (pagesRes.ok) {
        const data = await pagesRes.json();
        setPages(data.pages || []);
        setIgAccounts(data.instagramAccounts || []);

        // Check for default selections based on account name
        const accountName = activeAccount?.name || "";
        let defaultSet = false;

        for (const [pattern, defaults] of Object.entries(DEFAULT_SELECTIONS)) {
          if (accountName.includes(pattern)) {
            const defaultPage = data.pages?.find((p: Page) => p.name === defaults.page);
            const defaultIg = data.instagramAccounts?.find((ig: InstagramAccount) =>
              ig.username.toLowerCase() === defaults.ig.toLowerCase()
            );

            if (defaultPage) {
              setSelectedPage(defaultPage.fbPageId);
              defaultSet = true;
            }
            if (defaultIg) {
              setSelectedIg(defaultIg.igAccountId);
            }
            break;
          }
        }

        // Auto-select first page if no default
        if (!defaultSet && data.pages?.length > 0) {
          setSelectedPage(data.pages[0].fbPageId);
        }
      }
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateSelect = (template: CopyTemplate) => {
    setPrimaryText(template.primaryText1);
    setHeadline(template.headline1);
    setDescription(template.description || "");
    setLink(template.link);
    setDisplayLink(template.displayLink || "");
    setCallToAction(template.callToAction);
    setShowTemplateModal(false);
  };

  // Handle page selection with paired Instagram
  const handlePageSelect = (pageId: string) => {
    setSelectedPage(pageId);

    // Find the page and check for paired Instagram
    const page = pages.find((p) => p.fbPageId === pageId);
    if (page) {
      const pairedIgUsername = PAGE_IG_PAIRINGS[page.name];
      if (pairedIgUsername) {
        const pairedIg = igAccounts.find(
          (ig) => ig.username.toLowerCase() === pairedIgUsername.toLowerCase()
        );
        if (pairedIg) {
          setSelectedIg(pairedIg.igAccountId);
        }
      }
    }
  };

  // Filter media by search
  const filteredMedia = media.filter((item) =>
    item.name.toLowerCase().includes(mediaSearch.toLowerCase())
  );

  const refreshAdSets = async () => {
    if (!activeAccount) return;

    setIsRefreshingAdSets(true);
    try {
      const response = await fetch(`/api/launch/adsets?accountId=${activeAccount.id}`);
      if (response.ok) {
        const data = await response.json();
        setAdSets(data.adSets || []);
      }
    } catch (err) {
      console.error("Error refreshing ad sets:", err);
    } finally {
      setIsRefreshingAdSets(false);
    }
  };

  // Filter and sort ad sets
  const filteredAdSets = adSets
    .filter((adSet) =>
      adSet.name.toLowerCase().includes(adSetSearch.toLowerCase()) ||
      adSet.campaign.name.toLowerCase().includes(adSetSearch.toLowerCase())
    )
    .sort((a, b) => {
      // First by spend (highest first)
      const spendA = a.spend_7d || 0;
      const spendB = b.spend_7d || 0;
      if (spendA !== spendB) return spendB - spendA;

      // Then by creation date (newest first)
      const dateA = a.created_time ? new Date(a.created_time).getTime() : 0;
      const dateB = b.created_time ? new Date(b.created_time).getTime() : 0;
      return dateB - dateA;
    });

  const handleLaunch = async () => {
    setError(null);
    setResult(null);

    if (selectedAdSets.length === 0) {
      setError("Please select at least one ad set");
      return;
    }

    if (selectedMedia.length === 0) {
      setError("Please select at least one media asset");
      return;
    }

    if (!selectedPage) {
      setError("Please select a Facebook Page");
      return;
    }

    if (!primaryText || !headline || !link) {
      setError("Please fill in primary text, headline, and link");
      return;
    }

    setIsLaunching(true);

    try {
      const response = await fetch("/api/launch/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: activeAccount?.id,
          adSetIds: selectedAdSets,
          mediaAssetIds: selectedMedia,
          pageId: selectedPage,
          instagramAccountId: selectedIg || undefined,
          primaryText,
          headline,
          description,
          link,
          displayLink,
          callToAction,
          launchPaused,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Launch failed");
      }

      setResult({
        ...data.summary,
        results: data.results,
      });

      // Clear selections on success
      if (data.summary.success > 0) {
        setSelectedAdSets([]);
        setSelectedMedia([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Launch failed");
    } finally {
      setIsLaunching(false);
    }
  };

  // Fetch ads in an ad set for deletion
  const fetchAdsInAdSet = async (adSetId: string) => {
    if (!activeAccount) return;

    try {
      const response = await fetch(
        `/api/launch/ads-in-adset?accountId=${activeAccount.id}&adSetId=${adSetId}`
      );
      if (response.ok) {
        const data = await response.json();
        setAdsInAdSet(data.ads || []);
      }
    } catch (err) {
      console.error("Error fetching ads:", err);
    }
  };

  // Handle opening delete modal for a specific ad set
  const handleOpenDeleteModal = async (adSetId: string) => {
    setAdSetToDeleteFrom(adSetId);
    setSelectedAdsToDelete([]);
    setShowDeleteAdsModal(true);
    await fetchAdsInAdSet(adSetId);
  };

  // Delete selected ads
  const handleDeleteAds = async () => {
    if (!activeAccount || selectedAdsToDelete.length === 0) return;

    setIsDeletingAds(true);
    try {
      const response = await fetch("/api/launch/delete-ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: activeAccount.id,
          adIds: selectedAdsToDelete,
        }),
      });

      if (response.ok) {
        // Refresh the list
        if (adSetToDeleteFrom) {
          await fetchAdsInAdSet(adSetToDeleteFrom);
        }
        setSelectedAdsToDelete([]);
      }
    } catch (err) {
      console.error("Error deleting ads:", err);
    } finally {
      setIsDeletingAds(false);
    }
  };

  if (!activeAccount) {
    return (
      <Card>
        <div className="text-center py-12">
          <p className="text-gray-500">
            Please select an ad account to launch ads
          </p>
        </div>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-12 text-gray-500">Loading...</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Launch Ads</h1>
          <p className="text-gray-600 mt-1">
            Create and launch ads to your ad sets
          </p>
        </div>
        <Link href="/launch/csv">
          <Button variant="secondary">
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
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            CSV Upload
          </Button>
        </Link>
      </div>

      {/* Results */}
      {result && (
        <div
          className={`p-4 rounded-lg ${
            result.failed === 0
              ? "bg-green-50 border border-green-200"
              : result.success === 0
              ? "bg-red-50 border border-red-200"
              : "bg-yellow-50 border border-yellow-200"
          }`}
        >
          <p className="font-medium">
            Launched {result.success} of {result.total} ads
            {result.failed > 0 && ` (${result.failed} failed)`}
          </p>

          {/* Show detailed errors */}
          {result.results && result.results.some((r) => !r.success) && (
            <div className="mt-3 space-y-2">
              <p className="text-sm font-medium text-gray-700">Failed ad sets:</p>
              {result.results
                .filter((r) => !r.success)
                .map((r) => (
                  <div
                    key={r.adSetId}
                    className="flex items-center justify-between p-2 bg-white rounded border text-sm"
                  >
                    <div>
                      <span className="text-gray-700">Ad Set ID: {r.adSetId}</span>
                      {r.error && (
                        <p className="text-red-600 text-xs mt-1">{r.error}</p>
                      )}
                    </div>
                    {r.error?.toLowerCase().includes("limit") ||
                    r.error?.toLowerCase().includes("too many") ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleOpenDeleteModal(r.adSetId)}
                      >
                        Delete Ads
                      </Button>
                    ) : null}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <p className="font-medium">{error}</p>
          {error.toLowerCase().includes("limit") ||
          error.toLowerCase().includes("too many") ? (
            <p className="text-sm mt-2">
              Try deleting some existing ads from the ad set to make room.
            </p>
          ) : null}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Selections */}
        <div className="space-y-6">
          {/* Ad Sets */}
          <Card>
            <CardHeader
              title="Ad Sets"
              description={`Select ad sets to launch into (${selectedAdSets.length} selected)`}
              action={
                <button
                  onClick={refreshAdSets}
                  disabled={isRefreshingAdSets}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                  title="Refresh ad sets"
                >
                  <svg
                    className={`w-5 h-5 ${isRefreshingAdSets ? "animate-spin" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
              }
            />
            {/* Search */}
            <div className="mb-4">
              <Input
                placeholder="Search ad sets..."
                value={adSetSearch}
                onChange={(e) => setAdSetSearch(e.target.value)}
              />
            </div>
            {adSets.length === 0 ? (
              <p className="text-gray-500 text-sm">No active ad sets found</p>
            ) : filteredAdSets.length === 0 ? (
              <p className="text-gray-500 text-sm">No ad sets match your search</p>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2">
                {filteredAdSets.map((adSet) => {
                  const isNew = adSet.created_time &&
                    new Date(adSet.created_time) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

                  return (
                    <label
                      key={adSet.id}
                      className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedAdSets.includes(adSet.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAdSets([...selectedAdSets, adSet.id]);
                          } else {
                            setSelectedAdSets(
                              selectedAdSets.filter((id) => id !== adSet.id)
                            );
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {adSet.name}
                          </p>
                          {isNew && (
                            <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                              New
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="truncate">{adSet.campaign.name}</span>
                          {adSet.spend_7d !== undefined && adSet.spend_7d > 0 && (
                            <span className="text-green-600 font-medium">
                              ${adSet.spend_7d.toFixed(2)} (7d)
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 text-xs rounded flex-shrink-0 ${
                          adSet.status === "ACTIVE"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {adSet.status}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Media Selection */}
          <Card>
            <CardHeader
              title="Media"
              description={`Select images or videos (${selectedMedia.length} selected)`}
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowMediaModal(true)}
                >
                  Select Media
                </Button>
              }
            />
            {selectedMedia.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedMedia.map((id) => {
                  const asset = media.find((m) => m.id === id);
                  return asset ? (
                    <div
                      key={id}
                      className="relative group w-20 h-20 bg-gray-100 rounded overflow-hidden"
                    >
                      {asset.type === "IMAGE" ? (
                        <img
                          src={asset.r2Url}
                          alt={asset.name}
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
                      )}
                      <button
                        onClick={() =>
                          setSelectedMedia(selectedMedia.filter((i) => i !== id))
                        }
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ) : null;
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No media selected</p>
            )}
          </Card>

          {/* Page & Instagram */}
          <Card>
            <CardHeader
              title="Facebook Page & Instagram"
              description="Select the accounts to publish from"
            />
            <div className="space-y-4">
              {/* Facebook Page Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Facebook Page
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {pages.map((page) => (
                    <label
                      key={page.fbPageId}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedPage === page.fbPageId
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="facebookPage"
                        value={page.fbPageId}
                        checked={selectedPage === page.fbPageId}
                        onChange={(e) => handlePageSelect(e.target.value)}
                        className="sr-only"
                      />
                      {page.pictureUrl ? (
                        <img
                          src={page.pictureUrl}
                          alt={page.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900">{page.name}</span>
                        {PAGE_IG_PAIRINGS[page.name] && (
                          <span className="ml-2 text-xs text-pink-600">
                            paired with @{PAGE_IG_PAIRINGS[page.name]}
                          </span>
                        )}
                      </div>
                      {selectedPage === page.fbPageId && (
                        <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Instagram Account Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instagram Account {selectedPage && PAGE_IG_PAIRINGS[pages.find(p => p.fbPageId === selectedPage)?.name || ""] ? "(auto-paired)" : "(optional)"}
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  <label
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedIg === ""
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="instagram"
                      value=""
                      checked={selectedIg === ""}
                      onChange={(e) => setSelectedIg(e.target.value)}
                      className="sr-only"
                    />
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <span className="text-sm text-gray-600">None</span>
                    {selectedIg === "" && (
                      <svg className="w-5 h-5 text-blue-500 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </label>
                  {igAccounts.map((ig) => (
                    <label
                      key={ig.igAccountId}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedIg === ig.igAccountId
                          ? "border-pink-500 bg-pink-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="instagram"
                        value={ig.igAccountId}
                        checked={selectedIg === ig.igAccountId}
                        onChange={(e) => setSelectedIg(e.target.value)}
                        className="sr-only"
                      />
                      {ig.pictureUrl ? (
                        <img
                          src={ig.pictureUrl}
                          alt={ig.username}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                          </svg>
                        </div>
                      )}
                      <span className="text-sm font-medium text-gray-900">@{ig.username}</span>
                      {selectedIg === ig.igAccountId && (
                        <svg className="w-5 h-5 text-pink-500 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column - Ad Copy */}
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Ad Copy"
              description="Enter your ad content"
              action={
                templates.length > 0 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowTemplateModal(true)}
                  >
                    Load Template
                  </Button>
                )
              }
            />
            <div className="space-y-4">
              <Textarea
                label="Primary Text"
                value={primaryText}
                onChange={(e) => setPrimaryText(e.target.value)}
                placeholder="Main ad body text..."
                rows={4}
              />

              <Input
                label="Headline"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Ad headline"
              />

              <Textarea
                label="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional description"
                rows={2}
              />

              <Input
                label="Destination URL"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://example.com/landing-page"
              />

              <Input
                label="Display Link (optional)"
                value={displayLink}
                onChange={(e) => setDisplayLink(e.target.value)}
                placeholder="https://example.com"
              />

              <Select
                label="Call to Action"
                value={callToAction}
                onChange={(e) => setCallToAction(e.target.value)}
                options={CTA_OPTIONS}
              />

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={launchPaused}
                  onChange={(e) => setLaunchPaused(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Launch as paused</span>
              </label>
            </div>
          </Card>

          {/* Launch Button */}
          <Button
            onClick={handleLaunch}
            isLoading={isLaunching}
            disabled={
              selectedAdSets.length === 0 ||
              selectedMedia.length === 0 ||
              !primaryText ||
              !headline ||
              !link
            }
            className="w-full"
            size="lg"
          >
            Launch {selectedAdSets.length > 0 ? `${selectedAdSets.length} ` : ""}
            Ad{selectedAdSets.length !== 1 ? "s" : ""}
          </Button>
        </div>
      </div>

      {/* Media Selection Modal */}
      <Modal
        isOpen={showMediaModal}
        onClose={() => setShowMediaModal(false)}
        title="Select Media"
        size="xl"
      >
        {/* Search and View Toggle */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <Input
              placeholder="Search media..."
              value={mediaSearch}
              onChange={(e) => setMediaSearch(e.target.value)}
            />
          </div>
          <div className="flex border rounded-lg overflow-hidden">
            <button
              onClick={() => setMediaViewMode("grid")}
              className={`p-2 ${mediaViewMode === "grid" ? "bg-blue-100 text-blue-600" : "bg-white text-gray-500 hover:bg-gray-50"}`}
              title="Grid view"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setMediaViewMode("list")}
              className={`p-2 ${mediaViewMode === "list" ? "bg-blue-100 text-blue-600" : "bg-white text-gray-500 hover:bg-gray-50"}`}
              title="List view"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Grid View */}
        {mediaViewMode === "grid" ? (
          <div className="grid grid-cols-4 gap-3 max-h-96 overflow-y-auto">
            {filteredMedia.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  if (selectedMedia.includes(item.id)) {
                    setSelectedMedia(selectedMedia.filter((i) => i !== item.id));
                  } else {
                    setSelectedMedia([...selectedMedia, item.id]);
                  }
                }}
                className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                  selectedMedia.includes(item.id)
                    ? "border-blue-500"
                    : "border-transparent hover:border-gray-300"
                }`}
              >
                <div className="aspect-square bg-gray-100">
                  {item.type === "IMAGE" ? (
                    <img
                      src={item.r2Url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-purple-50">
                      <svg
                        className="w-8 h-8 text-purple-400"
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
                </div>
                {selectedMedia.includes(item.id) && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                )}
                <p className="p-2 text-xs truncate">{item.name}</p>
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="max-h-96 overflow-y-auto space-y-2">
            {filteredMedia.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  if (selectedMedia.includes(item.id)) {
                    setSelectedMedia(selectedMedia.filter((i) => i !== item.id));
                  } else {
                    setSelectedMedia([...selectedMedia, item.id]);
                  }
                }}
                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer border transition-all ${
                  selectedMedia.includes(item.id)
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                  {item.type === "IMAGE" ? (
                    <img
                      src={item.r2Url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-purple-50">
                      <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.type}</p>
                </div>
                {selectedMedia.includes(item.id) && (
                  <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        )}

        {filteredMedia.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {mediaSearch ? "No media matches your search" : "No media uploaded yet"}
          </div>
        )}

        <div className="mt-4 flex justify-between items-center">
          <span className="text-sm text-gray-500">
            {selectedMedia.length} selected
          </span>
          <Button onClick={() => setShowMediaModal(false)}>Done</Button>
        </div>
      </Modal>

      {/* Template Selection Modal */}
      <Modal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        title="Load Copy Template"
        size="lg"
      >
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {templates.map((template) => (
            <div
              key={template.id}
              onClick={() => handleTemplateSelect(template)}
              className="p-4 border rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all"
            >
              <h4 className="font-medium text-gray-900">{template.name}</h4>
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {template.primaryText1}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Headline: {template.headline1}
              </p>
            </div>
          ))}
        </div>
      </Modal>

      {/* Delete Ads Modal */}
      <Modal
        isOpen={showDeleteAdsModal}
        onClose={() => {
          setShowDeleteAdsModal(false);
          setAdSetToDeleteFrom(null);
          setAdsInAdSet([]);
          setSelectedAdsToDelete([]);
        }}
        title="Delete Ads from Ad Set"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Select ads to delete from this ad set to make room for new ones.
          </p>

          {adsInAdSet.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Loading ads...
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-2">
              {adsInAdSet.map((ad) => (
                <label
                  key={ad.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedAdsToDelete.includes(ad.id)
                      ? "border-red-500 bg-red-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedAdsToDelete.includes(ad.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedAdsToDelete([...selectedAdsToDelete, ad.id]);
                      } else {
                        setSelectedAdsToDelete(
                          selectedAdsToDelete.filter((id) => id !== ad.id)
                        );
                      }
                    }}
                    className="w-4 h-4 text-red-600 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {ad.name}
                    </p>
                    <p className="text-xs text-gray-500">ID: {ad.id}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-xs rounded ${
                      ad.status === "ACTIVE"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {ad.status}
                  </span>
                </label>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center pt-4 border-t">
            <span className="text-sm text-gray-500">
              {selectedAdsToDelete.length} selected
            </span>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowDeleteAdsModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteAds}
                isLoading={isDeletingAds}
                disabled={selectedAdsToDelete.length === 0}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete Selected
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
