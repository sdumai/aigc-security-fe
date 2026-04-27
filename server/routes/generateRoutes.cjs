const { config } = require("../config.cjs");
const { createImageGenerationTask, createVideoGenerationTask, getVideoGenerationTask, pollArkVideoTask } = require("../clients/ark.cjs");
const { signedFormRequest } = require("../clients/volcOpenApi.cjs");
const { getVolcResponseError, visualCvRequest } = require("../clients/volcVisual.cjs");
const {
  ARK_TASK_STATUS,
  DEFAULT_FACE_ANIMATION_PROMPT,
  DEFAULT_IMAGE_SIZE,
  DEFAULT_VIDEO_DURATION_SECONDS,
  DEFAULT_VIDEO_RATIO,
  MODELSCOPE,
  POLLING,
  SEEDEDIT_TASK_STATUS,
  VOLC_FACE_SWAP_2,
  VOLC_SUCCESS_CODE,
  VOLC_VISUAL,
} = require("../constants.cjs");
const {
  clampInteger,
  formatFastApiError,
  getErrorMessage,
  parseJsonOrError,
  sendBadRequest,
  sendInternalError,
  sleep,
} = require("../utils/http.cjs");
const {
  createReferenceImageContent,
  extractVolcGeneratedImage,
  normalizeModelScopeVideoUrl,
  normalizeVolcBase64Image,
  stripSimpleImageDataUrl,
  toImageDataUrl,
} = require("../utils/media.cjs");

function requireVolcCredentials(res, message) {
  if (config.volc.accessKey && config.volc.secretKey) return false;
  sendBadRequest(res, message);
  return true;
}

function requireArkApiKey(res, message = "请先配置生成服务密钥") {
  if (config.ark.apiKey) return false;
  sendBadRequest(res, message);
  return true;
}

function parseFaceSwapImages(body, res) {
  const { templateBase64, imageBase64 } = body || {};
  const template = normalizeVolcBase64Image(templateBase64);
  const image = normalizeVolcBase64Image(imageBase64);
  if (!template || !image) {
    sendBadRequest(res, "需要 templateBase64（目标图/模版）和 imageBase64（源人脸）");
    return null;
  }
  return { image, template };
}

function normalizeUnitInterval(value, fallback) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.min(1, Math.max(0, numericValue));
}

function normalizeOptionalUnitInterval(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return undefined;
  return Math.min(1, Math.max(0, numericValue));
}

function normalizeFaceSwapFaceType(value) {
  return ["area", "l2r", "t2b"].includes(value) ? value : VOLC_VISUAL.FACE_SWAP_FACE_TYPE;
}

function normalizeFaceSwapLocation(value, fallback) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.min(3, Math.max(1, Math.round(numericValue)));
}

function normalizeLogoPosition(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 0;
  return Math.min(3, Math.max(0, Math.round(numericValue)));
}

function normalizeLogoLanguage(value) {
  const numericValue = Number(value);
  return numericValue === 1 ? 1 : 0;
}

function buildFaceSwapLogoInfo(body) {
  if (body?.addLogo !== true) return undefined;

  const logoInfo = {
    add_logo: true,
    position: normalizeLogoPosition(body.logoPosition),
    language: normalizeLogoLanguage(body.logoLanguage),
    opacity: normalizeUnitInterval(body.logoOpacity, 1),
  };
  const logoText = typeof body.logoText === "string" ? body.logoText.trim() : "";
  if (logoText) {
    logoInfo.logo_text_content = logoText;
  }
  return logoInfo;
}

function sendVolcImageResult(res, imageUrl, message) {
  return res.json({
    imageUrl,
    message,
    format: imageUrl.startsWith("data:") ? "data_url" : "url",
  });
}

function validateVisualResult(volcRes, res, fallback) {
  if (!volcRes.ok) {
    const message = volcRes.request_id ? `${volcRes.message}（request_id: ${volcRes.request_id}）` : volcRes.message;
    sendInternalError(res, message);
    return false;
  }
  if (volcRes.code !== undefined && volcRes.code !== VOLC_SUCCESS_CODE) {
    sendInternalError(res, getVolcResponseError(volcRes.data, fallback));
    return false;
  }
  return true;
}

