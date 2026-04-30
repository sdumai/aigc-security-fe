const { getErrorMessage, sendBadRequest, sendInternalError, sendJsonError } = require("../utils/http.cjs");
const { HTTP_STATUS } = require("../constants.cjs");
const {
  deleteGeneratedSample,
  getGeneratedSample,
  listDetectionRecords,
  listGeneratedSamples,
  resolveUploadPath,
  saveDetectionRecord,
  saveGeneratedSample,
} = require("../utils/contentStore.cjs");

function registerContentRoutes(app) {
  app.post("/api/data/save", async (req, res) => {
    try {
      const sample = await saveGeneratedSample(req.body);
      res.json({ success: true, data: sample, message: "内容已保存到样本库" });
    } catch (error) {
      console.error("Save generated sample error:", error);
      sendBadRequest(res, getErrorMessage(error, "保存样本失败"));
    }
  });

  app.get("/api/data/outputs", async (_req, res) => {
    try {
      res.json({ success: true, data: await listGeneratedSamples() });
    } catch (error) {
      console.error("List generated samples error:", error);
      sendInternalError(res, "读取样本库失败");
    }
  });

  app.get("/api/data/outputs/:id", async (req, res) => {
    try {
      const sample = await getGeneratedSample(req.params.id);
      if (!sample) {
        return sendJsonError(res, 404, "样本不存在");
      }
      res.json({ success: true, data: sample });
    } catch (error) {
      console.error("Get generated sample error:", error);
      sendInternalError(res, "读取样本失败");
    }
  });

  app.delete("/api/data/outputs/:id", async (req, res) => {
    try {
      const deleted = await deleteGeneratedSample(req.params.id);
      if (!deleted) {
        return sendJsonError(res, 404, "样本不存在");
      }
      res.json({ success: true, message: "样本已删除，检测记录已保留" });
    } catch (error) {
      console.error("Delete generated sample error:", error);
      sendInternalError(res, "删除样本失败");
    }
  });

  app.post("/api/data/detections", async (req, res) => {
    try {
      const record = await saveDetectionRecord(req.body);
      res.json({ success: true, data: record, message: "检测记录已保存" });
    } catch (error) {
      console.error("Save detection record error:", error);
      sendBadRequest(res, getErrorMessage(error, "保存检测记录失败"));
    }
  });

  app.get("/api/data/detections", async (_req, res) => {
    try {
      res.json({ success: true, data: await listDetectionRecords() });
    } catch (error) {
      console.error("List detection records error:", error);
      sendInternalError(res, "读取检测记录失败");
    }
  });

  app.get("/api/data/outputs/:id/detections", async (req, res) => {
    try {
      res.json({ success: true, data: await listDetectionRecords(req.params.id) });
    } catch (error) {
      console.error("List sample detection records error:", error);
      sendInternalError(res, "读取样本检测记录失败");
    }
  });

  app.get("/api/data/media/:filename", (req, res) => {
    try {
      const filePath = resolveUploadPath(req.params.filename);
      res.sendFile(filePath);
    } catch (error) {
      sendJsonError(res, HTTP_STATUS.BAD_REQUEST, getErrorMessage(error, "媒体文件路径无效"));
    }
  });
}

module.exports = {
  registerContentRoutes,
};
