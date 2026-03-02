/**
 * 检测与生成代理：密钥仅存服务端
 * 火山方舟：VOLC_ARK_API_KEY、VOLC_ARK_VISION_MODEL（图片/视频理解、AI 生成检测、敏感检测）
 * 火山人像融合：VOLC_ACCESS_KEY、VOLC_SECRET_KEY
 * 启动：node server/index.cjs
 */
require("dotenv").config({ path: ".env.local" });
const express = require("express");
const cors = require("cors");

const VOLC_ARK_API_KEY = (process.env.VOLC_ARK_API_KEY || process.env.VITE_VOLC_ARK_API_KEY || "").trim();
const VOLC_ARK_VISION_MODEL = (
  process.env.VOLC_ARK_VISION_MODEL ||
  process.env.VITE_VOLC_ARK_VISION_MODEL ||
  ""
).trim();
const VOLC_ACCESS_KEY = (process.env.VOLC_ACCESS_KEY || process.env.VITE_VOLC_ACCESS_KEY || "").trim();
const VOLC_SECRET_KEY = (process.env.VOLC_SECRET_KEY || process.env.VITE_VOLC_SECRET_KEY || "").trim();

const app = express();
app.use(cors());
app.use(express.json({ limit: "30mb" }));

/** 火山方舟图片理解：敏感内容检测（Chat 多模态 API）
 * @see https://www.volcengine.com/docs/82379/1362931
 * 需在控制台创建「支持视觉」的模型接入点，将 endpoint_id 配到 VOLC_ARK_VISION_MODEL
 */
const VOLC_ARK_CHAT_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
const VOLC_SAFE_PROMPT = `你是一个图片内容安全审核助手。请判断该图片是否包含以下违规内容：暴力血腥、色情低俗、政治敏感、仇恨符号、毒品赌博、未成年人不当内容等。
仅输出一个 JSON 对象，不要其他文字。格式：{"safe": true或false, "suggestion": "pass或review或block", "labels": ["标签1","标签2"], "reason": "简短原因"}
若内容安全则 safe 为 true、suggestion 为 pass、labels 为空数组；否则 safe 为 false，suggestion 为 review 或 block，labels 列出违规类型。`;

/** 火山方舟图片理解：AI 生成图片检测（多模态 Chat API）
 * @see https://www.volcengine.com/docs/82379/1362931
 * 入参：imageUrl 或 imageBase64；返回 isAIGenerated、confidence、reason
 */
const VOLC_IMAGE_AIGC_PROMPT = `你是一个图像真伪鉴定助手。请仔细观察该图片，判断其是否为 AI 生成、合成或深度伪造（如 GAN、Diffusion、Deepfake、FaceSwap 等）。
仅输出一个 JSON 对象，不要其他文字。格式：{"isAIGenerated": true或false, "confidence": 0到1之间的小数, "reason": "简短说明"}
若判断为真人拍摄/非 AI 生成则 isAIGenerated 为 false，confidence 为可信度；若判断为 AI 生成或合成则 isAIGenerated 为 true，confidence 为置信度。`;

