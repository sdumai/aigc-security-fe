/**
 * 腾讯云图片/视频内容安全代理：解决浏览器 CORS，密钥仅存服务端
 * 火山方舟：VOLC_ARK_API_KEY、VOLC_ARK_VISION_MODEL（敏感检测）
 * 火山人像融合（人脸替换）：VOLC_ACCESS_KEY、VOLC_SECRET_KEY（视觉开放平台 AK/SK，见控制台）
 * 启动：在项目根目录执行 node server/index.cjs
 * 环境变量：.env.local 中的 TENCENT_SECRET_ID、TENCENT_SECRET_KEY、TENCENT_IMS_BIZTYPE（可选）
 * 视频本地上传：二选一
 *   1) 配置 COS_BUCKET + COS_REGION：本地上传先传到腾讯云 COS，再用 COS 地址做检测（推荐，无需 ngrok）
 *   2) 配置 DETECT_VIDEO_PUBLIC_URL（如 ngrok）：代理暴露公网后腾讯云从该 URL 拉取视频
 */
require("dotenv").config({ path: ".env.local" });
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const TENCENT_SECRET_ID = (process.env.TENCENT_SECRET_ID || process.env.VITE_TENCENT_SECRET_ID || "").trim();
const TENCENT_SECRET_KEY = (process.env.TENCENT_SECRET_KEY || process.env.VITE_TENCENT_SECRET_KEY || "").trim();
const TENCENT_IMS_BIZTYPE = (process.env.TENCENT_IMS_BIZTYPE || process.env.VITE_TENCENT_IMS_BIZTYPE || "").trim();
const DETECT_VIDEO_PUBLIC_URL = (process.env.DETECT_VIDEO_PUBLIC_URL || "").trim();
const COS_BUCKET = (process.env.COS_BUCKET || "").trim();
const COS_REGION = (process.env.COS_REGION || "ap-guangzhou").trim();
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

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const uploadIdToPath = new Map();
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${path.extname(file.originalname) || ".mp4"}`;
    cb(null, id);
  },
});
const uploadMw = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } }).single("file");

/** 视频本地上传：若配置了 COS，则上传到腾讯云 COS 并返回 cosInfo（推荐）；否则返回公网 URL（需 DETECT_VIDEO_PUBLIC_URL） */
app.post("/api/detect/tencent-video-ims/upload", (req, res) => {
  uploadMw(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || "上传失败" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "请选择视频文件" });
    }
    const id = req.file.filename;
    const ext = path.extname(req.file.originalname) || path.extname(id) || ".mp4";
    const cosKey = `aigc-detect/${new Date().toISOString().slice(0, 10)}/${id}`;

    if (COS_BUCKET && TENCENT_SECRET_ID && TENCENT_SECRET_KEY) {
      const COS = require("cos-nodejs-sdk-v5");
      const cos = new COS({
        SecretId: TENCENT_SECRET_ID,
        SecretKey: TENCENT_SECRET_KEY,
      });
      try {
        await new Promise((resolve, reject) => {
          cos.putObject(
            {
              Bucket: COS_BUCKET,
              Region: COS_REGION,
              Key: cosKey,
              Body: fs.createReadStream(req.file.path),
              ContentLength: req.file.size,
            },
            (err, data) => {
              if (err) return reject(err);
              resolve(data);
            },
          );
        });
        const url = `https://${COS_BUCKET}.cos.${COS_REGION}.myqcloud.com/${cosKey}`;
        res.json({
          url,
          cosInfo: { Bucket: COS_BUCKET, Region: COS_REGION, Object: cosKey },
        });
      } catch (e) {
        console.error("COS upload error:", e);
        res.status(500).json({ error: (e && e.message) || "上传到 COS 失败" });
      } finally {
        try {
          fs.unlinkSync(req.file.path);
        } catch (_) {}
      }
      return;
    }

    const base = DETECT_VIDEO_PUBLIC_URL || `${req.protocol}://${req.get("host")}`;
    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(base.replace(/\/$/, ""));
    if (isLocalhost) {
      return res.status(400).json({
        error:
          "腾讯云无法访问 localhost。请任选其一：1) 在 .env.local 中配置 COS_BUCKET 和 COS_REGION，本地上传会先传到腾讯云 COS 再检测（推荐）；2) 配置 DETECT_VIDEO_PUBLIC_URL 为代理公网地址（如 ngrok）；3) 改用「视频 URL」填入公网视频链接。",
      });
    }
    uploadIdToPath.set(id, req.file.path);
    const url = `${base.replace(/\/$/, "")}/api/detect/tencent-video-ims/temp/${encodeURIComponent(id)}`;
    res.json({ url, id });
  });
});

