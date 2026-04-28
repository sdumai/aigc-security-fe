const { config } = require("../config.cjs");
const {
  ARK_TASK_STATUS,
  CHAT_COMPLETION,
  CONTENT_TYPE,
  DEFAULT_IMAGE_COUNT,
  POLLING,
} = require("../constants.cjs");
const { sleep } = require("../utils/http.cjs");

const ARK_CHAT_PATH = "/chat/completions";
const ARK_IMAGE_GENERATION_PATH = "/images/generations";
const ARK_TASKS_PATH = "/contents/generations/tasks";

function arkUrl(path) {
  return `${config.ark.baseUrl}${path}`;
}

function authHeaders() {
  return {
    "Content-Type": CONTENT_TYPE.JSON,
    Authorization: `Bearer ${config.ark.apiKey}`,
  };
}

function arkTaskHeaders() {
  return { Authorization: `Bearer ${config.ark.apiKey}` };
}

function chatCompletion(content, systemPrompt) {
  return fetch(arkUrl(ARK_CHAT_PATH), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      model: config.ark.visionModel,
      messages: [{ role: "user", content: [...content, { type: "text", text: systemPrompt }] }],
      max_tokens: CHAT_COMPLETION.MAX_TOKENS,
      temperature: CHAT_COMPLETION.TEMPERATURE,
    }),
  });
}

function imageChat(imageInput, systemPrompt) {
  return chatCompletion([imageInput], systemPrompt);
}

function videoChat(videoUrl, systemPrompt) {
  return chatCompletion([{ type: "video_url", video_url: { url: videoUrl } }], systemPrompt);
}

function createImageGenerationTask({
  model,
  prompt,
  size,
  responseFormat = "url",
  outputFormat,
  watermark,
  optimizePrompt,
}) {
  const body = {
    model: model || config.ark.imageModel,
    prompt,
    size,
    n: DEFAULT_IMAGE_COUNT,
    response_format: responseFormat,
    watermark: !!watermark,
  };

  if (outputFormat) {
    body.output_format = outputFormat;
  }

  if (optimizePrompt) {
    body.optimize_prompt_options = { mode: "standard" };
  }

  return fetch(arkUrl(ARK_IMAGE_GENERATION_PATH), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
}

function createVideoGenerationTask(body) {
  return fetch(arkUrl(ARK_TASKS_PATH), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
}

function getVideoGenerationTask(taskId) {
  return fetch(arkUrl(`${ARK_TASKS_PATH}/${taskId}`), {
    headers: arkTaskHeaders(),
  });
}

async function pollArkVideoTask(taskId) {
  for (let i = 0; i < POLLING.ARK_VIDEO_MAX_ATTEMPTS; i++) {
    const getRes = await getVideoGenerationTask(taskId);
    if (!getRes.ok) return null;

    const taskData = await getRes.json();
    const status = taskData?.status;
    if (status === ARK_TASK_STATUS.SUCCEEDED) {
      const videoUrl = taskData?.content?.video_url ?? taskData?.output?.video_url;
      return videoUrl || null;
    }
    if (status === ARK_TASK_STATUS.FAILED) {
      return null;
    }
    await sleep(POLLING.ARK_VIDEO_INTERVAL_MS);
  }
  return null;
}

module.exports = {
  createImageGenerationTask,
  createVideoGenerationTask,
  getVideoGenerationTask,
  imageChat,
  pollArkVideoTask,
  videoChat,
};
