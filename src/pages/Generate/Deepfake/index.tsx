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
  Input,
} from "antd";
import { UploadOutlined, ThunderboltOutlined, DownloadOutlined } from "@ant-design/icons";
import type { UploadFile } from "antd";
import request from "@/utils/request";

const { Title, Paragraph } = Typography;
const { TextArea } = Input;

type FunctionType = "faceswap" | "fomm" | "stargan";
type ModelType =
  | "FaceShifter"
  | "SimSwap"
  | "DeepFaceLab"
  | "FaceSwap-GAN"
  | "FOMM"
  | "Face2Face"
  | "Wav2Lip"
  | "LivePortrait"
  | "StarGAN"
  | "StarGAN-v2"
  | "AttGAN"
  | "STGAN";

interface GenerateResult {
  imageUrl?: string;
  videoUrl?: string;
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
    faceswap: ["FaceShifter", "SimSwap", "DeepFaceLab", "FaceSwap-GAN"],
    fomm: ["FOMM", "Face2Face", "Wav2Lip", "LivePortrait"],
    stargan: ["StarGAN", "StarGAN-v2", "AttGAN", "STGAN"],
  };

  /** 安全解析 JSON 响应，避免空 body 导致 Unexpected end of JSON input */
  const parseJsonResponse = async (res: Response): Promise<Record<string, unknown>> => {
    const text = await res.text();
    if (!text.trim()) {
      throw new Error(res.ok ? "未返回有效数据" : `请求失败 ${res.status}，请检查后端服务是否启动`);
    }
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new Error(res.ok ? "返回格式异常" : `请求失败 ${res.status}，请检查后端服务`);
    }
  };

  const getBase64FromUploadFile = (file: UploadFile): Promise<string> => {
    const dataUrl = (file as any).url;
    if (typeof dataUrl === "string" && dataUrl.indexOf(",") >= 0) {
      return Promise.resolve(dataUrl.split(",")[1] || "");
    }
    const raw = (file as any).originFileObj;
    if (!(raw instanceof File)) return Promise.resolve("");
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const s = (reader.result as string) || "";
        resolve(s.indexOf(",") >= 0 ? s.split(",")[1] : s);
      };
      reader.onerror = reject;
      reader.readAsDataURL(raw);
    });
  };

  const handleGenerate = async () => {
    try {
      await form.validateFields();
      const values = form.getFieldsValue();

      if (targetFile.length === 0) {
        message.warning("请上传目标人脸图片");
        return;
      }

      if (values.function === "faceswap" && sourceFile.length === 0) {
        message.warning("请上传驱动人脸");
        return;
      }

      setLoading(true);
      setResult(null);

      if (values.function === "faceswap") {
        const targetBase64 = await getBase64FromUploadFile(targetFile[0]);
        const sourceBase64 = await getBase64FromUploadFile(sourceFile[0]);
        if (!targetBase64 || !sourceBase64) {
          message.error("无法读取图片，请重新上传");
          setLoading(false);
          return;
        }
        // 接口约定：image_base64=目标图（被换脸的那张），template_base64=模版（要换上去的脸）
        const res = await fetch("/api/generate/faceswap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: targetBase64,
            templateBase64: sourceBase64,
          }),
        });
        const data = await parseJsonResponse(res);
        if (!res.ok) {
          throw new Error((data.error as string) || "人脸替换请求失败");
        }
        setResult({
          imageUrl: (data.imageUrl as string) || "",
          message: (data.message as string) || "人脸替换完成。",
        });
        message.success("生成成功！");
        return;
      }

      if (values.function === "fomm") {
        const imageBase64 = await getBase64FromUploadFile(targetFile[0]);
        if (!imageBase64) {
          message.error("无法读取目标人脸图片，请重新上传");
          setLoading(false);
          return;
        }
        const prompt = (values.fommPrompt ?? "").trim() || "让图中人脸做自然的微笑和轻微点头动作";
        const res = await fetch("/api/generate/fomm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64, prompt }),
        });
        const data = await parseJsonResponse(res);
        if (!res.ok) {
          throw new Error((data.error as string) || "人脸动画请求失败");
        }
        setResult({
          videoUrl: (data.videoUrl as string) || "",
          message: (data.message as string) || "人脸动画视频生成成功。",
        });
        message.success("生成成功！");
        return;
      }

      if (values.function === "stargan") {
        const editPrompt = (values.editPrompt ?? "").trim();
        if (!editPrompt) {
          message.warning("请输入编辑指令");
          setLoading(false);
          return;
        }
        const imageBase64 = await getBase64FromUploadFile(targetFile[0]);
        if (!imageBase64) {
          message.error("无法读取图片，请重新上传");
          setLoading(false);
          return;
        }
        const res = await fetch("/api/generate/seededit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: editPrompt, imageBase64 }),
        });
        const data = await parseJsonResponse(res);
        if (!res.ok) {
          throw new Error((data.error as string) || "属性编辑请求失败");
        }
        setResult({
          imageUrl: (data.imageUrl as string) || "",
          message: (data.message as string) || "属性编辑完成。",
        });
        message.success("生成成功！");
        return;
      }
    } catch (error) {
      console.error("Generate error:", error);
      message.error(error instanceof Error ? error.message : "生成失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    const url = result?.videoUrl ?? result?.imageUrl;
    if (!url) return;

    const values = form.getFieldsValue();
    const functionName = values.function === "faceswap" ? "faceswap" : values.function === "fomm" ? "fomm" : "stargan";
    const isVideo = !!result?.videoUrl;

    try {
      message.loading("正在下载...", 0);
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `deepfake-${functionName}-${Date.now()}.${isVideo ? "mp4" : "jpg"}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      message.destroy();
      message.success("下载成功！");
    } catch (error) {
      message.destroy();
      console.error("Download error:", error);
      window.open(url, "_blank");
      message.info(isVideo ? "已在新标签页打开视频，请右键另存为" : "已在新标签页打开图片，请右键保存");
    }
  };

  const handleSave = async () => {
    try {
      const values = form.getFieldsValue();
      const saveUrl = result?.videoUrl ?? result?.imageUrl;
      if (!saveUrl) return;
      await request.post("/data/save", {
        type: result?.videoUrl ? "video" : "image",
        title: `Deepfake ${
          values.function === "faceswap" ? "人脸替换" : values.function === "fomm" ? "人脸动画" : "属性编辑"
        }`,
        url: saveUrl,
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
          提供多种基于人脸图像的深度伪造生成能力。人脸替换：将驱动人脸融合到目标图中，实现换脸；人脸动画：基于单张人脸图与动作描述，生成带表情与动作的短视频（图生视频）；属性编辑：在保持身份不变的前提下，按文本指令修改人脸属性（如发型、肤色等）。以上功能仅供学术研究与深度伪造检测等安全测试使用，请勿用于造假、欺诈等非法用途。
        </Paragraph>
      </div>

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
              <Form.Item label="上传目标人脸图片" name="target" tooltip="将被替换或编辑的目标人脸">
                <Upload
                  accept="image/jpeg,image/png,image/jpg"
                  listType="picture-card"
                  fileList={targetFile}
                  maxCount={1}
                  beforeUpload={(file) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                      setTargetFile([
                        {
                          uid: file.uid,
                          name: file.name,
                          status: "done",
                          url: e.target?.result as string,
                          originFileObj: file,
                        } as any,
                      ]);
                    };
                    reader.readAsDataURL(file);
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

              {functionType === "faceswap" && (
                <Form.Item label="上传驱动人脸" name="source" tooltip="用于替换的源人脸图片">
                  <Upload
                    accept="image/jpeg,image/png,image/jpg"
                    listType="picture-card"
                    fileList={sourceFile}
                    maxCount={1}
                    beforeUpload={(file) => {
                      const reader = new FileReader();
                      reader.onload = (e) => {
                        setSourceFile([
                          {
                            uid: file.uid,
                            name: file.name,
                            status: "done",
                            url: e.target?.result as string,
                            originFileObj: file,
                          } as any,
                        ]);
                      };
                      reader.readAsDataURL(file);
                      return false;
                    }}
                    onRemove={() => setSourceFile([])}
                  >
                    {sourceFile.length === 0 && (
                      <div>
                        <UploadOutlined />
                        <div style={{ marginTop: 8 }}>上传图片</div>
                      </div>
                    )}
                  </Upload>
                </Form.Item>
              )}

              {functionType === "fomm" && (
                <Form.Item
                  label="动作描述"
                  name="fommPrompt"
                  tooltip="描述希望人脸做的动作，如：微笑、点头、说话。留空则使用默认自然微动"
                >
                  <TextArea rows={2} placeholder="让图中人脸做自然的微笑和轻微点头动作" maxLength={300} showCount />
                </Form.Item>
              )}

              {functionType === "stargan" && (
                <>
                  <Form.Item
                    label="编辑指令"
                    name="editPrompt"
                    rules={[{ required: true, message: "请输入编辑指令" }]}
                    tooltip="用自然语言描述要对图片做的修改，如：把头发改成红色、加一副眼镜、换成微笑表情"
                  >
                    <TextArea rows={3} placeholder="例如：把头发改成黑色，保持人脸不变" maxLength={500} showCount />
                  </Form.Item>
                </>
              )}

              <Form.Item label="功能选择" name="function" rules={[{ required: true, message: "请选择功能" }]}>
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
                    <Radio value="faceswap">人脸替换（Face Swapping）</Radio>
                    <Radio value="fomm">人脸动画（Face Reenactment）</Radio>
                    <Radio value="stargan">属性编辑（Attribute Editing）</Radio>
                  </Space>
                </Radio.Group>
              </Form.Item>

              <Form.Item label="模型选择" name="model" rules={[{ required: true, message: "请选择模型" }]}>
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
                <Paragraph style={{ marginTop: 16, color: "#666" }}>正在生成中，请稍候...</Paragraph>
              </div>
            ) : result ? (
              <div>
                {result.videoUrl ? (
                  <video
                    src={result.videoUrl}
                    controls
                    style={{ width: "100%", borderRadius: 8 }}
                    title="人脸动画结果"
                  />
                ) : result.imageUrl ? (
                  <Image
                    src={result.imageUrl}
                    alt="生成结果"
                    style={{ width: "100%", borderRadius: 8 }}
                    fallback="https://via.placeholder.com/512x512?text=Generated+Result"
                  />
                ) : null}
                <Alert
                  message="生成成功"
                  description={result.message}
                  type="success"
                  showIcon
                  style={{ marginTop: 16 }}
                />
                <Space style={{ marginTop: 16, width: "100%" }} direction="vertical">
                  <Button type="primary" block icon={<DownloadOutlined />} onClick={handleDownload}>
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
                <Paragraph style={{ color: "#999" }}>请配置参数并点击"开始生成"按钮</Paragraph>
                <Paragraph style={{ color: "#999", fontSize: 12 }}>生成结果将在此处显示</Paragraph>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DeepfakeGeneratePage;
