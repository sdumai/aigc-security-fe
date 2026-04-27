import type { ReactNode } from "react";

export type TMediaFormat = "url" | "data_url";

export type TContentType = "image" | "video";

export type TDeepfakeFunction = "faceswap" | "fomm" | "stargan";

export type TDeepfakeModel =
  | "FaceShifter"
  | "SimSwap"
  | "DeepFaceLab"
  | "FaceSwap-GAN"
  | "FOMM"
  | "Face2Face"
  | "Wav2Lip"
  | "LivePortrait"
  | "StarGAN"
  | "StarGAN-v2"
  | "AttGAN"
  | "STGAN";

export type TImageModel = "volc" | "stable-diffusion";

export type TVideoModel = "volc" | "modelscope";

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
}

export interface ITextToImageFormValues {
  imageModel: TImageModel;
  prompt: string;
  size: string;
  watermark: boolean;
}

export interface ITextToVideoFormValues {
  videoModel: TVideoModel;
  prompt: string;
  ratio: string;
  duration: string;
  t2vFrames: string;
  t2vSteps: string;
}

export interface IImageToVideoFormValues {
  prompt: string;
  ratio: string;
  duration: string;
}
