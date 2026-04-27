import type { UploadFile } from "antd";

import {
  BLOCK_RISK_SCORE,
  DEFAULT_BLOCK_SCORE,
  DEFAULT_NEGATIVE_CONFIDENCE,
  DEFAULT_POSITIVE_CONFIDENCE,
  DEFAULT_REVIEW_SCORE,
  EMPTY_RESULT_COUNT,
  MAX_NORMALIZED_SCORE,
  MIN_NORMALIZED_SCORE,
  PERCENT_MULTIPLIER,
  REVIEW_RISK_SCORE,
  RISK_SCORE_DENOMINATOR,
  REMOTE_UPLOAD_UID,
  REPORT_LIST_START_INDEX,
  SAFE_IMAGE_LABEL_SCORE_STEP,
  SAFE_IMAGE_RISK_BASE_SCORE,
  SAFE_IMAGE_RISK_MAX_SCORE,
  SAFE_RISK_SCORE,
} from "@/constants/detect";
import type {
  IApiErrorPayload,
  IDetectMediaBody,
  IFakeDetectionResult,
  IUnsafeDetectionResult,
  TRiskLevel,
} from "@/typings/detect";
import { getBase64FromUploadFile } from "@/utils/media";

export const clampScore = (score: number): number => {
  return Math.min(MAX_NORMALIZED_SCORE, Math.max(MIN_NORMALIZED_SCORE, score));
};

export const scoreToPercent = (score: number): number => {
  return Math.round(score * PERCENT_MULTIPLIER);
};

export const formatApiErrorPayload = (data: IApiErrorPayload): string => {
  const detail = data.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail.map((item: { msg?: string }) => item?.msg || String(item)).join("；") || "请求无效";
  }

  return data.error || "检测失败";
};

export const assertValidUrl = (url: string, message: string): void => {
  try {
    new URL(url);
  } catch {
    throw new Error(message);
  }
};

export const createRemoteUploadFile = (url: string): UploadFile => {
  return {
    uid: REMOTE_UPLOAD_UID,
    name: url.split("/").pop() || "remote-file",
    status: "done",
    url,
  };
};

export const createImageDetectBody = async (
  inputTab: "upload" | "url",
  uploadedFile: UploadFile | null,
  urlInput: string,
): Promise<IDetectMediaBody> => {
  if (inputTab === "url" && urlInput.trim()) {
    return { imageUrl: urlInput.trim() };
  }

  if (!uploadedFile) {
    throw new Error("无法获取图片内容，请重新上传或输入 URL");
  }

  const imageBase64 = await getBase64FromUploadFile(uploadedFile);

  if (!imageBase64) {
    throw new Error("无法读取图片，请重新上传");
  }

  return { imageBase64 };
};

export const normalizeVolcImageFakeResult = (
  data: Record<string, unknown>,
  previewUrl: string,
): IFakeDetectionResult => {
  const isAIGenerated = data.isAIGenerated === true;
  const confidence =
    typeof data.confidence === "number"
      ? clampScore(data.confidence)
      : isAIGenerated
        ? DEFAULT_POSITIVE_CONFIDENCE
        : DEFAULT_NEGATIVE_CONFIDENCE;
  const reason = typeof data.reason === "string" ? data.reason.trim() : "";

  return {
    isFake: isAIGenerated,
    confidence,
    rawScore: confidence,
    model: "火山引擎",
    details: { artifacts: reason ? [reason] : isAIGenerated ? ["判定为 AI 生成/合成"] : [] },
    heatmapUrl: previewUrl,
  };
};

export const normalizeUniversalFakeResult = (
  data: Record<string, unknown>,
  previewUrl: string,
): IFakeDetectionResult => {
  const isFake = data.is_ai_generated === true;
  const score =
    typeof data.score === "number" && !Number.isNaN(data.score)
      ? clampScore(data.score)
      : isFake
        ? DEFAULT_POSITIVE_CONFIDENCE
        : DEFAULT_NEGATIVE_CONFIDENCE;
  const message = typeof data.message === "string" ? data.message.trim() : "";
  const artifacts: string[] = [];

  if (message) {
    artifacts.push(message);
  }

  if (typeof data.arch === "string" && data.arch) {
    artifacts.push(`模型架构: ${data.arch}`);
  }

  if (typeof data.threshold === "number") {
    artifacts.push(`判定阈值: ${data.threshold}`);
  }

  return {
    isFake,
    confidence: score,
    rawScore: score,
    model: "UniversalFakeDetect",
    details: { artifacts },
    heatmapUrl: previewUrl,
  };
};

