import { useState } from "react";
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

const { Title, Paragraph } = Typography;
const { TextArea } = Input;

const VOLC_ARK_API_KEY = (import.meta.env.VITE_VOLC_ARK_API_KEY ?? "").trim();
const VOLC_ARK_BASE = "https://ark.cn-beijing.volces.com/api/v3";
const VOLC_ARK_URL = `${VOLC_ARK_BASE}/images/generations`;
const VOLC_ARK_MODEL = "doubao-seedream-4-0-250828";
const VOLC_ARK_T2V_MODEL = "doubao-seedance-1-0-lite-t2v-250428";
const VOLC_ARK_I2V_MODEL = "doubao-seedance-1-0-lite-i2v-250428";

interface ImageResult {
  imageUrl: string;
  message: string;
}

interface VideoResult {
  videoUrl: string;
  message: string;
}

const GeneralGeneratePage = () => {
  const navigate = useNavigate();
  const [imageForm] = Form.useForm();
  const [videoForm] = Form.useForm();
  const [i2vForm] = Form.useForm();
  const [imageLoading, setImageLoading] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [i2vLoading, setI2vLoading] = useState(false);
  const [imageResult, setImageResult] = useState<ImageResult | null>(null);
  const [videoResult, setVideoResult] = useState<VideoResult | null>(null);
  const [i2vResult, setI2vResult] = useState<VideoResult | null>(null);
  const [i2vRefImages, setI2vRefImages] = useState<UploadFile[]>([]);

  const handleImageGenerate = async () => {
    try {
      if (!VOLC_ARK_API_KEY) {
        message.error("请配置 .env.local 中的 VITE_VOLC_ARK_API_KEY");
        return;
      }
      const values = await imageForm.validateFields();
      setImageLoading(true);
      setImageResult(null);

      const res = await fetch(VOLC_ARK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${VOLC_ARK_API_KEY}`,
        },
        body: JSON.stringify({
          model: VOLC_ARK_MODEL,
          prompt: values.prompt,
          size: values.size,
          n: 1,
          response_format: "url",
          watermark: !!values.watermark,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `请求失败 ${res.status}`);
      }

      const data = await res.json();
      const imageUrl = data?.data?.[0]?.url;
      if (!imageUrl) throw new Error("未返回图片地址");

      setImageResult({
        imageUrl,
        message: "图像生成成功！",
      });
      message.success("图像生成成功！");
    } catch (error) {
      console.error("Generate error:", error);
      message.error(error instanceof Error ? error.message : "生成失败，请重试");
    } finally {
      setImageLoading(false);
    }
  };

  /** 轮询视频任务直到完成，返回 videoUrl 或抛错 */
  const pollVideoTask = async (taskId: string): Promise<string> => {
    const maxAttempts = 120;
    const pollInterval = 3000;
    for (let i = 0; i < maxAttempts; i++) {
      const getRes = await fetch(`${VOLC_ARK_BASE}/contents/generations/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${VOLC_ARK_API_KEY}` },
      });
      if (!getRes.ok) throw new Error(`查询任务失败 ${getRes.status}`);
      const taskData = await getRes.json();
      const status = taskData?.status;
      if (status === "succeeded") {
        const videoUrl = taskData?.content?.video_url ?? taskData?.output?.video_url;
        if (!videoUrl) throw new Error("未返回视频地址");
        return videoUrl;
      }
      if (status === "failed") {
        const errMsg = taskData?.error?.message ?? taskData?.message ?? "生成失败";
        throw new Error(errMsg);
      }
      await new Promise((r) => setTimeout(r, pollInterval));
    }
    throw new Error("生成超时，请稍后在内容管理中查看");
  };

  const handleVideoGenerate = async () => {
    try {
      if (!VOLC_ARK_API_KEY) {
        message.error("请配置 .env.local 中的 VITE_VOLC_ARK_API_KEY");
        return;
      }
      const values = await videoForm.validateFields();
      setVideoLoading(true);
      setVideoResult(null);

      const createRes = await fetch(`${VOLC_ARK_BASE}/contents/generations/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${VOLC_ARK_API_KEY}`,
        },
        body: JSON.stringify({
          model: VOLC_ARK_T2V_MODEL,
          content: [{ type: "text", text: values.prompt }],
          ratio: values.ratio || "16:9",
          duration: Number(values.duration) || 5,
        }),
      });
      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}));
        throw new Error(err?.error?.message || `创建任务失败 ${createRes.status}`);
      }
      const createData = await createRes.json();
      const taskId = createData?.id;
      if (!taskId) throw new Error("未返回任务 ID");

      const videoUrl = await pollVideoTask(taskId);
      setVideoResult({ videoUrl, message: "视频生成成功！" });
      message.success("视频生成成功！");
    } catch (error) {
      console.error("Generate error:", error);
      message.error(error instanceof Error ? error.message : "生成失败，请重试");
    } finally {
      setVideoLoading(false);
    }
  };

  const handleI2VGenerate = async () => {
    try {
      if (!VOLC_ARK_API_KEY) {
        message.error("请配置 .env.local 中的 VITE_VOLC_ARK_API_KEY");
        return;
      }
      const values = await i2vForm.validateFields();
      if (!i2vRefImages?.length) {
        message.error("请上传至少一张参考图");
        return;
      }
      setI2vLoading(true);
      setI2vResult(null);

      const fileToDataUrl = (file: File): Promise<string> =>
        new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result as string);
          r.onerror = reject;
          r.readAsDataURL(file);
        });

      const content: Array<{ type: string; text?: string; image_url?: { url: string }; role?: string }> = [
        { type: "text", text: values.prompt },
      ];
      for (const item of i2vRefImages) {
        const file = item.originFileObj ?? (item as unknown as File);
        if (!file || !(file instanceof File)) continue;
        const url = await fileToDataUrl(file);
        content.push({ type: "image_url", image_url: { url }, role: "reference_image" });
      }

      const createRes = await fetch(`${VOLC_ARK_BASE}/contents/generations/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${VOLC_ARK_API_KEY}`,
        },
        body: JSON.stringify({
          model: VOLC_ARK_I2V_MODEL,
          content,
          ratio: values.ratio || "16:9",
          duration: Number(values.duration) || 5,
        }),
      });
      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}));
        throw new Error(err?.error?.message || `创建任务失败 ${createRes.status}`);
      }
      const createData = await createRes.json();
      const taskId = createData?.id;
      if (!taskId) throw new Error("未返回任务 ID");

      const videoUrl = await pollVideoTask(taskId);
      setI2vResult({ videoUrl, message: "视频生成成功！" });
      message.success("视频生成成功！");
    } catch (error) {
      console.error("I2V error:", error);
      message.error(error instanceof Error ? error.message : "生成失败，请重试");
    } finally {
      setI2vLoading(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!imageResult?.imageUrl) return;

    try {
      message.loading("正在下载图像...", 0);

      // 使用 fetch 获取图片数据
      const response = await fetch(imageResult.imageUrl);
      const blob = await response.blob();

      // 创建 blob URL 并下载
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `ai-generated-image-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 清理 blob URL
      URL.revokeObjectURL(blobUrl);

      message.destroy();
      message.success("图像下载成功！");
    } catch (error) {
      message.destroy();
      console.error("Download error:", error);
      window.open(imageResult.imageUrl, "_blank");
      message.info("已在新标签页打开图像，请右键保存");
    }
  };

  const handleSaveImage = async () => {
    try {
      const values = imageForm.getFieldsValue();
      await request.post("/data/save", {
        type: "image",
        title: `AI 图像生成 - ${values.prompt.substring(0, 20)}...`,
        url: imageResult?.imageUrl,
      });
      message.success({
        content: "图像已保存！可在内容管理中查看",
        duration: 3,
      });
      setTimeout(() => {
        navigate("/data/output");
      }, 1500);
    } catch (error) {
      console.error("Save error:", error);
    }
  };

  const handleDownloadVideo = async () => {
    if (!videoResult?.videoUrl) return;

    try {
      message.loading("正在下载视频（可能需要较长时间）...", 0);

      // 使用 fetch 获取视频数据
      const response = await fetch(videoResult.videoUrl);
      const blob = await response.blob();

      // 创建 blob URL 并下载
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `ai-generated-video-${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 清理 blob URL
      URL.revokeObjectURL(blobUrl);

      message.destroy();
      message.success("视频下载成功！");
    } catch (error) {
      message.destroy();
      console.error("Download error:", error);
      window.open(videoResult.videoUrl, "_blank");
      message.info("已在新标签页打开视频，请右键保存");
    }
  };

  const handleSaveVideo = async () => {
    try {
      const values = videoForm.getFieldsValue();
      await request.post("/data/save", {
        type: "video",
        title: `AI 视频生成 - ${values.prompt.substring(0, 20)}...`,
        url: videoResult?.videoUrl,
      });
      message.success({
        content: "视频已保存！可在内容管理中查看",
        duration: 3,
      });
      setTimeout(() => {
        navigate("/data/output");
      }, 1500);
    } catch (error) {
      console.error("Save error:", error);
    }
  };

  const imageTab = (
    <Row gutter={24}>
      <Col xs={24} lg={12}>
        <Card title="图像生成配置" bordered={false}>
          <Form form={imageForm} layout="vertical" initialValues={{ size: "2K", watermark: true }}>
            <Form.Item label="提示词（Prompt）" name="prompt" rules={[{ required: true, message: "请输入提示词" }]}>
              <TextArea rows={4} placeholder="请输入提提示词：悲伤的小狗" showCount maxLength={500} />
            </Form.Item>

            <Form.Item
              label="图像分辨率"
              name="size"
              tooltip="指定生成图像的分辨率，可在 prompt 中用自然语言描述图片宽高比、图片形状或图片用途，最终由模型判断生成图片的大小"
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
              <Image src={imageResult.imageUrl} alt="生成的图像" style={{ width: "100%", borderRadius: 8 }} />
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

  const videoTab = (
    <Row gutter={24}>
      <Col xs={24} lg={12}>
        <Card title="文生视频配置" bordered={false}>
          <Form form={videoForm} layout="vertical" initialValues={{ duration: "5", ratio: "16:9" }}>
            <Form.Item label="提示词（Prompt）" name="prompt" rules={[{ required: true, message: "请输入提示词" }]}>
              <TextArea
                rows={4}
                placeholder="写实风格，晴朗的蓝天之下，一大片白色的雏菊花田，镜头逐渐拉近..."
                showCount
                maxLength={500}
              />
            </Form.Item>
            <Form.Item label="画幅比例" name="ratio">
              <Select>
                <Select.Option value="16:9">16:9</Select.Option>
                <Select.Option value="1:1">1:1</Select.Option>
                <Select.Option value="9:16">9:16</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item label="生成时长（秒）" name="duration" rules={[{ required: true, message: "请选择时长" }]}>
              <Select>
                <Select.Option value="3">3 秒</Select.Option>
                <Select.Option value="5">5 秒</Select.Option>
                <Select.Option value="8">8 秒</Select.Option>
                <Select.Option value="12">12 秒</Select.Option>
              </Select>
            </Form.Item>
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
              <video src={videoResult.videoUrl} controls style={{ width: "100%", borderRadius: 8 }}>
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
    try {
      const values = i2vForm.getFieldsValue();
      await request.post("/data/save", {
        type: "video",
        title: `AI 图生视频 - ${(values.prompt || "").substring(0, 20)}...`,
        url: i2vResult?.videoUrl,
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
        <Card title="图生视频配置" bordered={false}>
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

  return (
    <div className="page-transition">
      <div className="page-header">
        <Title level={2} className="page-title">
          多模态内容生成
        </Title>
        <Paragraph className="page-description">
          基于先进的 AI 模型，支持文本到图像、文本到视频的多模态内容生成。
          只需输入描述性文字，即可生成高质量的图像或视频内容。
        </Paragraph>
      </div>

      <Tabs
        defaultActiveKey="image"
        size="large"
        items={[
          { key: "image", label: "文生图", icon: <PictureOutlined />, children: imageTab },
          { key: "t2v", label: "文生视频", icon: <VideoCameraOutlined />, children: videoTab },
          { key: "i2v", label: "图生视频", icon: <VideoCameraOutlined />, children: i2vTab },
        ]}
      />
    </div>
  );
};

export default GeneralGeneratePage;
