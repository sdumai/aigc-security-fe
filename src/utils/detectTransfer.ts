import type { NavigateFunction } from "react-router-dom";

import { FAKE_DETECT_ROUTE, UNSAFE_DETECT_ROUTE } from "@/constants/routes";
import type { IGeneratedDetectTransfer, IGeneratedDetectTransferLocationState, TGeneratedDetectTarget } from "@/typings/detect";
import type { IGenerateResult, TContentType } from "@/typings/generate";

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
}: {
  navigate: NavigateFunction;
  result: IGenerateResult | null;
  mediaType: TContentType;
  target: TGeneratedDetectTarget;
  title?: string;
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
    filename: getGeneratedDetectFilename(mediaType, result?.format),
    createdAt: Date.now(),
  };

  navigate(DETECT_TARGET_ROUTES[target], {
    state: {
      [GENERATED_DETECT_TRANSFER_STATE_KEY]: transfer,
    } satisfies IGeneratedDetectTransferLocationState,
  });

  return true;
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