export const normalizeVideoFakeResult = (data: Record<string, unknown>, previewUrl: string): IFakeDetectionResult => {
  const isFake = data.isFake === true;
  const confidence =
    typeof data.confidence === "number" && !Number.isNaN(data.confidence)
      ? clampScore(data.confidence)
      : isFake
        ? DEFAULT_POSITIVE_CONFIDENCE
        : DEFAULT_NEGATIVE_CONFIDENCE;

  return {
    isFake,
    confidence,
    rawScore: confidence,
    model: typeof data.model === "string" ? data.model : "视频 AI 生成识别",
    heatmapUrl: typeof data.heatmapUrl === "string" ? data.heatmapUrl : previewUrl,
    details: typeof data.details === "object" && data.details !== null ? data.details : {},
  } as IFakeDetectionResult;
};

export const getRiskBySuggestion = (suggestion: string): TRiskLevel => {
  if (suggestion === "block") {
    return "high";
  }

  if (suggestion === "review") {
    return "medium";
  }

  return "low";
};

export const normalizeUnsafeResult = (
  data: Record<string, unknown>,
  mode: "image" | "video",
): IUnsafeDetectionResult => {
  const safe = data.safe === true;
  const suggestion = typeof data.suggestion === "string" ? data.suggestion.toLowerCase() : "pass";
  const labels = Array.isArray(data.labels) ? data.labels.map(String) : [];
  const reason = typeof data.reason === "string" ? data.reason : "";
  const risk = getRiskBySuggestion(suggestion);
  const riskScore = safe
    ? mode === "image"
      ? Math.min(SAFE_IMAGE_RISK_MAX_SCORE, SAFE_IMAGE_RISK_BASE_SCORE + labels.length * SAFE_IMAGE_LABEL_SCORE_STEP)
      : SAFE_RISK_SCORE
    : suggestion === "block"
      ? BLOCK_RISK_SCORE
      : REVIEW_RISK_SCORE;
  const suggestions = safe
    ? ["内容安全，可以正常发布", reason || "未检测到违规内容"]
    : [reason || "建议人工复审", ...labels.map((label) => `违规类型：${label}`)];
  const details: IUnsafeDetectionResult["details"] = {};

  labels.forEach((label) => {
    details[label] = { score: suggestion === "block" ? DEFAULT_BLOCK_SCORE : DEFAULT_REVIEW_SCORE };
  });

  return {
    violations: labels,
    risk,
    riskScore,
    suggestions,
    details,
  };
};

export const createUnsafeReport = ({
  result,
  filename,
  riskText,
  violationLabels,
}: {
  result: IUnsafeDetectionResult;
  filename: string;
  riskText: string;
  violationLabels: Record<string, string>;
}): string => {
  const violationSection =
    result.violations.length > EMPTY_RESULT_COUNT
      ? `
检测到的违规类型
----------------
${result.violations.map((violate, index) => `${index + REPORT_LIST_START_INDEX}. ${violationLabels[violate] || violate}`).join("\n")}

详细分析
--------
${Object.entries(result.details)
  .map(([key, value]) => {
    const regionText = value.regions && value.regions.length > EMPTY_RESULT_COUNT ? ` (检测到 ${value.regions.length} 处可疑区域)` : "";
    return `${violationLabels[key] || key}：${scoreToPercent(value.score)}%${regionText}`;
  })
  .join("\n")}
`
      : `
内容安全状态
------------
未检测到违规内容，内容安全。
`;

  return `
不安全内容检测报告
==================

检测时间：${new Date().toLocaleString("zh-CN")}
文件名称：${filename}

检测结果
--------
风险等级：${riskText}
风险评分：${result.riskScore}/${RISK_SCORE_DENOMINATOR}

${violationSection}

处理建议
--------
${result.suggestions.map((suggestion, index) => `${index + REPORT_LIST_START_INDEX}. ${suggestion}`).join("\n")}

---
此报告由 AIGC 安全性研究与工具平台自动生成
`;
};
