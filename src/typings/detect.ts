import type { ReactNode } from "react";

export type TDetectInputTab = "upload" | "url";

export type TDetectContentKind = "image" | "video";

export type TImageDetectBackend = "volc" | "universal";

export type TRiskLevel = "low" | "medium" | "high";

export interface IFaceRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface IFakeDetectionResult {
  isFake: boolean;
  confidence: number;
  rawScore?: number;
  heatmapUrl: string;
  model: string;
  details: {
    faceRegion?: IFaceRegion;
    artifacts?: string[];
    segmentRatio?: number;
    segmentConclusion?: string;
  };
}

export interface IUnsafeDetectionDetail {
  score: number;
  regions?: IFaceRegion[];
}

export interface IUnsafeDetectionResult {
  violations: string[];
  risk: TRiskLevel;
  riskScore: number;
  suggestions: string[];
  details: Record<string, IUnsafeDetectionDetail>;
}

export interface IApiErrorPayload {
  error?: string;
  detail?: unknown;
}

export interface IDetectMediaBody {
  imageUrl?: string;
  imageBase64?: string;
  videoUrl?: string;
  videoBase64?: string;
}

export interface IRiskConfig {
  color: string;
  text: string;
  icon: ReactNode;
}
