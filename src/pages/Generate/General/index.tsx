import { useState, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Tabs,
  Form,
  Input,
  Select,
  Button,
  Upload,
  Image,
  message,
  Spin,
  Typography,
  Space,
  Row,
  Col,
  Switch,
  Modal,
} from "antd";
import {
  ThunderboltOutlined,
  UploadOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import type { UploadFile } from "antd";
import request from "@/utils/request";
import { apiBase } from "@/utils/apiBase";

const { Title, Paragraph } = Typography;
const { TextArea } = Input;

interface ImageResult {
  imageUrl: string;
  message: string;
  /** 火山为 http(s) URL；本地 SD 多为 data:image/...;base64,... */
  format: "url" | "data_url";
}

const IMAGE_MODEL_OPTIONS = [
  { value: "volc", label: "seedream-5.0", endpoint: "/api/generate/image" },
  { value: "stable-diffusion", label: "Stable Diffusion", endpoint: "/api/generate/image-stable-diffusion" },
] as const;

function dataUrlToBlob(dataUrl: string): Blob {
  const m = dataUrl.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!m) throw new Error("无效的 data URL");
  const binary = atob(m[2].replace(/\s/g, ""));
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return new Blob([arr], { type: m[1] || "image/png" });
}

/** 火山返回 http(s)；ModelScope 应为 data:video/...，部分环境只给裸 base64，需补前缀才能被 <video> 识别 */
function normalizeVideoUrlFromApi(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  if (t.startsWith("http://") || t.startsWith("https://") || t.startsWith("data:")) return t;
  return `data:video/mp4;base64,${t.replace(/\s/g, "")}`;
}

const VIDEO_MODEL_OPTIONS = [
  { value: "volc", label: "火山引擎（方舟）", endpoint: "/api/generate/t2v" },
  { value: "modelscope", label: "ModelScope（自托管文生视频）", endpoint: "/api/generate/model-scope" },
] as const;

interface VideoResult {
  videoUrl: string;
  message: string;
  /** 火山多为 http(s) URL；ModelScope 代理返回 data:video/mp4;base64,... */
  format?: "url" | "data_url";
}