function registerFaceSwapV2Route(app) {
  app.post("/api/generate/faceswap", async (req, res) => {
    try {
      if (
        requireVolcCredentials(
          res,
          "请配置火山引擎视觉 API 密钥：在 .env.local 中设置 VOLC_ACCESS_KEY 和 VOLC_SECRET_KEY",
        )
      ) {
        return;
      }

      const images = parseFaceSwapImages(req.body, res);
      if (!images) return;

      const query = { Action: VOLC_FACE_SWAP_2.ACTION, Version: VOLC_FACE_SWAP_2.VERSION };
      const bodyParams = new URLSearchParams();
      bodyParams.set("image_base64", images.image);
      bodyParams.set("template_base64", images.template);
      bodyParams.set("action_id", VOLC_FACE_SWAP_2.ACTION_ID);
      bodyParams.set("version", VOLC_FACE_SWAP_2.MODEL_VERSION);
      const sourceSimilarity = normalizeOptionalUnitInterval(req.body?.sourceSimilarity);
      if (sourceSimilarity !== undefined) {
        bodyParams.set("source_similarity", String(sourceSimilarity));
      }
      if (req.body?.doRisk === true) {
        bodyParams.set("do_risk", "true");
      }

      const volcRes = await signedFormRequest(query, bodyParams);
      const data = await volcRes.json();
      if (data.ResponseMetadata && data.ResponseMetadata.Error) {
        return sendInternalError(res, getVolcResponseError(data, "火山引擎人像融合接口错误"));
      }
      if (data.code !== undefined && data.code !== VOLC_SUCCESS_CODE) {
        return sendInternalError(res, getVolcResponseError(data, `接口错误: ${data.code}`));
      }

      const imageUrl = extractVolcGeneratedImage(data);
      if (!imageUrl) {
        return sendInternalError(res, "未返回融合结果图");
      }
      sendVolcImageResult(res, imageUrl, "人脸替换完成（Volc FaceSwap 2.0）");
    } catch (err) {
      console.error("Volc FaceSwap error:", err);
      sendInternalError(res, getErrorMessage(err, "请求火山引擎人像融合失败"));
    }
  });
}

function registerFaceSwapV36Route(app) {
  app.post("/api/generate/faceswap-3.6", async (req, res) => {
    try {
      if (
        requireVolcCredentials(
          res,
          "请配置火山引擎视觉 API 密钥：在 .env.local 中设置 VOLC_ACCESS_KEY 和 VOLC_SECRET_KEY",
        )
      ) {
        return;
      }

      const images = parseFaceSwapImages(req.body, res);
      if (!images) return;

      const sourceSimilarity = normalizeOptionalUnitInterval(req.body?.sourceSimilarity);
      const logoInfo = buildFaceSwapLogoInfo(req.body);
      const volcRes = await visualCvRequest(VOLC_VISUAL.FACE_SWAP_ACTION, {
        req_key: VOLC_VISUAL.FACE_SWAP_REQ_KEY,
        binary_data_base64: [images.image, images.template],
        face_type: normalizeFaceSwapFaceType(req.body?.faceType),
        merge_infos: [
          {
            location: normalizeFaceSwapLocation(req.body?.sourceLocation, VOLC_VISUAL.FACE_SWAP_SOURCE_LOCATION),
            template_location: normalizeFaceSwapLocation(
              req.body?.templateLocation,
              VOLC_VISUAL.FACE_SWAP_TEMPLATE_LOCATION,
            ),
          },
        ],
        ...(sourceSimilarity !== undefined ? { source_similarity: String(sourceSimilarity) } : {}),
        ...(logoInfo ? { logo_info: logoInfo } : {}),
        return_url: req.body?.returnUrl === true,
      });

      if (!validateVisualResult(volcRes, res, `接口错误: ${volcRes.code}`)) return;

      const imageUrl = extractVolcGeneratedImage(volcRes.data);
      if (!imageUrl) {
        return sendInternalError(res, "未返回融合结果图");
      }
      sendVolcImageResult(res, imageUrl, "人脸替换完成（Volc FaceSwap 3.6）");
    } catch (err) {
      console.error("Volc FaceSwap 3.6 error:", err);
      sendInternalError(res, getErrorMessage(err, "请求火山引擎人像融合 3.6 失败"));
    }
  });
}

