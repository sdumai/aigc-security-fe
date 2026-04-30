import type { NavigateFunction } from "react-router-dom";

import { FAKE_DETECT_ROUTE, UNSAFE_DETECT_ROUTE } from "@/constants/routes";
import type { IContentSample, TGeneratedSourceModule } from "@/typings/content";
import type { IGeneratedDetectTransfer, IGeneratedDetectTransferLocationState, TGeneratedDetectTarget } from "@/typings/detect";
import type { IGenerateResult, TContentType } from "@/typings/generate";
import { dataUrlToFile } from "@/utils/media";

export const GENERATED_DETECT_TRANSFER_STATE_KEY = "generatedDetectTransfer";

const DETECT_TARGET_ROUTES: Record<TGeneratedDetectTarget, string> = {
  fake: FAKE_DETECT_ROUTE,
  unsafe: UNSAFE_DETECT_ROUTE,
};

const DETECT_TARGET_LABELS: Record<TGeneratedDetectTarget, string> = {
  fake: "AI 生成检测",
  unsafe: "敏感内容检测",
};

export const getDetectTargetLabel = (target: TGeneratedDetectTarget): string => DETECT_TARGET_LABELS[target];

export const isDataUrl = (url: string): boolean => url.startsWith("data:");

export const isHttpUrl = (url: string): boolean => /^https?:\/\//i.test(url);

export const shouldUseTransferAsFile = (transferOrUrl: IGeneratedDetectTransfer | string): boolean => {
  const url = typeof transferOrUrl === "string" ? transferOrUrl : transferOrUrl.url;

  if (typeof transferOrUrl !== "string" && transferOrUrl.storageType === "local") {
    return true;
  }

  return isDataUrl(url) || !isHttpUrl(url);
};

export const createFileFromTransfer = async (transfer: IGeneratedDetectTransfer): Promise<File> => {
  if (isDataUrl(transfer.url)) {
    return dataUrlToFile(transfer.url, transfer.filename);
  }

  const response = await fetch(transfer.url);

  if (!response.ok) {
    throw new Error("无法读取本地样本文件");
  }

  const blob = await response.blob();
  return new File([blob], transfer.filename, { type: blob.type || "application/octet-stream" });
};

export const getGeneratedResultUrl = (result: IGenerateResult | null, mediaType: TContentType): string => {
  if (!result) {
    return "";
  }

  return mediaType === "image" ? result.imageUrl || "" : result.videoUrl || "";
};

export const getGeneratedDetectFilename = (mediaType: TContentType, format?: string): string => {
  const extension = mediaType === "image" ? (format === "data_url" ? "png" : "jpg") : "mp4";
  return `generated-sample-${Date.now()}.${extension}`;
};

export const sendGeneratedResultToDetect = ({
  navigate,
  result,
  mediaType,
  target,
  title,
  model,
  sourceModule,
  sampleId,
}: {
  navigate: NavigateFunction;
  result: IGenerateResult | null;
  mediaType: TContentType;
  target: TGeneratedDetectTarget;
  title?: string;
  model?: string;
  sourceModule?: TGeneratedSourceModule;
  sampleId?: string;
}): boolean => {
  const url = getGeneratedResultUrl(result, mediaType);

  if (!url) {
    return false;
  }

  const transfer: IGeneratedDetectTransfer = {
    source: "generation",
    target,
    mediaType,
    url,
    format: result?.format,
    title,
    model,
    sourceModule,
    filename: getGeneratedDetectFilename(mediaType, result?.format),
    sampleId,
    createdAt: Date.now(),
  };

  navigate(DETECT_TARGET_ROUTES[target], {
    state: {
      [GENERATED_DETECT_TRANSFER_STATE_KEY]: transfer,
    } satisfies IGeneratedDetectTransferLocationState,
  });

  return true;
};

export const sendContentSampleToDetect = ({
  navigate,
  sample,
  target,
}: {
  navigate: NavigateFunction;
  sample: IContentSample;
  target: TGeneratedDetectTarget;
}): void => {
  const transfer: IGeneratedDetectTransfer = {
    source: "generation",
    target,
    mediaType: sample.type,
    url: sample.fullUrl,
    format: "url",
    title: sample.title,
    model: sample.model,
    sourceModule: sample.sourceModule,
    filename: sample.mediaFilename || getGeneratedDetectFilename(sample.type, "url"),
    sampleId: sample.id,
    storageType: sample.storageType,
    createdAt: Date.now(),
  };

  navigate(DETECT_TARGET_ROUTES[target], {
    state: {
      [GENERATED_DETECT_TRANSFER_STATE_KEY]: transfer,
    } satisfies IGeneratedDetectTransferLocationState,
  });
};

export const getGeneratedDetectTransfer = (
  state: unknown,
  target: TGeneratedDetectTarget,
): IGeneratedDetectTransfer | null => {
  if (typeof state !== "object" || state === null) {
    return null;
  }

  const maybeState = state as IGeneratedDetectTransferLocationState;
  const transfer = maybeState.generatedDetectTransfer;

  if (
    transfer?.source !== "generation" ||
    transfer.target !== target ||
    (transfer.mediaType !== "image" && transfer.mediaType !== "video") ||
    typeof transfer.url !== "string" ||
    transfer.url.length === 0
  ) {
    return null;
  }

  return transfer;
};