function volcImageChat(imageInput, systemPrompt) {
  return fetch(VOLC_ARK_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${VOLC_ARK_API_KEY}`,
    },
    body: JSON.stringify({
      model: VOLC_ARK_VISION_MODEL,
      messages: [{ role: "user", content: [imageInput, { type: "text", text: systemPrompt }] }],
      max_tokens: 512,
      temperature: 0.1,
    }),
  });
}

app.post("/api/detect/volc-image-aigc", async (req, res) => {
  const sendErr = (msg) => res.status(500).json({ error: msg });
  try {
    if (!VOLC_ARK_API_KEY) {
      return sendErr("请先配置生成服务密钥（VOLC_ARK_API_KEY）");
    }
    if (!VOLC_ARK_VISION_MODEL) {
      return sendErr("请配置 VOLC_ARK_VISION_MODEL（支持图片理解的模型接入点 ID）");
    }
    const { imageUrl, imageBase64 } = req.body || {};
    let imageInput;
    if (imageUrl && typeof imageUrl === "string") {
      imageInput = { type: "image_url", image_url: { url: imageUrl.trim() } };
    } else if (imageBase64 && typeof imageBase64 === "string") {
      const dataUrl = imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;
      imageInput = { type: "image_url", image_url: { url: dataUrl } };
    } else {
      return res.status(400).json({ error: "需要 imageUrl 或 imageBase64" });
    }
    const response = await volcImageChat(imageInput, VOLC_IMAGE_AIGC_PROMPT);
    const data = await response.json();
    if (data.error) {
      return sendErr(data.error.message || data.error.code || "接口错误");
    }
    const text = data.choices?.[0]?.message?.content?.trim() || "";
    let parsed = { isAIGenerated: false, confidence: 0, reason: "" };
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch (_) {}
    res.json(parsed);
  } catch (err) {
    console.error("Volc image AIGC error:", err);
    sendErr(err && err.message ? err.message : "请求失败");
  }
});

app.post("/api/detect/volc-ims", async (req, res) => {
  const sendErr = (msg) => res.status(500).json({ error: msg });
  try {
    if (!VOLC_ARK_API_KEY) {
      return sendErr("请先配置生成服务密钥（VOLC_ARK_API_KEY）");
    }
    if (!VOLC_ARK_VISION_MODEL) {
      return sendErr("请配置 VOLC_ARK_VISION_MODEL（支持视觉的模型接入点 ID）");
    }
    const { imageUrl, imageBase64 } = req.body || {};
    let imageInput;
    if (imageUrl && typeof imageUrl === "string") {
      imageInput = { type: "image_url", image_url: { url: imageUrl.trim() } };
    } else if (imageBase64 && typeof imageBase64 === "string") {
      const dataUrl = imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;
      imageInput = { type: "image_url", image_url: { url: dataUrl } };
    } else {
      return res.status(400).json({ error: "需要 imageUrl 或 imageBase64" });
    }
    const response = await volcImageChat(imageInput, VOLC_SAFE_PROMPT);
    const data = await response.json();
    if (data.error) {
      return sendErr(data.error.message || data.error.code || "火山方舟接口错误");
    }
    const text = data.choices?.[0]?.message?.content?.trim() || "";
    let parsed = { safe: true, suggestion: "pass", labels: [], reason: "" };
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch (_) {}
    res.json(parsed);
  } catch (err) {
    console.error("Volc IMS error:", err);
    sendErr(err && err.message ? err.message : "请求火山方舟失败");
  }
});

/** 火山方舟视频理解：视频敏感内容检测（Chat 多模态 API）
 * @see https://www.volcengine.com/docs/82379/1895586
 * 入参：videoUrl 公网可访问的视频地址，或 videoBase64 视频的 base64（与文档中 data:video/mp4;base64, 一致）
 */
const VOLC_VIDEO_SAFE_PROMPT = `你是一个视频内容安全审核助手。请观看该视频，判断是否包含以下违规内容：暴力血腥、色情低俗、政治敏感、仇恨符号、毒品赌博、未成年人不当内容等。
仅输出一个 JSON 对象，不要其他文字。格式：{"safe": true或false, "suggestion": "pass或review或block", "labels": ["标签1","标签2"], "reason": "简短原因"}
若内容安全则 safe 为 true、suggestion 为 pass、labels 为空数组；否则 safe 为 false，suggestion 为 review 或 block，labels 列出违规类型。`;

app.post("/api/detect/volc-video-ims", async (req, res) => {
  const sendErr = (msg) => res.status(500).json({ error: msg });
  try {
    if (!VOLC_ARK_API_KEY) {
      return sendErr("请在 .env.local 中配置 VOLC_ARK_API_KEY 或 VITE_VOLC_ARK_API_KEY");
    }
    if (!VOLC_ARK_VISION_MODEL) {
      return sendErr("请在 .env.local 中配置 VOLC_ARK_VISION_MODEL（支持视频理解的模型接入点 ID，如 ep-xxx）");
    }
    const { videoUrl, videoBase64 } = req.body || {};
    let videoUrlValue = typeof videoUrl === "string" ? videoUrl.trim() : "";
    if (!videoUrlValue && typeof videoBase64 === "string" && videoBase64.length > 0) {
      videoUrlValue = videoBase64.startsWith("data:") ? videoBase64 : `data:video/mp4;base64,${videoBase64}`;
    }
    if (!videoUrlValue) {
      return res.status(400).json({ error: "需要 videoUrl（公网可访问的视频地址）或 videoBase64（视频 Base64 编码）" });
    }
    // 文档 Base64 传入：video_url 为 "data:video/mp4;base64,{base64}"（与 https://www.volcengine.com/docs/82379/1895586 一致）
    const videoContentBlock = { type: "video_url", video_url: { url: videoUrlValue } };
    const response = await fetch(VOLC_ARK_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${VOLC_ARK_API_KEY}`,
      },
      body: JSON.stringify({
        model: VOLC_ARK_VISION_MODEL,
        messages: [
          {
            role: "user",
            content: [videoContentBlock, { type: "text", text: VOLC_VIDEO_SAFE_PROMPT }],
          },
        ],
        max_tokens: 512,
        temperature: 0.1,
      }),
    });
    const data = await response.json();
    if (data.error) {
      return sendErr(data.error.message || data.error.code || "火山方舟接口错误");
    }
    const text = data.choices?.[0]?.message?.content?.trim() || "";
    let parsed = { safe: true, suggestion: "pass", labels: [], reason: "" };
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch (_) {}
    res.json(parsed);
  } catch (err) {
    console.error("Volc video IMS error:", err);
    sendErr(err && err.message ? err.message : "请求火山方舟失败");
  }
});