function normalizeSeedEditScale(scale) {
  const numericScale = Number(scale);
  if (!Number.isFinite(numericScale)) return VOLC_VISUAL.SEEDEDIT_DEFAULT_SCALE;
  return Math.min(VOLC_VISUAL.SEEDEDIT_MAX_SCALE, Math.max(VOLC_VISUAL.SEEDEDIT_MIN_SCALE, numericScale));
}

function normalizeSeedEditSeed(seed) {
  const numericSeed = Number(seed);
  if (!Number.isFinite(numericSeed)) return VOLC_VISUAL.SEEDEDIT_DEFAULT_SEED;
  return Math.min(VOLC_VISUAL.SEEDEDIT_MAX_SEED, Math.max(VOLC_VISUAL.SEEDEDIT_MIN_SEED, Math.round(numericSeed)));
}

function buildSeedEditSubmitBody({ prompt, imageInput, seed, scale }) {
  const submitBody = {
    req_key: VOLC_VISUAL.SEEDEDIT_REQ_KEY,
    prompt,
    seed: normalizeSeedEditSeed(seed),
    scale: normalizeSeedEditScale(scale),
  };

  if (/^https?:\/\//i.test(imageInput)) {
    submitBody.image_urls = [imageInput];
  } else {
    submitBody.binary_data_base64 = [stripSimpleImageDataUrl(imageInput)];
  }

  return submitBody;
}

async function pollSeedEditResult(taskId, res) {
  for (let i = 0; i < POLLING.SEEDEDIT_MAX_ATTEMPTS; i++) {
    const getRes = await visualCvRequest(VOLC_VISUAL.SEEDEDIT_GET_RESULT_ACTION, {
      req_key: VOLC_VISUAL.SEEDEDIT_REQ_KEY,
      task_id: taskId,
      req_json: JSON.stringify({ return_url: true }),
    });

    if (!getRes.ok) {
      sendInternalError(res, getRes.message || "查询任务失败");
      return true;
    }
    if (getRes.code !== VOLC_SUCCESS_CODE) {
      sendInternalError(res, getRes.message || `查询失败 code=${getRes.code}`);
      return true;
    }

    const status = getRes.data?.data?.status;
    if (status === SEEDEDIT_TASK_STATUS.DONE) {
      const urls = getRes.data?.data?.image_urls;
      const base64Arr = getRes.data?.data?.binary_data_base64;
      if (Array.isArray(urls) && urls.length > 0) {
        res.json({ imageUrl: urls[0], message: "属性编辑完成。" });
        return true;
      }
      if (Array.isArray(base64Arr) && base64Arr.length > 0) {
        res.json({
          imageUrl: `data:image/jpeg;base64,${base64Arr[0]}`,
          message: "属性编辑完成。",
        });
        return true;
      }
      sendInternalError(res, "任务完成但未返回图片");
      return true;
    }
    if (status === SEEDEDIT_TASK_STATUS.NOT_FOUND || status === SEEDEDIT_TASK_STATUS.EXPIRED) {
      sendInternalError(res, status === SEEDEDIT_TASK_STATUS.EXPIRED ? "任务已过期，请重新提交" : "任务未找到");
      return true;
    }

    await sleep(POLLING.SEEDEDIT_INTERVAL_MS);
  }

  sendInternalError(res, "生成超时，请稍后重试");
  return true;
}

