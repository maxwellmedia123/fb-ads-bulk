"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount } from "@/lib/context/AccountContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import Link from "next/link";

interface CopyTemplate {
  id: string;
  name: string;
  primaryText1: string;
  headline1: string;
  link: string;
  callToAction: string;
  updatedAt: string;
}

export default function CopyPage() {
  const { activeAccount } = useAccount();
  const [templates, setTemplates] = useState<CopyTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeAccount) {
      fetchTemplates();
    }
  }, [activeAccount]);

  const fetchTemplates = async () => {
    if (!activeAccount) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/copy?accountId=${activeAccount.id}`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const response = await fetch(`/api/copy?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setTemplates(templates.filter((t) => t.id !== id));
      }
    } catch (error) {
      console.error("Error deleting template:", error);
    }
  };

  const truncate = (text: string, length: number) => {
    if (text.length <= length) return text;
    return text.substring(0, length) + "...";
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeAccount) return;

    setIsImporting(true);
    setImportError(null);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("accountId", activeAccount.id);

      const response = await fetch("/api/copy/import", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Import failed");
      }

      setImportResult({ success: data.imported, failed: data.failed });
      fetchTemplates();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const downloadSampleCSV = () => {
    const headers = [
      "Name",
      "Primary Text 1",
      "Primary Text 2",
      "Primary Text 3",
      "Primary Text 4",
      "Primary Text 5",
      "Headline 1",
      "Headline 2",
      "Headline 3",
      "Headline 4",
      "Headline 5",
      "Description",
      "Link",
      "Display Link",
      "UTM Parameters",
      "CTA",
    ];

    const sampleRow = [
      "Sample Template",
      "This is the main ad text that will grab attention...",
      "Alternative primary text variation 2",
      "",
      "",
      "",
      "Main Headline",
      "Alternative Headline",
      "",
      "",
      "",
      "Optional description text",
      "https://example.com/landing",
      "example.com",
      "utm_source=facebook&utm_medium=paid",
      "LEARN_MORE",
    ];

    const csvContent = [headers.join(","), sampleRow.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",")].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "copy_templates_sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!activeAccount) {
    return (
      <Card>
        <div className="text-center py-12">
          <p className="text-gray-500">
            Please select an ad account to view copy templates
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
          <h1 className="text-2xl font-bold text-gray-900">Copy Templates</h1>
          <p className="text-gray-600 mt-1">
            Save and reuse ad copy for your campaigns
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setShowImportModal(true)}>
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
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            Import CSV
          </Button>
          <Link href="/copy/new">
            <Button>
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
              New Template
            </Button>
          </Link>
        </div>
      </div>

      {/* Templates List */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading templates...</div>
      ) : templates.length === 0 ? (
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
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No copy templates yet
            </h3>
            <p className="text-gray-500 mb-6">
              Create templates to quickly apply saved copy when launching ads
            </p>
            <Link href="/copy/new">
              <Button>Create Template</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {templates.map((template) => (
            <Card key={template.id}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {template.name}
                    </h3>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                      {template.callToAction.replace("_", " ")}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                    {truncate(template.primaryText1, 200)}
                  </p>

                  <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                    <span className="font-medium text-gray-700">
                      {template.headline1}
                    </span>
                    <span>•</span>
                    <span className="truncate max-w-xs">{template.link}</span>
                  </div>

                  <p className="mt-2 text-xs text-gray-400">
                    Updated {new Date(template.updatedAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Link href={`/copy/${template.id}`}>
                    <Button variant="secondary" size="sm">
                      Edit
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(template.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Import Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false);
          setImportError(null);
          setImportResult(null);
        }}
        title="Import Copy Templates"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Upload a CSV file with your copy templates. Each row will create a new template.
          </p>

          {/* Sample Download */}
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-gray-600 flex-1">Need the CSV format?</span>
            <button
              onClick={downloadSampleCSV}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Download Sample
            </button>
          </div>

          {/* File Input */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleImportCSV}
              className="hidden"
              id="csv-import"
            />
            <label
              htmlFor="csv-import"
              className="cursor-pointer"
            >
              <svg className="mx-auto w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-gray-600">
                {isImporting ? "Importing..." : "Click to select a CSV file"}
              </p>
            </label>
          </div>

          {/* Error */}
          {importError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {importError}
            </div>
          )}

          {/* Success */}
          {importResult && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              Imported {importResult.success} template(s)
              {importResult.failed > 0 && ` (${importResult.failed} failed)`}
            </div>
          )}

          {/* CSV Format Info */}
          <div className="text-xs text-gray-500 space-y-1">
            <p className="font-medium">Required columns:</p>
            <p>Name, Primary Text 1, Headline 1, Link</p>
            <p className="font-medium mt-2">Optional columns:</p>
            <p>Primary Text 2-5, Headline 2-5, Description, Display Link, UTM Parameters, CTA</p>
          </div>

          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setShowImportModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
