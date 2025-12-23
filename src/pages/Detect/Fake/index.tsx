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
  Divider,
  Input,
  Tabs,
} from "antd";
import {
  UploadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ScanOutlined,
  DownloadOutlined,
  LinkOutlined,
} from "@ant-design/icons";
import type { UploadFile, UploadProps } from "antd";

const { Title, Paragraph, Text } = Typography;
const { Dragger } = Upload;

// Mock 检测结果数据
const MOCK_DETECTION_RESULTS = [
  {
    isFake: true,
    confidence: 0.87,
    model: "XceptionNet",
    details: {
      faceRegion: { x: 20, y: 15, width: 60, height: 70 },
      artifacts: ["面部边界不自然", "光照不一致", "AI生成痕迹"],
    },
  },
  {
    isFake: false,
    confidence: 0.15,
    model: "EfficientNet-B4",
    details: {
      artifacts: [],
    },
  },
  {
    isFake: true,
    confidence: 0.92,
    model: "XceptionNet",
    details: {
      faceRegion: { x: 25, y: 20, width: 50, height: 65 },
      artifacts: ["Deepfake特征", "面部纹理异常", "眼部反光不自然"],
    },
  },
  {
    isFake: false,
    confidence: 0.08,
    model: "ResNet-101",
    details: {
      artifacts: [],
    },
  },
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
  };
}

