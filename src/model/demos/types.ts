/** Sample catalog buckets (Samples panel sections). */
export type DemoBucket =
  | "business"
  | "mass-publication"
  | "personal"
  | "ads";

export const DEMO_BUCKET_ORDER: DemoBucket[] = [
  "business",
  "mass-publication",
  "personal",
  "ads",
];

export const DEMO_BUCKET_LABEL: Record<DemoBucket, string> = {
  business: "Business",
  "mass-publication": "Mass publication",
  personal: "Personal",
  ads: "Ads",
};

export interface DemoEntry {
  id: string;
  title: string;
  /** Fine-grained eyebrow (Finance, Legal, …). */
  category: string;
  /** Samples panel section. */
  bucket: DemoBucket;
  blurb: string;
  sampleCsv: string;
  artboard?: import("../document").CanvasPresetId;
  build: () => import("../document").Project;
}
