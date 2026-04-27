import type { IDetectMediaBody, IFakeDetectionResult, IUnsafeDetectionResult, TImageDetectBackend } from "@/typings/detect";
import { apiBase } from "@/utils/apiBase";
import {
  formatApiErrorPayload,
  normalizeUniversalFakeResult,
  normalizeUnsafeResult,
  normalizeVideoFakeResult,
  normalizeVolcImageFakeResult,
} from "@/utils/detect";

interface IPostJsonOptions {
  allowHtmlGuard?: boolean;
}

const postJson = async <TBody extends object>(
  endpoint: string,
  body: TBody,
  options: IPostJsonOptions = {},
): Promise<Record<string, unknown>> => {
  const response = await fetch(`${apiBase}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await response.text();

  if (options.allowHtmlGuard && text.trimStart().startsWith("<")) {
    throw new Error("代理未返回 JSON（可能未启动）：请先执行 node server/index.cjs");
  }

  let data: Record<string, unknown>;

  try {
    data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    throw new Error("检测接口返回格式错误");
  }

  if (!response.ok || data.error) {
    throw new Error(formatApiErrorPayload(data));
  }

  return data;
};

export const detectFakeImage = async ({
  body,
  backend,
  previewUrl,
}: {
  body: IDetectMediaBody;
  backend: TImageDetectBackend;
  previewUrl: string;
}): Promise<IFakeDetectionResult> => {
  if (backend === "volc") {
    const data = await postJson("/api/detect/volc-image-aigc", body);
    return normalizeVolcImageFakeResult(data, previewUrl);
  }

  const data = await postJson("/api/detect/universal-fake-detect", body);
  return normalizeUniversalFakeResult(data, previewUrl);
};

export const detectFakeVideo = async ({
  body,
  previewUrl,
}: {
  body: IDetectMediaBody;
  previewUrl: string;
}): Promise<IFakeDetectionResult> => {
  const data = await postJson("/api/detect/volc-video-aigc", body, { allowHtmlGuard: true });
  return normalizeVideoFakeResult(data, previewUrl);
};

export const detectUnsafeImage = async (body: IDetectMediaBody): Promise<IUnsafeDetectionResult> => {
  const data = await postJson("/api/detect/volc-ims", body);
  return normalizeUnsafeResult(data, "image");
};

export const detectUnsafeVideo = async (body: IDetectMediaBody): Promise<IUnsafeDetectionResult> => {
  const data = await postJson("/api/detect/volc-video-ims", body);
  return normalizeUnsafeResult(data, "video");
};