/** 提供已上传视频供腾讯云拉取（需代理暴露到公网时有效） */
app.get("/api/detect/tencent-video-ims/temp/:id", (req, res) => {
  const id = decodeURIComponent(req.params.id);
  const filePath = uploadIdToPath.get(id) || path.join(uploadDir, id);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send("Not Found");
  }
  res.sendFile(path.resolve(filePath));
});

app.post("/api/detect/tencent-ims", async (req, res) => {
  const sendError = (code, message) => {
    res.status(500).json({ Response: { Error: { Code: code, Message: message } } });
  };
  try {
    if (!TENCENT_SECRET_ID || !TENCENT_SECRET_KEY) {
      return sendError(
        "MissingCredential",
        "请在 .env.local 中配置 TENCENT_SECRET_ID 和 TENCENT_SECRET_KEY（或 VITE_ 前缀）",
      );
    }

    const { fileContent, fileUrl, bizType } = req.body || {};
    if (!fileContent && !fileUrl) {
      return res.status(400).json({
        Response: { Error: { Code: "InvalidParameter", Message: "需要 fileContent 或 fileUrl" } },
      });
    }

    const tencentcloud = require("tencentcloud-sdk-nodejs");
    const ImsClient = tencentcloud.ims.v20200713.Client;
    const client = new ImsClient({
      credential: { secretId: TENCENT_SECRET_ID, secretKey: TENCENT_SECRET_KEY },
      region: "ap-guangzhou",
    });

    const params = {};
    if (fileContent) params.FileContent = fileContent;
    if (fileUrl) params.FileUrl = fileUrl;
    if (bizType || TENCENT_IMS_BIZTYPE) params.BizType = bizType || TENCENT_IMS_BIZTYPE;

    const result = await client.ImageModeration(params);
    res.json(result);
  } catch (err) {
    console.error("Tencent IMS error:", err);
    const msg = err && err.message ? err.message : String(err);
    sendError("InternalError", msg);
  }
});

/** 火山方舟图片理解：敏感内容检测（Chat 多模态 API）
 * @see https://www.volcengine.com/docs/82379/1362931
 * 需在控制台创建「支持视觉」的模型接入点，将 endpoint_id 配到 VOLC_ARK_VISION_MODEL
 */
const VOLC_ARK_CHAT_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
const VOLC_SAFE_PROMPT = `你是一个图片内容安全审核助手。请判断该图片是否包含以下违规内容：暴力血腥、色情低俗、政治敏感、仇恨符号、毒品赌博、未成年人不当内容等。
仅输出一个 JSON 对象，不要其他文字。格式：{"safe": true或false, "suggestion": "pass或review或block", "labels": ["标签1","标签2"], "reason": "简短原因"}
若内容安全则 safe 为 true、suggestion 为 pass、labels 为空数组；否则 safe 为 false，suggestion 为 review 或 block，labels 列出违规类型。`;

