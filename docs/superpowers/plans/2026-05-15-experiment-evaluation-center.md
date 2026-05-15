# Experiment Evaluation Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an experiment evaluation center for selecting saved samples, unlocking batch detection with a demo password, running sequential detection jobs, computing experiment metrics, and showing a defense-ready report view.

**Architecture:** Add a new front-end page under `/data/experiments` that reuses the existing content sample store, detection services, and detection record API. Keep the first version front-end led: route/navigation/constants/types/utilities are isolated, batch execution state is local to the page, and successful results persist through `saveDetectionRecord`.

**Tech Stack:** React 18, TypeScript, React Router, Ant Design 5, existing DScan service modules, existing CSS in `src/index.css`, Vite build verification.

---

## File Structure

- Create `src/constants/experiment.ts`: password gate constant, filter options, experiment labels, status labels, and default experiment name helper.
- Create `src/typings/experiment.ts`: experiment filter, run, job, metrics, report, and option types.
- Create `src/pages/Data/Experiments/experimentUtils.ts`: pure helpers for filtering samples, creating jobs, deriving media request bodies, formatting scores, classifying risk, building detection record payloads, and deriving metrics.
- Create `src/pages/Data/Experiments/index.tsx`: page component with loading, configuration, password modal, batch runner, metrics, job table, model comparison, and report view.
- Modify `src/constants/routes.ts`: export `DATA_EXPERIMENTS_ROUTE`.
- Modify `src/routes/index.tsx`: register the new route.
- Modify `src/components/Layout/AppLayout.tsx`: add the navigation item near content management.
- Modify `src/index.css`: add focused styles for the experiment page, metric bars, job status list, and report card.
- No backend file changes in this first version.

---

### Task 1: Add Experiment Constants, Types, Route, And Navigation

**Files:**
- Create: `src/constants/experiment.ts`
- Create: `src/typings/experiment.ts`
- Modify: `src/constants/routes.ts`
- Modify: `src/routes/index.tsx`
- Modify: `src/components/Layout/AppLayout.tsx`

- [ ] **Step 1: Add experiment route constant**

Edit `src/constants/routes.ts` so the file contains:

```ts
export const FAKE_DETECT_ROUTE = "/detect/fake";
export const UNSAFE_DETECT_ROUTE = "/detect/unsafe";
export const DATA_OUTPUT_ROUTE = "/data/output";
export const DATA_EXPERIMENTS_ROUTE = "/data/experiments";
```

- [ ] **Step 2: Create constants file**

Create `src/constants/experiment.ts` with:

```ts
import type { ISelectOption } from "@/typings/generate";
import type {
  TExperimentDetectionFilter,
  TExperimentDetectionTarget,
  TExperimentJobStatus,
  TExperimentMediaFilter,
  TExperimentSourceFilter,
} from "@/typings/experiment";

export const BATCH_DETECT_PASSWORD = "dscan-batch-2026";
export const BATCH_PASSWORD_MESSAGE = "批量检测功能仅供实验授权使用，请联系作者获取访问密码。";

export const EXPERIMENT_TARGET_LABELS: Record<TExperimentDetectionTarget, string> = {
  fake: "AI 生成检测",
  unsafe: "敏感内容检测",
  both: "全部检测",
};

export const EXPERIMENT_JOB_STATUS_LABELS: Record<TExperimentJobStatus, string> = {
  waiting: "等待中",
  running: "检测中",
  success: "成功",
  failed: "失败",
  cancelled: "已取消",
};

export const EXPERIMENT_JOB_STATUS_COLORS: Record<TExperimentJobStatus, string> = {
  waiting: "default",
  running: "processing",
  success: "success",
  failed: "error",
  cancelled: "warning",
};

export const EXPERIMENT_MEDIA_FILTER_OPTIONS: ISelectOption<TExperimentMediaFilter>[] = [
  { value: "all", label: "全部媒体" },
  { value: "image", label: "图片" },
  { value: "video", label: "视频" },
];

export const EXPERIMENT_SOURCE_FILTER_OPTIONS: ISelectOption<TExperimentSourceFilter>[] = [
  { value: "all", label: "全部来源" },
  { value: "text-to-image", label: "文生图" },
  { value: "text-to-video", label: "文生视频" },
  { value: "image-to-video", label: "图生视频" },
  { value: "deepfake", label: "Deepfake" },
  { value: "manual", label: "手动样本" },
];

export const EXPERIMENT_DETECTION_FILTER_OPTIONS: ISelectOption<TExperimentDetectionFilter>[] = [
  { value: "all", label: "全部状态" },
  { value: "none", label: "未检测" },
  { value: "partial", label: "部分已测" },
  { value: "complete", label: "全部已测" },
];

export const EXPERIMENT_TARGET_OPTIONS: ISelectOption<TExperimentDetectionTarget>[] = [
  { value: "both", label: "全部检测" },
  { value: "fake", label: "AI 生成检测" },
  { value: "unsafe", label: "敏感内容检测" },
];

export const DEFAULT_EXPERIMENT_NAME_PREFIX = "生成样本检测实验";

export const createDefaultExperimentName = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${DEFAULT_EXPERIMENT_NAME_PREFIX} ${year}-${month}-${day}`;
};
```

- [ ] **Step 3: Create experiment type definitions**

Create `src/typings/experiment.ts` with:

```ts
import type { IContentDetectionRecord, IContentSample, TGeneratedSourceModule } from "@/typings/content";
import type { TContentType } from "@/typings/generate";
import type { TImageDetectBackend } from "@/typings/detect";

export type TExperimentDetectionTarget = TGeneratedDetectTarget | "both";
export type TExperimentJobStatus = "waiting" | "running" | "success" | "failed" | "cancelled";
export type TExperimentMediaFilter = TContentType | "all";
export type TExperimentSourceFilter = TGeneratedSourceModule | "all";
export type TExperimentDetectionFilter = "all" | "none" | "partial" | "complete";

export interface IExperimentFilters {
  mediaType: TExperimentMediaFilter;
  sourceModule: TExperimentSourceFilter;
  detectionStatus: TExperimentDetectionFilter;
}

