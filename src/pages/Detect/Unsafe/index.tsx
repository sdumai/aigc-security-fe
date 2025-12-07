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
} from "antd";
import {
  UploadOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SafetyOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import type { UploadFile, UploadProps } from "antd";
import request from "@/utils/request";

const { Title, Paragraph, Text } = Typography;
const { Dragger } = Upload;

// Mock 不安全内容检测结果
const MOCK_UNSAFE_RESULTS = [
  {
    violations: [],
    risk: "low" as RiskLevel,
    riskScore: 5,
    suggestions: ["内容安全，可以正常发布"],
    details: {},
  },
  {
    violations: ["violence"],
    risk: "medium" as RiskLevel,
    riskScore: 45,
    suggestions: ["建议模糊化暴力画面", "添加内容警告标识"],
    details: {
      violence: {
        score: 0.45,
        regions: [{ x: 30, y: 25, width: 40, height: 50 }],
      },
    },
  },
  {
    violations: ["sensitive", "violence"],
    risk: "high" as RiskLevel,
    riskScore: 82,
    suggestions: ["建议删除敏感内容", "不建议公开发布", "需要人工审核"],
    details: {
      sensitive: {
        score: 0.78,
        regions: [{ x: 20, y: 20, width: 60, height: 60 }],
      },
      violence: {
        score: 0.65,
      },
    },
  },
  {
    violations: ["sexual"],
    risk: "high" as RiskLevel,
    riskScore: 91,
    suggestions: ["严重违规，禁止发布", "建议立即删除"],
    details: {
      sexual: {
        score: 0.91,
        regions: [{ x: 15, y: 10, width: 70, height: 80 }],
      },
    },
  },
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

const riskConfig: Record<
  RiskLevel,
  { color: string; text: string; icon: React.ReactNode }
> = {
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

  const handleDetect = async () => {
    if (!uploadedFile) {
      message.warning("请先上传文件");
      return;
    }

    try {
      setLoading(true);
      setResult(null);

      // 模拟检测延迟（1.5-2秒）
      await new Promise((resolve) => setTimeout(resolve, 1800));

      // 使用 mock 数据（随机选择一个结果）
      const randomResult = MOCK_UNSAFE_RESULTS[
        Math.floor(Math.random() * MOCK_UNSAFE_RESULTS.length)
      ];
      
      setResult(randomResult);
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
  };

  const handleDownloadReport = () => {
    if (!result) return;

    // 创建不安全内容检测报告
    const reportContent = `
不安全内容检测报告
==================

检测时间：${new Date().toLocaleString("zh-CN")}
文件名称：${uploadedFile?.name || "未知"}

检测结果
--------
风险等级：${riskConfig[result.risk].text}
风险评分：${result.riskScore}/100

${result.violations.length > 0 ? `
检测到的违规类型
----------------
${result.violations.map((v, i) => `${i + 1}. ${violationLabels[v] || v}`).join("\n")}

详细分析
--------
${Object.entries(result.details).map(([key, value]) => {
  return `${violationLabels[key] || key}：${Math.round(value.score * 100)}%${
    value.regions && value.regions.length > 0 ? ` (检测到 ${value.regions.length} 处可疑区域)` : ""
  }`;
}).join("\n")}
` : `
内容安全状态
------------
未检测到违规内容，内容安全。
`}

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
        description="可识别：暴力血腥、色情低俗、政治敏感、仇恨符号、毒品赌博等多类违规内容。支持图片和视频格式。"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Row gutter={24}>
        <Col xs={24} lg={12}>
          <Card title="上传检测内容" bordered={false}>
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

            {uploadedFile && previewUrl && (
              <Image
                src={previewUrl}
                alt="上传的内容"
                style={{ width: "100%", borderRadius: 8 }}
                preview={false}
              />
            )}

            <Space
              direction="vertical"
              style={{ width: "100%", marginTop: 16 }}
            >
              <Button
                type="primary"
                size="large"
                block
                icon={<SafetyOutlined />}
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
                <SafetyOutlined
                  style={{ fontSize: 64, color: "#d9d9d9", marginBottom: 16 }}
                />
                <Paragraph style={{ color: "#999", marginBottom: 8 }}>
                  等待上传文件
                </Paragraph>
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
                <Paragraph style={{ marginTop: 16, color: "#666" }}>
                  检测中...
                </Paragraph>
              </div>
            )}

            {result && !loading && (
              <div>
                <Alert
                  message="安全检测已完成"
                  description={`检测到 ${
                    result.violations.length
                  } 个违规类型，风险等级：${riskConfig[result.risk].text}`}
                  type={
                    result.risk === "low"
                      ? "success"
                      : result.risk === "medium"
                      ? "warning"
                      : "error"
                  }
                  showIcon
                  style={{ marginBottom: 16 }}
                />
                <Space
                  direction="vertical"
                  size="large"
                  style={{ width: "100%" }}
                >
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
                    <Text style={{ fontSize: 16 }}>
                      风险评分：{Math.round(result.riskScore * 100)}%
                    </Text>
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
                              <Space
                                direction="vertical"
                                style={{ width: "100%" }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                  }}
                                >
                                  <Text strong>
                                    {violationLabels[key] || key}
                                  </Text>
                                  <Text type="danger">
                                    {Math.round(value.score * 100)}%
                                  </Text>
                                </div>
                                {value.regions && value.regions.length > 0 && (
                                  <Text
                                    type="secondary"
                                    style={{ fontSize: 12 }}
                                  >
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

export default UnsafeDetectPage;
