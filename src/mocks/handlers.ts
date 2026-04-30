import { http, HttpResponse, delay, passthrough } from "msw";

export const handlers = [
  // Deepfake 人脸生成
  http.post("/api/generate/deepfake", async () => {
    await delay(1000); // 模拟网络延迟
    return HttpResponse.json({
      success: true,
      imageUrl: "/mock/deepfake_result.jpg",
      message: "生成成功",
    });
  }),

  // 通用图像生成（可在此对接第三方文生图 API，或由真实后端代理）
  http.post("/api/generate/image", async ({ request }) => {
    await delay(1200);
    const body = (await request.json()) as { prompt?: string; size?: string; responseFormat?: string };
    // 开发环境返回占位图；生产环境应由后端调用第三方 API 后返回真实 imageUrl
    const size = body?.size?.replace("x", "/") || "768/768";
    return HttpResponse.json({
      success: true,
      imageUrl: `https://picsum.photos/seed/${encodeURIComponent(body?.prompt || "default")}/${size}`,
      message: "图像生成成功",
      format: "url",
    });
  }),

  // 视频生成
  http.post("/api/generate/video", async ({ request }) => {
    await delay(3000); // 视频生成需要更长时间

    try {
      const body = (await request.json()) as any;
      const prompt = body?.prompt || "";

      // 根据提示词返回不同的视频或使用默认视频
      // 这里可以集成真实的视频生成 API
      return HttpResponse.json({
        success: true,
        videoUrl: "/mock/sample_video.mp4",
        message: `视频生成成功！提示词：${prompt.substring(0, 20)}...`,
        details: {
          duration: body?.duration || "2",
          resolution: "720p",
          fps: 24,
        },
      });
    } catch (error) {
      return HttpResponse.json(
        {
          success: false,
          message: "视频生成失败，请重试",
        },
        { status: 500 },
      );
    }
  }),

  // 虚假内容检测
  http.post("/api/detect/fake", async () => {
    await delay(800);
    return HttpResponse.json({
      success: true,
      isFake: true,
      confidence: 0.873,
      heatmapUrl: "/mock/heatmap.png",
      model: "D3 视频检测模型",
      details: {
        faceRegion: { x: 120, y: 80, width: 200, height: 250 },
        artifacts: ["边缘失真", "光照不一致", "纹理异常"],
      },
    });
  }),

  // 不安全内容检测
  http.post("/api/detect/unsafe", async () => {
    await delay(700);
    return HttpResponse.json({
      success: true,
      violations: ["violence", "sensitive"],
      risk: "high",
      riskScore: 0.85,
      suggestions: ["建议模糊处理人物面部", "移除暴力相关元素", "添加内容警告标识"],
      details: {
        violence: {
          score: 0.92,
          regions: [{ x: 100, y: 150, width: 300, height: 200 }],
        },
        sensitive: {
          score: 0.78,
          regions: [{ x: 250, y: 100, width: 150, height: 180 }],
        },
      },
    });
  }),

  // 文件上传
  http.post("/api/data/upload", async () => {
    await delay(1500);
    return HttpResponse.json({
      success: true,
      fileId: `file_${Date.now()}`,
      status: "success",
      url: "/mock/uploaded_file.jpg",
      message: "上传成功",
    });
  }),

  // 网络爬取
  http.post("/api/data/crawl", async () => {
    await delay(3000);
    return HttpResponse.json({
      success: true,
      taskId: `task_${Date.now()}`,
      status: "completed",
      filesCount: 15,
      message: "爬取完成",
    });
  }),

  // 获取已生成内容列表
  http.get("/api/data/outputs", async () => {
    return passthrough();
  }),

  // 保存生成的内容
  http.post("/api/data/save", async () => {
    return passthrough();
  }),

  // 获取检测历史记录
  http.get("/api/data/detections", async () => {
    return passthrough();
  }),
];
