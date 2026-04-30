/**
 * 检测与生成代理：密钥仅存服务端
 * 火山方舟：VOLC_ARK_API_KEY、VOLC_ARK_VISION_MODEL（图片/视频理解、AI 生成检测、敏感检测）
 * 火山人像融合：VOLC_ACCESS_KEY、VOLC_SECRET_KEY
 * 自托管文生图：STABLE_DIFFUSION_SERVICE_URL 或 SD_SERVICE_URL（默认 http://127.0.0.1:8009）→ /api/generate/image-stable-diffusion
 * 自托管文生视频(ModelScope T2V)：MODELSCOPE_T2V_URL 或 MS_T2V_URL（默认 http://127.0.0.1:8011）→ /api/generate/model-scope
 * 启动：node server/index.cjs
 */
const express = require("express");
const cors = require("cors");
const { config, hasArkApiKey, hasArkVisionConfig, hasVolcCredentials } = require("./config.cjs");
const { registerContentRoutes } = require("./routes/contentRoutes.cjs");
const { registerDetectRoutes } = require("./routes/detectRoutes.cjs");
const { registerGenerateRoutes } = require("./routes/generateRoutes.cjs");

const app = express();

app.use(cors());
app.use(express.json({ limit: config.server.jsonLimit }));

registerDetectRoutes(app);
registerGenerateRoutes(app);
registerContentRoutes(app);

function logAvailableRoutes(port) {
  console.log(
    `UniversalFakeDetect 图片检测(代理→${config.localServices.universalFakeDetectUrl}): http://localhost:${port}/api/detect/universal-fake-detect`,
  );

  if (hasArkVisionConfig()) {
    console.log(`Volc Ark 图片敏感检测: http://localhost:${port}/api/detect/volc-ims`);
    console.log(`Volc Ark 视频敏感检测: http://localhost:${port}/api/detect/volc-video-ims`);
    console.log(`Volc Ark 视频 AI 生成检测: http://localhost:${port}/api/detect/volc-video-aigc`);
  }

  if (hasVolcCredentials()) {
    console.log(`Volc FaceSwap 2.0: http://localhost:${port}/api/generate/faceswap`);
    console.log(`Volc FaceSwap 3.6: http://localhost:${port}/api/generate/faceswap-3.6`);
  }

  if (hasArkApiKey()) {
    console.log(`Volc SeedEdit(属性编辑): http://localhost:${port}/api/generate/seededit`);
    console.log(`人脸动画(I2V): http://localhost:${port}/api/generate/fomm`);
    console.log(`文生图: http://localhost:${port}/api/generate/image`);
    console.log(
      `文生图(SD 代理→${config.localServices.stableDiffusionUrl}): http://localhost:${port}/api/generate/image-stable-diffusion`,
    );
    console.log(`文生视频(火山): http://localhost:${port}/api/generate/t2v`);
    console.log(`文生视频(ModelScope→${config.localServices.modelScopeT2vUrl}): http://localhost:${port}/api/generate/model-scope`);
    console.log(`图生视频: http://localhost:${port}/api/generate/i2v`);
  }

  console.log(`内容样本库: http://localhost:${port}/api/data/outputs`);
  console.log(`检测记录库: http://localhost:${port}/api/data/detections`);
}

const server = app.listen(config.server.port, () => {
  logAvailableRoutes(config.server.port);
});

server.on("error", (error) => {
  console.error("代理服务启动失败:", error);
});
