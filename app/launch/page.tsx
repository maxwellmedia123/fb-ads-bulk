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
}

interface InstagramAccount {
  id: string;
  igAccountId: string;
  username: string;
}

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

  // Selections
  const [selectedAdSets, setSelectedAdSets] = useState<string[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  const [selectedPage, setSelectedPage] = useState("");
  const [selectedIg, setSelectedIg] = useState("");

  // Ad Copy
  const [customName, setCustomName] = useState("");
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
  } | null>(null);

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

        // Auto-select first page
        if (data.pages?.length > 0) {
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
          customName,
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

      setResult(data.summary);

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
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
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
            />
            {adSets.length === 0 ? (
              <p className="text-gray-500 text-sm">No active ad sets found</p>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2">
                {adSets.map((adSet) => (
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
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {adSet.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {adSet.campaign.name}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 text-xs rounded ${
                        adSet.status === "ACTIVE"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {adSet.status}
                    </span>
                  </label>
                ))}
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
              <Select
                label="Facebook Page"
                value={selectedPage}
                onChange={(e) => setSelectedPage(e.target.value)}
                options={pages.map((p) => ({
                  value: p.fbPageId,
                  label: p.name,
                }))}
                placeholder="Select a page"
              />

              <Select
                label="Instagram Account (optional)"
                value={selectedIg}
                onChange={(e) => setSelectedIg(e.target.value)}
                options={[
                  { value: "", label: "None" },
                  ...igAccounts.map((ig) => ({
                    value: ig.igAccountId,
                    label: `@${ig.username}`,
                  })),
                ]}
              />
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
              <Input
                label="Ad Name (optional)"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Custom ad name"
              />

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
        <div className="grid grid-cols-4 gap-3 max-h-96 overflow-y-auto">
          {media.map((item) => (
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
        <div className="mt-4 flex justify-end">
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
    </div>
  );
}
