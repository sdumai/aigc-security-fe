import type { TDetectContentKind, TGeneratedDetectTarget } from "@/typings/detect";
import type { TContentType } from "@/typings/generate";

export type TGeneratedSourceModule = "text-to-image" | "text-to-video" | "image-to-video" | "deepfake" | "manual";

export type TContentStorageType = "local" | "remote";

export interface IContentLatestDetection {
  type: TGeneratedDetectTarget;
  result: string;
  score?: number;
  createdAt: string;
}

export interface IContentDetectionStatus {
  fake: boolean;
  unsafe: boolean;
}

export interface IContentSample {
  id: string;
  type: TContentType;
  title: string;
  sourceModule: TGeneratedSourceModule;
  model?: string;
  prompt?: string;
  fullUrl: string;
  thumbnailUrl: string;
  storageType: TContentStorageType;
  mediaFilename?: string;
  mimeType?: string;
  size: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
  detectionStatus: IContentDetectionStatus;
  latestDetection?: IContentLatestDetection;
}

export interface ISaveContentSamplePayload {
  type: TContentType;
  title: string;
  url: string;
  sourceModule?: TGeneratedSourceModule;
  model?: string;
  prompt?: string;
}

export interface IContentDetectionRecord {
  id: string;
  sampleId?: string;
  type: TGeneratedDetectTarget;
  mediaType: TDetectContentKind;
  filename: string;
  result: string;
  confidence?: number;
  riskScore?: number;
  model?: string;
  detectorModel?: string;
  sourceModule?: TGeneratedSourceModule;
  sourceTitle?: string;
  sourceModel?: string;
  sourcePrompt?: string;
  sourceUrl?: string;
  sourceThumbnailUrl?: string;
  previewUrl?: string;
  labels?: string[];
  rawResult?: unknown;
  createdAt: string;
}

export interface ISaveDetectionRecordPayload {
  sampleId?: string;
  type: TGeneratedDetectTarget;
  mediaType: TDetectContentKind;
  filename: string;
  result: string;
  confidence?: number;
  riskScore?: number;
  model?: string;
  detectorModel?: string;
  sourceModule?: TGeneratedSourceModule;
  sourceTitle?: string;
  sourceModel?: string;
  sourcePrompt?: string;
  sourceUrl?: string;
  sourceThumbnailUrl?: string;
  previewUrl?: string;
  labels?: string[];
  rawResult?: unknown;
}
