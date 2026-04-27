import request from "@/utils/request";
import type { ISaveGeneratedContentPayload } from "@/typings/generate";

export const saveGeneratedContent = async (payload: ISaveGeneratedContentPayload): Promise<void> => {
  await request.post("/data/save", payload);
};