/** 视频 AI 生成检测（火山方舟视频理解）
 * @see https://www.volcengine.com/docs/82379/1895586 视频理解
 * 入参：videoUrl 或 videoBase64，与 volc-video-ims 一致
 * 返回：与前端 Detect/Fake 视频结果结构一致，便于直接 setResult
 */
const VOLC_VIDEO_AIGC_PROMPT = `你是一个视频真伪鉴别助手。请观看该视频，判断其是否为 AI 生成、深度伪造、换脸或合成视频（如 Deepfake、FaceSwap、图生视频等）。
仅输出一个 JSON 对象，不要其他文字。格式：{"is_ai_generated": true或false, "confidence": 0到1之间的小数, "reason": "简短说明"}
若为真实拍摄/非 AI 合成则 is_ai_generated 为 false、confidence 接近 0；若存在明显 AI 生成痕迹则 is_ai_generated 为 true、confidence 接近 1。`;

app.post("/api/detect/volc-video-aigc", async (req, res) => {
  const sendErr = (msg) => res.status(500).json({ error: msg });
  try {
    if (!VOLC_ARK_API_KEY) {
      return sendErr("请先配置生成服务密钥");
    }
    if (!VOLC_ARK_VISION_MODEL) {
      return sendErr("请配置 VOLC_ARK_VISION_MODEL（支持视频理解的模型接入点 ID）");
    }
    const { videoUrl, videoBase64 } = req.body || {};
    let videoUrlValue = typeof videoUrl === "string" ? videoUrl.trim() : "";
    if (!videoUrlValue && typeof videoBase64 === "string" && videoBase64.length > 0) {
      videoUrlValue = videoBase64.startsWith("data:") ? videoBase64 : `data:video/mp4;base64,${videoBase64}`;
    }
    if (!videoUrlValue) {
      return res.status(400).json({ error: "需要 videoUrl（公网可访问）或 videoBase64" });
    }
    const videoContentBlock = { type: "video_url", video_url: { url: videoUrlValue } };
    const response = await fetch(VOLC_ARK_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${VOLC_ARK_API_KEY}`,
      },
      body: JSON.stringify({
        model: VOLC_ARK_VISION_MODEL,
        messages: [
          {
            role: "user",
            content: [videoContentBlock, { type: "text", text: VOLC_VIDEO_AIGC_PROMPT }],
          },
        ],
        max_tokens: 512,
        temperature: 0.1,
      }),
    });
    const data = await response.json();
    if (data.error) {
      return sendErr(data.error.message || data.error.code || "视频理解接口错误");
    }
    const text = data.choices?.[0]?.message?.content?.trim() || "";
    let isFake = false;
    let confidence = 0;
    let reason = "";
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        isFake = !!parsed.is_ai_generated;
        confidence = Math.min(1, Math.max(0, Number(parsed.confidence) || 0));
        reason = String(parsed.reason || "").trim() || (isFake ? "存在 AI 生成痕迹" : "未发现明显 AI 生成痕迹");
      }
    } catch (_) {}
    const segmentConclusion =
      confidence < 0.5
        ? "无 AI 生成痕迹的常规视频"
        : confidence <= 0.9
          ? "含 AI 生成，建议人工二次校验"
          : "大概率为 AI 合成视频";
    res.json({
      isFake: isFake || confidence >= 0.5,
      confidence,
      model: "视频 AI 生成识别",
      heatmapUrl: typeof videoUrl === "string" ? videoUrl.trim() : undefined,
      details: {
        artifacts: isFake || confidence >= 0.5 ? [segmentConclusion] : [],
        machineLabel: isFake || confidence >= 0.5 ? "生成内容风险" : "正常",
        segmentRatio: confidence,
        segmentConclusion: reason || segmentConclusion,
      },
    });
  } catch (err) {
    console.error("Volc video AIGC error:", err);
    sendErr(err && err.message ? err.message : "视频 AI 生成检测失败");
  }
});

/** 火山引擎人像融合（人脸替换）FaceSwap API
 * @see https://www.volcengine.com/docs/86081/1660449 人像融合3.6
 * @see https://www.volcengine.com/docs/6271/65541 接口文档：Action=FaceSwap, image_base64, template_base64
 * 鉴权：VOLC_ACCESS_KEY + VOLC_SECRET_KEY，使用 HMAC-SHA256 签名
 */
const VOLC_CV_HOST = "open.volcengineapi.com";
const VOLC_CV_SERVICE = "cv";
const VOLC_CV_REGION = "cn-north-1";

function volcGetXDate() {
  return new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function volcHmac(secret, s) {
  return require("crypto").createHmac("sha256", secret).update(s, "utf8").digest();
}

function volcHash(s) {
  return require("crypto").createHash("sha256").update(s, "utf8").digest("hex");
}

function volcUriEscape(str) {
  try {
    return encodeURIComponent(String(str))
      .replace(/[^A-Za-z0-9_.~\-%]+/g, encodeURIComponent)
      .replace(/[*]/g, (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`);
  } catch (e) {
    return "";
  }
}

function volcQueryToString(params) {
  return Object.keys(params)
    .sort()
    .map((key) => {
      const val = params[key];
      if (val === undefined || val === null) return undefined;
      const k = volcUriEscape(key);
      const v = volcUriEscape(val);
      return `${k}=${v}`;
    })
    .filter(Boolean)
    .join("&");
}

function volcSign(params) {
  const {
    method = "GET",
    pathName = "/",
    query = {},
    headers = {},
    accessKeyId = "",
    secretAccessKey = "",
    bodySha,
  } = params;
  const datetime = headers["X-Date"] || volcGetXDate();
  const date = datetime.substring(0, 8);
  const signedHeaderKeys = "host;x-date";
  const canonicalHeaders = `host:${params.host || VOLC_CV_HOST}\nx-date:${datetime}\n`;
  const canonicalRequest = [
    method.toUpperCase(),
    pathName,
    volcQueryToString(query) || "",
    canonicalHeaders,
    signedHeaderKeys,
    bodySha || volcHash(""),
  ].join("\n");
  const credentialScope = [date, VOLC_CV_REGION, VOLC_CV_SERVICE, "request"].join("/");
  const stringToSign = ["HMAC-SHA256", datetime, credentialScope, volcHash(canonicalRequest)].join("\n");
  const kDate = volcHmac(secretAccessKey, date);
  const kRegion = volcHmac(kDate, VOLC_CV_REGION);
  const kService = volcHmac(kRegion, VOLC_CV_SERVICE);
  const kSigning = volcHmac(kService, "request");
  const signature = volcHmac(kSigning, stringToSign).toString("hex");
  return [
    "HMAC-SHA256",
    `Credential=${accessKeyId}/${credentialScope},`,
    `SignedHeaders=${signedHeaderKeys},`,
    `Signature=${signature}`,
  ].join(" ");
}

app.post("/api/generate/faceswap", async (req, res) => {
  const sendErr = (msg) => res.status(500).json({ error: msg });
  try {
    if (!VOLC_ACCESS_KEY || !VOLC_SECRET_KEY) {
      return res.status(400).json({
        error: "请配置火山引擎视觉 API 密钥：在 .env.local 中设置 VOLC_ACCESS_KEY 和 VOLC_SECRET_KEY",
      });
    }
    const { templateBase64, imageBase64 } = req.body || {};
    const template = typeof templateBase64 === "string" ? templateBase64.trim() : "";
    const image = typeof imageBase64 === "string" ? imageBase64.trim() : "";
    if (!template || !image) {
      return res.status(400).json({ error: "需要 templateBase64（目标图/模版）和 imageBase64（源人脸）" });
    }
    const query = { Action: "FaceSwap", Version: "2020-08-26" };
    const bodyParams = new URLSearchParams();
    bodyParams.set("image_base64", image);
    bodyParams.set("template_base64", template);
    bodyParams.set("action_id", "faceswap");
    bodyParams.set("version", "2.0");
    const bodyString = bodyParams.toString();
    const bodySha = volcHash(bodyString);
    const xDate = volcGetXDate();
    const authorization = volcSign({
      method: "POST",
      pathName: "/",
      query,
      headers: { "X-Date": xDate },
      host: VOLC_CV_HOST,
      accessKeyId: VOLC_ACCESS_KEY,
      secretAccessKey: VOLC_SECRET_KEY,
      bodySha,
    });
    const url = `https://${VOLC_CV_HOST}/?${volcQueryToString(query)}`;
    const volcRes = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Date": xDate,
        Host: VOLC_CV_HOST,
        Authorization: authorization,
      },
      body: bodyString,
    });
    const data = await volcRes.json();
    if (data.ResponseMetadata && data.ResponseMetadata.Error) {
      const err = data.ResponseMetadata.Error;
      return sendErr(err.Message || err.Code || "火山引擎人像融合接口错误");
    }
    if (data.code !== undefined && data.code !== 10000) {
      return sendErr(data.message || `接口错误: ${data.code}`);
    }
    const resultImageBase64 = data.data && data.data.image;
    if (!resultImageBase64) {
      return sendErr("未返回融合结果图");
    }
    res.json({
      imageUrl: `data:image/jpeg;base64,${resultImageBase64}`,
      message: "人脸替换完成（火山引擎人像融合）",
    });
  } catch (err) {
    console.error("Volc FaceSwap error:", err);
    sendErr(err && err.message ? err.message : "请求火山引擎人像融合失败");
  }
});

