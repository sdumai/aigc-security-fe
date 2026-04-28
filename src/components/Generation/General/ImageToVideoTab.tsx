import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Col, Form, Input, message, Row, Select } from "antd";
import { ThunderboltOutlined } from "@ant-design/icons";
import type { UploadFile } from "antd";

import {
  DEFAULT_I2V_DURATION,
  DEFAULT_TEXTAREA_ROWS,
  DEFAULT_VIDEO_RATIO,
  EMPTY_UPLOAD_COUNT,
  I2V_DURATION_OPTIONS,
  I2V_MAX_IMAGE_COUNT,
  I2V_REFERENCE_TOOLTIP,
  I2V_UPLOAD_TEXT,
  IMAGE_TO_VIDEO_PROMPT_PLACEHOLDER,
  PROMPT_MAX_LENGTH,
  TITLE_PROMPT_PREVIEW_LENGTH,
  TITLE_PROMPT_PREVIEW_START_INDEX,
  VIDEO_RATIO_OPTIONS,
} from "@/constants/generate";
import { DATA_OUTPUT_ROUTE } from "@/constants/routes";
import {
  COL_FULL_SPAN,
  GRID_GUTTER,
  MESSAGE_DURATION_SECONDS,
  MESSAGE_LOADING_DURATION_FOREVER,
  SAVE_NAVIGATION_DELAY_MS,
} from "@/constants/ui";
import { ImagePreviewModal } from "@/components/Generation/common/ImagePreviewModal";
import { ImageUploadField } from "@/components/Generation/common/ImageUploadField";
import { MediaResultCard } from "@/components/Generation/common/MediaResultCard";
import { generateImageToVideo } from "@/services/generate";
import { saveGeneratedContent } from "@/services/content";
import type { IImageToVideoFormValues, IVideoGenerateResult } from "@/typings/generate";
import { downloadMedia, getBase64FromUploadFile, getUploadPreviewUrl } from "@/utils/media";

const { TextArea } = Input;

export const ImageToVideoTab = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm<IImageToVideoFormValues>();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IVideoGenerateResult | null>(null);
  const [refImages, setRefImages] = useState<UploadFile[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");

  const handleUploadPreview = async (file: UploadFile) => {
    const url = await getUploadPreviewUrl(file);

    if (url) {
      setPreviewUrl(url);
      setPreviewOpen(true);
    }
  };

  const getImageBase64List = async () => {
    const imageBase64List: string[] = [];

    for (const image of refImages) {
      const imageBase64 = await getBase64FromUploadFile(image);

      if (imageBase64) {
        imageBase64List.push(imageBase64);
      }
    }

    if (imageBase64List.length === EMPTY_UPLOAD_COUNT) {
      throw new Error("无法读取参考图，请重新上传");
    }

    return imageBase64List;
  };

  const handleGenerate = async () => {
    try {
      const values = await form.validateFields();

      if (refImages.length === EMPTY_UPLOAD_COUNT) {
        message.error("请上传至少一张参考图");
        return;
      }

      setLoading(true);
      setResult(null);
      setResult(
        await generateImageToVideo({
          prompt: values.prompt,
          imageBase64List: await getImageBase64List(),
          ratio: values.ratio,
          duration: values.duration,
        }),
      );
      message.success("视频生成成功！");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "生成失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!result?.videoUrl) {
      return;
    }

    try {
      message.loading("正在下载视频...", MESSAGE_LOADING_DURATION_FOREVER);
      await downloadMedia(result.videoUrl, `ai-i2v-video-${Date.now()}.mp4`);
      message.destroy();
      message.success("视频下载成功！");
    } catch {
      message.destroy();
      window.open(result.videoUrl, "_blank");
      message.info("已在新标签页打开，请右键保存");
    }
  };

  const handleSave = async () => {
    if (!result?.videoUrl) {
      return;
    }

    try {
      const values = form.getFieldsValue();
      await saveGeneratedContent({
        type: "video",
        title: `AI 图生视频 - ${(values.prompt || "").substring(TITLE_PROMPT_PREVIEW_START_INDEX, TITLE_PROMPT_PREVIEW_LENGTH)}...`,
        url: result.videoUrl,
      });
      message.success({ content: "已保存到内容管理", duration: MESSAGE_DURATION_SECONDS });
      setTimeout(() => navigate(DATA_OUTPUT_ROUTE), SAVE_NAVIGATION_DELAY_MS);
    } catch (error) {
      console.error("Save error:", error);
    }
  };

  return (
    <>
      <Row gutter={GRID_GUTTER}>
        <Col xs={COL_FULL_SPAN} lg={14}>
          <Card
            title="图生视频参数"
            bordered={false}
            className="text-to-image-config-card"
            extra={
              <Button
                type="primary"
                className="deepfake-generate-action"
                icon={<ThunderboltOutlined />}
                loading={loading}
                onClick={handleGenerate}
              >
                {loading ? "生成中..." : "生成视频"}
              </Button>
            }
          >
            <Form form={form} layout="vertical" initialValues={{ duration: DEFAULT_I2V_DURATION, ratio: DEFAULT_VIDEO_RATIO }}>
              <Form.Item
                label="提示词（Prompt）"
                name="prompt"
                rules={[{ required: true, message: "请输入描述，如 [图1]... [图2]..." }]}
              >
                <TextArea
                  rows={DEFAULT_TEXTAREA_ROWS}
                  placeholder={IMAGE_TO_VIDEO_PROMPT_PLACEHOLDER}
                  showCount
                  maxLength={PROMPT_MAX_LENGTH}
                />
              </Form.Item>
              <Form.Item label="参考图片" required tooltip={I2V_REFERENCE_TOOLTIP}>
                <ImageUploadField
                  fileList={refImages}
                  setFileList={setRefImages}
                  maxCount={I2V_MAX_IMAGE_COUNT}
                  append
                  uploadText={I2V_UPLOAD_TEXT}
                  onPreview={handleUploadPreview}
                />
              </Form.Item>
              <Form.Item label="画幅比例" name="ratio">
                <Select>
                  {VIDEO_RATIO_OPTIONS.map((option) => (
                    <Select.Option key={option.value} value={option.value}>
                      {option.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item label="生成时长（秒）" name="duration" rules={[{ required: true }]}>
                <Select>
                  {I2V_DURATION_OPTIONS.map((option) => (
                    <Select.Option key={option.value} value={option.value}>
                      {option.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={COL_FULL_SPAN} lg={10}>
          <MediaResultCard
            title="生成结果"
            loading={loading}
            loadingText="正在生成视频，请稍候..."
            emptyText="图生视频结果将显示在这里"
            result={result}
            onDownload={handleDownload}
            onSave={handleSave}
            onReset={() => setResult(null)}
          />
        </Col>
      </Row>

      <ImagePreviewModal open={previewOpen} imageUrl={previewUrl} onClose={() => setPreviewOpen(false)} />
    </>
  );
};
