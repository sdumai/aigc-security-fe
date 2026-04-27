import type { UploadFile } from "antd";

import {
  DATA_URL_BODY_MATCH_INDEX,
  DATA_URL_MIME_MATCH_INDEX,
  DATA_URL_PAYLOAD_INDEX,
  EMPTY_LENGTH,
  LOOP_INCREMENT_STEP,
  PLAIN_TEXT_FILE_MIME,
} from "@/constants/media";
import type { TMediaFormat } from "@/typings/generate";

interface IUploadSourceFile extends File {
  uid?: string;
}

export const readBlobAsDataUrl = (file: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const getUploadPreviewUrl = async (file: UploadFile): Promise<string> => {
  if (typeof file.url === "string" && file.url.length > EMPTY_LENGTH) {
    return file.url;
  }

  if (typeof file.thumbUrl === "string" && file.thumbUrl.length > EMPTY_LENGTH) {
    return file.thumbUrl;
  }

  if (file.originFileObj) {
    return readBlobAsDataUrl(file.originFileObj);
  }

  return "";
};

export const getBase64FromUploadFile = async (file: UploadFile): Promise<string> => {
  if (typeof file.url === "string" && file.url.includes(",")) {
    return file.url.split(",")[DATA_URL_PAYLOAD_INDEX] || "";
  }

  if (!file.originFileObj) {
    return "";
  }

  const dataUrl = await readBlobAsDataUrl(file.originFileObj);
  return dataUrl.includes(",") ? dataUrl.split(",")[DATA_URL_PAYLOAD_INDEX] || "" : dataUrl;
};

export const createUploadFile = (file: IUploadSourceFile, dataUrl?: string): UploadFile => {
  return {
    uid: file.uid || `${Date.now()}-${file.name}`,
    name: file.name,
    status: "done",
    url: dataUrl,
    originFileObj: file as UploadFile["originFileObj"],
  };
};

export const dataUrlToBlob = (dataUrl: string): Blob => {
  const match = dataUrl.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!match) {
    throw new Error("无效的 data URL");
  }

  const binary = atob(match[DATA_URL_BODY_MATCH_INDEX].replace(/\s/g, ""));
  const bytes = new Uint8Array(binary.length);

  for (let index = EMPTY_LENGTH; index < binary.length; index += LOOP_INCREMENT_STEP) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: match[DATA_URL_MIME_MATCH_INDEX] || "application/octet-stream" });
};

export const normalizeImageUrlFromApi = (rawUrl: string): { imageUrl: string; format: TMediaFormat } => {
  const trimmedUrl = rawUrl.trim();
  const isDataUrl =
    trimmedUrl.startsWith("data:") ||
    (!trimmedUrl.startsWith("http://") && !trimmedUrl.startsWith("https://"));
  const imageUrl = isDataUrl && !trimmedUrl.startsWith("data:") ? `data:image/png;base64,${trimmedUrl}` : trimmedUrl;

  return {
    imageUrl,
    format: imageUrl.startsWith("data:") ? "data_url" : "url",
  };
};

export const normalizeVideoUrlFromApi = (rawUrl: string): { videoUrl: string; format: TMediaFormat } => {
  const trimmedUrl = rawUrl.trim();

  if (!trimmedUrl) {
    return { videoUrl: trimmedUrl, format: "url" };
  }

  if (trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://")) {
    return { videoUrl: trimmedUrl, format: "url" };
  }

  if (trimmedUrl.startsWith("data:")) {
    return { videoUrl: trimmedUrl, format: "data_url" };
  }

  return {
    videoUrl: `data:video/mp4;base64,${trimmedUrl.replace(/\s/g, "")}`,
    format: "data_url",
  };
};

export const getMediaBlob = async (url: string): Promise<Blob> => {
  if (url.startsWith("data:")) {
    return dataUrlToBlob(url);
  }

  const response = await fetch(url);
  return response.blob();
};

export const downloadMedia = async (url: string, filename: string): Promise<void> => {
  const blob = await getMediaBlob(url);
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  try {
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
  } finally {
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  }
};

export const downloadTextFile = (content: string, filename: string): void => {
  const blob = new Blob([content], { type: PLAIN_TEXT_FILE_MIME });
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  try {
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
  } finally {
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  }
};
