import type {
  IModelOption,
  ISelectOption,
  TDeepfakeFunction,
  TDeepfakeModel,
  TImageModel,
  TVideoModel,
} from "@/typings/generate";

export const DEEPFAKE_DEFAULT_FUNCTION: TDeepfakeFunction = "faceswap";

export const DEEPFAKE_DEFAULT_MODEL: TDeepfakeModel = "FaceShifter";

export const FACE_ANIMATION_DEFAULT_PROMPT = "让图中人脸做自然的微笑和轻微点头动作";
export const DEFAULT_IMAGE_MODEL = "volc";
export const DEFAULT_VIDEO_MODEL = "volc";
export const DEFAULT_IMAGE_SIZE = "2K";
export const DEFAULT_VIDEO_RATIO = "16:9";
export const DEFAULT_T2V_DURATION = "5";
export const DEFAULT_I2V_DURATION = "5";
export const DEFAULT_MODELSCOPE_FRAMES = "16";
export const DEFAULT_MODELSCOPE_STEPS = "25";
export const DEFAULT_MODELSCOPE_FRAME_COUNT = 16;
export const DEFAULT_MODELSCOPE_INFERENCE_STEPS = 25;
export const SHORT_TEXTAREA_ROWS = 2;
export const MEDIUM_TEXTAREA_ROWS = 3;
export const DEFAULT_TEXTAREA_ROWS = 4;
export const FACE_ANIMATION_PROMPT_MAX_LENGTH = 300;
export const PROMPT_MAX_LENGTH = 500;
export const TITLE_PROMPT_PREVIEW_START_INDEX = 0;
export const TITLE_PROMPT_PREVIEW_LENGTH = 20;
export const I2V_MAX_IMAGE_COUNT = 4;
export const DEFAULT_IMAGE_UPLOAD_MAX_COUNT = 1;
export const PRIMARY_UPLOAD_INDEX = 0;
export const DEFAULT_MODEL_OPTION_INDEX = 0;
export const EMPTY_UPLOAD_COUNT = 0;
export const ATTRIBUTE_EDIT_PROMPT_PLACEHOLDER = "把头发改成黑色，保持人脸不变";
export const TEXT_TO_IMAGE_PROMPT_PLACEHOLDER = "请输入提示词：悲伤的小狗";
export const TEXT_TO_VIDEO_PROMPT_PLACEHOLDER = "写实风格，晴朗的蓝天之下，一大片白色的雏菊花田，镜头逐渐拉近...";
export const IMAGE_TO_VIDEO_PROMPT_PLACEHOLDER =
  "例：[图1]戴着眼镜的男生和[图2]的柯基小狗，坐在[图3]的草坪上，3D卡通风格";
export const STABLE_DIFFUSION_SERVICE_PORT = 8009;
export const MODELSCOPE_T2V_SERVICE_PORT = 8011;
export const MODELSCOPE_MIN_FRAMES = 4;
export const MODELSCOPE_MAX_FRAMES = 24;
export const MODELSCOPE_MIN_STEPS = 10;
export const MODELSCOPE_MAX_STEPS = 50;
export const MODELSCOPE_DEFAULT_FPS = 8;
export const STABLE_DIFFUSION_MODEL_HELP_TEXT = `自托管服务由后端代理至 STABLE_DIFFUSION_SERVICE_URL（默认 ${STABLE_DIFFUSION_SERVICE_PORT}）；水印开关仅对火山文生图生效。`;
export const TEXT_TO_VIDEO_MODEL_TOOLTIP = `火山返回可播放 URL；ModelScope（${MODELSCOPE_T2V_SERVICE_PORT}）经 Node 代理返回 data:video/mp4;base64`;
export const MODELSCOPE_MODEL_HELP_TEXT = `与文生图里选 Stable Diffusion 类似：由后端转发至 MODELSCOPE_T2V_URL（默认 ${MODELSCOPE_T2V_SERVICE_PORT}）。参数对应 server.py：prompt、num_frames(${MODELSCOPE_MIN_FRAMES}-${MODELSCOPE_MAX_FRAMES})、num_inference_steps(${MODELSCOPE_MIN_STEPS}-${MODELSCOPE_MAX_STEPS})。`;
export const MODELSCOPE_FRAMES_TOOLTIP = `服务端限制 ${MODELSCOPE_MIN_FRAMES}-${MODELSCOPE_MAX_FRAMES}，导出约 fps=${MODELSCOPE_DEFAULT_FPS}`;
export const MODELSCOPE_STEPS_TOOLTIP = `${MODELSCOPE_MIN_STEPS}-${MODELSCOPE_MAX_STEPS}，越大越慢、质量可能略好`;
export const I2V_REFERENCE_TOOLTIP = `按顺序对应提示词中的 [图1][图2]…，最多 ${I2V_MAX_IMAGE_COUNT} 张`;
export const I2V_UPLOAD_TEXT = `上传参考图（1～${I2V_MAX_IMAGE_COUNT} 张）`;

