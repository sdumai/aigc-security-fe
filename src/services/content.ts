import request from "@/utils/request";
import { apiBase } from "@/utils/apiBase";
import type {
  IContentDetectionRecord,
  IContentSample,
  ISaveContentSamplePayload,
  ISaveDetectionRecordPayload,
} from "@/typings/content";
import type { ISaveGeneratedContentPayload } from "@/typings/generate";

interface IDataResponse<T> {
  data: T;
}

const normalizeMediaUrl = (url: string): string => {
  if (apiBase && url.startsWith("/api/")) {
    return `${apiBase}${url}`;
  }

  return url;
};

const normalizeSample = (sample: IContentSample): IContentSample => ({
  ...sample,
  fullUrl: normalizeMediaUrl(sample.fullUrl),
  thumbnailUrl: normalizeMediaUrl(sample.thumbnailUrl),
});

const normalizeDetectionRecord = (record: IContentDetectionRecord): IContentDetectionRecord => ({
  ...record,
  previewUrl: record.previewUrl ? normalizeMediaUrl(record.previewUrl) : record.previewUrl,
  sourceUrl: record.sourceUrl ? normalizeMediaUrl(record.sourceUrl) : record.sourceUrl,
  sourceThumbnailUrl: record.sourceThumbnailUrl ? normalizeMediaUrl(record.sourceThumbnailUrl) : record.sourceThumbnailUrl,
});

export const saveGeneratedContent = async (payload: ISaveGeneratedContentPayload | ISaveContentSamplePayload): Promise<IContentSample> => {
  const response = (await request.post("/data/save", payload)) as IDataResponse<IContentSample>;
  return normalizeSample(response.data);
};

export const fetchGeneratedSamples = async (): Promise<IContentSample[]> => {
  const response = (await request.get("/data/outputs")) as IDataResponse<IContentSample[]>;
  return response.data.map(normalizeSample);
};

export const fetchDetectionRecords = async (): Promise<IContentDetectionRecord[]> => {
  const response = (await request.get("/data/detections")) as IDataResponse<IContentDetectionRecord[]>;
  return response.data.map(normalizeDetectionRecord);
};

export const fetchSampleDetectionRecords = async (sampleId: string): Promise<IContentDetectionRecord[]> => {
  const response = (await request.get(`/data/outputs/${sampleId}/detections`)) as IDataResponse<IContentDetectionRecord[]>;
  return response.data.map(normalizeDetectionRecord);
};

export const saveDetectionRecord = async (payload: ISaveDetectionRecordPayload): Promise<IContentDetectionRecord> => {
  const response = (await request.post("/data/detections", payload)) as IDataResponse<IContentDetectionRecord>;
  return normalizeDetectionRecord(response.data);
};

export const deleteGeneratedSample = async (sampleId: string): Promise<void> => {
  await request.delete(`/data/outputs/${sampleId}`);
};