app.post("/api/detect/volc-ims", async (req, res) => {
  const sendErr = (msg) => res.status(500).json({ error: msg });
  try {
    if (!VOLC_ARK_API_KEY) {
      return sendErr("请在 .env.local 中配置 VOLC_ARK_API_KEY 或 VITE_VOLC_ARK_API_KEY");
    }
    if (!VOLC_ARK_VISION_MODEL) {
      return sendErr(
        "请在 .env.local 中配置 VOLC_ARK_VISION_MODEL（火山方舟控制台中「支持视觉」的模型接入点 ID，如 ep-xxx）",
      );
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
            content: [imageInput, { type: "text", text: VOLC_SAFE_PROMPT }],
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

const VIDEO_AIGC_BIZTYPE = "aigc_video_detect_100046462053";

/** 视频 AI 生成检测：创建任务并轮询直到完成（最多约 5 分钟） */
app.post("/api/detect/tencent-video-ims", async (req, res) => {
  const sendError = (code, message) => {
    res.status(500).json({ Response: { Error: { Code: code, Message: message } } });
  };
  try {
    if (!TENCENT_SECRET_ID || !TENCENT_SECRET_KEY) {
      return sendError("MissingCredential", "请在 .env.local 中配置 TENCENT_SECRET_ID 和 TENCENT_SECRET_KEY");
    }
    const { videoUrl, cosInfo } = req.body || {};
    let taskInput;
    if (cosInfo && cosInfo.Bucket && cosInfo.Region && cosInfo.Object) {
      taskInput = {
        Type: "COS",
        BucketInfo: { Bucket: cosInfo.Bucket, Region: cosInfo.Region, Object: cosInfo.Object },
      };
    } else if (videoUrl && typeof videoUrl === "string") {
      taskInput = { Type: "URL", Url: videoUrl.trim() };
    } else {
      return res.status(400).json({
        Response: {
          Error: { Code: "InvalidParameter", Message: "需要 videoUrl 或 cosInfo（Bucket、Region、Object）" },
        },
      });
    }

    const tencentcloud = require("tencentcloud-sdk-nodejs");
    const VmClient = tencentcloud.vm.v20210922.Client;
    const vm = new VmClient({
      credential: { secretId: TENCENT_SECRET_ID, secretKey: TENCENT_SECRET_KEY },
      region: "ap-guangzhou",
    });

    const createRes = await vm.CreateVideoModerationTask({
      Type: "VIDEO_AIGC",
      BizType: VIDEO_AIGC_BIZTYPE,
      Tasks: [{ Input: taskInput }],
    });
    const first = createRes.Results && createRes.Results[0];
    const taskId = first && first.TaskId;
    if (!taskId) {
      const errMsg = first && first.Message ? first.Message : "创建视频任务失败，未返回 TaskId";
      return sendError("InternalError", errMsg);
    }

    const maxAttempts = 100;
    const intervalMs = 3000;
    for (let i = 0; i < maxAttempts; i++) {
      const detailRes = await vm.DescribeTaskDetail({ TaskId: taskId });
      const status = detailRes.Status;
      if (status === "FINISH") {
        return res.json(detailRes);
      }
      if (status === "ERROR" || status === "CANCELLED") {
        return res.status(500).json({
          Response: {
            Error: {
              Code: status,
              Message: detailRes.ErrorDescription || detailRes.ErrorType || status,
            },
          },
        });
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    return sendError("Timeout", "视频检测超时，请稍后重试");
  } catch (err) {
    console.error("Tencent Video IMS error:", err);
    const msg = err && err.message ? err.message : String(err);
    sendError("InternalError", msg);
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

/** SeedEdit 3.0 图生图-指令编辑（属性编辑）
 * 两种接入方式（由前端 provider 选择）：
 * - ark：火山方舟 https://ark.cn-beijing.volces.com，鉴权 Bearer，需配置 VOLC_SEEDEDIT_MODEL=ep-xxx
 * - visual：智能视觉 https://visual.volcengineapi.com（文档 86081/1804561），鉴权 Bearer，可选 VOLC_VISUAL_SEEDEDIT_URL
 */
const VOLC_ARK_IMAGES_URL = "https://ark.cn-beijing.volces.com/api/v3/images/generations";
const VOLC_VISUAL_IMAGES_URL = (
  process.env.VOLC_VISUAL_SEEDEDIT_URL ||
  process.env.VITE_VOLC_VISUAL_SEEDEDIT_URL ||
  "https://visual.volcengineapi.com/api/v3/images/generations"
).trim();
const VOLC_SEEDEDIT_MODEL = (process.env.VOLC_SEEDEDIT_MODEL || process.env.VITE_VOLC_SEEDEDIT_MODEL || "").trim();
const VOLC_VISUAL_SEEDEDIT_MODEL = (
  process.env.VOLC_VISUAL_SEEDEDIT_MODEL ||
  process.env.VITE_VOLC_VISUAL_SEEDEDIT_MODEL ||
  "SeedEdit3.0"
).trim();

app.post("/api/generate/seededit", async (req, res) => {
  const sendErr = (msg) => res.status(500).json({ error: msg });
  try {
    const { prompt, imageUrl, imageBase64, provider } = req.body || {};
    const useVisual = String(provider || "ark").toLowerCase() === "visual";
    const apiUrl = useVisual ? VOLC_VISUAL_IMAGES_URL : VOLC_ARK_IMAGES_URL;

    if (!VOLC_ARK_API_KEY) {
      return res.status(400).json({ error: "请在 .env.local 中配置 VOLC_ARK_API_KEY 或 VITE_VOLC_ARK_API_KEY" });
    }
    if (!useVisual && !VOLC_SEEDEDIT_MODEL) {
      return res.status(400).json({
        error:
          "方舟方式需配置 VOLC_SEEDEDIT_MODEL 为接入点 ID（ep-xxx）。在火山方舟控制台部署「图生图-指令编辑 SeedEdit 3.0」后获取。",
      });
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
    const modelValue = useVisual ? VOLC_VISUAL_SEEDEDIT_MODEL : VOLC_SEEDEDIT_MODEL;
    const body = {
      model: modelValue,
      prompt: editPrompt,
      image: imageInput,
      size: "2k",
      n: 1,
      response_format: "url",
      watermark: false,
    };
    const response = await fetch(apiUrl, {
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
      if (/does not exist|you do not have access|不存在|无权/.test(String(msg)) && !useVisual) {
        return sendErr(
          "当前模型/接入点不可用。请在火山方舟控制台部署「图生图-指令编辑 SeedEdit 3.0」，将得到的接入点 ID（ep-xxx）配置到 .env.local 的 VOLC_SEEDEDIT_MODEL。",
        );
      }
      return sendErr(msg || "SeedEdit 接口错误");
    }
    const imageUrlOut = data.data && data.data[0] && data.data[0].url;
    if (!imageUrlOut) {
      return sendErr("未返回编辑结果图");
    }
    res.json({
      imageUrl: imageUrlOut,
      message: useVisual ? "属性编辑完成（智能视觉 SeedEdit 3.0）" : "属性编辑完成（火山方舟 SeedEdit 3.0）",
    });
  } catch (err) {
    console.error("Volc SeedEdit error:", err);
    sendErr(err && err.message ? err.message : "请求 SeedEdit 失败");
  }
});

const PORT = process.env.DETECT_PROXY_PORT || 3001;
app.listen(PORT, () => {
  console.log(`Tencent IMS proxy: http://localhost:${PORT}/api/detect/tencent-ims`);
  console.log(`Tencent Video AIGC proxy: http://localhost:${PORT}/api/detect/tencent-video-ims`);
  if (VOLC_ARK_API_KEY && VOLC_ARK_VISION_MODEL) {
    console.log(`Volc Ark 图片敏感检测: http://localhost:${PORT}/api/detect/volc-ims`);
    console.log(`Volc Ark 视频敏感检测: http://localhost:${PORT}/api/detect/volc-video-ims`);
  }
  if (VOLC_ACCESS_KEY && VOLC_SECRET_KEY) {
    console.log(`Volc 人像融合(人脸替换): http://localhost:${PORT}/api/generate/faceswap`);
  }
  if (VOLC_ARK_API_KEY) {
    console.log(`Volc SeedEdit(属性编辑): http://localhost:${PORT}/api/generate/seededit`);
  }
});
