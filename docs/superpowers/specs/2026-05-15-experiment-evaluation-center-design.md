# Experiment Evaluation Center Design

## Overview

DScan already has a content sample and detection record center. Generated image and video samples can be saved, linked detection records can be reviewed, and existing results can be downloaded or sent to single-item detection pages.

The next feature should focus on the research workflow that is still missing: batch detection, experiment-level metric aggregation, and a report-style view that can support thesis and defense materials. The feature will add an independent Experiment Evaluation Center while reusing the existing sample library, detection APIs, and detection record storage.

## Goals

- Let researchers select multiple saved samples and run batch AI-generated-content detection, unsafe-content detection, or both.
- Gate batch detection with a demo-level password prompt that tells users to contact the author for access.
- Persist successful detection results to the existing detection record store.
- Keep per-item failures visible in the current experiment run without polluting the persisted detection records.
- Provide experiment-level metrics for completion, high-risk findings, model comparison, and failure analysis.
- Provide a report view suitable for screenshots in thesis and defense materials.

## Non-Goals

- Do not introduce a full login, user, role, or backend authorization system.
- Do not persist experiment runs in the first version.
- Do not add a new charting dependency in the first version.
- Do not implement full accuracy, recall, F1, or confusion-matrix metrics until samples have verified ground-truth labels.
- Do not change the existing single-item detection pages except where shared utilities are needed.

## Route and Navigation

Add a new route:

```text
/data/experiments
```

The page label should be:

```text
实验评估中心
```

Navigation should place the new page near the existing content management page. The existing "样本与检测记录中心" remains the detailed library and history page. The new page focuses on experiment setup, batch execution, metric evaluation, and report output.

## Page Structure

### Experiment Configuration

The top section lets the researcher configure a run:

- Experiment name, defaulting to a date-based name such as "生成样本检测实验 2026-05-15".
- Sample filters:
  - Media type: image, video, or all.
  - Source module: text-to-image, text-to-video, image-to-video, deepfake, manual, or all.
  - Detection status: not detected, partially detected, fully detected, or all.
- Sample table:
  - Uses existing content samples.
  - Supports multi-select.
  - Shows media preview, title, source, model, detection status, and created time.
- Detection target:
  - AI generated detection.
  - Unsafe content detection.
  - Both.
- Image AI-generated-content backend:
  - Volc vision model.
  - UniversalFakeDetect.

The primary action is "批量检测". Clicking it opens the password dialog.

### Password Gate

Batch detection uses a front-end demo password. The password is stored in a front-end constant, for example:

```text
BATCH_DETECT_PASSWORD
```

This gate is intentionally an experience and cost-control affordance for demos. It is not a real security boundary. The UI should make that clear without distracting from the workflow.

Behavior:

- The password dialog appears only when starting batch detection.
- If the password is empty or incorrect, show:

```text
批量检测功能仅供实验授权使用，请联系作者获取访问密码。
```

- The correct password unlocks batch detection for the current page session.
- Refreshing the page requires entering the password again.
- The app should not reveal the expected password format.

### Batch Execution

Batch execution should run sequentially instead of concurrently. This reduces API pressure, helps avoid rate-limit issues, and keeps failures easier to understand in a research demo.

Each selected sample expands into one or more detection jobs:

- If target is AI generated detection, create one fake-detection job.
- If target is unsafe content detection, create one unsafe-detection job.
- If target is both, create both jobs.

Each job has a local state:

- Waiting.
- Running.
- Success.
- Failed.
- Cancelled.

For successful jobs:

- Call the existing detection service for the sample media type and selected detector.
- Normalize the detection result using existing detection utilities.
- Save the result through the existing detection record API.
- Update the page metrics from the saved record.

For failed jobs:

- Store the error message on the local job item.
- Continue executing the remaining jobs.
- Do not save a detection record for the failed job.

The page should disable starting a second batch while a batch is running. It should provide a stop action that prevents remaining waiting jobs from starting. Already completed records remain saved.

### Metrics Panel

The first version computes metrics from the current experiment run and the saved records returned by successful jobs.

Core metrics:

