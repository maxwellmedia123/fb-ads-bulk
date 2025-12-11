"use client";

import { useState, useCallback } from "react";
import { useAccount } from "@/lib/context/AccountContext";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

interface CarouselCard {
  mediaUrl?: string;
  portraitMediaUrl?: string;
  title?: string;
  description?: string;
  link?: string;
}

interface CSVAdRow {
  rowIndex: number;
  rowType: "Single" | "Carousel";
  customName?: string;
  primaryTextVariations: string[];
  headlineVariations: string[];
  adDescription?: string;
  link?: string;
  displayLink?: string;
  utmParameters?: string;
  callToAction?: string;
  launchPaused: boolean;
  videoUrls?: string[];
  adSetIds: string[];
  carouselCards?: CarouselCard[];
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export default function CSVUploadPage() {
  const { activeAccount } = useAccount();
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rows, setRows] = useState<CSVAdRow[]>([]);
  const [validation, setValidation] = useState<{
    validCount: number;
    invalidCount: number;
    totalErrors: number;
    totalWarnings: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

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

    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".csv")) {
      handleFile(file);
    } else {
      setError("Please upload a CSV file");
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFile = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setRows([]);
    setValidation(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/launch/csv/parse", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to parse CSV");
      }

      setRows(data.rows);
      setValidation(data.validation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse CSV");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLaunch = async () => {
    // TODO: Implement bulk launch
    alert("Bulk launch coming soon! For now, use the simple launcher.");
  };

  const downloadSample = () => {
    const sampleCSV = `Row Type,Custom Name,Primary Text Variation 1,Headline Variation 1,Ad Description,Link,Display Link,UTM Parameters,CTA,Partnership Code,Launch Paused,Video URLs,Ad Set IDs,Headline Variation 2,Headline Variation 3,Primary Text Variation 2,Primary Text Variation 3
Single,my_ad_name,"This is the primary ad text...",Main Headline,Optional description,https://example.com/landing,https://example.com,"utm_source=facebook&utm_campaign={{campaign.name}}",LEARN_MORE,,No,https://media.example.com/video.mp4,123456789012345,Headline Variation 2,,Alternative primary text...,`;

    const blob = new Blob([sampleCSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fb-ads-bulk-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!activeAccount) {
    return (
      <Card>
        <div className="text-center py-12">
          <p className="text-gray-500">
            Please select an ad account to upload ads
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
          <h1 className="text-2xl font-bold text-gray-900">CSV Upload</h1>
          <p className="text-gray-600 mt-1">
            Upload a CSV file to bulk launch ads
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={downloadSample}>
            Download Sample CSV
          </Button>
          <Link href="/launch">
            <Button variant="secondary">Simple Launcher</Button>
          </Link>
        </div>
      </div>

      {/* Upload Area */}
      {rows.length === 0 && (
        <Card>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-lg p-12 text-center transition-colors
              ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"}
            `}
          >
            {isLoading ? (
              <div className="text-gray-500">Processing CSV...</div>
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
                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="mt-4 text-lg font-medium text-gray-900">
                  Drop your CSV file here
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  or click to browse
                </p>
                <label className="mt-4 inline-block">
                  <span className="px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700">
                    Select CSV File
                  </span>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </>
            )}
          </div>
        </Card>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Validation Summary */}
      {validation && (
        <div className="flex gap-4">
          <Card className="flex-1 bg-green-50 border-green-200">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-700">
                {validation.validCount}
              </div>
              <div className="text-sm text-green-600">Valid Rows</div>
            </div>
          </Card>
          <Card className="flex-1 bg-red-50 border-red-200">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-700">
                {validation.invalidCount}
              </div>
              <div className="text-sm text-red-600">Invalid Rows</div>
            </div>
          </Card>
          <Card className="flex-1 bg-yellow-50 border-yellow-200">
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-700">
                {validation.totalWarnings}
              </div>
              <div className="text-sm text-yellow-600">Warnings</div>
            </div>
          </Card>
        </div>
      )}

      {/* Rows Table */}
      {rows.length > 0 && (
        <Card padding="none">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Preview ({rows.length} ads)</h3>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setRows([]);
                    setValidation(null);
                  }}
                >
                  Clear
                </Button>
                <Button
                  onClick={handleLaunch}
                  disabled={validation?.validCount === 0}
                >
                  Launch {validation?.validCount || 0} Ads
                </Button>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-max w-full text-sm">
              <thead className="bg-gray-50 border-y">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap">
                    #
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap">
                    Media
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap">
                    Primary Text
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap">
                    Headline
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap">
                    Link
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap">
                    Ad Sets
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap">
                    Issues
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row) => (
                  <tr
                    key={row.rowIndex}
                    className={`${
                      !row.isValid ? "bg-red-50" : row.warnings.length > 0 ? "bg-yellow-50" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {row.rowIndex + 1}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {row.isValid ? (
                        row.warnings.length > 0 ? (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">
                            Warning
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                            Valid
                          </span>
                        )
                      ) : (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                          Invalid
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {/* Media Preview */}
                      <div className="flex gap-1">
                        {row.videoUrls && row.videoUrls.length > 0 ? (
                          row.videoUrls.slice(0, 3).map((url, idx) => (
                            <div
                              key={idx}
                              className="w-20 h-20 bg-gray-100 rounded overflow-hidden flex-shrink-0"
                            >
                              {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                <img
                                  src={url}
                                  alt={`Media ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <video
                                  src={url}
                                  className="w-full h-full object-cover"
                                  muted
                                  onError={(e) => {
                                    (e.target as HTMLVideoElement).style.display = 'none';
                                  }}
                                />
                              )}
                            </div>
                          ))
                        ) : row.carouselCards && row.carouselCards.length > 0 ? (
                          row.carouselCards.slice(0, 3).map((card, idx) => (
                            <div
                              key={idx}
                              className="w-20 h-20 bg-gray-100 rounded overflow-hidden flex-shrink-0"
                            >
                              {card.mediaUrl && (
                                card.mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                  <img
                                    src={card.mediaUrl}
                                    alt={`Card ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <video
                                    src={card.mediaUrl}
                                    className="w-full h-full object-cover"
                                    muted
                                    onError={(e) => {
                                      (e.target as HTMLVideoElement).style.display = 'none';
                                    }}
                                  />
                                )
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="w-20 h-20 bg-gray-100 rounded flex items-center justify-center text-gray-400">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        {((row.videoUrls && row.videoUrls.length > 3) || (row.carouselCards && row.carouselCards.length > 3)) && (
                          <div className="w-20 h-20 bg-gray-200 rounded flex items-center justify-center text-gray-600 text-sm font-medium flex-shrink-0">
                            +{Math.max((row.videoUrls?.length || 0), (row.carouselCards?.length || 0)) - 3}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap max-w-[200px] truncate">
                      {row.customName || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{row.rowType}</td>
                    <td className="px-4 py-3 max-w-[250px]">
                      <div className="truncate" title={row.primaryTextVariations[0]}>
                        {row.primaryTextVariations[0] || "-"}
                      </div>
                      {row.primaryTextVariations.length > 1 && (
                        <span className="text-xs text-gray-500">
                          +{row.primaryTextVariations.length - 1} variation(s)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <div className="truncate" title={row.headlineVariations[0]}>
                        {row.headlineVariations[0] || "-"}
                      </div>
                      {row.headlineVariations.length > 1 && (
                        <span className="text-xs text-gray-500">
                          +{row.headlineVariations.length - 1} variation(s)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <div className="truncate text-blue-600" title={row.link}>
                        {row.link || "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {row.adSetIds.length > 0
                        ? `${row.adSetIds.length} ad set(s)`
                        : "-"}
                    </td>
                    <td className="px-4 py-3 min-w-[200px]">
                      {row.errors.length > 0 && (
                        <div className="text-red-600 text-xs">
                          {row.errors.join(", ")}
                        </div>
                      )}
                      {row.warnings.length > 0 && (
                        <div className="text-yellow-600 text-xs">
                          {row.warnings.join(", ")}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Help */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader
          title="CSV Format"
          description="Use the sample CSV as a starting point"
        />
        <div className="text-sm text-gray-600 space-y-2">
          <p>Required columns:</p>
          <ul className="list-disc list-inside ml-2 space-y-1">
            <li>
              <strong>Row Type:</strong> &quot;Single&quot; or &quot;Carousel&quot;
            </li>
            <li>
              <strong>Primary Text Variation 1:</strong> Main ad body text
            </li>
            <li>
              <strong>Headline Variation 1:</strong> Main headline
            </li>
            <li>
              <strong>Link:</strong> Destination URL
            </li>
            <li>
              <strong>Ad Set IDs:</strong> Comma-separated list of ad set IDs
            </li>
          </ul>
          <p className="mt-4">
            For carousels, include columns like &quot;Carousel 1 Media URL&quot;,
            &quot;Carousel 1 Title&quot;, etc.
          </p>
        </div>
      </Card>
    </div>
  );
}