const FakeDetectPage = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [uploadedFile, setUploadedFile] = useState<UploadFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [urlInput, setUrlInput] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("upload");

  const handleUpload: UploadProps["customRequest"] = async (options) => {
    const { file } = options;
    const uploadFile = file as File;

    try {
      setUploadedFile(file as any);
      // 创建预览 URL
      const url = URL.createObjectURL(uploadFile);
      setPreviewUrl(url);
      message.success("文件上传成功，请点击开始检测");
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
        uid: '-1', 
        name: urlInput.split('/').pop() || 'remote-file',
        status: 'done',
        url: urlInput,
      } as UploadFile);
      message.success("URL加载成功，请点击开始检测");
    } catch (error) {
      console.error("URL load error:", error);
      message.error("URL加载失败，请检查地址是否正确");
    } finally {
      setLoading(false);
    }
  };

  const handleDetect = async () => {
    if (!uploadedFile) {
      message.warning("请先上传文件");
      return;
    }

    try {
      setLoading(true);
      setResult(null);

      // 模拟检测延迟（1-2秒）
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // 使用 mock 数据（随机选择一个结果）
      const randomResult = MOCK_DETECTION_RESULTS[
        Math.floor(Math.random() * MOCK_DETECTION_RESULTS.length)
      ];
      
      setResult({
        ...randomResult,
        heatmapUrl: previewUrl, // 使用上传的图片作为热力图
      });
      message.success("检测完成！");

      // 滚动到结果区域
      setTimeout(() => {
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: "smooth",
        });
      }, 100);
    } catch (error) {
      console.error("Detection error:", error);
      message.error("检测失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const uploadProps: UploadProps = {
    name: "file",
    multiple: false,
    customRequest: handleUpload,
    showUploadList: false,
    accept: "image/*,video/*",
  };

  const resetDetection = () => {
    setResult(null);
    setUploadedFile(null);
    setPreviewUrl("");
    setUrlInput("");
  };

  const handleDownloadReport = () => {
    if (!result) return;

    // 创建检测报告内容
    const reportContent = `
虚假内容检测报告
==================

检测时间：${new Date().toLocaleString("zh-CN")}
文件名称：${uploadedFile?.name || "未知"}

检测结果
--------
结论：${result.isFake ? "虚假内容" : "真实内容"}
伪造概率：${Math.round(result.confidence * 100)}%
检测模型：${result.model}

${result.details.artifacts && result.details.artifacts.length > 0 ? `
异常特征
--------
${result.details.artifacts.map((artifact, index) => `${index + 1}. ${artifact}`).join("\n")}
` : ""}

${result.details.faceRegion ? `
可疑区域
--------
已检测到可疑的人脸区域，建议进一步核实。
` : ""}

---
此报告由 AIGC 安全性研究与工具平台自动生成
`;

    // 创建并下载文本文件
    const blob = new Blob([reportContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fake-detection-report-${Date.now()}.txt`;
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
          虚假内容检测
        </Title>
        <Paragraph className="page-description">
          使用深度学习技术检测图片或视频是否经过 AI 生成或篡改。 支持识别
          Deepfake、FaceSwap 等多种伪造手段，提供可疑区域定位和详细分析报告。
        </Paragraph>
      </div>

      <Alert
        message="检测说明"
        description="支持上传 JPG、PNG、MP4 等格式的图片或视频文件。文件大小建议不超过 50MB，检测时间约 1-3 秒。"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Row gutter={24}>
        <Col xs={24} lg={12}>
          <Card title="上传检测内容" bordered={false}>
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={[
                {
                  key: 'upload',
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
                          <p className="ant-upload-hint">
                            支持图片（JPG、PNG）或视频（MP4、AVI）格式
                          </p>
                        </Dragger>
                      )}

                      {uploadedFile && previewUrl && activeTab === 'upload' && (
                        <div className="heatmap-overlay">
                          <Image
                            src={previewUrl}
                            alt="上传的内容"
                            style={{ width: "100%", borderRadius: 8 }}
                            preview={false}
                          />
                          {result && result.details.faceRegion && (
                            <div
                              className="heatmap-layer"
                              style={{
                                top: `${(result.details.faceRegion.y / 100) * 100}%`,
                                left: `${(result.details.faceRegion.x / 100) * 100}%`,
                                width: `${
                                  (result.details.faceRegion.width / 100) * 100
                                }%`,
                                height: `${
                                  (result.details.faceRegion.height / 100) * 100
                                }%`,
                              }}
                            />
                          )}
                        </div>
                      )}
                    </>
                  ),
                },
                {
                  key: 'url',
                  label: (
                    <span>
                      <LinkOutlined /> URL解析
                    </span>
                  ),
                  children: (
                    <>
                      <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
                        <Input
                          size="large"
                          placeholder="请输入图片或视频的URL地址，例如：https://example.com/image.jpg"
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

                      {uploadedFile && previewUrl && activeTab === 'url' && (
                        <div className="heatmap-overlay">
                          <Image
                            src={previewUrl}
                            alt="URL内容"
                            style={{ width: "100%", borderRadius: 8 }}
                            preview={false}
                          />
                          {result && result.details.faceRegion && (
                            <div
                              className="heatmap-layer"
                              style={{
                                top: `${(result.details.faceRegion.y / 100) * 100}%`,
                                left: `${(result.details.faceRegion.x / 100) * 100}%`,
                                width: `${
                                  (result.details.faceRegion.width / 100) * 100
                                }%`,
                                height: `${
                                  (result.details.faceRegion.height / 100) * 100
                                }%`,
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

            <Space
              direction="vertical"
              style={{ width: "100%", marginTop: 16 }}
            >
              <Button
                type="primary"
                size="large"
                block
                icon={<ScanOutlined />}
                onClick={handleDetect}
                loading={loading}
                disabled={!uploadedFile || loading}
              >
                {loading ? "检测中..." : result ? "重新检测" : "开始检测"}
              </Button>
              <Button
                block
                icon={<UploadOutlined />}
                onClick={resetDetection}
                disabled={!uploadedFile || loading}
              >
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
                <ScanOutlined
                  style={{ fontSize: 64, color: "#d9d9d9", marginBottom: 16 }}
                />
                <Paragraph style={{ color: "#999", marginBottom: 8 }}>
                  等待上传文件
                </Paragraph>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  上传后将显示检测结果
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
                  检测中...
                </Paragraph>
              </div>
            )}

            {result && !loading && (
              <div>
                <Space
                  direction="vertical"
                  size="large"
                  style={{ width: "100%" }}
                >
                  <div style={{ textAlign: "center", padding: "20px 0" }}>
                    {result.isFake ? (
                      <>
                        <CloseCircleOutlined
                          style={{ fontSize: 72, color: "#ff4d4f" }}
                        />
                        <Title
                          level={3}
                          style={{
                            color: "#ff4d4f",
                            marginTop: 16,
                            marginBottom: 0,
                          }}
                        >
                          检测为虚假内容
                        </Title>
                      </>
                    ) : (
                      <>
                        <CheckCircleOutlined
                          style={{ fontSize: 72, color: "#52c41a" }}
                        />
                        <Title
                          level={3}
                          style={{
                            color: "#52c41a",
                            marginTop: 16,
                            marginBottom: 0,
                          }}
                        >
                          检测为真实内容
                        </Title>
                      </>
                    )}
                  </div>

                  <div>
                    <Text strong style={{ fontSize: 16 }}>
                      伪造概率
                    </Text>
                    <Progress
                      percent={Math.round(result.confidence * 100)}
                      status={result.isFake ? "exception" : "success"}
                      strokeColor={result.isFake ? "#ff4d4f" : "#52c41a"}
                      style={{ marginTop: 8 }}
                    />
                  </div>

                  <Divider />

                  <div>
                    <Text strong>检测模型：</Text>
                    <Tag color="blue" style={{ marginLeft: 8 }}>
                      {result.model}
                    </Tag>
                  </div>

                  {result.details.artifacts &&
                    result.details.artifacts.length > 0 && (
                      <div>
                        <Text strong>检测到的异常特征：</Text>
                        <div style={{ marginTop: 8 }}>
                          {result.details.artifacts.map((artifact, index) => (
                            <Tag
                              color="red"
                              key={index}
                              style={{ marginBottom: 8 }}
                            >
                              {artifact}
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

                  <Space style={{ width: "100%" }} direction="vertical">
                    <Button 
                      type="primary" 
                      block 
                      icon={<DownloadOutlined />}
                      onClick={handleDownloadReport}
                    >
                      下载检测报告
                    </Button>
                  </Space>
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
