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
import { UploadOutlined, ThunderboltOutlined } from "@ant-design/icons";
import type { UploadFile } from "antd";
import request from "@/utils/request";

const { Title, Paragraph } = Typography;

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
      const formData = new FormData();
      formData.append("target", targetFile[0].originFileObj as File);
      formData.append("source", sourceFile[0].originFileObj as File);
      formData.append("function", values.function);
      formData.append("model", values.model);

      const response: any = await request.post("/generate/deepfake", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setResult(response);
      message.success("生成成功！");
    } catch (error) {
      console.error("Generate error:", error);
    } finally {
      setLoading(false);
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
                    setFunctionType(e.target.value);
                    form.setFieldsValue({
                      model: modelOptions[e.target.value][0],
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
                  <Button type="primary" block onClick={handleSave}>
                    保存到内容管理
                  </Button>
                  <Button block>下载结果</Button>
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