const GeneralGeneratePage = () => {
  const navigate = useNavigate();

  // ---------- 文生图 ----------
  const [imageForm] = Form.useForm();
  const imageModel = Form.useWatch("imageModel", imageForm);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageResult, setImageResult] = useState<ImageResult | null>(null);

  const handleImageGenerate = async () => {
    try {
      const values = await imageForm.validateFields();
      setImageLoading(true);
      setImageResult(null);
      const model = values.imageModel as string;
      const opt = IMAGE_MODEL_OPTIONS.find((o) => o.value === model);
      const endpoint = opt?.endpoint ?? "/api/generate/image";
      const res = await fetch(`${apiBase}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: values.prompt,
          size: values.size,
          watermark: !!values.watermark,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "请求失败");
      const rawUrl = typeof data.imageUrl === "string" ? data.imageUrl.trim() : "";
      if (!rawUrl) throw new Error("未返回图片数据");
      const isData =
        rawUrl.startsWith("data:") ||
        data.format === "data_url" ||
        (!rawUrl.startsWith("http://") && !rawUrl.startsWith("https://"));
      const imageUrl = isData && !rawUrl.startsWith("data:") ? `data:image/png;base64,${rawUrl}` : rawUrl;
      const format: "url" | "data_url" =
        imageUrl.startsWith("data:") || data.format === "data_url" ? "data_url" : "url";
      setImageResult({
        imageUrl,
        message: data.message || "图像生成成功！",
        format,
      });
      message.success("图像生成成功！");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "生成失败，请重试");
    } finally {
      setImageLoading(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!imageResult?.imageUrl) return;
    const ext = imageResult.format === "data_url" ? "png" : "jpg";
    try {
      message.loading("正在下载图像...", 0);
      let blob: Blob;
      if (imageResult.imageUrl.startsWith("data:")) {
        blob = dataUrlToBlob(imageResult.imageUrl);
      } else {
        const response = await fetch(imageResult.imageUrl);
        blob = await response.blob();
      }
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `ai-generated-image-${Date.now()}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      message.destroy();
      message.success("图像下载成功！");
    } catch {
      message.destroy();
      window.open(imageResult.imageUrl, "_blank");
      message.info("已在新标签页打开图像，请右键保存");
    }
  };

  const handleSaveImage = async () => {
    if (!imageResult?.imageUrl) return;
    try {
      const values = imageForm.getFieldsValue();
      await request.post("/data/save", {
        type: "image",
        title: `AI 图像生成 - ${(values.prompt || "").substring(0, 20)}...`,
        url: imageResult.imageUrl,
      });
      message.success({ content: "图像已保存！可在内容管理中查看", duration: 3 });
      setTimeout(() => navigate("/data/output"), 1500);
    } catch (error) {
      console.error("Save error:", error);
    }
  };

  const imageTab = (
    <Row gutter={24}>
      <Col xs={24} lg={12}>
        <Card title="文生图参数" bordered={false}>
          <Form form={imageForm} layout="vertical" initialValues={{ imageModel: "volc", size: "2K", watermark: true }}>
            <Form.Item
              label="生成模型"
              name="imageModel"
              tooltip="火山返回图片 URL；自托管 SD 返回 base64（data URL），由前端统一展示"
              rules={[{ required: true, message: "请选择模型" }]}
            >
              <Select>
                {IMAGE_MODEL_OPTIONS.map((o) => (
                  <Select.Option key={o.value} value={o.value}>
                    {o.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            {imageModel === "stable-diffusion" && (
              <Paragraph type="secondary" style={{ marginTop: -8, marginBottom: 8 }}>
                自托管服务由后端代理至 STABLE_DIFFUSION_SERVICE_URL（默认 8009）；水印开关仅对火山文生图生效。
              </Paragraph>
            )}
            <Form.Item label="提示词（Prompt）" name="prompt" rules={[{ required: true, message: "请输入提示词" }]}>
              <TextArea rows={4} placeholder="请输入提示词：悲伤的小狗" showCount maxLength={500} />
            </Form.Item>
            <Form.Item
              label="图像分辨率"
              name="size"
              tooltip="指定生成图像的分辨率"
              rules={[{ required: true, message: "请选择尺寸" }]}
            >
              <Select>
                <Select.Option value="1K">1K</Select.Option>
                <Select.Option value="2K">2K</Select.Option>
                <Select.Option value="4K">4K</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item label="水印" name="watermark" valuePropName="checked">
              <Switch checkedChildren="开启" unCheckedChildren="关闭" />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                size="large"
                block
                icon={<ThunderboltOutlined />}
                loading={imageLoading}
                onClick={handleImageGenerate}
              >
                {imageLoading ? "生成中..." : "生成图片"}
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </Col>
      <Col xs={24} lg={12}>
        <Card title="生成结果" bordered={false}>
          {imageLoading ? (
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <Spin size="large" />
              <Paragraph style={{ marginTop: 16, color: "#666" }}>正在生成图像，请稍候...</Paragraph>
            </div>
          ) : imageResult ? (
            <div>
              <Image src={imageResult.imageUrl} alt="生成的图像" style={{ width: "80%", borderRadius: 8 }} />
              <Space style={{ marginTop: 16, width: "100%" }} direction="vertical">
                <Button type="primary" block icon={<DownloadOutlined />} onClick={handleDownloadImage}>
                  下载到本地
                </Button>
                <Button block onClick={handleSaveImage}>
                  保存到内容管理
                </Button>
                <Button block onClick={() => setImageResult(null)}>
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
              <PictureOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />
              <Paragraph style={{ color: "#999", marginTop: 16 }}>图像将在生成后显示在这里</Paragraph>
            </div>
          )}
        </Card>
      </Col>
    </Row>
  );

  // ---------- 文生视频 ----------
  const [videoForm] = Form.useForm();
  const videoModel = Form.useWatch("videoModel", videoForm);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoResult, setVideoResult] = useState<VideoResult | null>(null);
  /** 超长 data URL 在部分浏览器作 video src 不稳定，预览用 Blob URL */
  const [videoPreviewSrc, setVideoPreviewSrc] = useState<string | null>(null);

  useLayoutEffect(() => {
    let objectUrl: string | undefined;
    const u = videoResult?.videoUrl;
    if (!u) {
      setVideoPreviewSrc(null);
      return;
    }
    if (u.startsWith("http://") || u.startsWith("https://")) {
      setVideoPreviewSrc(u);
      return;
    }
    if (u.startsWith("data:")) {
      try {
        const blob = dataUrlToBlob(u);
        objectUrl = URL.createObjectURL(blob);
        setVideoPreviewSrc(objectUrl);
      } catch {
        setVideoPreviewSrc(u);
      }
      return () => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      };
    }
    setVideoPreviewSrc(u);
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [videoResult?.videoUrl]);

  const handleVideoGenerate = async () => {
    try {
      const values = await videoForm.validateFields();
      setVideoLoading(true);
      setVideoResult(null);
      const model = values.videoModel as string;
      const opt = VIDEO_MODEL_OPTIONS.find((o) => o.value === model);
      const endpoint = opt?.endpoint ?? "/api/generate/t2v";
      const isModelScope = model === "modelscope";
      const bodyObj = isModelScope
        ? {
            prompt: values.prompt,
            num_frames: Number(values.t2vFrames) || 16,
            num_inference_steps: Number(values.t2vSteps) || 25,
          }
        : {
            prompt: values.prompt,
            ratio: values.ratio,
            duration: values.duration,
          };
      const res = await fetch(`${apiBase}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyObj),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "请求失败");
      const raw = typeof data.videoUrl === "string" ? data.videoUrl.trim() : "";
      if (!raw) throw new Error("未返回视频地址");
      const canonical = normalizeVideoUrlFromApi(raw);
      const fmt =
        data.format === "data_url" || data.format === "url"
          ? data.format
          : canonical.startsWith("data:")
            ? "data_url"
            : "url";
      setVideoResult({
        videoUrl: canonical,
        message: data.message || "视频生成成功！",
        format: fmt,
      });
      message.success("视频生成成功！");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "生成失败，请重试");
    } finally {
      setVideoLoading(false);
    }
  };

  const handleDownloadVideo = async () => {
    if (!videoResult?.videoUrl) return;
    try {
      message.loading("正在下载视频（可能需要较长时间）...", 0);
      let blob: Blob;
      if (videoResult.videoUrl.startsWith("data:")) {
        const m = videoResult.videoUrl.match(/^data:([^;]+);base64,([\s\S]+)$/);
        if (!m) throw new Error("无效的 data URL");
        const binary = atob(m[2].replace(/\s/g, ""));
        const arr = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
        blob = new Blob([arr], { type: m[1] || "video/mp4" });
      } else {
        const response = await fetch(videoResult.videoUrl);
        blob = await response.blob();
      }
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `ai-generated-video-${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      message.destroy();
      message.success("视频下载成功！");
    } catch {
      message.destroy();
      window.open(videoResult.videoUrl, "_blank");
      message.info("已在新标签页打开视频，请右键保存");
    }
  };

  const handleSaveVideo = async () => {
    if (!videoResult?.videoUrl) return;
    try {
      const values = videoForm.getFieldsValue();
      await request.post("/data/save", {
        type: "video",
        title: `AI 视频生成 - ${(values.prompt || "").substring(0, 20)}...`,
        url: videoResult.videoUrl,
      });
      message.success({ content: "视频已保存！可在内容管理中查看", duration: 3 });
      setTimeout(() => navigate("/data/output"), 1500);
    } catch (error) {
      console.error("Save error:", error);
    }
  };

  const videoTab = (
    <Row gutter={24}>
      <Col xs={24} lg={12}>
        <Card title="文生视频参数" bordered={false}>
          <Form
            form={videoForm}
            layout="vertical"
            initialValues={{
              videoModel: "volc",
              duration: "5",
              ratio: "16:9",
              t2vFrames: "16",
              t2vSteps: "25",
            }}
          >
            <Form.Item
              label="生成模型"
              name="videoModel"
              tooltip="火山返回可播放 URL；ModelScope（8011）经 Node 代理返回 data:video/mp4;base64"
              rules={[{ required: true, message: "请选择模型" }]}
            >
              <Select>
                {VIDEO_MODEL_OPTIONS.map((o) => (
                  <Select.Option key={o.value} value={o.value}>
                    {o.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            {videoModel === "modelscope" && (
              <Paragraph type="secondary" style={{ marginTop: -8, marginBottom: 8 }}>
                与文生图里选 Stable Diffusion 类似：由后端转发至 MODELSCOPE_T2V_URL（默认 8011）。参数对应
                server.py：prompt、num_frames(4–24)、num_inference_steps(10–50)。
              </Paragraph>
            )}
            <Form.Item label="提示词（Prompt）" name="prompt" rules={[{ required: true, message: "请输入提示词" }]}>
              <TextArea
                rows={4}
                placeholder="写实风格，晴朗的蓝天之下，一大片白色的雏菊花田，镜头逐渐拉近..."
                showCount
                maxLength={500}
              />
            </Form.Item>
            {videoModel !== "modelscope" && (
              <Form.Item label="画幅比例" name="ratio">
                <Select>
                  <Select.Option value="16:9">16:9</Select.Option>
                  <Select.Option value="1:1">1:1</Select.Option>
                  <Select.Option value="9:16">9:16</Select.Option>
                </Select>
              </Form.Item>
            )}
            {videoModel === "modelscope" ? (
              <>
                <Form.Item
                  label="视频帧数 num_frames"
                  name="t2vFrames"
                  rules={[{ required: true, message: "请选择帧数" }]}
                  tooltip="服务端限制 4–24，导出约 fps=8"
                >
                  <Select>
                    <Select.Option value="8">8 帧</Select.Option>
                    <Select.Option value="16">16 帧（约 2 秒）</Select.Option>
                    <Select.Option value="24">24 帧（约 3 秒）</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item
                  label="推理步数 num_inference_steps"
                  name="t2vSteps"
                  rules={[{ required: true, message: "请选择步数" }]}
                  tooltip="10–50，越大越慢、质量可能略好"
                >
                  <Select>
                    <Select.Option value="15">15（较快）</Select.Option>
                    <Select.Option value="25">25（默认）</Select.Option>
                    <Select.Option value="35">35</Select.Option>
                  </Select>
                </Form.Item>
              </>
            ) : (
              <Form.Item label="生成时长（秒）" name="duration" rules={[{ required: true, message: "请选择时长" }]}>
                <Select>
                  <Select.Option value="3">3 秒</Select.Option>
                  <Select.Option value="5">5 秒</Select.Option>
                  <Select.Option value="8">8 秒</Select.Option>
                  <Select.Option value="12">12 秒</Select.Option>
                </Select>
              </Form.Item>
            )}
            <Form.Item>
              <Button
                type="primary"
                size="large"
                block
                icon={<ThunderboltOutlined />}
                loading={videoLoading}
                onClick={handleVideoGenerate}
              >
                {videoLoading ? "生成中..." : "生成视频"}
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </Col>
      <Col xs={24} lg={12}>
        <Card title="生成结果" bordered={false}>
          {videoLoading ? (
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <Spin size="large" />
              <Paragraph style={{ marginTop: 16, color: "#666" }}>正在生成视频，这可能需要较长时间...</Paragraph>
            </div>
          ) : videoResult ? (
            <div>
              <video
                key={videoPreviewSrc || videoResult.videoUrl}
                src={videoPreviewSrc || videoResult.videoUrl}
                controls
                style={{ width: "100%", borderRadius: 8 }}
              >
                您的浏览器不支持视频播放
              </video>
              <Space style={{ marginTop: 16, width: "100%" }} direction="vertical">
                <Button type="primary" block icon={<DownloadOutlined />} onClick={handleDownloadVideo}>
                  下载到本地
                </Button>
                <Button block onClick={handleSaveVideo}>
                  保存到内容管理
                </Button>
                <Button block onClick={() => setVideoResult(null)}>
                  重新生成
                </Button>
              </Space>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "80px 20px", background: "#fafafa", borderRadius: 8 }}>
              <VideoCameraOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />
              <Paragraph style={{ color: "#999", marginTop: 16 }}>视频将在生成后显示在这里</Paragraph>
            </div>
          )}
        </Card>
      </Col>
    </Row>
  );

  // ---------- 图生视频 ----------
  const [i2vForm] = Form.useForm();
  const [i2vLoading, setI2vLoading] = useState(false);
  const [i2vResult, setI2vResult] = useState<VideoResult | null>(null);
  const [i2vRefImages, setI2vRefImages] = useState<UploadFile[]>([]);
  const [uploadPreviewOpen, setUploadPreviewOpen] = useState(false);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState("");

  const handleUploadPreview = async (file: UploadFile) => {
    let url = file.url ?? file.thumbUrl ?? "";
    if (!url && file.originFileObj) {
      url = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.readAsDataURL(file.originFileObj as Blob);
      });
    }
    if (url) {
      setUploadPreviewUrl(url);
      setUploadPreviewOpen(true);
    }
  };

  const handleI2VGenerate = async () => {
    try {
      await i2vForm.validateFields();
      if (!i2vRefImages?.length) {
        message.error("请上传至少一张参考图");
        return;
      }
      setI2vLoading(true);
      setI2vResult(null);

      const fileToBase64 = (file: File): Promise<string> =>
        new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => {
            const s = (r.result as string) || "";
            resolve(s.indexOf(",") >= 0 ? s.split(",")[1] : s);
          };
          r.onerror = reject;
          r.readAsDataURL(file);
        });

      const imageBase64List: string[] = [];
      for (const item of i2vRefImages) {
        const file = item.originFileObj ?? (item as unknown as File);
        if (file && file instanceof File) {
          imageBase64List.push(await fileToBase64(file));
        }
      }
      if (imageBase64List.length === 0) {
        message.error("无法读取参考图，请重新上传");
        setI2vLoading(false);
        return;
      }

      const values = i2vForm.getFieldsValue();
      const res = await fetch(`${apiBase}/api/generate/i2v`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: values.prompt,
          imageBase64List,
          ratio: values.ratio,
          duration: values.duration,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "请求失败");
      setI2vResult({ videoUrl: data.videoUrl, message: data.message || "视频生成成功！" });
      message.success("视频生成成功！");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "生成失败，请重试");
    } finally {
      setI2vLoading(false);
    }
  };

  const handleDownloadI2VVideo = async () => {
    if (!i2vResult?.videoUrl) return;
    try {
      message.loading("正在下载视频...", 0);
      const response = await fetch(i2vResult.videoUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `ai-i2v-video-${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      message.destroy();
      message.success("视频下载成功！");
    } catch {
      message.destroy();
      window.open(i2vResult.videoUrl, "_blank");
      message.info("已在新标签页打开，请右键保存");
    }
  };

  const handleSaveI2VVideo = async () => {
    if (!i2vResult?.videoUrl) return;
    try {
      const values = i2vForm.getFieldsValue();
      await request.post("/data/save", {
        type: "video",
        title: `AI 图生视频 - ${(values.prompt || "").substring(0, 20)}...`,
        url: i2vResult.videoUrl,
      });
      message.success({ content: "已保存到内容管理", duration: 3 });
      setTimeout(() => navigate("/data/output"), 1500);
    } catch (error) {
      console.error("Save error:", error);
    }
  };

  const i2vTab = (
    <Row gutter={24}>
      <Col xs={24} lg={12}>
        <Card title="图生视频参数" bordered={false}>
          <Form form={i2vForm} layout="vertical" initialValues={{ duration: "5", ratio: "16:9" }}>
            <Form.Item
              label="提示词（Prompt）"
              name="prompt"
              rules={[{ required: true, message: "请输入描述，如 [图1]... [图2]..." }]}
            >
              <TextArea
                rows={4}
                placeholder="例：[图1]戴着眼镜的男生和[图2]的柯基小狗，坐在[图3]的草坪上，3D卡通风格"
                showCount
                maxLength={500}
              />
            </Form.Item>
            <Form.Item label="参考图片" required tooltip="按顺序对应提示词中的 [图1][图2]…，最多 4 张">
              <Upload
                listType="picture-card"
                fileList={i2vRefImages}
                maxCount={4}
                beforeUpload={(file) => {
                  setI2vRefImages((prev) =>
                    [
                      ...prev,
                      {
                        uid: `${Date.now()}-${file.name}`,
                        name: file.name,
                        status: "done" as const,
                        originFileObj: file,
                      } as UploadFile,
                    ].slice(0, 4),
                  );
                  return false;
                }}
                onRemove={(file) => setI2vRefImages((prev) => prev.filter((f) => f.uid !== file.uid))}
                onPreview={handleUploadPreview}
              >
                {i2vRefImages.length < 4 && (
                  <div>
                    <UploadOutlined />
                    <div style={{ marginTop: 8 }}>上传参考图（1～4 张）</div>
                  </div>
                )}
              </Upload>
            </Form.Item>
            <Form.Item label="画幅比例" name="ratio">
              <Select>
                <Select.Option value="16:9">16:9</Select.Option>
                <Select.Option value="1:1">1:1</Select.Option>
                <Select.Option value="9:16">9:16</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item label="生成时长（秒）" name="duration" rules={[{ required: true }]}>
              <Select>
                <Select.Option value="5">5 秒</Select.Option>
                <Select.Option value="2">2 秒</Select.Option>
                <Select.Option value="4">4 秒</Select.Option>
                <Select.Option value="6">6 秒</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                size="large"
                block
                icon={<ThunderboltOutlined />}
                loading={i2vLoading}
                onClick={handleI2VGenerate}
              >
                {i2vLoading ? "生成中..." : "生成视频"}
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </Col>
      <Col xs={24} lg={12}>
        <Card title="生成结果" bordered={false}>
          {i2vLoading ? (
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <Spin size="large" />
              <Paragraph style={{ marginTop: 16, color: "#666" }}>正在生成视频，请稍候...</Paragraph>
            </div>
          ) : i2vResult ? (
            <div>
              <video src={i2vResult.videoUrl} controls style={{ width: "100%", borderRadius: 8 }}>
                您的浏览器不支持视频播放
              </video>
              <Space style={{ marginTop: 16, width: "100%" }} direction="vertical">
                <Button type="primary" block icon={<DownloadOutlined />} onClick={handleDownloadI2VVideo}>
                  下载到本地
                </Button>
                <Button block onClick={handleSaveI2VVideo}>
                  保存到内容管理
                </Button>
                <Button block onClick={() => setI2vResult(null)}>
                  重新生成
                </Button>
              </Space>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "80px 20px", background: "#fafafa", borderRadius: 8 }}>
              <VideoCameraOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />
              <Paragraph style={{ color: "#999", marginTop: 16 }}>图生视频结果将显示在这里</Paragraph>
            </div>
          )}
        </Card>
      </Col>
    </Row>
  );

  // ---------- 页面 ----------
  return (
    <div className="page-transition">
      <div className="page-header">
        <Title level={2} className="page-title">
          多模态内容生成
        </Title>
        <Paragraph className="page-description">
          基于多模态大模型，支持文生图、文生视频、图生视频。输入文本或图像即可生成对应媒体，适用于安全研究、检测数据构建与效果评估。
        </Paragraph>
      </div>

      <Tabs
        defaultActiveKey="image"
        size="large"
        items={[
          {
            key: "image",
            label: (
              <span>
                <PictureOutlined /> 文生图
              </span>
            ),
            children: imageTab,
          },
          {
            key: "t2v",
            label: (
              <span>
                <VideoCameraOutlined /> 文生视频
              </span>
            ),
            children: videoTab,
          },
          {
            key: "i2v",
            label: (
              <span>
                <VideoCameraOutlined /> 图生视频
              </span>
            ),
            children: i2vTab,
          },
        ]}
      />

      <Modal
        title="预览"
        open={uploadPreviewOpen}
        footer={null}
        onCancel={() => setUploadPreviewOpen(false)}
        width="80%"
        style={{ maxWidth: 800 }}
        centered
      >
        {uploadPreviewUrl && <img src={uploadPreviewUrl} alt="预览" style={{ width: "100%", display: "block" }} />}
      </Modal>
    </div>
  );
};

export default GeneralGeneratePage;
