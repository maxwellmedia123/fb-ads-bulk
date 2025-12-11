"use client";

import { useRouter } from "next/navigation";
import { useAccount } from "@/lib/context/AccountContext";
import { Card } from "@/components/ui/Card";
import { CopyTemplateForm } from "@/components/CopyTemplateForm";

export default function NewCopyPage() {
  const router = useRouter();
  const { activeAccount } = useAccount();

  if (!activeAccount) {
    return (
      <Card>
        <div className="text-center py-12">
          <p className="text-gray-500">
            Please select an ad account to create a copy template
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Copy Template</h1>
        <p className="text-gray-600 mt-1">
          Create a reusable template for your ad copy
        </p>
      </div>

      <CopyTemplateForm
        accountId={activeAccount.id}
        onSave={() => router.push("/copy")}
        onCancel={() => router.push("/copy")}
      />
    </div>
  );
}