export interface IExperimentRun {
  id: string;
  name: string;
  startedAt?: string;
  endedAt?: string;
  target: TExperimentDetectionTarget;
  imageFakeBackend: TImageDetectBackend;
  selectedSampleIds: string[];
}

export interface IExperimentJob {
  id: string;
  sampleId: string;
  target: TGeneratedDetectTarget;
  status: TExperimentJobStatus;
  recordId?: string;
  errorMessage?: string;
  startedAt?: string;
  endedAt?: string;
}

export interface IExperimentMetricSummary {
  expectedJobs: number;
  successJobs: number;
  failedJobs: number;
  cancelledJobs: number;
  completionRate: number;
  failureRate: number;
  highRiskRate: number;
  fakeSuspiciousRate: number;
  unsafeRiskRate: number;
  averageFakeConfidence?: number;
  averageUnsafeRiskScore?: number;
}

export interface IExperimentModelMetric {
  model: string;
  count: number;
  highRiskCount: number;
  passCount: number;
  averageScore?: number;
  passRate: number;
}

export interface IExperimentReportData {
  run: IExperimentRun;
  samples: IContentSample[];
  jobs: IExperimentJob[];
  records: IContentDetectionRecord[];
  metrics: IExperimentMetricSummary;
  modelMetrics: IExperimentModelMetric[];
  highRiskRecords: IContentDetectionRecord[];
  lowRiskRecords: IContentDetectionRecord[];
  failedJobs: IExperimentJob[];
}
```

- [ ] **Step 4: Register the route**

In `src/routes/index.tsx`, add the import:

```ts
import ExperimentEvaluationPage from "@/pages/Data/Experiments";
```

Then add this route inside `<Routes>` after the existing data output route:

```tsx
<Route path="/data/experiments" element={<ExperimentEvaluationPage />} />
```

- [ ] **Step 5: Add navigation item**

In `src/components/Layout/AppLayout.tsx`, add `ExperimentOutlined` to the icon import:

```ts
  ExperimentOutlined,
```

Replace the current single content management item:

```tsx
{
  key: "/data/output",
  icon: <DatabaseOutlined />,
  label: "内容管理",
},
```

with a data submenu:

```tsx
{
  key: "data",
  icon: <DatabaseOutlined />,
  label: "数据与实验",
  children: [
    { key: "/data/output", icon: <DatabaseOutlined />, label: "内容管理" },
    { key: "/data/experiments", icon: <ExperimentOutlined />, label: "实验评估中心" },
  ],
},
```

Update `getOpenKeys`:

```ts
if (path.startsWith("/data")) return ["data"];
```

- [ ] **Step 6: Run build to expose missing imports before page implementation**

Run:

```bash
npm run build
```

Expected result: FAIL because `@/pages/Data/Experiments` does not exist yet. Continue to Task 2.

---

### Task 2: Add Experiment Utility Functions

**Files:**
- Create: `src/pages/Data/Experiments/experimentUtils.ts`

- [ ] **Step 1: Create utility file with filtering, job creation, scoring, payload conversion, and metrics helpers**

Create `src/pages/Data/Experiments/experimentUtils.ts` with:

```ts
import { DEFAULT_VIDEO_UNDERSTANDING_FPS, IMAGE_DETECT_BACKENDS } from "@/constants/detect";
import type {
  IContentDetectionRecord,
  IContentSample,
  ISaveDetectionRecordPayload,
  TGeneratedSourceModule,
} from "@/typings/content";
import type {
  IDetectMediaBody,
  IFakeDetectionResult,
  IUnsafeDetectionResult,
  TGeneratedDetectTarget,
  TImageDetectBackend,
} from "@/typings/detect";
import type {
  IExperimentFilters,
  IExperimentJob,
  IExperimentMetricSummary,
  IExperimentModelMetric,
  TExperimentDetectionTarget,
} from "@/typings/experiment";

export const isSampleMatchedByFilters = (sample: IContentSample, filters: IExperimentFilters): boolean => {
  if (filters.mediaType !== "all" && sample.type !== filters.mediaType) return false;
  if (filters.sourceModule !== "all" && sample.sourceModule !== filters.sourceModule) return false;

  const fakeDone = Boolean(sample.detectionStatus?.fake);
  const unsafeDone = Boolean(sample.detectionStatus?.unsafe);

  if (filters.detectionStatus === "none") return !fakeDone && !unsafeDone;
  if (filters.detectionStatus === "partial") return fakeDone !== unsafeDone;
  if (filters.detectionStatus === "complete") return fakeDone && unsafeDone;
  return true;
};

export const createExperimentJobs = (
  sampleIds: string[],
  target: TExperimentDetectionTarget,
  runId: string,
): IExperimentJob[] => {
  const targets: TGeneratedDetectTarget[] =
    target === "both" ? ["fake", "unsafe"] : [target];

  return sampleIds.flatMap((sampleId) =>
    targets.map((jobTarget) => ({
      id: `${runId}_${sampleId}_${jobTarget}`,
      sampleId,
      target: jobTarget,
      status: "waiting" as const,
    })),
  );
};

export const createSampleDetectBody = (sample: IContentSample): IDetectMediaBody => {
  if (sample.type === "video") {
    return {
      videoUrl: sample.fullUrl,
      fps: DEFAULT_VIDEO_UNDERSTANDING_FPS,
    };
  }

  return {
    imageUrl: sample.fullUrl,
  };
};

export const getImageFakeModelName = (backend: TImageDetectBackend): string => {
  return IMAGE_DETECT_BACKENDS.find((item) => item.value === backend)?.label?.toString() || "Seed 2.0 Pro";
};

export const getDetectorModelName = (
  sample: IContentSample,
  target: TGeneratedDetectTarget,
  imageFakeBackend: TImageDetectBackend,
): string => {
  if (target === "unsafe") {
    return sample.type === "video" ? "Seed 2.0 Pro（视频敏感内容检测）" : "Seed 2.0 Pro（图片敏感内容检测）";
  }

  if (sample.type === "video") {
    return "Seed 2.0 Pro（视频 AI 生成检测）";
  }

  return getImageFakeModelName(imageFakeBackend);
};

