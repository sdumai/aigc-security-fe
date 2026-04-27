import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Col, Form, Input, message, Row, Select, Switch, Typography } from "antd";
import { PictureOutlined, ThunderboltOutlined } from "@ant-design/icons";

import {
  DEFAULT_IMAGE_MODEL,
  DEFAULT_IMAGE_SIZE,
  DEFAULT_TEXTAREA_ROWS,
  IMAGE_MODEL_OPTIONS,
  IMAGE_SIZE_OPTIONS,
  PROMPT_MAX_LENGTH,
  STABLE_DIFFUSION_MODEL_HELP_TEXT,
  TEXT_TO_IMAGE_PROMPT_PLACEHOLDER,
  TITLE_PROMPT_PREVIEW_LENGTH,
  TITLE_PROMPT_PREVIEW_START_INDEX,
} from "@/constants/generate";
import { DATA_OUTPUT_ROUTE } from "@/constants/routes";
import {
  COL_FULL_SPAN,
  COL_HALF_LG_SPAN,
  COMPACT_HELP_TEXT_MARGIN_BOTTOM,
  COMPACT_HELP_TEXT_MARGIN_TOP,
  EMPTY_ICON_SIZE,
  GRID_GUTTER,
  MESSAGE_DURATION_SECONDS,
  MESSAGE_LOADING_DURATION_FOREVER,
  MUTED_ICON_COLOR,
  SAVE_NAVIGATION_DELAY_MS,
} from "@/constants/ui";
import { MediaResultCard } from "@/components/Generation/common/MediaResultCard";
import { generateTextToImage } from "@/services/generate";
import { saveGeneratedContent } from "@/services/content";
import type { IImageGenerateResult, ITextToImageFormValues } from "@/typings/generate";
import { downloadMedia } from "@/utils/media";

const { Paragraph } = Typography;
const { TextArea } = Input;

export const TextToImageTab = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm<ITextToImageFormValues>();
  const imageModel = Form.useWatch("imageModel", form);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IImageGenerateResult | null>(null);

  const handleGenerate = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      setResult(null);
      setResult(
        await generateTextToImage({
          model: values.imageModel,
          prompt: values.prompt,
          size: values.size,
          watermark: values.watermark,
        }),
      );
      message.success("图像生成成功！");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "生成失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!result?.imageUrl) {
      return;
    }

    try {
      message.loading("正在下载图像...", MESSAGE_LOADING_DURATION_FOREVER);
      await downloadMedia(result.imageUrl, `ai-generated-image-${Date.now()}.${result.format === "data_url" ? "png" : "jpg"}`);
      message.destroy();
      message.success("图像下载成功！");
    } catch {
      message.destroy();
      window.open(result.imageUrl, "_blank");
      message.info("已在新标签页打开图像，请右键保存");
    }
  };

  const handleSave = async () => {
    if (!result?.imageUrl) {
      return;
    }

    try {
      const values = form.getFieldsValue();
      await saveGeneratedContent({
        type: "image",
        title: `AI 图像生成 - ${(values.prompt || "").substring(TITLE_PROMPT_PREVIEW_START_INDEX, TITLE_PROMPT_PREVIEW_LENGTH)}...`,
        url: result.imageUrl,
      });
      message.success({ content: "图像已保存！可在内容管理中查看", duration: MESSAGE_DURATION_SECONDS });
      setTimeout(() => navigate(DATA_OUTPUT_ROUTE), SAVE_NAVIGATION_DELAY_MS);
    } catch (error) {
      console.error("Save error:", error);
    }
  };

  return (
    <Row gutter={GRID_GUTTER}>
      <Col xs={COL_FULL_SPAN} lg={COL_HALF_LG_SPAN}>
        <Card title="文生图参数" bordered={false}>
          <Form form={form} layout="vertical" initialValues={{ imageModel: DEFAULT_IMAGE_MODEL, size: DEFAULT_IMAGE_SIZE, watermark: true }}>
            <Form.Item
              label="生成模型"
              name="imageModel"
              tooltip="火山返回图片 URL；自托管 SD 返回 base64（data URL），由前端统一展示"
              rules={[{ required: true, message: "请选择模型" }]}
            >
              <Select>
                {IMAGE_MODEL_OPTIONS.map((option) => (
                  <Select.Option key={option.value} value={option.value}>
                    {option.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            {imageModel === "stable-diffusion" && (
              <Paragraph type="secondary" style={{ marginTop: COMPACT_HELP_TEXT_MARGIN_TOP, marginBottom: COMPACT_HELP_TEXT_MARGIN_BOTTOM }}>
                {STABLE_DIFFUSION_MODEL_HELP_TEXT}
              </Paragraph>
            )}
            <Form.Item label="提示词（Prompt）" name="prompt" rules={[{ required: true, message: "请输入提示词" }]}>
              <TextArea rows={DEFAULT_TEXTAREA_ROWS} placeholder={TEXT_TO_IMAGE_PROMPT_PLACEHOLDER} showCount maxLength={PROMPT_MAX_LENGTH} />
            </Form.Item>
            <Form.Item
              label="图像分辨率"
              name="size"
              tooltip="指定生成图像的分辨率"
              rules={[{ required: true, message: "请选择尺寸" }]}
            >
              <Select>
                {IMAGE_SIZE_OPTIONS.map((option) => (
                  <Select.Option key={option.value} value={option.value}>
                    {option.label}
                  </Select.Option>
                ))}
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
                loading={loading}
                onClick={handleGenerate}
              >
                {loading ? "生成中..." : "生成图片"}
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </Col>

      <Col xs={COL_FULL_SPAN} lg={COL_HALF_LG_SPAN}>
        <MediaResultCard
          title="生成结果"
          loading={loading}
          loadingText="正在生成图像，请稍候..."
          emptyIcon={<PictureOutlined style={{ fontSize: EMPTY_ICON_SIZE, color: MUTED_ICON_COLOR }} />}
          emptyText="图像将在生成后显示在这里"
          result={result}
          imageAlt="生成的图像"
          onDownload={handleDownload}
          onSave={handleSave}
          onReset={() => setResult(null)}
        />
      </Col>
    </Row>
  );
};
