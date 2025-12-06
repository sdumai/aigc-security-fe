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
} from "antd";
import {
  UploadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ScanOutlined,
} from "@ant-design/icons";
import type { UploadFile, UploadProps } from "antd";
import request from "@/utils/request";

const { Title, Paragraph, Text } = Typography;
const { Dragger } = Upload;

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

      // 发送检测请求
      const formData = new FormData();
      formData.append("file", uploadedFile.originFileObj as File);

      const response: any = await request.post("/detect/fake", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("Detection response:", response);
      setResult(response);
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

  return (
    <div>
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
                    <Button block>导出检测报告</Button>
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