export const buildFakeRecordPayload = ({
  sample,
  result,
  imageFakeBackend,
}: {
  sample: IContentSample;
  result: IFakeDetectionResult;
  imageFakeBackend: TImageDetectBackend;
}): ISaveDetectionRecordPayload => {
  const detectorModel = getDetectorModelName(sample, "fake", imageFakeBackend);

  return {
    sampleId: sample.id,
    type: "fake",
    mediaType: sample.type,
    filename: sample.mediaFilename || sample.title || (sample.type === "video" ? "视频样本" : "图片样本"),
    result: result.isFake ? "疑似 AI 生成/伪造" : "通过",
    confidence: result.confidence,
    model: detectorModel,
    detectorModel,
    sourceModule: sample.sourceModule as TGeneratedSourceModule,
    sourceTitle: sample.title,
    sourceModel: sample.model,
    sourcePrompt: sample.prompt,
    sourceUrl: sample.fullUrl,
    sourceThumbnailUrl: sample.thumbnailUrl,
    previewUrl: sample.fullUrl,
    labels: result.details.artifacts || [],
    rawResult: result,
  };
};

export const buildUnsafeRecordPayload = ({
  sample,
  result,
  imageFakeBackend,
}: {
  sample: IContentSample;
  result: IUnsafeDetectionResult;
  imageFakeBackend: TImageDetectBackend;
}): ISaveDetectionRecordPayload => {
  const detectorModel = getDetectorModelName(sample, "unsafe", imageFakeBackend);
  const resultText = result.risk === "high" ? "高风险" : result.risk === "medium" ? "中风险" : "低风险";

  return {
    sampleId: sample.id,
    type: "unsafe",
    mediaType: sample.type,
    filename: sample.mediaFilename || sample.title || (sample.type === "video" ? "视频样本" : "图片样本"),
    result: resultText,
    riskScore: result.riskScore,
    model: detectorModel,
    detectorModel,
    sourceModule: sample.sourceModule as TGeneratedSourceModule,
    sourceTitle: sample.title,
    sourceModel: sample.model,
    sourcePrompt: sample.prompt,
    sourceUrl: sample.fullUrl,
    sourceThumbnailUrl: sample.thumbnailUrl,
    previewUrl: sample.fullUrl,
    labels: result.violations,
    rawResult: result,
  };
};

export const normalizeRecordScore = (record: IContentDetectionRecord): number | undefined => {
  const rawScore = record.type === "fake" ? record.confidence : record.riskScore;
  if (typeof rawScore !== "number" || !Number.isFinite(rawScore)) return undefined;
  return rawScore <= 1 ? rawScore * 100 : rawScore;
};

export const isHighRiskDetectionRecord = (record: IContentDetectionRecord): boolean => {
  const score = normalizeRecordScore(record) || 0;
  if (record.type === "fake") return !record.result.includes("通过");
  return record.result.includes("高") || score >= 80;
};

export const isPassDetectionRecord = (record: IContentDetectionRecord): boolean => {
  if (record.type === "fake") return record.result.includes("通过");
  return !record.result.includes("高") && !record.result.includes("中") && (normalizeRecordScore(record) || 0) < 50;
};

const average = (values: number[]): number | undefined => {
  if (values.length === 0) return undefined;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

export const deriveExperimentMetrics = ({
  jobs,
  records,
}: {
  jobs: IExperimentJob[];
  records: IContentDetectionRecord[];
}): IExperimentMetricSummary => {
  const expectedJobs = jobs.length;
  const successJobs = jobs.filter((job) => job.status === "success").length;
  const failedJobs = jobs.filter((job) => job.status === "failed").length;
  const cancelledJobs = jobs.filter((job) => job.status === "cancelled").length;
  const highRiskRecords = records.filter(isHighRiskDetectionRecord);
  const fakeRecords = records.filter((record) => record.type === "fake");
  const unsafeRecords = records.filter((record) => record.type === "unsafe");
  const fakeScores = fakeRecords.map(normalizeRecordScore).filter((score): score is number => typeof score === "number");
  const unsafeScores = unsafeRecords.map(normalizeRecordScore).filter((score): score is number => typeof score === "number");

  return {
    expectedJobs,
    successJobs,
    failedJobs,
    cancelledJobs,
    completionRate: expectedJobs > 0 ? successJobs / expectedJobs : 0,
    failureRate: expectedJobs > 0 ? failedJobs / expectedJobs : 0,
    highRiskRate: successJobs > 0 ? highRiskRecords.length / successJobs : 0,
    fakeSuspiciousRate: fakeRecords.length > 0 ? fakeRecords.filter(isHighRiskDetectionRecord).length / fakeRecords.length : 0,
    unsafeRiskRate: unsafeRecords.length > 0 ? unsafeRecords.filter(isHighRiskDetectionRecord).length / unsafeRecords.length : 0,
    averageFakeConfidence: average(fakeScores),
    averageUnsafeRiskScore: average(unsafeScores),
  };
};

export const deriveModelMetrics = (records: IContentDetectionRecord[]): IExperimentModelMetric[] => {
  const groups = new Map<string, IContentDetectionRecord[]>();

  records.forEach((record) => {
    const model = record.detectorModel || record.model || "未知检测模型";
    groups.set(model, [...(groups.get(model) || []), record]);
  });

  return Array.from(groups.entries()).map(([model, modelRecords]) => {
    const scores = modelRecords.map(normalizeRecordScore).filter((score): score is number => typeof score === "number");
    const passCount = modelRecords.filter(isPassDetectionRecord).length;

    return {
      model,
      count: modelRecords.length,
      highRiskCount: modelRecords.filter(isHighRiskDetectionRecord).length,
      passCount,
      averageScore: average(scores),
      passRate: modelRecords.length > 0 ? passCount / modelRecords.length : 0,
    };
  });
};

export const formatRate = (value: number): string => `${Math.round(value * 100)}%`;

export const formatExperimentScore = (value?: number): string => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return `${Math.round(value)}分`;
};
```

- [ ] **Step 2: Run build to catch type errors in helpers**

Run:

```bash
npm run build
```

Expected result: FAIL only because `@/pages/Data/Experiments` is still missing from the route import. If the output mentions `experimentUtils.ts`, fix the named type or import before continuing.

---

### Task 3: Create The Experiment Page Shell, Sample Filters, And Password Gate

**Files:**
- Create: `src/pages/Data/Experiments/index.tsx`

- [ ] **Step 1: Create the page component imports and state**

Create `src/pages/Data/Experiments/index.tsx` starting with these imports and state definitions:

```tsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Image,
  Input,
  Modal,
  Radio,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  FileImageOutlined,
  LockOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  StopOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import {
  BATCH_DETECT_PASSWORD,
  BATCH_PASSWORD_MESSAGE,
  EXPERIMENT_DETECTION_FILTER_OPTIONS,
  EXPERIMENT_JOB_STATUS_COLORS,
  EXPERIMENT_JOB_STATUS_LABELS,
  EXPERIMENT_MEDIA_FILTER_OPTIONS,
  EXPERIMENT_SOURCE_FILTER_OPTIONS,
  EXPERIMENT_TARGET_LABELS,
  EXPERIMENT_TARGET_OPTIONS,
  createDefaultExperimentName,
} from "@/constants/experiment";
import { DEFAULT_IMAGE_DETECT_BACKEND, IMAGE_DETECT_BACKENDS } from "@/constants/detect";
import { fetchDetectionRecords, fetchGeneratedSamples } from "@/services/content";
import type { IContentDetectionRecord, IContentSample, TGeneratedSourceModule } from "@/typings/content";
import type { TGeneratedDetectTarget, TImageDetectBackend } from "@/typings/detect";
import type {
  IExperimentFilters,
  IExperimentJob,
  IExperimentRun,
  TExperimentDetectionTarget,
} from "@/typings/experiment";
import { getGenerationModelLabel } from "@/utils/modelLabels";
import {
  isSampleMatchedByFilters,
} from "./experimentUtils";

