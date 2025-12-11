import Papa from "papaparse";

export interface CSVAdRow {
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
  partnershipCode?: string;
  launchPaused: boolean;
  videoUrls?: string[];
  adSetIds: string[];
  carouselCards: CarouselCard[];
  // Validation
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface CarouselCard {
  mediaUrl?: string;
  portraitMediaUrl?: string;
  title?: string;
  description?: string;
  link?: string;
}

const COLUMN_MAPPING: Record<string, string> = {
  "Row Type": "rowType",
  "Custom Name": "customName",
  "Primary Text Variation 1": "primaryText1",
  "Primary Text Variation 2": "primaryText2",
  "Primary Text Variation 3": "primaryText3",
  "Primary Text Variation 4": "primaryText4",
  "Primary Text Variation 5": "primaryText5",
  "Headline Variation 1": "headline1",
  "Headline Variation 2": "headline2",
  "Headline Variation 3": "headline3",
  "Headline Variation 4": "headline4",
  "Headline Variation 5": "headline5",
  "Ad Description": "adDescription",
  Link: "link",
  "Display Link": "displayLink",
  "UTM Parameters": "utmParameters",
  CTA: "callToAction",
  "Partnership Code": "partnershipCode",
  "Launch Paused": "launchPaused",
  "Video URLs": "videoUrls",
  "Ad Set IDs": "adSetIds",
};

export function parseCSV(csvContent: string): CSVAdRow[] {
  const result = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  const rows: CSVAdRow[] = [];

  result.data.forEach((rawRow, index) => {
    const row = normalizeRow(rawRow);
    const parsedRow = parseRow(row, index);
    rows.push(parsedRow);
  });

  return rows;
}

function normalizeRow(
  rawRow: Record<string, string>
): Record<string, string> {
  const normalized: Record<string, string> = {};

  for (const [key, value] of Object.entries(rawRow)) {
    const normalizedKey = COLUMN_MAPPING[key] || key;
    normalized[normalizedKey] = value?.trim() || "";
  }

  return normalized;
}

function parseRow(row: Record<string, string>, index: number): CSVAdRow {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Parse row type
  const rowType = row.rowType === "Carousel" ? "Carousel" : "Single";

  // Parse primary text variations
  const primaryTextVariations: string[] = [];
  for (let i = 1; i <= 5; i++) {
    const text = row[`primaryText${i}`];
    if (text) primaryTextVariations.push(text);
  }

  // Parse headline variations
  const headlineVariations: string[] = [];
  for (let i = 1; i <= 5; i++) {
    const text = row[`headline${i}`];
    if (text) headlineVariations.push(text);
  }

  // Parse video URLs
  const videoUrls = row.videoUrls
    ? row.videoUrls.split(",").map((url) => url.trim()).filter(Boolean)
    : [];

  // Parse ad set IDs
  const adSetIds = row.adSetIds
    ? row.adSetIds.split(",").map((id) => id.trim()).filter(Boolean)
    : [];

  // Parse carousel cards
  const carouselCards: CarouselCard[] = [];
  for (let i = 1; i <= 10; i++) {
    const mediaUrl = row[`Carousel ${i} Media URL`];
    const portraitMediaUrl = row[`Carousel ${i} Portrait Media URL`];
    const title = row[`Carousel ${i} Title`];
    const description = row[`Carousel ${i} Description`];
    const link = row[`Carousel ${i} Link`];

    if (mediaUrl || title) {
      carouselCards.push({
        mediaUrl,
        portraitMediaUrl,
        title,
        description,
        link,
      });
    }
  }

  // Validation
  if (primaryTextVariations.length === 0) {
    errors.push("Missing primary text");
  }

  if (headlineVariations.length === 0) {
    errors.push("Missing headline");
  }

  if (!row.link && rowType === "Single") {
    errors.push("Missing destination link");
  }

  if (adSetIds.length === 0) {
    errors.push("Missing ad set IDs");
  }

  // For single ads, need video URL or carousel mode
  if (rowType === "Single" && videoUrls.length === 0) {
    warnings.push("No video/image URL specified - will need to select media");
  }

  // For carousel, need at least 2 cards
  if (rowType === "Carousel" && carouselCards.length < 2) {
    errors.push("Carousel needs at least 2 cards");
  }

  const isValid = errors.length === 0;

  return {
    rowIndex: index,
    rowType,
    customName: row.customName,
    primaryTextVariations,
    headlineVariations,
    adDescription: row.adDescription,
    link: row.link,
    displayLink: row.displayLink,
    utmParameters: row.utmParameters,
    callToAction: row.callToAction || "LEARN_MORE",
    partnershipCode: row.partnershipCode,
    launchPaused: row.launchPaused?.toLowerCase() === "yes",
    videoUrls,
    adSetIds,
    carouselCards,
    isValid,
    errors,
    warnings,
  };
}

export function validateCSVRows(rows: CSVAdRow[]): {
  valid: CSVAdRow[];
  invalid: CSVAdRow[];
  totalErrors: number;
  totalWarnings: number;
} {
  const valid = rows.filter((r) => r.isValid);
  const invalid = rows.filter((r) => !r.isValid);
  const totalErrors = rows.reduce((sum, r) => sum + r.errors.length, 0);
  const totalWarnings = rows.reduce((sum, r) => sum + r.warnings.length, 0);

  return { valid, invalid, totalErrors, totalWarnings };
}

export function generateSampleCSV(): string {
  const headers = [
    "Row Type",
    "Custom Name",
    "Primary Text Variation 1",
    "Headline Variation 1",
    "Ad Description",
    "Link",
    "Display Link",
    "UTM Parameters",
    "CTA",
    "Partnership Code",
    "Launch Paused",
    "Video URLs",
    "Ad Set IDs",
    "Headline Variation 2",
    "Headline Variation 3",
    "Primary Text Variation 2",
    "Primary Text Variation 3",
  ];

  const sampleRow = [
    "Single",
    "my_ad_name",
    "This is the primary ad text...",
    "Main Headline",
    "Optional description",
    "https://example.com/landing",
    "https://example.com",
    "utm_source=facebook&utm_campaign={{campaign.name}}",
    "LEARN_MORE",
    "",
    "No",
    "https://media.example.com/video.mp4",
    "123456789012345",
    "Headline Variation 2",
    "",
    "Alternative primary text...",
    "",
  ];

  return Papa.unparse([headers, sampleRow]);
}
