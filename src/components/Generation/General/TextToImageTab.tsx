import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Col, Form, Input, message, Row, Segmented, Select, Space, Switch, Typography } from "antd";
import { FileImageOutlined, SlidersOutlined, ThunderboltOutlined } from "@ant-design/icons";

import {
  ARK_IMAGE_MODEL_SIZE_OPTIONS,
  DEFAULT_IMAGE_OPTIMIZE_PROMPT,
  DEFAULT_IMAGE_MODEL,
  DEFAULT_IMAGE_OUTPUT_FORMAT,
  DEFAULT_IMAGE_RESPONSE_FORMAT,
  DEFAULT_IMAGE_SIZE,
  DEFAULT_TEXTAREA_ROWS,
  IMAGE_MODEL_OPTIONS,
  IMAGE_OUTPUT_FORMAT_OPTIONS,
  IMAGE_RESPONSE_FORMAT_OPTIONS,
  PROMPT_MAX_LENGTH,
  STABLE_DIFFUSION_IMAGE_SIZE_OPTIONS,
  STABLE_DIFFUSION_MODEL_HELP_TEXT,
  TEXT_TO_IMAGE_PROMPT_PLACEHOLDER,
  TITLE_PROMPT_PREVIEW_LENGTH,
  TITLE_PROMPT_PREVIEW_START_INDEX,
} from "@/constants/generate";
import { DATA_OUTPUT_ROUTE } from "@/constants/routes";
import {
  COL_FULL_SPAN,
  COMPACT_HELP_TEXT_MARGIN_BOTTOM,
  COMPACT_HELP_TEXT_MARGIN_TOP,
  GRID_GUTTER,
  MESSAGE_DURATION_SECONDS,
  MESSAGE_LOADING_DURATION_FOREVER,
  SAVE_NAVIGATION_DELAY_MS,
} from "@/constants/ui";
import { MediaResultCard } from "@/components/Generation/common/MediaResultCard";
import { ImageModelIntroCard } from "@/components/Generation/General/ImageModelIntroCard";
import { generateTextToImage } from "@/services/generate";
import { saveGeneratedContent } from "@/services/content";
import { sendGeneratedResultToDetect } from "@/utils/detectTransfer";
import type { IImageGenerateResult, ITextToImageFormValues } from "@/typings/generate";
import type { TGeneratedDetectTarget } from "@/typings/detect";
import { downloadMedia } from "@/utils/media";
import { getGenerationModelLabel } from "@/utils/modelLabels";

const { Paragraph } = Typography;
const { TextArea } = Input;

const IMAGE_MODEL_OPTION_BADGES: Partial<Record<ITextToImageFormValues["imageModel"], string>> = {
  volc: "最新",
  "stable-diffusion": "本地",
};