/** 属性编辑：SeedEdit 3.0 智能视觉接口（文档 86081/1804561），鉴权 Bearer，可选 VOLC_VISUAL_SEEDEDIT_URL / VOLC_VISUAL_SEEDEDIT_MODEL */
const VOLC_VISUAL_IMAGES_URL = (
  process.env.VOLC_VISUAL_SEEDEDIT_URL ||
  process.env.VITE_VOLC_VISUAL_SEEDEDIT_URL ||
  "https://visual.volcengineapi.com/api/v3/images/generations"
).trim();
const VOLC_VISUAL_SEEDEDIT_MODEL = (
  process.env.VOLC_VISUAL_SEEDEDIT_MODEL ||
  process.env.VITE_VOLC_VISUAL_SEEDEDIT_MODEL ||
  "SeedEdit3.0"
).trim();
const VOLC_ARK_BASE = (process.env.VOLC_ARK_BASE || "https://ark.cn-beijing.volces.com/api/v3").trim();
const VOLC_ARK_I2V_MODEL = (
  process.env.VOLC_ARK_I2V_MODEL ||
  process.env.VITE_VOLC_ARK_I2V_MODEL ||
  "doubao-seedance-1-0-lite-i2v-250428"
).trim();
const VOLC_ARK_IMAGE_MODEL = (
  process.env.VOLC_ARK_IMAGE_MODEL ||
  process.env.VITE_VOLC_ARK_IMAGE_MODEL ||
  "doubao-seedream-4-0-250828"
).trim();
const VOLC_ARK_T2V_MODEL = (
  process.env.VOLC_ARK_T2V_MODEL ||
  process.env.VITE_VOLC_ARK_T2V_MODEL ||
  "doubao-seedance-1-0-lite-t2v-250428"
).trim();