const { Paragraph, Text, Title } = Typography;

const SOURCE_MODULE_LABELS: Record<TGeneratedSourceModule, string> = {
  "text-to-image": "文生图",
  "text-to-video": "文生视频",
  "image-to-video": "图生视频",
  deepfake: "Deepfake",
  manual: "手动样本",
};

const ExperimentEvaluationPage = () => {
  const cancelRequestedRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [samples, setSamples] = useState<IContentSample[]>([]);
  const [records, setRecords] = useState<IContentDetectionRecord[]>([]);
  const [experimentRecords, setExperimentRecords] = useState<IContentDetectionRecord[]>([]);
  const [jobs, setJobs] = useState<IExperimentJob[]>([]);
  const [selectedSampleIds, setSelectedSampleIds] = useState<React.Key[]>([]);
  const [filters, setFilters] = useState<IExperimentFilters>({
    mediaType: "all",
    sourceModule: "all",
    detectionStatus: "all",
  });
  const [experimentName, setExperimentName] = useState(createDefaultExperimentName());
  const [target, setTarget] = useState<TExperimentDetectionTarget>("both");
  const [imageFakeBackend, setImageFakeBackend] = useState<TImageDetectBackend>(DEFAULT_IMAGE_DETECT_BACKEND);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [batchUnlocked, setBatchUnlocked] = useState(false);
  const [run, setRun] = useState<IExperimentRun | null>(null);

  return null;
};

