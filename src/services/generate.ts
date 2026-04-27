import {
  DEFAULT_MODELSCOPE_FRAME_COUNT,
  DEFAULT_MODELSCOPE_INFERENCE_STEPS,
  FACE_SWAP_MODEL_V36,
  IMAGE_MODEL_OPTIONS,
  VIDEO_MODEL_OPTIONS,
} from "@/constants/generate";
import type {
  IImageGenerateResult,
  IVideoGenerateResult,
  TDeepfakeModel,
  TFaceSwapFaceType,
  TFaceSwapLogoLanguage,
  TFaceSwapLogoPosition,
  TImageModel,
  TVideoModel,
} from "@/typings/generate";
import { apiBase } from "@/utils/apiBase";
import { normalizeImageUrlFromApi, normalizeVideoUrlFromApi } from "@/utils/media";

interface IApiData {
  imageUrl?: string;
  videoUrl?: string;
  message?: string;
  error?: string;
  format?: string;
}

export interface IFaceSwapGenerateParams {
  imageBase64: string;
  templateBase64: string;
  model?: TDeepfakeModel;
  sourceSimilarity?: number;
  doRisk?: boolean;
  faceType?: TFaceSwapFaceType;
  sourceLocation?: number;
  templateLocation?: number;
  returnUrl?: boolean;
  addLogo?: boolean;
  logoPosition?: TFaceSwapLogoPosition;
  logoLanguage?: TFaceSwapLogoLanguage;
  logoOpacity?: number;
  logoText?: string;
}

export interface IFaceAnimationGenerateParams {
  imageBase64: string;
  prompt: string;
}

export interface ISeedEditGenerateParams {
  imageBase64: string;
  prompt: string;
  scale?: number;
  seed?: number;
}

export interface ITextToImageGenerateParams {
  model: TImageModel;
  prompt: string;
  size: string;
  watermark: boolean;
}

export interface ITextToVideoGenerateParams {
  model: TVideoModel;
  prompt: string;
  ratio?: string;
  duration?: string;
  frameCount?: string;
  inferenceSteps?: string;
}

export interface IImageToVideoGenerateParams {
  prompt: string;
  imageBase64List: string[];
  ratio: string;
  duration: string;
}

const parseJsonResponse = async (response: Response): Promise<IApiData> => {
  const text = await response.text();

  if (!text.trim()) {
    throw new Error(response.ok ? "未返回有效数据" : `请求失败 ${response.status}，请检查后端服务是否启动`);
  }

  try {
    return JSON.parse(text) as IApiData;
  } catch {
    throw new Error(response.ok ? "返回格式异常" : `请求失败 ${response.status}，请检查后端服务`);
  }
};

const postJson = async <TBody extends object>(endpoint: string, body: TBody): Promise<IApiData> => {
  const response = await fetch(`${apiBase}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(data.error || "请求失败");
  }

  return data;
};

const requireImageUrl = (data: IApiData, defaultMessage: string): IImageGenerateResult => {
  const rawUrl = typeof data.imageUrl === "string" ? data.imageUrl.trim() : "";

  if (!rawUrl) {
    throw new Error("未返回图片数据");
  }

  const normalized = normalizeImageUrlFromApi(rawUrl);
  const format = data.format === "data_url" || data.format === "url" ? data.format : normalized.format;

  return {
    imageUrl: normalized.imageUrl,
    message: data.message || defaultMessage,
    format,
  };
};

const requireVideoUrl = (data: IApiData, defaultMessage: string): IVideoGenerateResult => {
  const rawUrl = typeof data.videoUrl === "string" ? data.videoUrl.trim() : "";

  if (!rawUrl) {
    throw new Error("未返回视频地址");
  }

  const normalized = normalizeVideoUrlFromApi(rawUrl);
  const format = data.format === "data_url" || data.format === "url" ? data.format : normalized.format;

  return {
    videoUrl: normalized.videoUrl,
    message: data.message || defaultMessage,
    format,
  };
};

export const generateFaceSwap = async (params: IFaceSwapGenerateParams): Promise<IImageGenerateResult> => {
  const endpoint = params.model === FACE_SWAP_MODEL_V36 ? "/api/generate/faceswap-3.6" : "/api/generate/faceswap";
  const data = await postJson(endpoint, {
    imageBase64: params.imageBase64,
    templateBase64: params.templateBase64,
    sourceSimilarity: params.sourceSimilarity,
    doRisk: params.doRisk,
    faceType: params.faceType,
    sourceLocation: params.sourceLocation,
    templateLocation: params.templateLocation,
    returnUrl: params.returnUrl,
    addLogo: params.addLogo,
    logoPosition: params.logoPosition,
    logoLanguage: params.logoLanguage,
    logoOpacity: params.logoOpacity,
    logoText: params.logoText,
  });
  return requireImageUrl(data, "人脸替换完成。");
};

export const generateFaceAnimation = async (
  params: IFaceAnimationGenerateParams,
): Promise<IVideoGenerateResult> => {
  const data = await postJson("/api/generate/fomm", params);
  return requireVideoUrl(data, "人脸动画视频生成成功。");
};

export const generateSeedEdit = async (params: ISeedEditGenerateParams): Promise<IImageGenerateResult> => {
  const data = await postJson("/api/generate/seededit", params);
  return requireImageUrl(data, "属性编辑完成。");
};

export const generateTextToImage = async (params: ITextToImageGenerateParams): Promise<IImageGenerateResult> => {
  const modelOption = IMAGE_MODEL_OPTIONS.find((option) => option.value === params.model);
  const data = await postJson(modelOption?.endpoint || "/api/generate/image", {
    prompt: params.prompt,
    size: params.size,
    watermark: params.watermark,
  });

  return requireImageUrl(data, "图像生成成功！");
};

export const generateTextToVideo = async (params: ITextToVideoGenerateParams): Promise<IVideoGenerateResult> => {
  const modelOption = VIDEO_MODEL_OPTIONS.find((option) => option.value === params.model);
  const isModelScope = params.model === "modelscope";
  const body = isModelScope
    ? {
        prompt: params.prompt,
        num_frames: Number(params.frameCount) || DEFAULT_MODELSCOPE_FRAME_COUNT,
        num_inference_steps: Number(params.inferenceSteps) || DEFAULT_MODELSCOPE_INFERENCE_STEPS,
      }
    : {
        prompt: params.prompt,
        ratio: params.ratio,
        duration: params.duration,
      };
  const data = await postJson(modelOption?.endpoint || "/api/generate/t2v", body);

  return requireVideoUrl(data, "视频生成成功！");
};

export const generateImageToVideo = async (params: IImageToVideoGenerateParams): Promise<IVideoGenerateResult> => {
  const data = await postJson("/api/generate/i2v", {
    prompt: params.prompt,
    imageBase64List: params.imageBase64List,
    ratio: params.ratio,
    duration: params.duration,
  });

  return requireVideoUrl(data, "视频生成成功！");
};
