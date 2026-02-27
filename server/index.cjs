/**
 * 腾讯云图片/视频内容安全代理：解决浏览器 CORS，密钥仅存服务端
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

const app = express();
app.use(cors());
app.use(express.json({ limit: "8mb" }));

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

const PORT = process.env.DETECT_PROXY_PORT || 3001;
app.listen(PORT, () => {
  console.log(`Tencent IMS proxy: http://localhost:${PORT}/api/detect/tencent-ims`);
  console.log(`Tencent Video AIGC proxy: http://localhost:${PORT}/api/detect/tencent-video-ims`);
});