export default ExperimentEvaluationPage;
```

- [ ] **Step 2: Add data loading and derived values**

Inside `ExperimentEvaluationPage`, before `return`, add:

```tsx
  const sampleById = useMemo(() => new Map(samples.map((sample) => [sample.id, sample])), [samples]);
  const filteredSamples = useMemo(
    () => samples.filter((sample) => isSampleMatchedByFilters(sample, filters)),
    [filters, samples],
  );
  const selectedSamples = useMemo(
    () => selectedSampleIds.map(String).map((id) => sampleById.get(id)).filter((sample): sample is IContentSample => Boolean(sample)),
    [sampleById, selectedSampleIds],
  );
  const loadData = async () => {
    try {
      setLoading(true);
      const [nextSamples, nextRecords] = await Promise.all([fetchGeneratedSamples(), fetchDetectionRecords()]);
      setSamples(nextSamples);
      setRecords(nextRecords);
    } catch (error) {
      console.error("Load experiment data error:", error);
      message.error("加载实验数据失败，请确认后端代理已启动");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);
```

- [ ] **Step 3: Add media preview, detection status, and columns**

Still inside the component, add:

```tsx
  const renderMediaPreview = (sample: IContentSample) => {
    const icon = sample.type === "video" ? <VideoCameraOutlined /> : <FileImageOutlined />;

    if (sample.type === "video") {
      return (
        <div className="experiment-media-thumb">
          <video src={sample.fullUrl} muted preload="metadata" />
          <span className="experiment-media-icon">{icon}</span>
        </div>
      );
    }

    return (
      <div className="experiment-media-thumb">
        <Image src={sample.thumbnailUrl} alt={sample.title} preview={false} />
        <span className="experiment-media-icon">{icon}</span>
      </div>
    );
  };

  const renderDetectionStatus = (sample: IContentSample) => (
    <Space size={6} wrap>
      <Tag color={sample.detectionStatus.fake ? "blue" : "default"}>
        AI 生成{sample.detectionStatus.fake ? "已测" : "未测"}
      </Tag>
      <Tag color={sample.detectionStatus.unsafe ? "orange" : "default"}>
        敏感{sample.detectionStatus.unsafe ? "已测" : "未测"}
      </Tag>
    </Space>
  );

  const sampleColumns: ColumnsType<IContentSample> = [
    {
      title: "样本",
      width: 360,
      render: (_, sample) => (
        <Space size={12} align="center" className="experiment-sample-cell">
          {renderMediaPreview(sample)}
          <div className="experiment-sample-copy">
            <Text strong ellipsis={{ tooltip: sample.title }}>{sample.title}</Text>
            <Text type="secondary" ellipsis={{ tooltip: sample.prompt || "-" }}>
              {sample.prompt || getGenerationModelLabel(sample.model) || "无生成参数"}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: "类型",
      width: 90,
      render: (_, sample) => <Tag>{sample.type === "image" ? "图片" : "视频"}</Tag>,
    },
    {
      title: "来源",
      width: 120,
      render: (_, sample) => SOURCE_MODULE_LABELS[sample.sourceModule] || "手动样本",
    },
    {
      title: "模型",
      width: 220,
      render: (_, sample) => (
        <Text ellipsis={{ tooltip: getGenerationModelLabel(sample.model) || "-" }}>
          {getGenerationModelLabel(sample.model) || "-"}
        </Text>
      ),
    },
    {
      title: "检测状态",
      width: 190,
      render: (_, sample) => renderDetectionStatus(sample),
    },
  ];
```

- [ ] **Step 4: Add password modal handlers**

Add:

```tsx
  const requestBatchStart = () => {
    if (selectedSamples.length === 0) {
      message.warning("请至少选择一个样本");
      return;
    }

    if (running) {
      message.warning("当前已有批量检测任务在执行");
      return;
    }

    if (!batchUnlocked) {
      setPasswordInput("");
      setPasswordOpen(true);
      return;
    }

    void startBatchDetection();
  };

  const handlePasswordConfirm = () => {
    if (passwordInput !== BATCH_DETECT_PASSWORD) {
      message.warning(BATCH_PASSWORD_MESSAGE);
      return;
    }

    setBatchUnlocked(true);
    setPasswordOpen(false);
    setPasswordInput("");
    void startBatchDetection();
  };
```

The `startBatchDetection` function is added in Task 4. TypeScript will fail until Task 4 is complete.

- [ ] **Step 5: Replace the temporary return with the page shell**

Replace `return null;` with:

```tsx
  return (
    <div className="page-transition experiment-page">
      <div className="page-header">
        <Title level={2} className="page-title">实验评估中心</Title>
        <Paragraph className="page-description">
          面向研究流程的批量检测、指标评估与报告整理。批量检测会顺序执行，并将成功结果写入检测记录中心。
        </Paragraph>
      </div>

      <Alert
        className="experiment-auth-alert"
        type="info"
        showIcon
        message="批量检测为演示级授权入口"
        description="密码限制只用于实验展示和调用成本控制，不等同于服务端权限系统。"
      />

      <Card bordered={false} className="experiment-panel">
        <Form layout="vertical">
          <Row gutter={[16, 12]}>
            <Col xs={24} lg={8}>
              <Form.Item label="实验名称">
                <Input value={experimentName} onChange={(event) => setExperimentName(event.target.value)} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8} lg={4}>
              <Form.Item label="媒体类型">
                <Select value={filters.mediaType} options={EXPERIMENT_MEDIA_FILTER_OPTIONS} onChange={(value) => setFilters((current) => ({ ...current, mediaType: value }))} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8} lg={4}>
              <Form.Item label="来源模块">
                <Select value={filters.sourceModule} options={EXPERIMENT_SOURCE_FILTER_OPTIONS} onChange={(value) => setFilters((current) => ({ ...current, sourceModule: value }))} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8} lg={4}>
              <Form.Item label="检测状态">
                <Select value={filters.detectionStatus} options={EXPERIMENT_DETECTION_FILTER_OPTIONS} onChange={(value) => setFilters((current) => ({ ...current, detectionStatus: value }))} />
              </Form.Item>
            </Col>
            <Col xs={24} lg={4}>
              <Form.Item label="刷新数据">
                <Button block icon={<ReloadOutlined />} loading={loading} onClick={() => void loadData()}>
                  刷新
                </Button>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 12]}>
            <Col xs={24} md={12}>
              <Form.Item label="检测类型">
                <Radio.Group
                  optionType="button"
                  buttonStyle="solid"
                  options={EXPERIMENT_TARGET_OPTIONS}
                  value={target}
                  onChange={(event) => setTarget(event.target.value)}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="图片 AI 生成检测模型">
                <Select
                  value={imageFakeBackend}
                  options={IMAGE_DETECT_BACKENDS}
                  onChange={setImageFakeBackend}
                  disabled={target === "unsafe"}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card
        bordered={false}
        className="experiment-panel"
        title="样本选择"
        extra={<Text type="secondary">已选择 {selectedSamples.length} 个样本 / 历史检测 {records.length} 条</Text>}
      >
        <Table
          rowKey="id"
          loading={loading}
          columns={sampleColumns}
          dataSource={filteredSamples}
          rowSelection={{
            selectedRowKeys: selectedSampleIds,
            onChange: setSelectedSampleIds,
          }}
          pagination={{ pageSize: 6, showSizeChanger: false }}
          scroll={{ x: 1100 }}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无符合条件的样本" /> }}
        />

        <div className="experiment-action-bar">
          <Space wrap>
            <Button
              type="primary"
              icon={batchUnlocked ? <PlayCircleOutlined /> : <LockOutlined />}
              disabled={selectedSamples.length === 0 || running}
              onClick={requestBatchStart}
            >
              批量检测
            </Button>
          </Space>
        </div>
      </Card>

      <Modal
        title="批量检测授权"
        open={passwordOpen}
        okText="开始检测"
        cancelText="取消"
        onOk={handlePasswordConfirm}
        onCancel={() => setPasswordOpen(false)}
      >
        <Paragraph>{BATCH_PASSWORD_MESSAGE}</Paragraph>
        <Input.Password
          autoFocus
          value={passwordInput}
          onChange={(event) => setPasswordInput(event.target.value)}
          onPressEnter={handlePasswordConfirm}
          placeholder="请输入访问密码"
        />
      </Modal>
    </div>
  );