/** 轮询方舟视频任务直至完成，返回 videoUrl 或 null（失败/超时由调用方 sendErr） */
async function pollArkVideoTask(taskId) {
  const maxAttempts = 120;
  const pollInterval = 3000;
  for (let i = 0; i < maxAttempts; i++) {
    const getRes = await fetch(`${VOLC_ARK_BASE}/contents/generations/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${VOLC_ARK_API_KEY}` },
    });
    if (!getRes.ok) return null;
    const taskData = await getRes.json();
    const status = taskData?.status;
    if (status === "succeeded") {
      const videoUrl = taskData?.content?.video_url ?? taskData?.output?.video_url;
      return videoUrl || null;
    }
    if (status === "failed") {
      return null;
    }
    await new Promise((r) => setTimeout(r, pollInterval));
  }
  return null;
}

/** 属性编辑：图生图 3.0 指令编辑 SeedEdit 3.0（仅智能视觉接口，见文档 86081/1804561） */
app.post("/api/generate/seededit", async (req, res) => {
  const sendErr = (msg) => res.status(500).json({ error: msg });
  try {
    const { prompt, imageUrl, imageBase64 } = req.body || {};
    if (!VOLC_ARK_API_KEY) {
      return res.status(400).json({ error: "请先配置生成服务密钥" });
    }
    const editPrompt = typeof prompt === "string" ? prompt.trim() : "";
    if (!editPrompt) {
      return res.status(400).json({ error: "需要 prompt（编辑指令）" });
    }
    let imageInput = typeof imageUrl === "string" ? imageUrl.trim() : "";
    if (!imageInput && typeof imageBase64 === "string" && imageBase64.length > 0) {
      imageInput = imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;
    }
    if (!imageInput) {
      return res.status(400).json({ error: "需要 imageUrl 或 imageBase64（待编辑图片）" });
    }
    const body = {
      model: VOLC_VISUAL_SEEDEDIT_MODEL,
      prompt: editPrompt,
      image: imageInput,
      size: "2k",
      n: 1,
      response_format: "url",
      watermark: false,
    };
    const response = await fetch(VOLC_VISUAL_IMAGES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${VOLC_ARK_API_KEY}`,
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (data.error) {
      const msg = data.error.message || data.error.code || "";
      return sendErr(msg || "SeedEdit 接口错误");
    }
    const imageUrlOut = data.data && data.data[0] && data.data[0].url;
    if (!imageUrlOut) {
      return sendErr("未返回编辑结果图");
    }
    res.json({ imageUrl: imageUrlOut, message: "属性编辑完成。" });
  } catch (err) {
    console.error("SeedEdit error:", err);
    sendErr(err && err.message ? err.message : "属性编辑请求失败");
  }
});

/** 人脸动画：图生视频 I2V，创建任务后轮询直至完成，返回 videoUrl */
app.post("/api/generate/fomm", async (req, res) => {
  const sendErr = (msg) => res.status(500).json({ error: msg });
  try {
    const { imageBase64, prompt } = req.body || {};
    if (!VOLC_ARK_API_KEY) {
      return res.status(400).json({ error: "请先配置生成服务密钥（VOLC_ARK_API_KEY）" });
    }
    const promptText = typeof prompt === "string" ? prompt.trim() : "";
    const imageInput = typeof imageBase64 === "string" ? imageBase64.trim() : "";
    if (!imageInput) {
      return res.status(400).json({ error: "需要 imageBase64（目标人脸图片）" });
    }
    const imageDataUrl = imageInput.startsWith("data:") ? imageInput : `data:image/jpeg;base64,${imageInput}`;
    const content = [
      { type: "text", text: promptText || "让图中人脸做自然的微笑和轻微点头动作" },
      { type: "image_url", image_url: { url: imageDataUrl }, role: "reference_image" },
    ];
    const createRes = await fetch(`${VOLC_ARK_BASE}/contents/generations/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${VOLC_ARK_API_KEY}`,
      },
      body: JSON.stringify({
        model: VOLC_ARK_I2V_MODEL,
        content,
        ratio: "16:9",
        duration: 5,
      }),
    });
    if (!createRes.ok) {
      const errData = await createRes.json().catch(() => ({}));
      return sendErr(errData?.error?.message || `创建任务失败 ${createRes.status}`);
    }
    const createData = await createRes.json();
    const taskId = createData?.id;
    if (!taskId) {
      return sendErr("未返回任务 ID");
    }
    const maxAttempts = 120;
    const pollInterval = 3000;
    for (let i = 0; i < maxAttempts; i++) {
      const getRes = await fetch(`${VOLC_ARK_BASE}/contents/generations/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${VOLC_ARK_API_KEY}` },
      });
      if (!getRes.ok) {
        return sendErr(`查询任务失败 ${getRes.status}`);
      }
      const taskData = await getRes.json();
      const status = taskData?.status;
      if (status === "succeeded") {
        const videoUrl = taskData?.content?.video_url ?? taskData?.output?.video_url;
        if (!videoUrl) {
          return sendErr("未返回视频地址");
        }
        return res.json({ videoUrl, message: "人脸动画视频生成成功。" });
      }
      if (status === "failed") {
        const errMsg = taskData?.error?.message ?? taskData?.message ?? "生成失败";
        return sendErr(errMsg);
      }
      await new Promise((r) => setTimeout(r, pollInterval));
    }
    sendErr("生成超时，请稍后重试");
  } catch (err) {
    console.error("FOMM/I2V error:", err);
    sendErr(err && err.message ? err.message : "人脸动画请求失败");
  }
});

/** 文生图 */
app.post("/api/generate/image", async (req, res) => {
  const sendErr = (msg) => res.status(500).json({ error: msg });
  try {
    if (!VOLC_ARK_API_KEY) {
      return res.status(400).json({ error: "请先配置生成服务密钥" });
    }
    const { prompt, size, watermark } = req.body || {};
    const promptText = typeof prompt === "string" ? prompt.trim() : "";
    if (!promptText) {
      return res.status(400).json({ error: "需要 prompt（提示词）" });
    }
    const resFetch = await fetch(`${VOLC_ARK_BASE}/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${VOLC_ARK_API_KEY}`,
      },
      body: JSON.stringify({
        model: VOLC_ARK_IMAGE_MODEL,
        prompt: promptText,
        size: size || "2K",
        n: 1,
        response_format: "url",
        watermark: !!watermark,
      }),
    });
    if (!resFetch.ok) {
      const errData = await resFetch.json().catch(() => ({}));
      return sendErr(errData?.error?.message || `请求失败 ${resFetch.status}`);
    }
    const data = await resFetch.json();
    const imageUrl = data?.data?.[0]?.url;
    if (!imageUrl) return sendErr("未返回图片地址");
    res.json({ imageUrl, message: "图像生成成功！" });
  } catch (err) {
    console.error("Image gen error:", err);
    sendErr(err && err.message ? err.message : "图像生成失败");
  }
});

/** 文生视频：创建任务后轮询 */
app.post("/api/generate/t2v", async (req, res) => {
  const sendErr = (msg) => res.status(500).json({ error: msg });
  try {
    if (!VOLC_ARK_API_KEY) {
      return res.status(400).json({ error: "请先配置生成服务密钥" });
    }
    const { prompt, ratio, duration } = req.body || {};
    const promptText = typeof prompt === "string" ? prompt.trim() : "";
    if (!promptText) {
      return res.status(400).json({ error: "需要 prompt（提示词）" });
    }
    const createRes = await fetch(`${VOLC_ARK_BASE}/contents/generations/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${VOLC_ARK_API_KEY}`,
      },
      body: JSON.stringify({
        model: VOLC_ARK_T2V_MODEL,
        content: [{ type: "text", text: promptText }],
        ratio: ratio || "16:9",
        duration: Number(duration) || 5,
      }),
    });
    if (!createRes.ok) {
      const errData = await createRes.json().catch(() => ({}));
      return sendErr(errData?.error?.message || `创建任务失败 ${createRes.status}`);
    }
    const createData = await createRes.json();
    const taskId = createData?.id;
    if (!taskId) return sendErr("未返回任务 ID");
    const videoUrl = await pollArkVideoTask(taskId);
    if (!videoUrl) return sendErr("生成失败或超时，请稍后重试");
    res.json({ videoUrl, message: "视频生成成功！" });
  } catch (err) {
    console.error("T2V error:", err);
    sendErr(err && err.message ? err.message : "文生视频失败");
  }
});

/** 图生视频：多图 + 提示词，创建任务后轮询 */
app.post("/api/generate/i2v", async (req, res) => {
  const sendErr = (msg) => res.status(500).json({ error: msg });
  try {
    if (!VOLC_ARK_API_KEY) {
      return res.status(400).json({ error: "请先配置生成服务密钥" });
    }
    const { prompt, imageBase64List, ratio, duration } = req.body || {};
    const promptText = typeof prompt === "string" ? prompt.trim() : "";
    const list = Array.isArray(imageBase64List) ? imageBase64List : [];
    if (list.length === 0) {
      return res.status(400).json({ error: "需要至少一张参考图（imageBase64List）" });
    }
    const content = [{ type: "text", text: promptText }];
    for (const b64 of list) {
      const s = typeof b64 === "string" ? b64.trim() : "";
      if (!s) continue;
      const dataUrl = s.startsWith("data:") ? s : `data:image/jpeg;base64,${s}`;
      content.push({ type: "image_url", image_url: { url: dataUrl }, role: "reference_image" });
    }
    if (content.length <= 1) {
      return res.status(400).json({ error: "需要至少一张有效参考图" });
    }
    const createRes = await fetch(`${VOLC_ARK_BASE}/contents/generations/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${VOLC_ARK_API_KEY}`,
      },
      body: JSON.stringify({
        model: VOLC_ARK_I2V_MODEL,
        content,
        ratio: ratio || "16:9",
        duration: Number(duration) || 5,
      }),
    });
    if (!createRes.ok) {
      const errData = await createRes.json().catch(() => ({}));
      return sendErr(errData?.error?.message || `创建任务失败 ${createRes.status}`);
    }
    const createData = await createRes.json();
    const taskId = createData?.id;
    if (!taskId) return sendErr("未返回任务 ID");
    const videoUrl = await pollArkVideoTask(taskId);
    if (!videoUrl) return sendErr("生成失败或超时，请稍后重试");
    res.json({ videoUrl, message: "视频生成成功！" });
  } catch (err) {
    console.error("I2V error:", err);
    sendErr(err && err.message ? err.message : "图生视频失败");
  }
});

const PORT = process.env.DETECT_PROXY_PORT || 3001;
app.listen(PORT, () => {
  if (VOLC_ARK_API_KEY && VOLC_ARK_VISION_MODEL) {
    console.log(`Volc Ark 图片敏感检测: http://localhost:${PORT}/api/detect/volc-ims`);
    console.log(`Volc Ark 视频敏感检测: http://localhost:${PORT}/api/detect/volc-video-ims`);
    console.log(`Volc Ark 视频 AI 生成检测: http://localhost:${PORT}/api/detect/volc-video-aigc`);
  }
  if (VOLC_ACCESS_KEY && VOLC_SECRET_KEY) {
    console.log(`Volc 人像融合(人脸替换): http://localhost:${PORT}/api/generate/faceswap`);
  }
  if (VOLC_ARK_API_KEY) {
    console.log(`Volc SeedEdit(属性编辑): http://localhost:${PORT}/api/generate/seededit`);
    console.log(`人脸动画(I2V): http://localhost:${PORT}/api/generate/fomm`);
    console.log(`文生图: http://localhost:${PORT}/api/generate/image`);
    console.log(`文生视频: http://localhost:${PORT}/api/generate/t2v`);
    console.log(`图生视频: http://localhost:${PORT}/api/generate/i2v`);
  }
});
