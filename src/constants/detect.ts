import type { ISelectOption } from "@/typings/generate";
import type { TImageDetectBackend, TRiskLevel } from "@/typings/detect";

export const KIB_BYTES = 1024;
export const BYTES_PER_MB = KIB_BYTES * KIB_BYTES;
export const MAX_LOCAL_VIDEO_BASE64_MB = 20;
export const MAX_LOCAL_VIDEO_BASE64_BYTES = MAX_LOCAL_VIDEO_BASE64_MB * BYTES_PER_MB;

export const MIN_NORMALIZED_SCORE = 0;
export const MAX_NORMALIZED_SCORE = 1;
export const DEFAULT_POSITIVE_CONFIDENCE = 0.8;
export const DEFAULT_NEGATIVE_CONFIDENCE = 0.2;
export const DEFAULT_REVIEW_SCORE = 0.6;
export const DEFAULT_BLOCK_SCORE = 0.9;
export const SAFE_RISK_SCORE = 10;
export const SAFE_IMAGE_RISK_BASE_SCORE = 5;
export const SAFE_IMAGE_LABEL_SCORE_STEP = 2;
export const SAFE_IMAGE_RISK_MAX_SCORE = 20;
export const REVIEW_RISK_SCORE = 50;
export const BLOCK_RISK_SCORE = 80;
export const RISK_SCORE_DENOMINATOR = 100;
export const PERCENT_MULTIPLIER = 100;
export const DETECT_STEP_INPUT = 1;
export const DETECT_STEP_READY = 2;
export const DETECT_STEP_RESULT = 3;
export const REMOTE_UPLOAD_UID = "-1";
export const EMPTY_RESULT_COUNT = 0;
export const EMPTY_SELECTION_COUNT = 0;
export const SCORE_DECIMAL_PLACES = 6;
export const REPORT_LIST_START_INDEX = 1;
export const SAMPLE_IMAGE_DETECT_URL = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=768";
export const DEFAULT_VIDEO_UNDERSTANDING_FPS = 1;
export const MIN_VIDEO_UNDERSTANDING_FPS = 0.2;
export const MAX_VIDEO_UNDERSTANDING_FPS = 5;
export const VIDEO_UNDERSTANDING_FPS_STEP = 0.2;

export const DEFAULT_IMAGE_DETECT_BACKEND: TImageDetectBackend = "volc";
export const DEFAULT_UNSAFE_MODEL = "Google-SafeSearch";

export const IMAGE_DETECT_BACKENDS: ISelectOption<TImageDetectBackend>[] = [
  { value: "volc", label: "Seed 2.0 Pro" },
  { value: "universal", label: "Universal Fake Detect" },
];

export const SAFETY_DETECTION_MODELS: ISelectOption[] = [
  { value: "Google-SafeSearch", label: "Google SafeSearch" },
  { value: "AWS-Rekognition", label: "AWS Rekognition" },
  { value: "Azure-ContentModerator", label: "Azure Content Moderator" },
  { value: "NSFW-Detector", label: "NSFW Detector" },
];

export const FAKE_DETECT_MODEL_INTROS: Array<{
  backend: TImageDetectBackend;
  name: string;
  badge: string;
  summary: string;
  strengths: string[];
  tradeoff: string;
}> = [
  {
    backend: "volc",
    name: "Seed 2.0 Pro",
    badge: "方舟视觉理解",
    summary: "基于火山方舟视觉理解模型，判断 AI 生成、合成或深度伪造痕迹，适合语义层面的真伪复核。",
    strengths: ["URL/Base64", "JSON 输出", "人工复核"],
    tradeoff: "依赖大模型视觉理解与提示词约束，结果应作为风险判断参考。",
  },
  {
    backend: "universal",
    name: "Universal Fake Detect",
    badge: "本地基线",
    summary: "本地 UniversalFakeDetect 服务，适合作为图像 AI 生成检测的可复现实验基线。",
    strengths: ["本地推理", "可复现", "阈值可控"],
    tradeoff: "需要本地服务启动，泛化效果取决于模型权重与训练分布。",
  },
];

export const UNSAFE_DETECT_MODEL_INTRO = {
  name: "Seed 2.0 Pro",
  badge: "固定审核链路",
  summary: "敏感内容检测统一走 Seed 2.0 Pro 视觉理解链路，识别暴力、色情、仇恨、毒品赌博等风险标签。",
  strengths: ["图/视频统一", "风险标签", "合规初筛"],
  tradeoff: "当前页面不再暴露模型下拉选择，减少误导性配置。",
};

export const VIOLATION_LABELS: Record<string, string> = {
  violence: "暴力内容",
  sensitive: "敏感内容",
  sexual: "色情内容",
  hate: "仇恨符号",
  drugs: "毒品相关",
  gambling: "赌博内容",
};

export const RISK_LABELS: Record<TRiskLevel, { color: string; text: string }> = {
  low: {
    color: "#52c41a",
    text: "低风险",
  },
  medium: {
    color: "#faad14",
    text: "中风险",
  },
  high: {
    color: "#ff4d4f",
    text: "高风险",
  },
};

export const FAKE_PASS_COLOR = "#52c41a";
export const FAKE_FAIL_COLOR = "#ff4d4f";
