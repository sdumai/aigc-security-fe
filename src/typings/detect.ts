import type { ReactNode } from "react";
import type { TMediaFormat } from "@/typings/generate";

export type TDetectInputTab = "upload" | "url";

export type TDetectContentKind = "image" | "video";

export type TImageDetectBackend = "volc" | "universal";

export type TRiskLevel = "low" | "medium" | "high";

export type TGeneratedDetectTarget = "fake" | "unsafe";

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
  fps?: number;
}

export interface IGeneratedDetectTransfer {
  source: "generation";
  target: TGeneratedDetectTarget;
  mediaType: TDetectContentKind;
  url: string;
  format?: TMediaFormat;
  title?: string;
  filename: string;
  createdAt: number;
}

export interface IGeneratedDetectTransferLocationState {
  generatedDetectTransfer?: IGeneratedDetectTransfer;
}

export interface IRiskConfig {
  color: string;
  text: string;
  icon: ReactNode;
}