function registerSeedEditRoute(app) {
  app.post("/api/generate/seededit", async (req, res) => {
    try {
      if (requireVolcCredentials(res, "请配置 VOLC_ACCESS_KEY 与 VOLC_SECRET_KEY（与人脸融合相同）")) return;

      const { prompt, imageUrl, imageBase64, seed, scale } = req.body || {};
      const editPrompt = typeof prompt === "string" ? prompt.trim() : "";
      if (!editPrompt) {
        return sendBadRequest(res, "需要 prompt（编辑指令）");
      }

      let imageInput = typeof imageUrl === "string" ? imageUrl.trim() : "";
      if (!imageInput && typeof imageBase64 === "string" && imageBase64.length > 0) {
        imageInput = toImageDataUrl(imageBase64);
      }
      if (!imageInput) {
        return sendBadRequest(res, "需要 imageUrl 或 imageBase64（待编辑图片）");
      }

      const submitRes = await visualCvRequest(
        VOLC_VISUAL.SEEDEDIT_SUBMIT_ACTION,
        buildSeedEditSubmitBody({ prompt: editPrompt, imageInput, seed, scale }),
      );
      if (!submitRes.ok) {
        const message = submitRes.message || "提交任务失败";
        return sendInternalError(res, submitRes.request_id ? `${message}（request_id: ${submitRes.request_id}）` : message);
      }
      if (submitRes.code !== VOLC_SUCCESS_CODE) {
        return sendInternalError(res, submitRes.message || `提交失败 code=${submitRes.code}`);
      }

      const taskId = submitRes.data?.data?.task_id;
      if (!taskId) {
        return sendInternalError(res, "未返回 task_id");
      }
      await pollSeedEditResult(taskId, res);
    } catch (err) {
      console.error("SeedEdit error:", err);
      sendInternalError(res, getErrorMessage(err, "属性编辑请求失败"));
    }
  });
}

async function pollFommTask(taskId, res) {
  for (let i = 0; i < POLLING.ARK_VIDEO_MAX_ATTEMPTS; i++) {
    const getRes = await getVideoGenerationTask(taskId);
    if (!getRes.ok) {
      sendInternalError(res, `查询任务失败 ${getRes.status}`);
      return true;
    }

    const taskData = await getRes.json();
    const status = taskData?.status;
    if (status === ARK_TASK_STATUS.SUCCEEDED) {
      const videoUrl = taskData?.content?.video_url ?? taskData?.output?.video_url;
      if (!videoUrl) {
        sendInternalError(res, "未返回视频地址");
        return true;
      }
      res.json({ videoUrl, message: "人脸动画视频生成成功。" });
      return true;
    }
    if (status === ARK_TASK_STATUS.FAILED) {
      sendInternalError(res, taskData?.error?.message ?? taskData?.message ?? "生成失败");
      return true;
    }

    await sleep(POLLING.ARK_VIDEO_INTERVAL_MS);
  }

  sendInternalError(res, "生成超时，请稍后重试");
  return true;
}

function registerFommRoute(app) {
  app.post("/api/generate/fomm", async (req, res) => {
    try {
      const { imageBase64, prompt } = req.body || {};
      if (requireArkApiKey(res, "请先配置生成服务密钥（VOLC_ARK_API_KEY）")) return;

      const promptText = typeof prompt === "string" ? prompt.trim() : "";
      const imageInput = typeof imageBase64 === "string" ? imageBase64.trim() : "";
      if (!imageInput) {
        return sendBadRequest(res, "需要 imageBase64（目标人脸图片）");
      }

      const createRes = await createVideoGenerationTask({
        model: config.ark.i2vModel,
        content: [
          { type: "text", text: promptText || DEFAULT_FACE_ANIMATION_PROMPT },
          { type: "image_url", image_url: { url: toImageDataUrl(imageInput) }, role: "reference_image" },
        ],
        ratio: DEFAULT_VIDEO_RATIO,
        duration: DEFAULT_VIDEO_DURATION_SECONDS,
      });
      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));
        return sendInternalError(res, errData?.error?.message || `创建任务失败 ${createRes.status}`);
      }

      const createData = await createRes.json();
      const taskId = createData?.id;
      if (!taskId) {
        return sendInternalError(res, "未返回任务 ID");
      }
      await pollFommTask(taskId, res);
    } catch (err) {
      console.error("FOMM/I2V error:", err);
      sendInternalError(res, getErrorMessage(err, "人脸动画请求失败"));
    }
  });
}