export const DEEPFAKE_MODEL_OPTIONS: Record<TDeepfakeFunction, TDeepfakeModel[]> = {
  faceswap: ["FaceShifter", "SimSwap", "DeepFaceLab", "FaceSwap-GAN"],
  fomm: ["FOMM", "Face2Face", "Wav2Lip", "LivePortrait"],
  stargan: ["StarGAN", "StarGAN-v2", "AttGAN", "STGAN"],
};

export const DEEPFAKE_FUNCTION_LABELS: Record<TDeepfakeFunction, string> = {
  faceswap: "人脸替换",
  fomm: "人脸动画",
  stargan: "属性编辑",
};

export const DEEPFAKE_FUNCTION_OPTIONS: ISelectOption<TDeepfakeFunction>[] = [
  { value: "faceswap", label: "人脸替换（Face Swapping）" },
  { value: "fomm", label: "人脸动画（Face Reenactment）" },
  { value: "stargan", label: "属性编辑（Attribute Editing）" },
];

export const DEEPFAKE_TARGET_TOOLTIPS: Record<TDeepfakeFunction, string> = {
  faceswap: "人脸替换的目标载体图像：保留该图的姿态与场景，仅对其人脸区域进行替换",
  fomm: "用于生成人脸动画的源人脸图像：该图中的人脸将按动作描述生成驱动短视频",
  stargan: "待编辑的人脸图像：将根据编辑指令对该图的人脸属性进行修改，保持身份一致",
};

export const IMAGE_MODEL_OPTIONS: IModelOption<TImageModel>[] = [
  { value: "volc", label: "Seedream 5.0", endpoint: "/api/generate/image" },
  {
    value: "stable-diffusion",
    label: "Stable Diffusion",
    endpoint: "/api/generate/image-stable-diffusion",
  },
];

export const VIDEO_MODEL_OPTIONS: IModelOption<TVideoModel>[] = [
  { value: "volc", label: "Seedance-1-0-lite-t2v", endpoint: "/api/generate/t2v" },
  { value: "modelscope", label: "Model-Scope", endpoint: "/api/generate/model-scope" },
];

export const IMAGE_SIZE_OPTIONS: ISelectOption[] = [
  { value: "1K", label: "1K" },
  { value: "2K", label: "2K" },
  { value: "4K", label: "4K" },
];

export const VIDEO_RATIO_OPTIONS: ISelectOption[] = [
  { value: "16:9", label: "16:9" },
  { value: "1:1", label: "1:1" },
  { value: "9:16", label: "9:16" },
];

export const T2V_DURATION_OPTIONS: ISelectOption[] = [
  { value: "3", label: "3 秒" },
  { value: "5", label: "5 秒" },
  { value: "8", label: "8 秒" },
  { value: "12", label: "12 秒" },
];

export const I2V_DURATION_OPTIONS: ISelectOption[] = [
  { value: "5", label: "5 秒" },
  { value: "2", label: "2 秒" },
  { value: "4", label: "4 秒" },
  { value: "6", label: "6 秒" },
];

export const MODELSCOPE_FRAME_OPTIONS: ISelectOption[] = [
  { value: "8", label: "8 帧" },
  { value: "16", label: "16 帧（约 2 秒）" },
  { value: "24", label: "24 帧（约 3 秒）" },
];

export const MODELSCOPE_STEP_OPTIONS: ISelectOption[] = [
  { value: "15", label: "15（较快）" },
  { value: "25", label: "25（默认）" },
  { value: "35", label: "35" },
];
