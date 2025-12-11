"use client";

import { useState } from "react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Textarea } from "./ui/Textarea";
import { Select } from "./ui/Select";
import { Card } from "./ui/Card";

interface CopyTemplateFormProps {
  accountId: string;
  initialData?: {
    id?: string;
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
  };
  onSave: () => void;
  onCancel: () => void;
}

const CTA_OPTIONS = [
  { value: "LEARN_MORE", label: "Learn More" },
  { value: "SHOP_NOW", label: "Shop Now" },
  { value: "SIGN_UP", label: "Sign Up" },
  { value: "SUBSCRIBE", label: "Subscribe" },
  { value: "DOWNLOAD", label: "Download" },
  { value: "GET_OFFER", label: "Get Offer" },
  { value: "GET_QUOTE", label: "Get Quote" },
  { value: "BOOK_NOW", label: "Book Now" },
  { value: "CONTACT_US", label: "Contact Us" },
  { value: "WATCH_MORE", label: "Watch More" },
  { value: "APPLY_NOW", label: "Apply Now" },
  { value: "BUY_NOW", label: "Buy Now" },
  { value: "ORDER_NOW", label: "Order Now" },
  { value: "NO_BUTTON", label: "No Button" },
];

export function CopyTemplateForm({
  accountId,
  initialData,
  onSave,
  onCancel,
}: CopyTemplateFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    primaryText1: initialData?.primaryText1 || "",
    primaryText2: initialData?.primaryText2 || "",
    primaryText3: initialData?.primaryText3 || "",
    primaryText4: initialData?.primaryText4 || "",
    primaryText5: initialData?.primaryText5 || "",
    headline1: initialData?.headline1 || "",
    headline2: initialData?.headline2 || "",
    headline3: initialData?.headline3 || "",
    headline4: initialData?.headline4 || "",
    headline5: initialData?.headline5 || "",
    description: initialData?.description || "",
    link: initialData?.link || "",
    displayLink: initialData?.displayLink || "",
    utmParameters: initialData?.utmParameters || "",
    callToAction: initialData?.callToAction || "LEARN_MORE",
  });

  const [showVariations, setShowVariations] = useState({
    primaryText: !!(
      initialData?.primaryText2 ||
      initialData?.primaryText3 ||
      initialData?.primaryText4 ||
      initialData?.primaryText5
    ),
    headline: !!(
      initialData?.headline2 ||
      initialData?.headline3 ||
      initialData?.headline4 ||
      initialData?.headline5
    ),
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        accountId,
        id: initialData?.id,
      };

      const response = await fetch("/api/copy", {
        method: initialData?.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save template");
      }

      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Template Name */}
      <Card>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Info</h3>
        <Input
          label="Template Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g., Summer Sale Copy"
          required
        />
      </Card>

      {/* Primary Text */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Primary Text (Body)</h3>
          <button
            type="button"
            onClick={() =>
              setShowVariations((prev) => ({
                ...prev,
                primaryText: !prev.primaryText,
              }))
            }
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showVariations.primaryText ? "Hide variations" : "Add variations"}
          </button>
        </div>

        <div className="space-y-4">
          <Textarea
            label="Primary Text 1"
            name="primaryText1"
            value={formData.primaryText1}
            onChange={handleChange}
            placeholder="Main ad copy..."
            required
            rows={4}
          />

          {showVariations.primaryText && (
            <>
              <Textarea
                label="Primary Text 2 (optional)"
                name="primaryText2"
                value={formData.primaryText2}
                onChange={handleChange}
                rows={4}
              />
              <Textarea
                label="Primary Text 3 (optional)"
                name="primaryText3"
                value={formData.primaryText3}
                onChange={handleChange}
                rows={4}
              />
              <Textarea
                label="Primary Text 4 (optional)"
                name="primaryText4"
                value={formData.primaryText4}
                onChange={handleChange}
                rows={4}
              />
              <Textarea
                label="Primary Text 5 (optional)"
                name="primaryText5"
                value={formData.primaryText5}
                onChange={handleChange}
                rows={4}
              />
            </>
          )}
        </div>
      </Card>

      {/* Headlines */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Headlines</h3>
          <button
            type="button"
            onClick={() =>
              setShowVariations((prev) => ({
                ...prev,
                headline: !prev.headline,
              }))
            }
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showVariations.headline ? "Hide variations" : "Add variations"}
          </button>
        </div>

        <div className="space-y-4">
          <Input
            label="Headline 1"
            name="headline1"
            value={formData.headline1}
            onChange={handleChange}
            placeholder="Main headline"
            required
          />

          {showVariations.headline && (
            <>
              <Input
                label="Headline 2 (optional)"
                name="headline2"
                value={formData.headline2}
                onChange={handleChange}
              />
              <Input
                label="Headline 3 (optional)"
                name="headline3"
                value={formData.headline3}
                onChange={handleChange}
              />
              <Input
                label="Headline 4 (optional)"
                name="headline4"
                value={formData.headline4}
                onChange={handleChange}
              />
              <Input
                label="Headline 5 (optional)"
                name="headline5"
                value={formData.headline5}
                onChange={handleChange}
              />
            </>
          )}
        </div>
      </Card>

      {/* Description */}
      <Card>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Description</h3>
        <Textarea
          label="Ad Description (optional)"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Additional description text..."
          rows={2}
        />
      </Card>

      {/* Link Settings */}
      <Card>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Link Settings</h3>
        <div className="space-y-4">
          <Input
            label="Destination URL"
            name="link"
            value={formData.link}
            onChange={handleChange}
            placeholder="https://example.com/landing-page"
            required
          />

          <Input
            label="Display Link (optional)"
            name="displayLink"
            value={formData.displayLink}
            onChange={handleChange}
            placeholder="https://example.com"
            helpText="Shown instead of the full URL"
          />

          <Textarea
            label="UTM Parameters (optional)"
            name="utmParameters"
            value={formData.utmParameters}
            onChange={handleChange}
            placeholder="utm_source=facebook&utm_campaign={{campaign.name}}&utm_content={{ad.name}}"
            rows={2}
            helpText="Will be appended to the destination URL"
          />

          <Select
            label="Call to Action"
            name="callToAction"
            value={formData.callToAction}
            onChange={handleChange}
            options={CTA_OPTIONS}
          />
        </div>
      </Card>

      {/* Error */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {initialData?.id ? "Update Template" : "Create Template"}
        </Button>
      </div>
    </form>
  );
}