```

- [ ] **Step 6: Run build and confirm the expected missing batch function**

Run:

```bash
npm run build
```

Expected result: FAIL with `Cannot find name 'startBatchDetection'` and unused run-state symbols that are consumed by Task 4. Continue to Task 4.

---

### Task 4: Implement Sequential Batch Detection

**Files:**
- Modify: `src/pages/Data/Experiments/index.tsx`

- [ ] **Step 1: Extend imports for detection and save services**

In `src/pages/Data/Experiments/index.tsx`, update service imports:

```ts
import { fetchDetectionRecords, fetchGeneratedSamples, saveDetectionRecord } from "@/services/content";
import { detectFakeImage, detectFakeVideo, detectUnsafeImage, detectUnsafeVideo } from "@/services/detect";
```

Update utility imports:

```ts
import {
  buildFakeRecordPayload,
  buildUnsafeRecordPayload,
  createExperimentJobs,
  createSampleDetectBody,
  isSampleMatchedByFilters,
} from "./experimentUtils";
```

- [ ] **Step 2: Add job state helpers**

Inside the component, before `requestBatchStart`, add:

```tsx
  const updateJob = (jobId: string, patch: Partial<IExperimentJob>) => {
    setJobs((currentJobs) =>
      currentJobs.map((job) => (job.id === jobId ? { ...job, ...patch } : job)),
    );
  };

  const markWaitingJobsCancelled = () => {
    setJobs((currentJobs) =>
      currentJobs.map((job) =>
        job.status === "waiting"
          ? {
              ...job,
              status: "cancelled",
              endedAt: new Date().toISOString(),
              errorMessage: "用户停止了本次批量检测",
            }
          : job,
      ),
    );
  };

  const handleStopBatch = () => {
    cancelRequestedRef.current = true;
    message.info("已请求停止，当前检测项结束后将不再启动新任务");
  };
```

- [ ] **Step 3: Add one-job executor**

Add:

```tsx
  const executeDetectionJob = async ({
    job,
    sample,
    currentRun,
  }: {
    job: IExperimentJob;
    sample: IContentSample;
    currentRun: IExperimentRun;
  }) => {
    const body = createSampleDetectBody(sample);

    if (job.target === "fake") {
      const result =
        sample.type === "video"
          ? await detectFakeVideo({ body, previewUrl: sample.fullUrl })
          : await detectFakeImage({ body, backend: currentRun.imageFakeBackend, previewUrl: sample.fullUrl });
      const savedRecord = await saveDetectionRecord(
        buildFakeRecordPayload({ sample, result, imageFakeBackend: currentRun.imageFakeBackend }),
      );
      return savedRecord;
    }

    const result = sample.type === "video" ? await detectUnsafeVideo(body) : await detectUnsafeImage(body);
    const savedRecord = await saveDetectionRecord(
      buildUnsafeRecordPayload({ sample, result, imageFakeBackend: currentRun.imageFakeBackend }),
    );
    return savedRecord;
  };
