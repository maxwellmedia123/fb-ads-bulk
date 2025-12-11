"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAccount } from "@/lib/context/AccountContext";
import { Card } from "@/components/ui/Card";
import { CopyTemplateForm } from "@/components/CopyTemplateForm";

interface CopyTemplate {
  id: string;
  name: string;
  primaryText1: string;
  primaryText2?: string;
  primaryText3?: string;
  primaryText4?: string;
  primaryText5?: string;
  headline1: string;
  headline2?: string;
  headline3?: string;
  headline4?: string;
  headline5?: string;
  description?: string;
  link: string;
  displayLink?: string;
  utmParameters?: string;
  callToAction: string;
}

export default function EditCopyPage() {
  const router = useRouter();
  const params = useParams();
  const { activeAccount } = useAccount();
  const [template, setTemplate] = useState<CopyTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchTemplate();
    }
  }, [params.id]);

  const fetchTemplate = async () => {
    try {
      const response = await fetch(`/api/copy?id=${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setTemplate(data.template);
      } else {
        setError("Template not found");
      }
    } catch (err) {
      setError("Failed to load template");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12 text-gray-500">Loading template...</div>
    );
  }

  if (error || !template) {
    return (
      <Card>
        <div className="text-center py-12">
          <p className="text-red-500">{error || "Template not found"}</p>
        </div>
      </Card>
    );
  }

  if (!activeAccount) {
    return (
      <Card>
        <div className="text-center py-12">
          <p className="text-gray-500">
            Please select an ad account to edit this template
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Copy Template</h1>
        <p className="text-gray-600 mt-1">Update your ad copy template</p>
      </div>

      <CopyTemplateForm
        accountId={activeAccount.id}
        initialData={template}
        onSave={() => router.push("/copy")}
        onCancel={() => router.push("/copy")}
      />
    </div>
  );
}