export const TextToImageTab = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm<ITextToImageFormValues>();
  const watchedImageModel = Form.useWatch("imageModel", form);
  const imageModel = watchedImageModel || DEFAULT_IMAGE_MODEL;
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IImageGenerateResult | null>(null);
  const [savedSampleId, setSavedSampleId] = useState<string | undefined>();
  const isStableDiffusion = imageModel === "stable-diffusion";
  const isSeedream5 = imageModel === "volc";
  const isArkImageModel = !isStableDiffusion;
  const imageSizeOptions = useMemo(() => {
    if (imageModel === "stable-diffusion") {
      return STABLE_DIFFUSION_IMAGE_SIZE_OPTIONS;
    }

    return ARK_IMAGE_MODEL_SIZE_OPTIONS[imageModel] || ARK_IMAGE_MODEL_SIZE_OPTIONS.volc;
  }, [imageModel]);

  useEffect(() => {
    const currentSize = form.getFieldValue("size");
    if (!imageSizeOptions.some((option) => option.value === currentSize)) {
      form.setFieldValue("size", imageSizeOptions[0]?.value || DEFAULT_IMAGE_SIZE);
    }
  }, [form, imageSizeOptions]);

  const handleGenerate = async () => {
    try {
      const values = await form.validateFields();
      const shouldUseArkOptions = values.imageModel !== "stable-diffusion";
      setLoading(true);
      setResult(null);
      setSavedSampleId(undefined);
      setResult(
        await generateTextToImage({
          model: values.imageModel,
          prompt: values.prompt,
          size: values.size,
          responseFormat: shouldUseArkOptions ? values.responseFormat : undefined,
          outputFormat: values.imageModel === "volc" ? values.outputFormat : undefined,
          watermark: values.watermark,
          optimizePrompt: shouldUseArkOptions ? values.optimizePrompt : undefined,
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
      const modelLabel = getGenerationModelLabel(values.imageModel);
      const sample = await saveGeneratedContent({
        type: "image",
        title: `AI 图像生成 - ${(values.prompt || "").substring(TITLE_PROMPT_PREVIEW_START_INDEX, TITLE_PROMPT_PREVIEW_LENGTH)}...`,
        url: result.imageUrl,
        sourceModule: "text-to-image",
        model: modelLabel,
        prompt: values.prompt,
      });
      setSavedSampleId(sample.id);
      message.success({ content: "图像已保存！可在内容管理中查看", duration: MESSAGE_DURATION_SECONDS });
      setTimeout(() => navigate(DATA_OUTPUT_ROUTE), SAVE_NAVIGATION_DELAY_MS);
    } catch (error) {
      console.error("Save error:", error);
    }
  };

  const handleSendToDetect = async (target: TGeneratedDetectTarget) => {
    if (!result?.imageUrl) {
      message.warning("暂无可送检的生成图片");
      return;
    }

    const values = form.getFieldsValue();
    const modelLabel = getGenerationModelLabel(values.imageModel);
    let sampleId = savedSampleId;

    try {
      if (!sampleId) {
        const sample = await saveGeneratedContent({
          type: "image",
          title: `AI 图像生成 - ${(values.prompt || "").substring(TITLE_PROMPT_PREVIEW_START_INDEX, TITLE_PROMPT_PREVIEW_LENGTH)}...`,
          url: result.imageUrl,
          sourceModule: "text-to-image",
          model: modelLabel,
          prompt: values.prompt,
        });
        sampleId = sample.id;
        setSavedSampleId(sample.id);
      }
    } catch (error) {
      console.error("Save sample before detect error:", error);
      message.warning("样本记录保存失败，仍继续送检");
    }

    const sent = sendGeneratedResultToDetect({
      navigate,
      result,
      mediaType: "image",
      target,
      title: values.prompt,
      model: modelLabel,
      sourceModule: "text-to-image",
      sampleId,
    });

    if (!sent) {
      message.warning("暂无可送检的生成图片");
    }
  };

  return (
    <Row gutter={GRID_GUTTER}>
      <Col xs={COL_FULL_SPAN} lg={14}>
        <Card
          title="文生图参数"
          bordered={false}
          className="text-to-image-config-card"
          extra={
            <Button
              type="primary"
              className="deepfake-generate-action"
              icon={loading ? <FileImageOutlined /> : <ThunderboltOutlined />}
              loading={loading}
              onClick={handleGenerate}
            >
              {loading ? "生成中..." : "生成图片"}
            </Button>
          }
        >
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              imageModel: DEFAULT_IMAGE_MODEL,
              size: DEFAULT_IMAGE_SIZE,
              responseFormat: DEFAULT_IMAGE_RESPONSE_FORMAT,
              outputFormat: DEFAULT_IMAGE_OUTPUT_FORMAT,
              watermark: true,
              optimizePrompt: DEFAULT_IMAGE_OPTIMIZE_PROMPT,
            }}
          >
            <Form.Item
              label="生成模型"
              name="imageModel"
              tooltip="火山返回图片 URL；自托管 SD 返回 base64（data URL），由前端统一展示"
              rules={[{ required: true, message: "请选择模型" }]}
            >
              <Select>
                {IMAGE_MODEL_OPTIONS.map((option) => (
                  <Select.Option key={option.value} value={option.value}>
                    <span className="model-select-option">
                      <span className="model-select-option-label">{option.label}</span>
                      {IMAGE_MODEL_OPTION_BADGES[option.value] && (
                        <span className="model-select-option-badge">{IMAGE_MODEL_OPTION_BADGES[option.value]}</span>
                      )}
                    </span>
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <ImageModelIntroCard selectedModel={imageModel} />
            {imageModel === "stable-diffusion" && STABLE_DIFFUSION_MODEL_HELP_TEXT && (
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
                {imageSizeOptions.map((option) => (
                  <Select.Option key={option.value} value={option.value}>
                    {option.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            {isArkImageModel && (
              <div className="text-to-image-advanced">
                <div className="text-to-image-advanced-title">
                  <Space size={8}>
                    <SlidersOutlined />
                    <span>生成控制</span>
                  </Space>
                </div>
                <Row gutter={[12, 12]}>
                  <Col xs={24} md={12}>
                    <Form.Item label="返回格式" name="responseFormat" tooltip="URL 链接 24 小时内有效；Base64 适合本地留存">
                      <Segmented block options={IMAGE_RESPONSE_FORMAT_OPTIONS} />
                    </Form.Item>
                  </Col>
                  {isSeedream5 && (
                    <Col xs={24} md={12}>
                      <Form.Item label="图片格式" name="outputFormat" tooltip="Seedream 5.0 支持 JPEG / PNG 输出">
                        <Segmented block options={IMAGE_OUTPUT_FORMAT_OPTIONS} />
                      </Form.Item>
                    </Col>
                  )}
                  <Col xs={24} md={12}>
                    <Form.Item label="水印" name="watermark" valuePropName="checked">
                      <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item label="提示词优化" name="optimizePrompt" valuePropName="checked" tooltip="使用标准优化模式增强提示词表达">
                      <Switch checkedChildren="标准" unCheckedChildren="关闭" />
                    </Form.Item>
                  </Col>
                </Row>
              </div>
            )}
          </Form>
        </Card>
      </Col>

      <Col xs={COL_FULL_SPAN} lg={10}>
        <MediaResultCard
          className="text-to-image-result-card"
          title="生成结果"
          loading={loading}
          loadingText="正在生成图像，请稍候..."
          emptyText="图像将在生成后显示在这里"
          result={result}
          imageAlt="生成的图像"
          onSendToDetect={handleSendToDetect}
          onDownload={handleDownload}
          onSave={handleSave}
          onReset={() => {
            setResult(null);
            setSavedSampleId(undefined);
          }}
        />
      </Col>
    </Row>
  );
};
