import { useState } from "react";
import {
  Card,
  Upload,
  message,
  Spin,
  Typography,
  Tag,
  Space,
  Row,
  Col,
  Image,
  Alert,
  Button,
  Divider,
  List,
  Input,
  Tabs,
  Checkbox,
  Radio,
} from "antd";
import {
  UploadOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SafetyOutlined,
  DownloadOutlined,
  LinkOutlined,
  PictureOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import type { UploadFile, UploadProps } from "antd";
import { imageModerationViaProxy } from "@/utils/tencentIms";

const SENSITIVE_BIZTYPE = (import.meta.env.VITE_TENCENT_IMS_SAFE_BIZTYPE ?? "").trim() || "";

const { Title, Paragraph, Text } = Typography;
const { Dragger } = Upload;

// 可选的检测模型
const SAFETY_DETECTION_MODELS = [
  { value: "Google-SafeSearch", label: "Google SafeSearch", description: "Google 安全搜索API，检测不适宜内容" },
  { value: "AWS-Rekognition", label: "AWS Rekognition", description: "Amazon 图像审核服务" },
  { value: "Azure-ContentModerator", label: "Azure Content Moderator", description: "微软内容审核服务" },
  { value: "NSFW-Detector", label: "NSFW Detector", description: "开源的NSFW内容检测模型" },
];

type RiskLevel = "low" | "medium" | "high";

interface DetectionResult {
  violations: string[];
  risk: RiskLevel;
  riskScore: number;
  suggestions: string[];
  details: {
    [key: string]: {
      score: number;
      regions?: Array<{
        x: number;
        y: number;
        width: number;
        height: number;
      }>;
    };
  };
}

const violationLabels: Record<string, string> = {
  violence: "暴力内容",
  sensitive: "敏感内容",
  sexual: "色情内容",
  hate: "仇恨符号",
  drugs: "毒品相关",
  gambling: "赌博内容",
};

const riskConfig: Record<RiskLevel, { color: string; text: string; icon: React.ReactNode }> = {
  low: {
    color: "#52c41a",
    text: "低风险",
    icon: <CheckCircleOutlined />,
  },
  medium: {
    color: "#faad14",
    text: "中风险",
    icon: <ExclamationCircleOutlined />,
  },
  high: {
    color: "#ff4d4f",
    text: "高风险",
    icon: <WarningOutlined />,
  },
};

const UnsafeDetectPage = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [uploadedFile, setUploadedFile] = useState<UploadFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [urlInput, setUrlInput] = useState<string>("");
  const [contentKind, setContentKind] = useState<"image" | "video">("image"); // 顶层 Tab：图片敏感检测 | 视频敏感检测
  const [activeTab, setActiveTab] = useState<string>("upload");
  const [selectedModels, setSelectedModels] = useState<string[]>(["Google-SafeSearch"]);
  const [detectionProvider, setDetectionProvider] = useState<"tencent" | "volc">("volc");
  const [currentStep, setCurrentStep] = useState<number>(1); // 1: 上传, 2: 选择方法, 3: 检测结果
  // 视频 Tab 专用
  const [videoUploadedUrl, setVideoUploadedUrl] = useState<string>("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrlInput, setVideoUrlInput] = useState<string>("");
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>("");
  const [videoUploadFileName, setVideoUploadFileName] = useState<string>("");
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoInputTab, setVideoInputTab] = useState<"upload" | "url">("upload");
  const VIDEO_BASE64_MAX_BYTES = 20 * 1024 * 1024;

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.indexOf(",") >= 0 ? dataUrl.split(",")[1] : dataUrl;
        resolve(base64 || "");
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleUpload: UploadProps["customRequest"] = async (options) => {
    const { file } = options;
    const uploadFile = file as File;

    try {
      setUploadedFile(file as any);
      // 创建预览 URL
      const url = URL.createObjectURL(uploadFile);
      setPreviewUrl(url);
      setCurrentStep(2); // 上传成功后进入选择检测方法步骤
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

  const handleVideoUrlLoad = () => {
    const url = videoUrlInput.trim();
    if (!url) {
      message.warning("请输入视频 URL");
      return;
    }
    try {
      new URL(url);
    } catch {
      message.error("URL 格式不正确");
      return;
    }
    setVideoFile(null);
    setVideoUploadedUrl(url);
    setVideoPreviewUrl(url);
    setVideoUploadFileName(url.split("/").pop() || "视频");
    setCurrentStep(2);
    message.success("已加载视频地址，可开始检测");
  };

  const handleVideoUpload: UploadProps["customRequest"] = async (options) => {
    const file = options.file as File;
    if (!file.type.startsWith("video/")) {
      message.error("请选择视频文件（如 MP4）");
      return;
    }
    setVideoFile(file);
    setVideoPreviewUrl(URL.createObjectURL(file));
    setVideoUploadFileName(file.name || "视频");
    setCurrentStep(2);
    const useBase64 = file.size <= VIDEO_BASE64_MAX_BYTES;
    if (useBase64) {
      setVideoUploadedUrl("");
      message.success("视频已选择，将使用 Base64 直接检测（无需 COS）");
      return;
    }
    setVideoUploading(true);
    setVideoUploadedUrl("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/detect/tencent-video-ims/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "上传失败");
      setVideoUploadedUrl(data.url);
      message.success("视频上传成功，可开始检测");
    } catch (e) {
      message.error(e instanceof Error ? e.message : "大视频需上传到 COS，请配置 COS 或使用视频 URL");
    } finally {
      setVideoUploading(false);
    }
  };

  const handleDetect = async () => {
    if (contentKind === "video") {
      const hasUrl = !!videoUploadedUrl;
      const hasFile = !!videoFile && videoFile.size <= VIDEO_BASE64_MAX_BYTES;
      if (!hasUrl && !hasFile) {
        message.warning("请先上传视频或输入视频 URL 并加载");
        return;
      }
      try {
        setLoading(true);
        setResult(null);
        const body: { videoUrl?: string; videoBase64?: string } = {};
        if (hasFile && videoFile) {
          body.videoBase64 = await fileToBase64(videoFile);
        } else {
          body.videoUrl = videoUploadedUrl;
        }
        const res = await fetch("/api/detect/volc-video-ims", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "火山方舟视频检测失败");
        const safe = data.safe === true;
        const suggestion = (data.suggestion || "pass").toLowerCase();
        const labels: string[] = Array.isArray(data.labels) ? data.labels : [];
        const reason = data.reason || "";
        const risk: RiskLevel = suggestion === "block" ? "high" : suggestion === "review" ? "medium" : "low";
        const riskScore = safe ? 10 : suggestion === "block" ? 80 : 50;
        const suggestions: string[] = safe
          ? ["内容安全，可以正常发布", reason || "未检测到违规内容"]
          : [reason || "建议人工复审", ...labels.map((l: string) => `违规类型：${l}`)];
        const details: DetectionResult["details"] = {};
        labels.forEach((l: string) => {
          details[l] = { score: suggestion === "block" ? 0.9 : 0.6 };
        });
        setResult({
          violations: labels,
          risk,
          riskScore,
          suggestions,
          details,
        });
        setCurrentStep(3);
        message.success("火山方舟视频敏感检测完成");
        setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), 100);
      } catch (error) {
        message.error(error instanceof Error ? error.message : "检测失败，请重试");
      } finally {
        setLoading(false);
      }
      return;
    }

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

      let detectionResult: DetectionResult;

      if (detectionProvider === "volc") {
        // 火山方舟图片理解
        const body: { imageUrl?: string; imageBase64?: string } = {};
        if (activeTab === "url" && urlInput.trim()) {
          body.imageUrl = urlInput.trim();
        } else {
          const rawFile = (uploadedFile as UploadFile).originFileObj ?? (uploadedFile as unknown as File);
          if (rawFile instanceof File) {
            body.imageBase64 = await fileToBase64(rawFile);
          } else {
            message.error("无法读取图片，请重新上传");
            setLoading(false);
            return;
          }
        }
        const res = await fetch("/api/detect/volc-ims", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "火山方舟检测失败");
        }
        const safe = data.safe === true;
        const suggestion = (data.suggestion || "pass").toLowerCase();
        const labels: string[] = Array.isArray(data.labels) ? data.labels : [];
        const reason = data.reason || "";
        const risk: RiskLevel = suggestion === "block" ? "high" : suggestion === "review" ? "medium" : "low";
        const riskScore = safe ? Math.min(20, 5 + labels.length * 2) : suggestion === "block" ? 80 : 50;
        const suggestions: string[] = safe
          ? ["内容安全，可以正常发布", reason || "未检测到违规内容"]
          : [reason || "建议人工复审", ...labels.map((l: string) => `违规类型：${l}`)];
        const details: DetectionResult["details"] = {};
        labels.forEach((l: string) => {
          details[l] = { score: suggestion === "block" ? 0.9 : 0.6 };
        });
        detectionResult = {
          violations: labels,
          risk,
          riskScore,
          suggestions,
          details,
        };
      } else {
        // 腾讯云内容安全
        let fileContent: string | undefined;
        let fileUrl: string | undefined;
        if (activeTab === "url" && urlInput.trim()) {
          fileUrl = urlInput.trim();
        } else {
          const rawFile = (uploadedFile as UploadFile).originFileObj ?? (uploadedFile as unknown as File);
          if (rawFile instanceof File) {
            fileContent = await fileToBase64(rawFile);
          } else {
            message.error("无法读取图片，请重新上传");
            setLoading(false);
            return;
          }
        }
        const tencentRes = await imageModerationViaProxy({
          ...(fileContent ? { FileContent: fileContent } : {}),
          ...(fileUrl ? { FileUrl: fileUrl } : {}),
          ...(SENSITIVE_BIZTYPE ? { BizType: SENSITIVE_BIZTYPE } : {}),
        });
        const r = tencentRes.Response;
        const sug = (r?.Suggestion || "Pass").toLowerCase();
        const risk: RiskLevel = sug === "block" ? "high" : sug === "review" ? "medium" : "low";
        const labelResults = r?.LabelResults || [];
        const violations = labelResults.map((x) => (x.Label || x.Scene || "").toLowerCase()).filter(Boolean);
        const riskScore = sug === "block" ? 85 : sug === "review" ? 55 : 10;
        const suggestions: string[] =
          sug === "pass"
            ? ["内容安全，可以正常发布", "未检测到违规内容"]
            : [...violations.map((v) => `检测到：${v}`), "建议人工复审"];
        const details: DetectionResult["details"] = {};
        labelResults.forEach((x) => {
          const key = (x.Label || x.Scene || "").toLowerCase();
          if (key) details[key] = { score: (x.Score ?? 0) / 100 };
        });
        detectionResult = { violations, risk, riskScore, suggestions, details };
      }

      setResult(detectionResult);
      setCurrentStep(3);
      message.success(
        `使用 ${detectionProvider === "volc" ? "火山方舟" : "腾讯云"}（${selectedModels.join(", ")}）检测完成`,
      );
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      }, 100);
    } catch (error) {
      console.error("Detection error:", error);
      message.error(error instanceof Error ? error.message : "检测失败，请重试");
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
    setCurrentStep(1);
    if (contentKind === "video") {
      setVideoUploadedUrl("");
      setVideoUrlInput("");
      setVideoPreviewUrl("");
      setVideoUploadFileName("");
    } else {
      setUploadedFile(null);
      setPreviewUrl("");
      setUrlInput("");
      setSelectedModels(["Google-SafeSearch"]);
    }
  };

  const handleDownloadReport = () => {
    if (!result) return;

    // 创建不安全内容检测报告
    const reportContent = `
不安全内容检测报告
==================

检测时间：${new Date().toLocaleString("zh-CN")}
文件名称：${contentKind === "video" ? videoUploadFileName || "视频" : uploadedFile?.name || "未知"}

检测结果
--------
风险等级：${riskConfig[result.risk].text}
风险评分：${result.riskScore}/100

${
  result.violations.length > 0
    ? `
检测到的违规类型
----------------
${result.violations.map((v, i) => `${i + 1}. ${violationLabels[v] || v}`).join("\n")}

详细分析
--------
${Object.entries(result.details)
  .map(([key, value]) => {
    return `${violationLabels[key] || key}：${Math.round(value.score * 100)}%${
      value.regions && value.regions.length > 0 ? ` (检测到 ${value.regions.length} 处可疑区域)` : ""
    }`;
  })
  .join("\n")}
`
    : `
内容安全状态
------------
未检测到违规内容，内容安全。
`
}

处理建议
--------
${result.suggestions.map((s, i) => `${i + 1}. ${s}`).join("\n")}

---
此报告由 AIGC 安全性研究与工具平台自动生成
`;

    // 创建并下载文本文件
    const blob = new Blob([reportContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `unsafe-detection-report-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    message.success("检测报告已下载！");
  };

  return (
    <div className="page-transition">
      <div className="page-header">
        <Title level={2} className="page-title">
          不安全内容检测
        </Title>
        <Paragraph className="page-description">
          智能识别图片或视频中的不安全内容，包括暴力、色情、仇恨符号等违规元素。
          提供风险等级评估和整改建议，助力内容安全审核。
        </Paragraph>
      </div>

      <Alert
        message="检测范围"
        description="可识别：暴力血腥、色情低俗、政治敏感、仇恨符号、毒品赌博等多类违规内容。图片支持腾讯云/火山方舟；视频敏感检测使用火山方舟视频理解。"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Tabs
        activeKey={contentKind}
        onChange={(k) => {
          setContentKind(k as "image" | "video");
          setResult(null);
          setCurrentStep(1);
          if (k === "video") {
            setVideoUploadedUrl("");
            setVideoUrlInput("");
            setVideoPreviewUrl("");
            setVideoUploadFileName("");
          } else {
            setUploadedFile(null);
            setPreviewUrl("");
            setUrlInput("");
          }
        }}
        size="large"
        style={{ marginBottom: 24 }}
        items={[
          {
            key: "image",
            label: (
              <span>
                <PictureOutlined /> 图片敏感检测
              </span>
            ),
            children: (
              <Row gutter={24}>
                <Col xs={24} lg={12}>
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
                                  <p className="ant-upload-hint">支持图片（JPG、PNG 等）</p>
                                </Dragger>
                              )}

                              {uploadedFile && previewUrl && activeTab === "upload" && (
                                <Image
                                  src={previewUrl}
                                  alt="上传的内容"
                                  style={{ width: "100%", borderRadius: 8 }}
                                  preview={false}
                                />
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
                                  placeholder="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=768"
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

                              {uploadedFile && previewUrl && activeTab === "url" && (
                                <Image
                                  src={previewUrl}
                                  alt="URL内容"
                                  style={{ width: "100%", borderRadius: 8 }}
                                  preview={false}
                                />
                              )}
                            </>
                          ),
                        },
                      ]}
                    />

                    {/* 检测方法选择 - 仅在第2步（已上传文件但未检测）时显示 */}
                    {currentStep === 2 && uploadedFile && !result && (
                      <Card title="选择检测方法" size="small" style={{ marginTop: 16, backgroundColor: "#f5f5f5" }}>
                        <Paragraph style={{ marginBottom: 8, fontSize: 13, color: "#666" }}>检测服务</Paragraph>
                        <Radio.Group
                          value={detectionProvider}
                          onChange={(e) => setDetectionProvider(e.target.value)}
                          style={{ marginBottom: 16 }}
                        >
                          <Radio value="tencent">腾讯云内容安全</Radio>
                          <Radio value="volc">火山方舟图片理解</Radio>
                        </Radio.Group>
                        <Paragraph style={{ marginBottom: 12, fontSize: 13, color: "#666" }}>
                          选择一个或多个检测模型进行综合分析，提高检测准确率
                        </Paragraph>
                        <Checkbox.Group
                          value={selectedModels}
                          onChange={(checkedValues) => setSelectedModels(checkedValues as string[])}
                          style={{ width: "100%" }}
                        >
                          <Space direction="vertical" style={{ width: "100%" }}>
                            {SAFETY_DETECTION_MODELS.map((model) => (
                              <Card key={model.value} size="small" hoverable>
                                <Checkbox value={model.value} style={{ width: "100%" }}>
                                  <div>
                                    <Text strong>{model.label}</Text>
                                    <br />
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                      {model.description}
                                    </Text>
                                  </div>
                                </Checkbox>
                              </Card>
                            ))}
                          </Space>
                        </Checkbox.Group>
                      </Card>
                    )}

                    <Space direction="vertical" style={{ width: "100%", marginTop: 16 }}>
                      {contentKind === "image" && currentStep === 2 && !result && (
                        <Button
                          type="primary"
                          size="large"
                          block
                          icon={<SafetyOutlined />}
                          onClick={handleDetect}
                          loading={loading}
                          disabled={!uploadedFile || loading || selectedModels.length === 0}
                        >
                          {loading ? "检测中..." : `使用 ${selectedModels.length} 个模型开始检测`}
                        </Button>
                      )}
                      {contentKind === "image" && currentStep === 3 && result && (
                        <Button
                          type="primary"
                          size="large"
                          block
                          icon={<SafetyOutlined />}
                          onClick={handleDetect}
                          loading={loading}
                          disabled={loading}
                        >
                          重新检测
                        </Button>
                      )}
                      <Button block icon={<UploadOutlined />} onClick={resetDetection} disabled={loading}>
                        重新上传
                      </Button>
                    </Space>
                  </Card>
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
                        <SafetyOutlined style={{ fontSize: 64, color: "#d9d9d9", marginBottom: 16 }} />
                        <Paragraph style={{ color: "#999", marginBottom: 8 }}>等待上传文件</Paragraph>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          上传后将显示安全检测结果
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
                        <Paragraph style={{ marginTop: 16, color: "#666" }}>检测中...</Paragraph>
                      </div>
                    )}

                    {result && !loading && (
                      <div>
                        <Alert
                          message="安全检测已完成"
                          description={`检测到 ${result.violations.length} 个违规类型，风险等级：${
                            riskConfig[result.risk].text
                          }`}
                          type={result.risk === "low" ? "success" : result.risk === "medium" ? "warning" : "error"}
                          showIcon
                          style={{ marginBottom: 16 }}
                        />
                        <Space direction="vertical" size="large" style={{ width: "100%" }}>
                          <div
                            style={{
                              textAlign: "center",
                              padding: "20px",
                              background: `${riskConfig[result.risk].color}15`,
                              borderRadius: 8,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 64,
                                color: riskConfig[result.risk].color,
                              }}
                            >
                              {riskConfig[result.risk].icon}
                            </div>
                            <Title
                              level={3}
                              style={{
                                color: riskConfig[result.risk].color,
                                marginTop: 16,
                                marginBottom: 8,
                              }}
                            >
                              {riskConfig[result.risk].text}
                            </Title>
                            <Text style={{ fontSize: 16 }}>风险评分：{result.riskScore}/100</Text>
                          </div>

                          {result.violations.length > 0 && (
                            <>
                              <Divider />
                              <div>
                                <Text strong style={{ fontSize: 16 }}>
                                  检测到的违规类型
                                </Text>
                                <div style={{ marginTop: 12 }}>
                                  {result.violations.map((violation) => (
                                    <Tag
                                      key={violation}
                                      color="red"
                                      style={{
                                        fontSize: 14,
                                        padding: "4px 12px",
                                        marginBottom: 8,
                                      }}
                                    >
                                      {violationLabels[violation] || violation}
                                    </Tag>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <Text strong style={{ fontSize: 16 }}>
                                  详细分析
                                </Text>
                                <List
                                  style={{ marginTop: 12 }}
                                  size="small"
                                  bordered
                                  dataSource={Object.entries(result.details)}
                                  renderItem={([key, value]) => (
                                    <List.Item>
                                      <Space direction="vertical" style={{ width: "100%" }}>
                                        <div
                                          style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                          }}
                                        >
                                          <Text strong>{violationLabels[key] || key}</Text>
                                          <Text type="danger">{Math.round(value.score * 100)}%</Text>
                                        </div>
                                        {value.regions && value.regions.length > 0 && (
                                          <Text type="secondary" style={{ fontSize: 12 }}>
                                            检测到 {value.regions.length} 处可疑区域
                                          </Text>
                                        )}
                                      </Space>
                                    </List.Item>
                                  )}
                                />
                              </div>
                            </>
                          )}

                          {result.suggestions.length > 0 && (
                            <>
                              <Divider />
                              <div>
                                <Text strong style={{ fontSize: 16 }}>
                                  整改建议
                                </Text>
                                <List
                                  style={{ marginTop: 12 }}
                                  size="small"
                                  dataSource={result.suggestions}
                                  renderItem={(item, index) => (
                                    <List.Item>
                                      <Space>
                                        <Tag color="orange">{index + 1}</Tag>
                                        <Text>{item}</Text>
                                      </Space>
                                    </List.Item>
                                  )}
                                />
                              </div>
                            </>
                          )}

                          <Space style={{ width: "100%" }} direction="vertical">
                            <Button type="primary" block icon={<DownloadOutlined />} onClick={handleDownloadReport}>
                              下载检测报告
                            </Button>
                          </Space>
                        </Space>
                      </div>
                    )}
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: "video",
            label: (
              <span>
                <VideoCameraOutlined /> 视频敏感检测
              </span>
            ),
            children: (
              <Row gutter={24}>
                <Col xs={24} lg={12}>
                  <Card title="上传视频（火山方舟视频理解）" bordered={false}>
                    <Tabs
                      activeKey={videoInputTab}
                      onChange={(k) => setVideoInputTab(k as "upload" | "url")}
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
                              {!videoUploadedUrl && !videoFile && (
                                <Dragger
                                  accept="video/*"
                                  customRequest={handleVideoUpload}
                                  showUploadList={false}
                                  style={{ padding: "24px 16px", position: "relative" }}
                                >
                                  {videoUploading ? (
                                    <>
                                      <Spin size="large" />
                                      <Paragraph style={{ marginTop: 8 }}>正在上传…</Paragraph>
                                    </>
                                  ) : (
                                    <>
                                      <p className="ant-upload-drag-icon">
                                        <UploadOutlined style={{ fontSize: 48, color: "#1890ff" }} />
                                      </p>
                                      <p className="ant-upload-text">点击或拖拽视频到此区域</p>
                                      <p className="ant-upload-hint">
                                        ≤20MB 将用 Base64 直接检测（无需 COS）；更大视频将上传到 COS 后检测
                                      </p>
                                    </>
                                  )}
                                </Dragger>
                              )}
                              {(videoUploadedUrl || videoFile) && videoPreviewUrl && (
                                <video
                                  src={videoPreviewUrl}
                                  controls
                                  style={{ width: "100%", borderRadius: 8 }}
                                  title={videoUploadFileName}
                                />
                              )}
                            </>
                          ),
                        },
                        {
                          key: "url",
                          label: (
                            <span>
                              <LinkOutlined /> 视频 URL
                            </span>
                          ),
                          children: (
                            <>
                              <Space.Compact style={{ width: "100%", marginBottom: 16 }}>
                                <Input
                                  size="large"
                                  placeholder="https://example.com/video.mp4"
                                  value={videoUrlInput}
                                  onChange={(e) => setVideoUrlInput(e.target.value)}
                                  onPressEnter={handleVideoUrlLoad}
                                  disabled={loading}
                                />
                                <Button
                                  type="primary"
                                  size="large"
                                  onClick={handleVideoUrlLoad}
                                  icon={<LinkOutlined />}
                                >
                                  加载
                                </Button>
                              </Space.Compact>
                              {(videoUploadedUrl || videoFile) && videoPreviewUrl && videoInputTab === "url" && (
                                <video src={videoPreviewUrl} controls style={{ width: "100%", borderRadius: 8 }} />
                              )}
                            </>
                          ),
                        },
                      ]}
                    />
                    <Paragraph type="secondary" style={{ marginTop: 12, fontSize: 12 }}>
                      使用火山方舟视频理解进行敏感内容检测。本地上传 ≤20MB 可用 Base64 直接检测；更大视频或使用 URL
                      需公网可访问地址。
                    </Paragraph>
                    <Space direction="vertical" style={{ width: "100%", marginTop: 16 }}>
                      {(currentStep === 2 || videoUploadedUrl || videoFile) && !result && (
                        <Button
                          type="primary"
                          size="large"
                          block
                          icon={<SafetyOutlined />}
                          onClick={handleDetect}
                          loading={loading}
                          disabled={(!videoUploadedUrl && !videoFile) || loading}
                        >
                          {loading ? "检测中…" : "开始检测"}
                        </Button>
                      )}
                      {currentStep === 3 && result && (
                        <Button
                          type="primary"
                          size="large"
                          block
                          icon={<SafetyOutlined />}
                          onClick={handleDetect}
                          loading={loading}
                          disabled={loading}
                        >
                          重新检测
                        </Button>
                      )}
                      <Button block icon={<UploadOutlined />} onClick={resetDetection} disabled={loading}>
                        重新上传
                      </Button>
                    </Space>
                  </Card>
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
                        <SafetyOutlined style={{ fontSize: 64, color: "#d9d9d9", marginBottom: 16 }} />
                        <Paragraph style={{ color: "#999", marginBottom: 8 }}>等待上传视频</Paragraph>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          上传或输入视频 URL 后将显示安全检测结果
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
                        <Paragraph style={{ marginTop: 16, color: "#666" }}>检测中...</Paragraph>
                      </div>
                    )}
                    {result && !loading && (
                      <div>
                        <Alert
                          message="安全检测已完成"
                          description={`检测到 ${result.violations.length} 个违规类型，风险等级：${riskConfig[result.risk].text}`}
                          type={result.risk === "low" ? "success" : result.risk === "medium" ? "warning" : "error"}
                          showIcon
                          style={{ marginBottom: 16 }}
                        />
                        <Space direction="vertical" size="large" style={{ width: "100%" }}>
                          <div
                            style={{
                              textAlign: "center",
                              padding: "20px",
                              background: `${riskConfig[result.risk].color}15`,
                              borderRadius: 8,
                            }}
                          >
                            <div style={{ fontSize: 64, color: riskConfig[result.risk].color }}>
                              {riskConfig[result.risk].icon}
                            </div>
                            <Title
                              level={3}
                              style={{ color: riskConfig[result.risk].color, marginTop: 16, marginBottom: 8 }}
                            >
                              {riskConfig[result.risk].text}
                            </Title>
                            <Text style={{ fontSize: 16 }}>风险评分：{result.riskScore}/100</Text>
                          </div>
                          {result.violations.length > 0 && (
                            <>
                              <Divider />
                              <div>
                                <Text strong style={{ fontSize: 16 }}>
                                  检测到的违规类型
                                </Text>
                                <div style={{ marginTop: 12 }}>
                                  {result.violations.map((violation) => (
                                    <Tag
                                      key={violation}
                                      color="red"
                                      style={{ fontSize: 14, padding: "4px 12px", marginBottom: 8 }}
                                    >
                                      {violationLabels[violation] || violation}
                                    </Tag>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <Text strong style={{ fontSize: 16 }}>
                                  详细分析
                                </Text>
                                <List
                                  style={{ marginTop: 12 }}
                                  size="small"
                                  bordered
                                  dataSource={Object.entries(result.details)}
                                  renderItem={([key, value]) => (
                                    <List.Item>
                                      <Space direction="vertical" style={{ width: "100%" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                                          <Text strong>{violationLabels[key] || key}</Text>
                                          <Text type="danger">{Math.round(value.score * 100)}%</Text>
                                        </div>
                                      </Space>
                                    </List.Item>
                                  )}
                                />
                              </div>
                            </>
                          )}
                          {result.suggestions.length > 0 && (
                            <>
                              <Divider />
                              <div>
                                <Text strong style={{ fontSize: 16 }}>
                                  整改建议
                                </Text>
                                <List
                                  style={{ marginTop: 12 }}
                                  size="small"
                                  dataSource={result.suggestions}
                                  renderItem={(item, index) => (
                                    <List.Item>
                                      <Space>
                                        <Tag color="orange">{index + 1}</Tag>
                                        <Text>{item}</Text>
                                      </Space>
                                    </List.Item>
                                  )}
                                />
                              </div>
                            </>
                          )}
                          <Space style={{ width: "100%" }} direction="vertical">
                            <Button type="primary" block icon={<DownloadOutlined />} onClick={handleDownloadReport}>
                              下载检测报告
                            </Button>
                          </Space>
                        </Space>
                      </div>
                    )}
                  </Card>
                </Col>
              </Row>
            ),
          },
        ]}
      />
    </div>
  );
};

export default UnsafeDetectPage;