- Detection completion rate: successful jobs divided by expected jobs.
- High-risk rate: high-risk successful jobs divided by successful jobs.
- AI-generated suspicious rate: fake-detection records whose result is not a pass result divided by fake-detection records.
- Unsafe-content risk rate: unsafe records with medium or high risk divided by unsafe records.
- Average confidence or risk score grouped by detection type.
- Failure rate: failed jobs divided by expected jobs.

Model comparison:

- Group records by detector model.
- Show job count, average score, high-risk count, and pass rate.
- Use a table rather than a complex chart in the first version.

Distribution views:

- Use Ant Design `Progress`, `Statistic`, `Table`, `Tag`, and lightweight CSS bars.
- Do not add a charting library for the first version.

Ground-truth-dependent metrics:

- Accuracy, recall, precision, F1, and confusion matrix should be shown only after samples support verified labels.
- The first version may reserve a UI note or future field for ground truth, but should not calculate these metrics from inferred labels.

### Report View

The report view should be a screenshot-friendly section on the same page. It summarizes the current experiment in a compact layout:

- Experiment name and time range.
- Sample count and detection job count.
- Completion rate, high-risk rate, and failure rate.
- Detection target and selected detector backend.
- Representative high-risk cases.
- Representative low-risk cases.
- Failed cases, if any.

This is a visual aid for thesis and defense material creation. It does not need PDF export in the first version.

## Data Model

The first version should avoid adding a backend experiment table. Experiment state is local to the page.

Recommended front-end types:

```ts
type TExperimentDetectionTarget = "fake" | "unsafe" | "both";

type TExperimentJobStatus = "waiting" | "running" | "success" | "failed" | "cancelled";

interface IExperimentRun {
  id: string;
  name: string;
  startedAt?: string;
  endedAt?: string;
  target: TExperimentDetectionTarget;
  imageFakeBackend: TImageDetectBackend;
  selectedSampleIds: string[];
}

interface IExperimentJob {
  id: string;
  sampleId: string;
  target: TGeneratedDetectTarget;
  status: TExperimentJobStatus;
  recordId?: string;
  errorMessage?: string;
  startedAt?: string;
  endedAt?: string;
}
```

Derived metrics should be computed from `IExperimentJob`, linked samples, and saved detection records.

## API Usage

The feature should reuse existing front-end services:

- `fetchGeneratedSamples`
- `fetchDetectionRecords`
- `saveDetectionRecord`
- `detectFakeImage`
- `detectFakeVideo`
- `detectUnsafeImage`
- `detectUnsafeVideo`

The feature should build detection request bodies from existing persisted sample URLs. For local files exposed through `/api/data/media/:filename`, normalized URLs should remain usable through the existing API base normalization.

## Error Handling

- If samples fail to load, show the existing backend-startup guidance style used by the content center.
- If no sample is selected, disable batch detection and explain that at least one sample is required.
- If a video detection request requires a public URL but receives an unusable local URL, show the returned service error on that job.
- If API keys or local model services are missing, mark that job failed and continue.
- If the user stops execution, mark waiting jobs as cancelled and keep successful records.
- If result saving fails after detection succeeds, show the job as failed with the save error. Do not count it as a completed persisted result.

## Testing and Verification

Implementation should verify:

- The new route renders and appears in navigation.
- Existing samples and records load on the page.
- Batch detection cannot start with no selected samples.
- Batch detection cannot start before the correct password is entered.
- Incorrect password shows the author-contact message.
- Correct password unlocks the current page session.
- Sequential execution handles image and video samples.
- A single failed job does not stop the remaining jobs.
- Successful jobs are saved to the existing detection record center.
- Metrics update as jobs complete.
- The stop action cancels waiting jobs without deleting saved records.
- The report view reflects the current experiment run.
- `npm run build` passes.

## Implementation Notes

- Keep the first version front-end led and reuse the existing JSON-backed content store.
- Keep the password in one constant file so it is easy to change for a demo.
- Make the password gate copy honest: it is an experiment authorization prompt, not production authentication.
- Prefer small helpers for job creation, metric derivation, and result-to-record conversion so the page component does not become difficult to maintain.
- Avoid unrelated refactors in the existing content center.

