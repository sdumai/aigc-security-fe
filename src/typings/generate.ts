import type { ReactNode } from "react";

export type TMediaFormat = "url" | "data_url";

export type TContentType = "image" | "video";

export type TDeepfakeFunction = "faceswap" | "fomm" | "stargan";

export type TFaceSwapModel = "Volc FaceSwap 2.0" | "Volc FaceSwap 3.6";

export type TFaceAnimationModel = "Seedance Lite I2V";

export type TAttributeEditModel = "SeedEdit 3.0";

export type TDeepfakeModel = TFaceSwapModel | TFaceAnimationModel | TAttributeEditModel;

export type TFaceSwapFaceType = "area" | "l2r" | "t2b";

export type TFaceSwapLogoPosition = "0" | "1" | "2" | "3";

export type TFaceSwapLogoLanguage = "0" | "1";

export type TSeedEditSeedMode = "random" | "fixed";

export type TImageModel = "volc" | "volc-seedream-4-5" | "stable-diffusion";

export type TImageResponseFormat = "url" | "b64_json";

export type TImageOutputFormat = "jpeg" | "png";

export type TVideoModel = "volc" | "volc-seedance-1-5-pro" | "volc-seedance-2-fast" | "modelscope";

export type TVideoResolution = "480p" | "720p" | "1080p";

export type TVideoRatio = "adaptive" | "16:9" | "4:3" | "1:1" | "3:4" | "9:16" | "21:9";

export interface ISelectOption<TValue extends string = string> {
  value: TValue;
  label: ReactNode;
}

export interface IModelOption<TValue extends string = string> extends ISelectOption<TValue> {
  endpoint: string;
}

export interface IGenerateResult {
  imageUrl?: string;
  videoUrl?: string;
  message: string;
  format?: TMediaFormat;
}

export interface IImageGenerateResult {
  imageUrl: string;
  message: string;
  format: TMediaFormat;
}

export interface IVideoGenerateResult {
  videoUrl: string;
  message: string;
  format: TMediaFormat;
}

export interface ISaveGeneratedContentPayload {
  type: TContentType;
  title: string;
  url: string;
  model?: string;
}

export interface IDeepfakeFormValues {
  function: TDeepfakeFunction;
  model: TDeepfakeModel;
  fommPrompt?: string;
  editPrompt?: string;
  faceSwapSourceSimilarity?: number;
  faceSwapDoRisk?: boolean;
  faceSwapFaceType?: TFaceSwapFaceType;
  faceSwapSourceLocation?: number;
  faceSwapTemplateLocation?: number;
  faceSwapReturnUrl?: boolean;
  faceSwapAddLogo?: boolean;
  faceSwapLogoPosition?: TFaceSwapLogoPosition;
  faceSwapLogoLanguage?: TFaceSwapLogoLanguage;
  faceSwapLogoOpacity?: number;
  faceSwapLogoText?: string;
  seedEditScale?: number;
  seedEditSeedMode?: TSeedEditSeedMode;
  seedEditSeed?: number;
}

export interface ITextToImageFormValues {
  imageModel: TImageModel;
  prompt: string;
  size: string;
  responseFormat: TImageResponseFormat;
  outputFormat: TImageOutputFormat;
  watermark: boolean;
  optimizePrompt: boolean;
}

export interface ITextToVideoFormValues {
  videoModel: TVideoModel;
  prompt: string;
  ratio: TVideoRatio;
  duration: string;
  t2vFrames: string;
  t2vSteps: string;
  resolution: TVideoResolution;
  seed: number;
  generateAudio: boolean;
  watermark: boolean;
}

export interface IImageToVideoFormValues {
  prompt: string;
  ratio: string;
  duration: string;
}
