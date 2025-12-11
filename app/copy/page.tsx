"use client";

import { useEffect, useState } from "react";
import { useAccount } from "@/lib/context/AccountContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
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
    </div>
  );
}
