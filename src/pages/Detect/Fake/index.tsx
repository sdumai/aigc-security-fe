import { useState } from "react";
import {
  Card,
  Upload,
  message,
  Spin,
  Typography,
  Progress,
  Tag,
  Space,
  Row,
  Col,
  Image,
  Alert,
  Button,
  Input,
  Tabs,
  Checkbox,
  Tooltip,
} from "antd";
import {
  UploadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ScanOutlined,
  LinkOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import type { UploadFile, UploadProps } from "antd";
import { imageModerationViaProxy } from "@/utils/tencentIms";

const { Title, Paragraph, Text } = Typography;
const { Dragger } = Upload;

// 可选的检测模型
const DETECTION_MODELS = [
  { value: "XceptionNet", label: "XceptionNet", description: "基于Xception架构的Deepfake检测模型" },
  { value: "EfficientNet-B4", label: "EfficientNet-B4", description: "高效的卷积神经网络模型" },
  { value: "ResNet-101", label: "ResNet-101", description: "深度残差网络，适用于人脸伪造检测" },
  { value: "FaceForensics++", label: "FaceForensics++", description: "专门的人脸伪造检测数据集训练模型" },
];

interface DetectionResult {
  isFake: boolean;
  confidence: number;
  heatmapUrl: string;
  model: string;
  details: {
    faceRegion?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    artifacts?: string[];
    /** 机审标签（腾讯云 Label），用于与控制台展示一致 */
    machineLabel?: string;
    /** 视频检测：合成段数占比 0-1，仅视频时有值 */
    segmentRatio?: number;
    /** 视频检测：结论文案，仅视频时有值 */
    segmentConclusion?: string;
  };
}

/** 检测类型：图片 / 视频 */
type DetectType = "image" | "video";

const FakeDetectPage = () => {
  const [detectType, setDetectType] = useState<DetectType>("image");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [uploadedFile, setUploadedFile] = useState<UploadFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [urlInput, setUrlInput] = useState<string>("");
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [videoUploadedUrl, setVideoUploadedUrl] = useState<string>("");
  const [videoCosInfo, setVideoCosInfo] = useState<{ Bucket: string; Region: string; Object: string } | null>(null);
  const [videoUploadFileName, setVideoUploadFileName] = useState<string>("");
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>("");
  const [videoUploading, setVideoUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("upload");
  const [videoInputTab, setVideoInputTab] = useState<"url" | "upload">("url");
  const [selectedModels, setSelectedModels] = useState<string[]>(["XceptionNet"]);
  const [currentStep, setCurrentStep] = useState<number>(1);

  const handleUpload: UploadProps["customRequest"] = async (options) => {
    const { file } = options;
    const uploadFile = file as File;
    const isImage = (uploadFile.type || "").startsWith("image/");
    if (!isImage) {
      message.warning("当前为「AI 图片生成检测」，仅支持图片。请重新选择图片文件（JPG、PNG 等）。");
      return;
    }
    try {
      setUploadedFile(file as any);
      const url = URL.createObjectURL(uploadFile);
      setPreviewUrl(url);
      setCurrentStep(2);
      message.success("文件上传成功，请选择检测方法");
    } catch (error) {
      console.error("Upload error:", error);
      message.error("上传失败，请重试");
    }
  };

  const handleUrlLoad = async () => {
    if (!urlInput.trim()) {
      message.warning("请输入URL地址");
      return;
    }

    // 验证URL格式
    try {
      new URL(urlInput);
    } catch {
      message.error("URL格式不正确，请输入有效的URL");
      return;
    }

    try {
      setLoading(true);
      // 这里可以实际调用API来获取远程文件
      // 暂时使用URL作为预览
      setPreviewUrl(urlInput);
      setUploadedFile({
        uid: "-1",
        name: urlInput.split("/").pop() || "remote-file",
        status: "done",
        url: urlInput,
      } as UploadFile);
      setCurrentStep(2); // URL加载成功后进入选择检测方法步骤
      message.success("URL加载成功，请选择检测方法");
    } catch (error) {
      console.error("URL load error:", error);
      message.error("URL加载失败，请检查地址是否正确");
    } finally {
      setLoading(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.replace(/^data:[^;]+;base64,/, "");
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  /** 视频 AI 生成检测：同一按钮先回显视频再发起检测（支持 URL 或本地上传后的 cosInfo） */
  const handleVideoDetect = async () => {
    const urlInput = videoUrl.trim();
    const url = videoUploadedUrl || videoPreviewUrl || urlInput;
    if (!videoCosInfo && !url) {
      message.warning("请输入视频 URL 或本地上传视频");
      return;
    }
    if (!videoCosInfo) {
      try {
        new URL(url);
      } catch {
        message.error("视频地址无效");
        return;
      }
      // 使用 URL 时：同一次点击先回显视频（设置 preview），再发起检测
      if (urlInput && url === urlInput) {
        setVideoPreviewUrl(urlInput);
      }
    }
    try {
      setLoading(true);
      setResult(null);
      const body = videoCosInfo ? { cosInfo: videoCosInfo } : { videoUrl: url };
      const res = await fetch("/api/detect/tencent-video-ims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      if (text.trimStart().startsWith("<")) {
        message.error("代理未返回 JSON（可能未启动）：请先执行 node server/index.cjs");
        setLoading(false);
        return;
      }
      let data: {
        Status?: string;
        Suggestion?: string;
        Label?: string;
        ErrorType?: string;
        ErrorDescription?: string;
        ImageSegments?: Array<{
          Result?: {
            HitFlag?: number;
            Suggestion?: string;
            Results?: Array<{ HitFlag?: number; Suggestion?: string }>;
          };
        }>;
      };
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        message.error("检测接口返回格式错误，请确认代理已启动（node server/index.cjs）");
        setLoading(false);
        return;
      }
      if (data.ErrorType || data.ErrorDescription) {
        message.error(data.ErrorDescription || data.ErrorType || "视频检测失败");
        setLoading(false);
        return;
      }
      const segments = data.ImageSegments ?? [];
      let aigcCount = 0;
      segments.forEach((seg) => {
        const result = seg.Result;
        const results = result?.Results ?? [];
        const hit =
          result?.HitFlag === 1 ||
          result?.Suggestion === "Block" ||
          result?.Suggestion === "Review" ||
          results.some((r) => r.HitFlag === 1 || r.Suggestion === "Block" || r.Suggestion === "Review");
        if (hit) aigcCount++;
      });
      const total = segments.length;
      const segmentRatio = total > 0 ? aigcCount / total : 0;
      let segmentConclusion: string;
      if (segmentRatio < 0.5) segmentConclusion = "无 AI 生成痕迹的常规视频";
      else if (segmentRatio <= 0.9) segmentConclusion = "含 AI 生成，建议人工二次校验";
      else segmentConclusion = "大概率为 AI 合成视频";
      const suggestion = data.Suggestion ?? "Pass";
      const isFake = suggestion === "Block" || suggestion === "Review" || segmentRatio >= 0.5;
      const machineLabelMap: Record<string, string> = {
        Normal: "正常",
        GeneratedContentRisk: "生成内容风险",
      };
      const machineLabel = machineLabelMap[data.Label ?? ""] ?? data.Label ?? (isFake ? "异常" : "正常");
      setResult({
        isFake,
        confidence: segmentRatio,
        model: "腾讯云视频 AI 生成识别",
        heatmapUrl: url,
        details: {
          artifacts: isFake ? [segmentConclusion] : [],
          machineLabel,
          segmentRatio,
          segmentConclusion,
        },
      });
      setCurrentStep(3);
      message.success("视频检测完成");
      setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), 100);
    } catch (err: unknown) {
      console.error("Video detect error:", err);
      const msg = err instanceof Error ? err.message : "视频检测失败";
      const friendly =
        msg.includes("Unexpected token") || msg.includes("is not valid JSON")
          ? "代理未返回 JSON，请先启动 node server/index.cjs"
          : msg;
      message.error(friendly);
    } finally {
      setLoading(false);
    }
  };

  const handleDetect = async () => {
    if (!uploadedFile) {
      message.warning("请先上传文件");
      return;
    }

    if (selectedModels.length === 0) {
      message.warning("请至少选择一个检测模型");
      return;
    }

    try {
      setLoading(true);
      setResult(null);

      const primaryModel = selectedModels[0];
      let params: { FileContent?: string; FileUrl?: string; BizType?: string } = {};
      const rawFile = (uploadedFile as UploadFile).originFileObj ?? (uploadedFile as unknown as File);
      if (activeTab === "upload" && rawFile instanceof File) {
        if (!rawFile.type.startsWith("image/")) {
          message.warning("腾讯云图片内容安全当前仅支持图片检测，请上传图片（JPG/PNG 等）");
          setLoading(false);
          return;
        }
        params.FileContent = await fileToBase64(rawFile);
      } else if (activeTab === "url" && urlInput.trim()) {
        params.FileUrl = urlInput.trim();
      } else {
        message.warning("无法获取图片内容，请重新上传或输入 URL");
        setLoading(false);
        return;
      }
      const res = await imageModerationViaProxy(params);
      type TencentResp = {
        HitFlag?: number;
        Score?: number;
        Suggestion?: string;
        Label?: string;
        SubLabel?: string;
        LabelResults?: Array<{ Label?: string; SubLabel?: string; Score?: number }>;
      };
      const resp: TencentResp = (res.Response ?? res) as TencentResp;
      if (!resp || typeof resp !== "object") {
        message.error("腾讯云未返回有效结果");
        setLoading(false);
        return;
      }

      const hitFlag = resp.HitFlag ?? 0;
      const score = (resp.Score ?? 0) / 100;
      const suggestion = resp.Suggestion ?? "Pass";
      const isFake = hitFlag === 1 || suggestion === "Block" || suggestion === "Review";
      const artifacts: string[] = [];
      if (resp.Label && resp.Label !== "Normal") {
        artifacts.push(resp.SubLabel ? `${resp.Label} - ${resp.SubLabel}` : resp.Label);
      }
      (resp.LabelResults ?? []).forEach((r: { Label?: string; SubLabel?: string; Score?: number }) => {
        if (r.Label && r.Label !== "Normal" && r.Score != null) {
          const desc = r.SubLabel ? `${r.Label}(${r.SubLabel}) ${r.Score}%` : `${r.Label} ${r.Score}%`;
          if (!artifacts.includes(desc)) artifacts.push(desc);
        }
      });

      const machineLabelMap: Record<string, string> = {
        Normal: "正常",
        GeneratedContentRisk: "生成内容风险",
        AIGenerated: "AI生成",
      };
      const rawLabel = resp.Label ?? "Normal";
      const machineLabelZh = machineLabelMap[rawLabel] ?? rawLabel;

      const detectionResult: DetectionResult = {
        isFake,
        confidence: score,
        model: primaryModel,
        details: { artifacts, machineLabel: machineLabelZh },
        heatmapUrl: previewUrl,
      };

      setResult(detectionResult);
      setCurrentStep(3);
      message.success(`使用 ${primaryModel} + 腾讯云 AI 生成识别 检测完成！`);

      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      }, 100);
    } catch (err: unknown) {
      console.error("Detection error:", err);
      let msg = err instanceof Error ? err.message : "检测失败，请重试";
      if (msg === "Failed to fetch" || msg.includes("NetworkError") || msg.includes("Load failed")) {
        msg = "请求失败：请先启动代理（另开终端执行 npm run dev:proxy 或 node server/index.cjs）";
      }
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const uploadProps: UploadProps = {
    name: "file",
    multiple: false,
    customRequest: handleUpload,
    showUploadList: false,
    accept: "image/*",
  };

  const resetDetection = () => {
    setResult(null);
    setUploadedFile(null);
    setPreviewUrl("");
    setUrlInput("");
    setVideoUrl("");
    setVideoUploadedUrl("");
    setVideoPreviewUrl("");
    setVideoCosInfo(null);
    setVideoUploadFileName("");
    setCurrentStep(1);
    setSelectedModels(["XceptionNet"]);
  };

  /** 视频本地上传：上传到代理后得到 URL，再用于检测 */
  const handleVideoUpload = async (file: File) => {
    const isVideo = (file.type || "").startsWith("video/");
    if (!isVideo) {
      message.warning("当前为「AI 视频生成检测」，仅支持视频。请重新选择视频文件（MP4、AVI 等）。");
      return false;
    }
    const formData = new FormData();
    formData.append("file", file);
    setVideoUploading(true);
    setVideoUploadedUrl("");
    try {
      const res = await fetch("/api/detect/tencent-video-ims/upload", {
        method: "POST",
        body: formData,
      });
      const text = await res.text();
      if (text.trimStart().startsWith("<")) {
        message.error("代理未返回 JSON（可能未启动）：请先执行 node server/index.cjs");
        return false;
      }
      let data: { url?: string; cosInfo?: { Bucket: string; Region: string; Object: string }; error?: string };
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        message.error("上传接口返回格式错误，请确认代理已启动");
        return false;
      }
      if (!res.ok) throw new Error(data.error || "上传失败");
      if (data.url) {
        setVideoUploadedUrl(data.url);
        setVideoCosInfo(data.cosInfo || null);
        setVideoUploadFileName(file.name || "视频文件");
        setVideoUrl("");
        message.success(data.cosInfo ? "视频已上传至腾讯云 COS，可点击开始检测" : "视频已上传，可点击开始检测");
      }
    } catch (e) {
      message.error(e instanceof Error ? e.message : "上传失败");
    } finally {
      setVideoUploading(false);
    }
    return false;
  };

  return (
    <div className="page-transition">
      <div className="page-header">
        <Title level={2} className="page-title">
          虚假内容检测
        </Title>
        <Paragraph className="page-description">
          使用深度学习技术检测图片或视频是否经过 AI 生成或篡改。 支持识别 Deepfake、FaceSwap
          等多种伪造手段，提供可疑区域定位和详细分析报告。
        </Paragraph>
      </div>

      <Row gutter={24}>
        <Col xs={24} lg={12}>
          <Tabs
            activeKey={detectType}
            onChange={(k) => {
              setDetectType(k as DetectType);
              setResult(null);
              setCurrentStep(1);
            }}
            items={[
              {
                key: "image",
                label: "AI 图片生成检测",
                children: (
                  <Card title="上传检测内容" bordered={false}>
                    <Tabs
                      activeKey={activeTab}
                      onChange={setActiveTab}
                      items={[
                        {
                          key: "upload",
                          label: (
                            <span>
                              <UploadOutlined /> 本地上传
                            </span>
                          ),
                          children: (
                            <>
                              {!uploadedFile && (
                                <Dragger {...uploadProps} style={{ padding: "40px 20px" }}>
                                  <p className="ant-upload-drag-icon">
                                    <UploadOutlined style={{ fontSize: 48, color: "#1890ff" }} />
                                  </p>
                                  <p className="ant-upload-text" style={{ fontSize: 18 }}>
                                    点击或拖拽文件到此区域上传
                                  </p>
                                  <p className="ant-upload-hint">支持图片（JPG、PNG）或视频（MP4、AVI）格式</p>
                                </Dragger>
                              )}

                              {uploadedFile &&
                                previewUrl &&
                                activeTab === "upload" &&
                                !(currentStep === 2 && !result) && (
                                  <div
                                    className="heatmap-overlay"
                                    style={{
                                      maxHeight: 320,
                                      borderRadius: 8,
                                      overflow: "hidden",
                                      background: "#fafafa",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                    }}
                                  >
                                    <Image
                                      src={previewUrl}
                                      alt="上传的内容"
                                      style={{
                                        width: "100%",
                                        maxHeight: 320,
                                        objectFit: "contain",
                                        borderRadius: 8,
                                      }}
                                      preview={false}
                                    />
                                    {result && result.details.faceRegion && (
                                      <div
                                        className="heatmap-layer"
                                        style={{
                                          top: `${(result.details.faceRegion.y / 100) * 100}%`,
                                          left: `${(result.details.faceRegion.x / 100) * 100}%`,
                                          width: `${(result.details.faceRegion.width / 100) * 100}%`,
                                          height: `${(result.details.faceRegion.height / 100) * 100}%`,
                                        }}
                                      />
                                    )}
                                  </div>
                                )}
                            </>
                          ),
                        },
                        {
                          key: "url",
                          label: (
                            <span>
                              <LinkOutlined /> URL解析
                            </span>
                          ),
                          children: (
                            <>
                              <Space.Compact style={{ width: "100%", marginBottom: 16 }}>
                                <Input
                                  size="large"
                                  placeholder="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=768"
                                  value={urlInput}
                                  onChange={(e) => setUrlInput(e.target.value)}
                                  onPressEnter={handleUrlLoad}
                                  disabled={loading}
                                />
                                <Button
                                  type="primary"
                                  size="large"
                                  onClick={handleUrlLoad}
                                  loading={loading}
                                  icon={<LinkOutlined />}
                                >
                                  加载
                                </Button>
                              </Space.Compact>

                              {uploadedFile && previewUrl && activeTab === "url" && !(currentStep === 2 && !result) && (
                                <div
                                  className="heatmap-overlay"
                                  style={{
                                    maxHeight: 320,
                                    borderRadius: 8,
                                    overflow: "hidden",
                                    background: "#fafafa",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <Image
                                    src={previewUrl}
                                    alt="URL内容"
                                    style={{
                                      width: "100%",
                                      maxHeight: 320,
                                      objectFit: "contain",
                                      borderRadius: 8,
                                    }}
                                    preview={false}
                                  />
                                  {result && result.details.faceRegion && (
                                    <div
                                      className="heatmap-layer"
                                      style={{
                                        top: `${(result.details.faceRegion.y / 100) * 100}%`,
                                        left: `${(result.details.faceRegion.x / 100) * 100}%`,
                                        width: `${(result.details.faceRegion.width / 100) * 100}%`,
                                        height: `${(result.details.faceRegion.height / 100) * 100}%`,
                                      }}
                                    />
                                  )}
                                </div>
                              )}
                            </>
                          ),
                        },
                      ]}
                    />

                    {/* 步骤2：左右布局 - 左侧图片预览，右侧方法选择 */}
                    {currentStep === 2 && uploadedFile && previewUrl && !result && (
                      <Row gutter={24} style={{ marginTop: 20 }} align="stretch">
                        <Col xs={24} md={12}>
                          <div
                            style={{
                              minHeight: 260,
                              maxHeight: 360,
                              borderRadius: 12,
                              overflow: "hidden",
                              background: "linear-gradient(145deg, #f8f9fa 0%, #f1f3f5 100%)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: 12,
                              border: "1px solid #e9ecef",
                            }}
                          >
                            <Image
                              src={previewUrl}
                              alt="待检测图片"
                              style={{
                                maxWidth: "100%",
                                maxHeight: 336,
                                objectFit: "contain",
                                borderRadius: 8,
                              }}
                              preview={false}
                            />
                          </div>
                          <Space direction="vertical" style={{ width: "100%", marginTop: 16 }} size={12}>
                            <Button
                              type="primary"
                              size="large"
                              block
                              icon={<ScanOutlined />}
                              onClick={handleDetect}
                              loading={loading}
                              disabled={loading || selectedModels.length === 0}
                              style={{ height: 44, borderRadius: 8 }}
                            >
                              {loading ? "检测中..." : `使用 ${selectedModels.length} 个模型开始检测`}
                            </Button>
                            <Button
                              block
                              icon={<UploadOutlined />}
                              onClick={resetDetection}
                              disabled={loading}
                              style={{ borderRadius: 8 }}
                            >
                              重新上传
                            </Button>
                          </Space>
                        </Col>
                        <Col xs={24} md={12}>
                          <Card
                            title="选择检测方法"
                            size="small"
                            bordered={false}
                            style={{
                              height: "100%",
                              minHeight: 260,
                              borderRadius: 12,
                              background: "#fafbfc",
                              border: "1px solid #e9ecef",
                              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                            }}
                            bodyStyle={{ padding: "16px 20px" }}
                          >
                            <Paragraph style={{ marginBottom: 16, fontSize: 13, color: "#5c6b7a" }}>
                              选择一个或多个检测模型进行综合分析，提高检测准确率
                            </Paragraph>
                            <Checkbox.Group
                              value={selectedModels}
                              onChange={(checkedValues) => setSelectedModels(checkedValues as string[])}
                              style={{ width: "100%" }}
                            >
                              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                                {DETECTION_MODELS.map((model) => (
                                  <Card
                                    key={model.value}
                                    size="small"
                                    hoverable
                                    style={{
                                      marginBottom: 0,
                                      borderRadius: 8,
                                      border: "1px solid #e9ecef",
                                      transition: "border-color 0.2s, box-shadow 0.2s",
                                    }}
                                  >
                                    <Checkbox value={model.value} style={{ width: "100%", alignItems: "flex-start" }}>
                                      <div style={{ paddingLeft: 4 }}>
                                        <Text strong style={{ fontSize: 14 }}>
                                          {model.label}
                                        </Text>
                                        <br />
                                        <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.5 }}>
                                          {model.description}
                                        </Text>
                                      </div>
                                    </Checkbox>
                                  </Card>
                                ))}
                              </Space>
                            </Checkbox.Group>
                          </Card>
                        </Col>
                      </Row>
                    )}

                    {/* 步骤3 或有结果时：全宽图片 + 按钮 */}
                    {!(currentStep === 2 && uploadedFile && !result) && (
                      <Space direction="vertical" style={{ width: "100%", marginTop: 16 }} size={12}>
                        {currentStep === 3 && result && (
                          <Button
                            type="primary"
                            size="large"
                            block
                            icon={<ScanOutlined />}
                            onClick={handleDetect}
                            loading={loading}
                            disabled={loading}
                            style={{ borderRadius: 8 }}
                          >
                            重新检测
                          </Button>
                        )}
                        {uploadedFile && (
                          <Button
                            block
                            icon={<UploadOutlined />}
                            onClick={resetDetection}
                            disabled={loading}
                            style={{ borderRadius: 8 }}
                          >
                            重新上传
                          </Button>
                        )}
                      </Space>
                    )}
                  </Card>
                ),
              },
              {
                key: "video",
                label: "AI 视频生成检测",
                children: (
                  <Card title="上传检测内容" bordered={false}>
                    <Paragraph type="secondary" style={{ marginBottom: 12 }}>
                      支持视频 URL 或本地上传，腾讯云将按每 4 秒截帧进行 AI 生成识别（
                      <a
                        href="https://cloud.tencent.cn/document/product/1265/125925"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        文档
                      </a>
                      ）。本地上传可配置 COS（推荐）或代理公网地址（如 ngrok）以便检测。
                    </Paragraph>
                    <Tabs
                      activeKey={videoInputTab}
                      onChange={(k) => {
                        setVideoInputTab(k as "url" | "upload");
                        if (k === "url") {
                          setVideoUploadedUrl("");
                          setVideoCosInfo(null);
                          setVideoUploadFileName("");
                        } else {
                          setVideoPreviewUrl("");
                        }
                      }}
                      items={[
                        {
                          key: "url",
                          label: "视频 URL",
                          children: (
                            <>
                              <Space.Compact style={{ width: "100%", marginBottom: 12 }}>
                                <Input
                                  size="large"
                                  placeholder="https://example.com/video.mp4"
                                  value={videoUrl}
                                  onChange={(e) => {
                                    setVideoUrl(e.target.value);
                                    setVideoPreviewUrl("");
                                  }}
                                  disabled={loading}
                                  style={{ flex: 1 }}
                                />
                                <Button
                                  type="primary"
                                  size="large"
                                  onClick={handleVideoDetect}
                                  loading={loading}
                                  icon={<ScanOutlined />}
                                >
                                  开始检测
                                </Button>
                              </Space.Compact>
                              {videoPreviewUrl && (
                                <div
                                  style={{
                                    marginBottom: 16,
                                    borderRadius: 12,
                                    overflow: "hidden",
                                    background: "#fafafa",
                                    border: "1px solid #e9ecef",
                                    padding: 12,
                                  }}
                                >
                                  <video
                                    src={videoPreviewUrl}
                                    controls
                                    style={{
                                      width: "100%",
                                      maxHeight: 320,
                                      display: "block",
                                      borderRadius: 8,
                                    }}
                                    preload="metadata"
                                  />
                                </div>
                              )}
                            </>
                          ),
                        },
                        {
                          key: "upload",
                          label: (
                            <Tooltip title="对象存储上传较慢，通过公网 URL 拉取也不稳定，建议优先使用「视频 URL」方式检测。">
                              <span>
                                <WarningOutlined style={{ marginRight: 6, color: "#faad14" }} />
                                本地上传
                              </span>
                            </Tooltip>
                          ),
                          children: (
                            <>
                              <Dragger
                                name="video"
                                multiple={false}
                                accept="video/*"
                                showUploadList={false}
                                customRequest={({ file }) => handleVideoUpload(file as File)}
                                disabled={loading || videoUploading}
                                style={{ padding: "24px 16px", marginBottom: 16, position: "relative" }}
                              >
                                {videoUploading ? (
                                  <>
                                    <p className="ant-upload-drag-icon">
                                      <Spin size="large" />
                                    </p>
                                    <p className="ant-upload-text">正在上传…</p>
                                    <p className="ant-upload-hint">上传至腾讯云 COS 后即可检测，请稍候</p>
                                  </>
                                ) : (
                                  <>
                                    <p className="ant-upload-drag-icon">
                                      <UploadOutlined style={{ fontSize: 40, color: "#1890ff" }} />
                                    </p>
                                    <p className="ant-upload-text">点击或拖拽视频到此区域上传</p>
                                    <p className="ant-upload-hint">支持 MP4、AVI 等，单文件建议不超过 500MB</p>
                                  </>
                                )}
                              </Dragger>
                              {videoUploadedUrl && (
                                <Paragraph type="secondary" style={{ marginBottom: 12 }}>
                                  已上传：{videoUploadFileName}，可点击下方开始检测
                                </Paragraph>
                              )}
                              <Button
                                type="primary"
                                size="large"
                                block
                                icon={<ScanOutlined />}
                                onClick={handleVideoDetect}
                                loading={loading}
                                disabled={!videoUploadedUrl || loading}
                              >
                                {loading ? "检测中…" : "开始检测"}
                              </Button>
                            </>
                          ),
                        },
                      ]}
                    />
                    <Button
                      block
                      icon={<UploadOutlined />}
                      onClick={resetDetection}
                      disabled={loading}
                      style={{ marginTop: 16 }}
                    >
                      重新输入
                    </Button>
                  </Card>
                ),
              },
            ]}
          />
        </Col>

        <Col xs={24} lg={12}>
          <Card title="检测结果" bordered={false}>
            {!result && !loading && (
              <div
                style={{
                  textAlign: "center",
                  padding: "80px 20px",
                  background: "#fafafa",
                  borderRadius: 8,
                }}
              >
                <ScanOutlined style={{ fontSize: 64, color: "#d9d9d9", marginBottom: 16 }} />
                <Paragraph style={{ color: "#999", marginBottom: 8 }}>
                  {detectType === "video" ? "等待输入视频 URL" : "等待上传文件"}
                </Paragraph>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {detectType === "video" ? "输入视频地址并点击开始检测" : "上传后将显示检测结果"}
                </Text>
              </div>
            )}

            {loading && (
              <div
                style={{
                  textAlign: "center",
                  padding: "80px 20px",
                  background: "#fafafa",
                  borderRadius: 8,
                }}
              >
                <Spin size="large" />
                <Paragraph style={{ marginTop: 16, color: "#666" }}>
                  {detectType === "video" ? "检测中…（视频按 4 秒截帧识别，可能需 1–3 分钟）" : "检测中..."}
                </Paragraph>
              </div>
            )}

            {result && !loading && (
              <div>
                <Space direction="vertical" size="large" style={{ width: "100%" }}>
                  {/* 识别结果 - 对齐腾讯云控制台「AI生成图片检测」 */}
                  <div style={{ textAlign: "center", padding: "16px 0" }}>
                    {result.isFake ? (
                      <>
                        <CloseCircleOutlined style={{ fontSize: 56, color: "#ff4d4f" }} />
                        <div style={{ marginTop: 12, fontSize: 18, fontWeight: 600, color: "#ff4d4f" }}>
                          识别结果：不通过
                        </div>
                      </>
                    ) : (
                      <>
                        <CheckCircleOutlined style={{ fontSize: 56, color: "#52c41a" }} />
                        <div style={{ marginTop: 12, fontSize: 18, fontWeight: 600, color: "#52c41a" }}>
                          识别结果：通过 (Pass)
                        </div>
                      </>
                    )}
                  </div>

                  {/* 机审标签 - 与腾讯云控制台一致 */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Text strong style={{ minWidth: 72 }}>
                      机审标签
                    </Text>
                    <Text type="secondary">{result.details.machineLabel ?? (result.isFake ? "异常" : "正常")}</Text>
                  </div>

                  {/* AI生成概率 / 合成段数占比 */}
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <Text strong style={{ fontSize: 16 }}>
                        {result.details.segmentRatio != null ? "合成段数占比" : "AI生成概率"}
                      </Text>
                      <Text strong style={{ fontSize: 16, color: result.isFake ? "#ff4d4f" : "#52c41a" }}>
                        {Math.round(result.confidence * 100)}%
                      </Text>
                    </div>
                    <Progress
                      percent={Math.round(result.confidence * 100)}
                      status={result.isFake ? "exception" : "success"}
                      strokeColor={result.isFake ? "#ff4d4f" : "#52c41a"}
                    />
                    {result.details.segmentConclusion && (
                      <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0, fontSize: 13 }}>
                        {result.details.segmentConclusion}
                      </Paragraph>
                    )}
                  </div>

                  {result.details.artifacts && result.details.artifacts.length > 0 && (
                    <div>
                      <Text strong>检测到的异常特征</Text>
                      <div style={{ marginTop: 8 }}>
                        {result.details.artifacts.map((artifact, index) => (
                          <Tag color="red" key={index} style={{ marginBottom: 8 }}>
                            {artifact
                              .replace(/GeneratedContentRisk/gi, "生成内容风险")
                              .replace(/AIGenerated/gi, "AI生成")
                              .replace(/Normal/gi, "正常")}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.details.faceRegion && (
                    <Alert
                      message="可疑区域已标注"
                      description="红色高亮区域显示了可能被篡改或伪造的部分"
                      type="warning"
                      showIcon
                    />
                  )}
                </Space>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default FakeDetectPage;