function registerArkImageRoute(app) {
  app.post("/api/generate/image", async (req, res) => {
    try {
      if (requireArkApiKey(res)) return;

      const { prompt, size, watermark } = req.body || {};
      const promptText = typeof prompt === "string" ? prompt.trim() : "";
      if (!promptText) {
        return sendBadRequest(res, "需要 prompt（提示词）");
      }

      const resFetch = await createImageGenerationTask({
        prompt: promptText,
        size: size || DEFAULT_IMAGE_SIZE,
        watermark,
      });
      if (!resFetch.ok) {
        const errData = await resFetch.json().catch(() => ({}));
        return sendInternalError(res, errData?.error?.message || `请求失败 ${resFetch.status}`);
      }

      const data = await resFetch.json();
      const imageUrl = data?.data?.[0]?.url;
      if (!imageUrl) return sendInternalError(res, "未返回图片地址");
      res.json({ imageUrl, message: "图像生成成功！" });
    } catch (err) {
      console.error("Image gen error:", err);
      sendInternalError(res, getErrorMessage(err, "图像生成失败"));
    }
  });
}

function registerStableDiffusionRoute(app) {
  app.post("/api/generate/image-stable-diffusion", async (req, res) => {
    try {
      const { prompt, size, watermark } = req.body || {};
      const promptText = typeof prompt === "string" ? prompt.trim() : "";
      if (!promptText) {
        return sendBadRequest(res, "需要 prompt（提示词）");
      }

      const sdRes = await fetch(`${config.localServices.stableDiffusionUrl}/api/sd/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptText,
          size: size || DEFAULT_IMAGE_SIZE,
          watermark: !!watermark,
        }),
      });
      const text = await sdRes.text();
      const parsed = parseJsonOrError(text, sdRes.status, "SD 服务");
      if (!parsed.ok) {
        return sendInternalError(res, parsed.message);
      }
      const data = parsed.data;
      if (!sdRes.ok) {
        return sendInternalError(
          res,
          formatFastApiError(data, sdRes.status, "SD 服务错误") || "Stable Diffusion 请求失败",
        );
      }

      const imageUrl = data.imageUrl;
      if (!imageUrl || typeof imageUrl !== "string") {
        return sendInternalError(res, "SD 未返回 imageUrl");
      }
      let normalized = imageUrl.trim();
      if (!normalized.startsWith("http") && !normalized.startsWith("data:")) {
        normalized = `data:image/png;base64,${normalized}`;
      }
      res.json({
        imageUrl: normalized,
        message: data.message || "图像生成成功！",
        format: normalized.startsWith("data:") ? "data_url" : "url",
      });
    } catch (err) {
      console.error("Stable Diffusion proxy error:", err);
      sendInternalError(
        res,
        getErrorMessage(err, "无法连接 Stable Diffusion 服务，请确认已启动（STABLE_DIFFUSION_SERVICE_URL / 默认 127.0.0.1:8009）"),
      );
    }
  });
}

function registerModelScopeRoute(app) {
  app.post("/api/generate/model-scope", async (req, res) => {
    try {
      const { prompt, num_frames, num_inference_steps } = req.body || {};
      const promptText = typeof prompt === "string" ? prompt.trim() : "";
      if (!promptText) {
        return sendBadRequest(res, "需要 prompt（提示词）");
      }

      const frames = clampInteger(num_frames, {
        min: MODELSCOPE.MIN_FRAMES,
        max: MODELSCOPE.MAX_FRAMES,
        fallback: MODELSCOPE.DEFAULT_FRAMES,
      });
      const steps = clampInteger(num_inference_steps, {
        min: MODELSCOPE.MIN_INFERENCE_STEPS,
        max: MODELSCOPE.MAX_INFERENCE_STEPS,
        fallback: MODELSCOPE.DEFAULT_INFERENCE_STEPS,
      });

      const msRes = await fetch(`${config.localServices.modelScopeT2vUrl}/api/t2v/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptText,
          num_frames: frames,
          num_inference_steps: steps,
        }),
      });
      const text = await msRes.text();
      const parsed = parseJsonOrError(text, msRes.status, "ModelScope T2V");
      if (!parsed.ok) {
        return sendInternalError(res, parsed.message);
      }
      const data = parsed.data;
      if (!msRes.ok) {
        return sendInternalError(
          res,
          formatFastApiError(data, msRes.status, "ModelScope T2V 错误") || "ModelScope T2V 请求失败",
        );
      }

      const videoUrl = data.videoUrl;
      if (!videoUrl || typeof videoUrl !== "string") {
        return sendInternalError(res, "ModelScope T2V 未返回 videoUrl");
      }
      const normalized = normalizeModelScopeVideoUrl(videoUrl);
      res.json({
        videoUrl: normalized,
        message: data.message || "视频生成成功！",
        format: normalized.startsWith("data:") ? "data_url" : "url",
      });
    } catch (err) {
      console.error("ModelScope T2V proxy error:", err);
      sendInternalError(res, getErrorMessage(err, "无法连接 ModelScope T2V（MODELSCOPE_T2V_URL / 默认 127.0.0.1:8011）"));
    }
  });
}

