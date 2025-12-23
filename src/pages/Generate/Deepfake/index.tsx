import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Form,
  Radio,
  Select,
  Button,
  Upload,
  Row,
  Col,
  message,
  Spin,
  Typography,
  Image,
  Space,
  Alert,
} from "antd";
import { UploadOutlined, ThunderboltOutlined, DownloadOutlined } from "@ant-design/icons";
import type { UploadFile } from "antd";
import request from "@/utils/request";

const { Title, Paragraph } = Typography;

// Mock Deepfake 生成结果图片
const MOCK_DEEPFAKE_RESULTS = [
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=512&h=512&fit=crop",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=512&h=512&fit=crop",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=512&h=512&fit=crop",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=512&h=512&fit=crop",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=512&h=512&fit=crop",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=512&h=512&fit=crop",
];

type FunctionType = "faceswap" | "fomm" | "stargan";
type ModelType = "FaceShifter" | "SimSwap" | "FOMM" | "StarGAN";

interface GenerateResult {
  imageUrl: string;
  message: string;
}

const DeepfakeGeneratePage = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [targetFile, setTargetFile] = useState<UploadFile[]>([]);
  const [sourceFile, setSourceFile] = useState<UploadFile[]>([]);
  const [functionType, setFunctionType] = useState<FunctionType>("faceswap");

  const modelOptions: Record<FunctionType, ModelType[]> = {
    faceswap: ["FaceShifter", "SimSwap"],
    fomm: ["FOMM"],
    stargan: ["StarGAN"],
  };

  const handleGenerate = async () => {
    try {
      await form.validateFields();

      if (targetFile.length === 0) {
        message.warning("请上传目标人脸图片");
        return;
      }

      if (sourceFile.length === 0) {
        message.warning("请上传驱动人脸/视频");
        return;
      }

      setLoading(true);
      setResult(null);

      const values = form.getFieldsValue();
      
      // 模拟生成延迟（2-3秒）
      await new Promise((resolve) => setTimeout(resolve, 2500));

      // 使用 mock 数据
      const randomResult = MOCK_DEEPFAKE_RESULTS[Math.floor(Math.random() * MOCK_DEEPFAKE_RESULTS.length)];
      const functionName = 
        values.function === "faceswap" ? "人脸替换" :
        values.function === "fomm" ? "人脸动画" : "属性编辑";
      
      setResult({
        imageUrl: randomResult,
        message: `使用 ${values.model} 模型完成${functionName}，效果逼真自然！`,
      });
      message.success("生成成功！");
    } catch (error) {
      console.error("Generate error:", error);
      message.error("生成失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!result?.imageUrl) return;

    const values = form.getFieldsValue();
    const functionName = 
      values.function === "faceswap" ? "faceswap" :
      values.function === "fomm" ? "fomm" : "stargan";

    try {
      message.loading("正在下载...", 0);
      
      // 使用 fetch 获取图片数据，避免跨域问题
      const response = await fetch(result.imageUrl);
      const blob = await response.blob();
      
      // 创建 blob URL 并下载
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `deepfake-${functionName}-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // 清理 blob URL
      URL.revokeObjectURL(blobUrl);
      
      message.destroy();
      message.success("下载成功！");
    } catch (error) {
      message.destroy();
      console.error("Download error:", error);
      // 如果 fetch 失败，回退到直接打开链接
      window.open(result.imageUrl, "_blank");
      message.info("已在新标签页打开图片，请右键保存");
    }
  };

  const handleSave = async () => {
    try {
      const values = form.getFieldsValue();
      await request.post("/data/save", {
        type: "image",
        title: `Deepfake ${
          values.function === "faceswap"
            ? "人脸替换"
            : values.function === "fomm"
            ? "人脸动画"
            : "属性编辑"
        }`,
        url: result?.imageUrl,
        model: values.model,
      });
      message.success({
        content: "内容已保存！可在内容管理中查看",
        duration: 3,
      });
      // 可选：延迟跳转到内容管理页面
      setTimeout(() => {
        navigate("/data/output");
      }, 1500);
    } catch (error) {
      console.error("Save error:", error);
    }
  };

  return (
    <div className="page-transition">
      <div className="page-header">
        <Title level={2} className="page-title">
          Deepfake 人脸生成
        </Title>
        <Paragraph className="page-description">
          支持人脸替换（FaceSwap）、人脸动画（FOMM）、属性编辑（StarGAN）等多种深度伪造技术。
          本功能仅供学术研究和安全测试使用，请勿用于非法用途。
        </Paragraph>
      </div>

      <Alert
        message="使用提示"
        description="请上传清晰的人脸图片以获得最佳效果。支持的格式：JPG、PNG、JPEG。建议图片分辨率不低于 512x512。"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Row gutter={24}>
        <Col xs={24} lg={12}>
          <Card title="配置参数" bordered={false}>
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                function: "faceswap",
                model: "FaceShifter",
              }}
            >
              <Form.Item
                label="上传目标人脸图片"
                name="target"
                tooltip="将被替换或编辑的目标人脸"
              >
                <Upload
                  listType="picture-card"
                  fileList={targetFile}
                  maxCount={1}
                  beforeUpload={(file) => {
                    setTargetFile([file as any]);
                    return false;
                  }}
                  onRemove={() => setTargetFile([])}
                >
                  {targetFile.length === 0 && (
                    <div>
                      <UploadOutlined />
                      <div style={{ marginTop: 8 }}>上传图片</div>
                    </div>
                  )}
                </Upload>
              </Form.Item>

              <Form.Item
                label="上传驱动人脸/视频"
                name="source"
                tooltip="用于替换的源人脸或驱动视频"
              >
                <Upload
                  listType="picture-card"
                  fileList={sourceFile}
                  maxCount={1}
                  beforeUpload={(file) => {
                    setSourceFile([file as any]);
                    return false;
                  }}
                  onRemove={() => setSourceFile([])}
                >
                  {sourceFile.length === 0 && (
                    <div>
                      <UploadOutlined />
                      <div style={{ marginTop: 8 }}>上传图片/视频</div>
                    </div>
                  )}
                </Upload>
              </Form.Item>

              <Form.Item
                label="功能选择"
                name="function"
                rules={[{ required: true, message: "请选择功能" }]}
              >
                <Radio.Group
                  onChange={(e) => {
                    const newType = e.target.value as FunctionType;
                    setFunctionType(newType);
                    form.setFieldsValue({
                      model: modelOptions[newType][0],
                    });
                  }}
                >
                  <Space direction="vertical">
                    <Radio value="faceswap">人脸替换（FaceSwap）</Radio>
                    <Radio value="fomm">人脸动画（FOMM）</Radio>
                    <Radio value="stargan">属性编辑（StarGAN）</Radio>
                  </Space>
                </Radio.Group>
              </Form.Item>

              <Form.Item
                label="模型选择"
                name="model"
                rules={[{ required: true, message: "请选择模型" }]}
              >
                <Select>
                  {modelOptions[functionType].map((model) => (
                    <Select.Option key={model} value={model}>
                      {model}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  size="large"
                  block
                  icon={<ThunderboltOutlined />}
                  loading={loading}
                  onClick={handleGenerate}
                >
                  {loading ? "生成中..." : "开始生成"}
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="生成结果" bordered={false}>
            {loading ? (
              <div style={{ textAlign: "center", padding: "80px 0" }}>
                <Spin size="large" />
                <Paragraph style={{ marginTop: 16, color: "#666" }}>
                  正在生成中，请稍候...
                </Paragraph>
              </div>
            ) : result ? (
              <div>
                <Image
                  src={result.imageUrl}
                  alt="生成结果"
                  style={{ width: "100%", borderRadius: 8 }}
                  fallback="https://via.placeholder.com/512x512?text=Generated+Result"
                />
                <Alert
                  message="生成成功"
                  description={result.message}
                  type="success"
                  showIcon
                  style={{ marginTop: 16 }}
                />
                <Space
                  style={{ marginTop: 16, width: "100%" }}
                  direction="vertical"
                >
                  <Button 
                    type="primary" 
                    block 
                    icon={<DownloadOutlined />}
                    onClick={handleDownload}
                  >
                    下载到本地
                  </Button>
                  <Button block onClick={handleSave}>
                    保存到内容管理
                  </Button>
                  <Button block onClick={() => setResult(null)}>
                    重新生成
                  </Button>
                </Space>
              </div>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding: "80px 20px",
                  background: "#fafafa",
                  borderRadius: 8,
                }}
              >
                <Paragraph style={{ color: "#999" }}>
                  请配置参数并点击"开始生成"按钮
                </Paragraph>
                <Paragraph style={{ color: "#999", fontSize: 12 }}>
                  生成结果将在此处显示
                </Paragraph>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DeepfakeGeneratePage;
