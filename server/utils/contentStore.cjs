const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");

const SCHEMA_VERSION = 1;
const SERVER_ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(SERVER_ROOT, "data");
const UPLOAD_DIR = path.join(SERVER_ROOT, "uploads", "generated");
const SAMPLES_FILE = path.join(DATA_DIR, "generated-samples.json");
const DETECTIONS_FILE = path.join(DATA_DIR, "detection-records.json");
const EMPTY_COLLECTION = [];

const MIME_EXTENSION_MAP = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(5).toString("hex")}`;
}

function formatBytes(bytes) {
  const size = Number(bytes) || 0;
  if (size <= 0) return "未知";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeContentType(value) {
  return value === "video" ? "video" : "image";
}

function normalizeDetectionType(value) {
  return value === "unsafe" ? "unsafe" : "fake";
}

function normalizeSourceModule(value) {
  return ["text-to-image", "text-to-video", "image-to-video", "deepfake", "manual"].includes(value)
    ? value
    : "manual";
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || ""));
}

function parseDataUrl(value) {
  const match = String(value || "").match(/^data:([^;,]+);base64,([\s\S]+)$/);
  if (!match) return null;

  const mimeType = match[1] || "application/octet-stream";
  const base64 = match[2].replace(/\s/g, "");
  const buffer = Buffer.from(base64, "base64");

  if (!buffer.length) return null;

  return {
    mimeType,
    buffer,
    extension: MIME_EXTENSION_MAP[mimeType] || (mimeType.startsWith("image/") ? "png" : "bin"),
  };
}

async function ensureStorage() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

async function readCollection(filePath) {
  await ensureStorage();

  try {
    const raw = await fs.readFile(filePath, "utf8");
    if (!raw.trim()) return [...EMPTY_COLLECTION];

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.items)) return parsed.items;
    return [...EMPTY_COLLECTION];
  } catch (error) {
    if (error.code === "ENOENT") {
      return [...EMPTY_COLLECTION];
    }

    const backupPath = `${filePath}.corrupt-${Date.now()}`;
    try {
      await fs.rename(filePath, backupPath);
    } catch (_) {}
    return [...EMPTY_COLLECTION];
  }
}

async function writeCollection(filePath, items) {
  await ensureStorage();

  const payload = {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: nowIso(),
    items,
  };
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(payload, null, 2));
  await fs.rename(tempPath, filePath);
}

async function persistMedia(url, type, id) {
  const dataUrl = parseDataUrl(url);

  if (dataUrl) {
    const filename = `${id}.${dataUrl.extension}`;
    await fs.writeFile(path.join(UPLOAD_DIR, filename), dataUrl.buffer);
    return {
      storageType: "local",
      fullUrl: `/api/data/media/${filename}`,
      thumbnailUrl: `/api/data/media/${filename}`,
      mediaFilename: filename,
      mimeType: dataUrl.mimeType,
      sizeBytes: dataUrl.buffer.length,
    };
  }

  const normalizedUrl = safeString(url);
  if (!normalizedUrl) {
    throw new Error("缺少媒体 URL");
  }

  return {
    storageType: "remote",
    fullUrl: normalizedUrl,
    thumbnailUrl: type === "image" ? normalizedUrl : normalizedUrl,
    mediaFilename: undefined,
    mimeType: undefined,
    sizeBytes: 0,
  };
}

async function saveGeneratedSample(payload = {}) {
  const type = normalizeContentType(payload.type);
  const id = createId("sample");
  const media = await persistMedia(payload.url, type, id);
  const timestamp = nowIso();
  const sample = {
    id,
    schemaVersion: SCHEMA_VERSION,
    type,
    title: safeString(payload.title, type === "image" ? "未命名图片样本" : "未命名视频样本"),
    sourceModule: normalizeSourceModule(payload.sourceModule),
    model: safeString(payload.model),
    prompt: safeString(payload.prompt),
    ...media,
    size: formatBytes(media.sizeBytes),
    createdAt: timestamp,
    updatedAt: timestamp,
    detectionStatus: {
      fake: false,
      unsafe: false,
    },
  };

  const samples = await readCollection(SAMPLES_FILE);
  samples.unshift(sample);
  await writeCollection(SAMPLES_FILE, samples);
  return sample;
}

async function listGeneratedSamples() {
  const samples = await readCollection(SAMPLES_FILE);
  return samples.sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
}

async function getGeneratedSample(id) {
  const samples = await readCollection(SAMPLES_FILE);
  return samples.find((sample) => sample.id === id) || null;
}

function resolveUploadPath(filename) {
  const safeName = path.basename(String(filename || ""));
  const resolved = path.resolve(UPLOAD_DIR, safeName);
  if (!resolved.startsWith(UPLOAD_DIR + path.sep)) {
    throw new Error("非法媒体路径");
  }
  return resolved;
}

async function deleteGeneratedSample(id) {
  const samples = await readCollection(SAMPLES_FILE);
  const sample = samples.find((item) => item.id === id);
  const nextSamples = samples.filter((item) => item.id !== id);
  const records = await readCollection(DETECTIONS_FILE);
  const hasLinkedRecords = records.some((record) => record.sampleId === id);
  const nextRecords = sample
    ? records.map((record) =>
        record.sampleId === id
          ? {
              ...record,
              sourceModule: record.sourceModule || sample.sourceModule,
              sourceTitle: safeString(record.sourceTitle) || safeString(sample.title),
              sourceModel: safeString(record.sourceModel) || safeString(sample.model),
              sourcePrompt: safeString(record.sourcePrompt) || safeString(sample.prompt),
              sourceUrl: safeString(record.sourceUrl) || safeString(sample.fullUrl) || safeString(record.previewUrl),
              sourceThumbnailUrl:
                safeString(record.sourceThumbnailUrl) || safeString(sample.thumbnailUrl) || safeString(record.previewUrl),
            }
          : record,
      )
    : records;

  if (sample?.storageType === "local" && sample.mediaFilename && !hasLinkedRecords) {
    try {
      await fs.unlink(resolveUploadPath(sample.mediaFilename));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }

  await writeCollection(SAMPLES_FILE, nextSamples);
  if (hasLinkedRecords) {
    await writeCollection(DETECTIONS_FILE, nextRecords);
  }
  return Boolean(sample);
}

async function saveDetectionRecord(payload = {}) {
  const type = normalizeDetectionType(payload.type);
  const timestamp = nowIso();
  const sampleId = safeString(payload.sampleId) || undefined;
  const samples = sampleId ? await readCollection(SAMPLES_FILE) : [];
  const linkedSample = sampleId ? samples.find((sample) => sample.id === sampleId) : null;
  const record = {
    id: createId("detect"),
    schemaVersion: SCHEMA_VERSION,
    sampleId,
    type,
    mediaType: normalizeContentType(payload.mediaType),
    filename: safeString(payload.filename, "未知样本"),
    result: safeString(payload.result, type === "fake" ? "未知生成检测结果" : "未知敏感检测结果"),
    confidence: typeof payload.confidence === "number" ? payload.confidence : undefined,
    riskScore: typeof payload.riskScore === "number" ? payload.riskScore : undefined,
    model: safeString(payload.model),
    detectorModel: safeString(payload.detectorModel) || safeString(payload.model),
    sourceModule: normalizeSourceModule(linkedSample?.sourceModule || payload.sourceModule),
    sourceTitle: safeString(linkedSample?.title) || safeString(payload.sourceTitle),
    sourceModel: safeString(linkedSample?.model) || safeString(payload.sourceModel),
    sourcePrompt: safeString(linkedSample?.prompt) || safeString(payload.sourcePrompt),
    sourceUrl: safeString(linkedSample?.fullUrl) || safeString(payload.sourceUrl) || safeString(payload.previewUrl),
    sourceThumbnailUrl:
      safeString(linkedSample?.thumbnailUrl) || safeString(payload.sourceThumbnailUrl) || safeString(payload.previewUrl),
    previewUrl: safeString(payload.previewUrl),
    labels: Array.isArray(payload.labels) ? payload.labels.map(String) : [],
    rawResult: payload.rawResult,
    createdAt: timestamp,
  };

  const records = await readCollection(DETECTIONS_FILE);
  records.unshift(record);
  await writeCollection(DETECTIONS_FILE, records);

  if (record.sampleId) {
    const sampleIndex = samples.findIndex((sample) => sample.id === record.sampleId);

    if (sampleIndex >= 0) {
      const score = type === "fake" ? record.confidence : record.riskScore;
      samples[sampleIndex] = {
        ...samples[sampleIndex],
        updatedAt: timestamp,
        detectionStatus: {
          fake: Boolean(samples[sampleIndex].detectionStatus?.fake) || type === "fake",
          unsafe: Boolean(samples[sampleIndex].detectionStatus?.unsafe) || type === "unsafe",
        },
        latestDetection: {
          type,
          result: record.result,
          score,
          createdAt: timestamp,
        },
      };
      await writeCollection(SAMPLES_FILE, samples);
    }
  }

  return record;
}

async function listDetectionRecords(sampleId) {
  const records = await readCollection(DETECTIONS_FILE);
  const filtered = sampleId ? records.filter((record) => record.sampleId === sampleId) : records;
  return filtered.sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
}

module.exports = {
  UPLOAD_DIR,
  deleteGeneratedSample,
  getGeneratedSample,
  listDetectionRecords,
  listGeneratedSamples,
  resolveUploadPath,
  saveDetectionRecord,
  saveGeneratedSample,
};
