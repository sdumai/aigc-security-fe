import {
  IMAGE_MODEL_OPTIONS,
  IMAGE_TO_VIDEO_MODEL_OPTIONS,
  VIDEO_MODEL_OPTIONS,
} from "@/constants/generate";

const toLabelText = (label: unknown, fallback: string) => (typeof label === "string" && label.trim() ? label : fallback);

const GENERATION_MODEL_LABELS = new Map<string, string>(
  [...IMAGE_MODEL_OPTIONS, ...VIDEO_MODEL_OPTIONS, ...IMAGE_TO_VIDEO_MODEL_OPTIONS].map((option) => [
    option.value,
    toLabelText(option.label, option.value),
  ]),
);

export const getGenerationModelLabel = (model?: string) => {
  if (!model) return "";
  return GENERATION_MODEL_LABELS.get(model) || model;
};