```

- [ ] **Step 4: Add batch runner**

Add:

```tsx
  const startBatchDetection = async () => {
    const runId = `experiment_${Date.now()}`;
    const currentRun: IExperimentRun = {
      id: runId,
      name: experimentName.trim() || createDefaultExperimentName(),
      startedAt: new Date().toISOString(),
      target,
      imageFakeBackend,
      selectedSampleIds: selectedSamples.map((sample) => sample.id),
    };
    const nextJobs = createExperimentJobs(currentRun.selectedSampleIds, target, runId);

    setRun(currentRun);
    setJobs(nextJobs);
    setExperimentRecords([]);
    setRunning(true);
    cancelRequestedRef.current = false;

    for (const job of nextJobs) {
      if (cancelRequestedRef.current) {
        markWaitingJobsCancelled();
        break;
      }

      const sample = sampleById.get(job.sampleId);
      if (!sample) {
        updateJob(job.id, {
          status: "failed",
          errorMessage: "样本不存在或已被删除",
          endedAt: new Date().toISOString(),
        });
        continue;
      }

      updateJob(job.id, { status: "running", startedAt: new Date().toISOString(), errorMessage: undefined });

      try {
        const savedRecord = await executeDetectionJob({ job, sample, currentRun });
        setExperimentRecords((currentRecords) => [savedRecord, ...currentRecords]);
        setRecords((currentRecords) => [savedRecord, ...currentRecords]);
        updateJob(job.id, {
          status: "success",
          recordId: savedRecord.id,
          endedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Experiment job failed:", error);
        updateJob(job.id, {
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "检测失败",
          endedAt: new Date().toISOString(),
        });
      }
    }

    setRun((current) => (current ? { ...current, endedAt: new Date().toISOString() } : current));
    setRunning(false);
    void loadData();
  };
```

- [ ] **Step 5: Add job table columns**

Add:

```tsx
  const jobColumns: ColumnsType<IExperimentJob> = [
    {
      title: "样本",
      width: 260,
      render: (_, job) => {
        const sample = sampleById.get(job.sampleId);
        return sample ? sample.title : job.sampleId;
      },
    },
    {
      title: "检测类型",
      width: 130,
      render: (_, job) => EXPERIMENT_TARGET_LABELS[job.target],
    },
    {
      title: "状态",
      width: 120,
      render: (_, job) => (
        <Tag color={EXPERIMENT_JOB_STATUS_COLORS[job.status]}>
          {EXPERIMENT_JOB_STATUS_LABELS[job.status]}
        </Tag>
      ),
    },
    {
      title: "错误信息",
      render: (_, job) =>
        job.errorMessage ? <Text type="danger">{job.errorMessage}</Text> : <Text type="secondary">-</Text>,
    },
  ];
```

- [ ] **Step 6: Render the batch status card**

Add this card between the sample selection card and the password modal:

```tsx
      <Card
        bordered={false}
        className="experiment-panel"
        title="批量执行"
        extra={
          running ? (
            <Button danger icon={<StopOutlined />} onClick={handleStopBatch}>
              停止本次检测
            </Button>
          ) : null
        }
      >
        {jobs.length > 0 ? (
          <Table
            rowKey="id"
            columns={jobColumns}
            dataSource={jobs}
            pagination={{ pageSize: 6, showSizeChanger: false }}
            scroll={{ x: 760 }}
          />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="开始批量检测后会显示任务进度" />
        )}
      </Card>
```

- [ ] **Step 7: Run build and verify batch code compiles**

Run:

```bash
npm run build
```

Expected result: PASS or fail only because `run` and `experimentRecords` are written during execution but not rendered until Task 5. Task 5 consumes those values in metrics and report sections.

---

### Task 5: Add Metrics, Model Comparison, And Report View

**Files:**
- Modify: `src/pages/Data/Experiments/index.tsx`

- [ ] **Step 1: Extend imports and derived values for metric rendering**

In the Ant Design import, add:

```ts
  Progress,
  Statistic,
```

In the icon import, add:

```ts
  BarChartOutlined,
```

In the utility import from `./experimentUtils`, add:

```ts
  deriveExperimentMetrics,
  deriveModelMetrics,
  formatExperimentScore,
  formatRate,
  isHighRiskDetectionRecord,
  isPassDetectionRecord,
```

Inside the component, after `selectedSamples`, add:

```tsx
  const metrics = useMemo(
    () => deriveExperimentMetrics({ jobs, records: experimentRecords }),
    [experimentRecords, jobs],
  );
  const modelMetrics = useMemo(() => deriveModelMetrics(experimentRecords), [experimentRecords]);
  const highRiskRecords = useMemo(() => experimentRecords.filter(isHighRiskDetectionRecord), [experimentRecords]);
  const lowRiskRecords = useMemo(() => experimentRecords.filter(isPassDetectionRecord), [experimentRecords]);
```

- [ ] **Step 2: Add model metric columns**

Inside the component, add:

```tsx
  const modelMetricColumns: ColumnsType<(typeof modelMetrics)[number]> = [
    {
      title: "检测模型",
      dataIndex: "model",
      render: (value: string) => <Text ellipsis={{ tooltip: value }}>{value}</Text>,
    },
    {
      title: "检测数",
      dataIndex: "count",
      width: 90,
    },
    {
      title: "高风险",
      dataIndex: "highRiskCount",
      width: 90,
    },
    {
      title: "通过率",
      width: 120,
      render: (_, item) => formatRate(item.passRate),
    },
    {
      title: "平均分",
      width: 120,
      render: (_, item) => formatExperimentScore(item.averageScore),
    },
  ];
```

- [ ] **Step 3: Add helper for report case rendering**

Add:

```tsx
  const renderRecordCase = (record: IContentDetectionRecord) => {
    const sample = record.sampleId ? sampleById.get(record.sampleId) : undefined;
    return (
      <div className="experiment-report-case" key={record.id}>
        <Text strong ellipsis={{ tooltip: sample?.title || record.sourceTitle || record.filename }}>
          {sample?.title || record.sourceTitle || record.filename}
        </Text>
        <Space size={6} wrap>
          <Tag color={record.type === "fake" ? "blue" : "orange"}>{EXPERIMENT_TARGET_LABELS[record.type]}</Tag>
          <Tag color={isHighRiskDetectionRecord(record) ? "error" : "success"}>{record.result}</Tag>
          <Text type="secondary">{formatExperimentScore(record.type === "fake" ? record.confidence : record.riskScore)}</Text>
        </Space>
      </div>
    );
  };
```

- [ ] **Step 4: Render metrics after batch status card**

Add this card after the batch status card:

```tsx
      <Row gutter={[16, 16]} className="experiment-metric-grid">
        <Col xs={12} lg={4}>
          <Card bordered={false} className="experiment-stat-card">
            <Statistic title="应检测项" value={metrics.expectedJobs} />
          </Card>
        </Col>
        <Col xs={12} lg={4}>
          <Card bordered={false} className="experiment-stat-card">
            <Statistic title="成功检测" value={metrics.successJobs} />
          </Card>
        </Col>
        <Col xs={12} lg={4}>
          <Card bordered={false} className="experiment-stat-card is-risk">
            <Statistic title="失败项" value={metrics.failedJobs} />
          </Card>
        </Col>
        <Col xs={12} lg={4}>
          <Card bordered={false} className="experiment-stat-card">
            <Statistic title="完成率" value={Math.round(metrics.completionRate * 100)} suffix="%" />
          </Card>
        </Col>
        <Col xs={12} lg={4}>
          <Card bordered={false} className="experiment-stat-card is-risk">
            <Statistic title="高风险率" value={Math.round(metrics.highRiskRate * 100)} suffix="%" />
          </Card>
        </Col>
        <Col xs={12} lg={4}>
          <Card bordered={false} className="experiment-stat-card">
            <Statistic title="失败率" value={Math.round(metrics.failureRate * 100)} suffix="%" />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <Card bordered={false} className="experiment-panel" title="风险分布">
            <Space direction="vertical" size={14} className="experiment-progress-list">
              <div>
                <Text>AI 生成疑似率</Text>
                <Progress percent={Math.round(metrics.fakeSuspiciousRate * 100)} status="active" />
              </div>
              <div>
                <Text>敏感内容风险率</Text>
                <Progress percent={Math.round(metrics.unsafeRiskRate * 100)} strokeColor="#fa8c16" />
              </div>
              <div>
                <Text>平均 AI 生成置信度</Text>
                <Progress percent={Math.round(metrics.averageFakeConfidence || 0)} strokeColor="#1677ff" />
              </div>
              <div>
                <Text>平均敏感风险分</Text>
                <Progress percent={Math.round(metrics.averageUnsafeRiskScore || 0)} strokeColor="#cf1322" />
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card bordered={false} className="experiment-panel" title="模型对比">
            <Table
              rowKey="model"
              columns={modelMetricColumns}
              dataSource={modelMetrics}
              pagination={false}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无模型指标" /> }}
            />
          </Card>
        </Col>
      </Row>
```

- [ ] **Step 5: Render report card**

Add this card after the metrics rows:

```tsx
      <Card
        bordered={false}
        className="experiment-report-card"
        title={
          <Space>
            <BarChartOutlined />
            <span>实验报告视图</span>
          </Space>
        }
      >
        {run ? (
          <Row gutter={[20, 20]}>
            <Col xs={24} lg={10}>
              <Space direction="vertical" size={10} className="experiment-report-summary">
                <Title level={4}>{run.name}</Title>
                <Text type="secondary">检测类型：{EXPERIMENT_TARGET_LABELS[run.target]}</Text>
                <Text type="secondary">图片检测模型：{imageFakeBackend}</Text>
                <Text type="secondary">样本数：{run.selectedSampleIds.length}</Text>
                <Text type="secondary">任务数：{metrics.expectedJobs}</Text>
                <Text type="secondary">完成率：{formatRate(metrics.completionRate)}</Text>
                <Text type="secondary">高风险率：{formatRate(metrics.highRiskRate)}</Text>
                <Text type="secondary">失败率：{formatRate(metrics.failureRate)}</Text>
              </Space>
            </Col>
            <Col xs={24} lg={7}>
              <Title level={5}>高风险案例</Title>
              <Space direction="vertical" size={8} className="experiment-report-cases">
                {highRiskRecords.slice(0, 3).map(renderRecordCase)}
                {highRiskRecords.length === 0 && <Text type="secondary">暂无高风险案例</Text>}
              </Space>
            </Col>
            <Col xs={24} lg={7}>
              <Title level={5}>低风险案例</Title>
              <Space direction="vertical" size={8} className="experiment-report-cases">
                {lowRiskRecords.slice(0, 3).map(renderRecordCase)}
                {lowRiskRecords.length === 0 && <Text type="secondary">暂无低风险案例</Text>}
              </Space>
            </Col>
          </Row>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="完成一次批量检测后生成实验报告视图" />
        )}
      </Card>
```

- [ ] **Step 6: Remove unused imports**

Remove any imports left unused after rendering metrics and report sections. Keep `Progress`, `Statistic`, `BarChartOutlined`, `formatExperimentScore`, and `formatRate` because Task 5 renders them.

- [ ] **Step 7: Run build**

Run:

```bash
npm run build
```

Expected result: PASS before styling, or fail only on unused symbols introduced during this task. Remove unused symbols before continuing.

---

### Task 6: Add Experiment Page Styling

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Append scoped experiment styles**

Append this CSS near the content management section in `src/index.css`:

```css
/* ========== 数据与实验：实验评估中心 ========== */
.experiment-page .page-header {
  margin-bottom: 16px;
}

.experiment-auth-alert {
  margin-bottom: 14px;
}

.experiment-panel,
.experiment-report-card {
  margin-bottom: 16px;
  border: 1px solid var(--color-border-light);
  box-shadow: none;
}

.experiment-sample-cell {
  min-width: 0;
}

.experiment-sample-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
  max-width: 245px;
}

.experiment-media-thumb {
  position: relative;
  width: 84px;
  height: 56px;
  flex: 0 0 84px;
  overflow: hidden;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  background: #eef2f7;
}

.experiment-media-thumb img,
.experiment-media-thumb video,
.experiment-media-thumb .ant-image,
.experiment-media-thumb .ant-image-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.experiment-media-icon {
  position: absolute;
  right: 6px;
  bottom: 6px;
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: #fff;
  background: rgba(26, 32, 44, 0.72);
  font-size: 13px;
}

.experiment-action-bar {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}

.experiment-metric-grid {
  margin-bottom: 16px;
}

.experiment-stat-card {
  position: relative;
  height: 100%;
  overflow: hidden;
  border: 1px solid var(--color-border-light);
  background: linear-gradient(180deg, #ffffff 0%, #fbfcfe 100%);
  box-shadow: none;
}

.experiment-stat-card::before {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  background: rgba(30, 58, 95, 0.42);
}

.experiment-stat-card.is-risk::before {
  background: rgba(185, 28, 28, 0.58);
}

.experiment-progress-list {
  width: 100%;
}

.experiment-report-card {
  background: #ffffff;
}

.experiment-report-summary,
.experiment-report-cases {
  width: 100%;
}

.experiment-report-case {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  background: #fbfcfe;
}

@media (max-width: 768px) {
  .experiment-action-bar {
    justify-content: stretch;
  }

  .experiment-action-bar .ant-btn {
    width: 100%;
  }
}
```

- [ ] **Step 2: Run build**

Run:

```bash
npm run build
```

Expected result: PASS.

---

### Task 7: Manual Verification And Final Cleanup

**Files:**
- Verify all changed files from Tasks 1-6.

- [ ] **Step 1: Start backend proxy**

Run in one terminal:

```bash
npm run dev:proxy
```

Expected result: Express proxy starts on the configured port, normally `3001`.

- [ ] **Step 2: Start frontend**

Run in another terminal:

```bash
npm run dev
```

Expected result: Vite starts, normally at `http://localhost:53177`.

- [ ] **Step 3: Verify route and navigation**

Open:

```text
http://localhost:53177/data/experiments
```

Expected result:

- Page title is `实验评估中心`.
- Sidebar shows `数据与实验`.
- `内容管理` and `实验评估中心` are both available under that section.
- Existing `/data/output` still opens the content center.

- [ ] **Step 4: Verify password gate**

On `/data/experiments`:

- Select at least one sample.
- Click `批量检测`.
- Enter an incorrect password.

Expected result:

```text
批量检测功能仅供实验授权使用，请联系作者获取访问密码。
```

Then enter:

```text
dscan-batch-2026
```

Expected result: modal closes and batch detection starts.

- [ ] **Step 5: Verify no-selection guard**

Clear selected rows and click `批量检测`.

Expected result:

```text
请至少选择一个样本
```

- [ ] **Step 6: Verify sequential job behavior**

Run a batch with at least two jobs.

Expected result:

- One job enters `检测中`.
- Completed jobs change to `成功` or `失败`.
- A failed job keeps its error text in the job table.
- Later jobs continue after a failure.
- `停止本次检测` prevents waiting jobs from starting.

- [ ] **Step 7: Verify persisted records**

After at least one successful job, open:

```text
http://localhost:53177/data/output
```

Expected result:

- The new detection record appears in the detection records tab.
- Linked sample details show updated detection history.

- [ ] **Step 8: Verify metrics and report**

Return to `/data/experiments`.

Expected result:

- Metric cards update after jobs complete.
- Risk distribution progress bars match the current run.
- Model comparison table groups by detector model.
- Report view shows experiment name, sample count, job count, completion rate, high-risk rate, and representative cases.

- [ ] **Step 9: Final build**

Run:

```bash
npm run build
```

Expected result: PASS.

- [ ] **Step 10: Commit implementation**

Run:

```bash
git status --short
git add src/constants/experiment.ts src/typings/experiment.ts src/pages/Data/Experiments/experimentUtils.ts src/pages/Data/Experiments/index.tsx src/constants/routes.ts src/routes/index.tsx src/components/Layout/AppLayout.tsx src/index.css
git commit -m "feat: add experiment evaluation center"
```

Expected result: one feature commit containing only the experiment evaluation center implementation.