function registerTextToVideoRoute(app) {
  app.post("/api/generate/t2v", async (req, res) => {
    try {
      if (requireArkApiKey(res)) return;

      const { prompt, ratio, duration } = req.body || {};
      const promptText = typeof prompt === "string" ? prompt.trim() : "";
      if (!promptText) {
        return sendBadRequest(res, "需要 prompt（提示词）");
      }

      const createRes = await createVideoGenerationTask({
        model: config.ark.t2vModel,
        content: [{ type: "text", text: promptText }],
        ratio: ratio || DEFAULT_VIDEO_RATIO,
        duration: Number(duration) || DEFAULT_VIDEO_DURATION_SECONDS,
      });
      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));
        return sendInternalError(res, errData?.error?.message || `创建任务失败 ${createRes.status}`);
      }

      const createData = await createRes.json();
      const taskId = createData?.id;
      if (!taskId) return sendInternalError(res, "未返回任务 ID");
      const videoUrl = await pollArkVideoTask(taskId);
      if (!videoUrl) return sendInternalError(res, "生成失败或超时，请稍后重试");
      res.json({ videoUrl, message: "视频生成成功！" });
    } catch (err) {
      console.error("T2V error:", err);
      sendInternalError(res, getErrorMessage(err, "文生视频失败"));
    }
  });
}

function registerImageToVideoRoute(app) {
  app.post("/api/generate/i2v", async (req, res) => {
    try {
      if (requireArkApiKey(res)) return;

      const { prompt, imageBase64List, ratio, duration } = req.body || {};
      const promptText = typeof prompt === "string" ? prompt.trim() : "";
      const list = Array.isArray(imageBase64List) ? imageBase64List : [];
      if (list.length === 0) {
        return sendBadRequest(res, "需要至少一张参考图（imageBase64List）");
      }

      const referenceImages = createReferenceImageContent(list);
      if (referenceImages.length === 0) {
        return sendBadRequest(res, "需要至少一张有效参考图");
      }

      const createRes = await createVideoGenerationTask({
        model: config.ark.i2vModel,
        content: [{ type: "text", text: promptText }, ...referenceImages],
        ratio: ratio || DEFAULT_VIDEO_RATIO,
        duration: Number(duration) || DEFAULT_VIDEO_DURATION_SECONDS,
      });
      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));
        return sendInternalError(res, errData?.error?.message || `创建任务失败 ${createRes.status}`);
      }

      const createData = await createRes.json();
      const taskId = createData?.id;
      if (!taskId) return sendInternalError(res, "未返回任务 ID");
      const videoUrl = await pollArkVideoTask(taskId);
      if (!videoUrl) return sendInternalError(res, "生成失败或超时，请稍后重试");
      res.json({ videoUrl, message: "视频生成成功！" });
    } catch (err) {
      console.error("I2V error:", err);
      sendInternalError(res, getErrorMessage(err, "图生视频失败"));
    }
  });
}

function registerGenerateRoutes(app) {
  registerFaceSwapV2Route(app);
  registerFaceSwapV36Route(app);
  registerSeedEditRoute(app);
  registerFommRoute(app);
  registerArkImageRoute(app);
  registerStableDiffusionRoute(app);
  registerModelScopeRoute(app);
  registerTextToVideoRoute(app);
  registerImageToVideoRoute(app);
}

module.exports = {
  registerGenerateRoutes,
};
