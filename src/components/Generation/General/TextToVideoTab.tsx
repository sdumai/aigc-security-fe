import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Typography,
} from "antd";
import { ThunderboltOutlined } from "@ant-design/icons";

import {
  DEFAULT_MODELSCOPE_FRAMES,
  DEFAULT_MODELSCOPE_STEPS,
  DEFAULT_SEEDANCE_2_GENERATE_AUDIO,
  DEFAULT_SEEDANCE_2_RATIO,
  DEFAULT_SEEDANCE_2_RESOLUTION,
  DEFAULT_SEEDANCE_2_SEED,
  DEFAULT_T2V_DURATION,
  DEFAULT_TEXTAREA_ROWS,
  DEFAULT_VIDEO_MODEL,
  DEFAULT_VIDEO_RATIO,
  DEFAULT_VIDEO_WATERMARK,
  MODELSCOPE_FRAME_OPTIONS,
  MODELSCOPE_FRAMES_TOOLTIP,
  MODELSCOPE_MODEL_HELP_TEXT,
  MODELSCOPE_STEP_OPTIONS,
  MODELSCOPE_STEPS_TOOLTIP,
  PROMPT_MAX_LENGTH,
  SEEDANCE_1_5_DURATION_OPTIONS,
  SEEDANCE_1_5_DURATION_TOOLTIP,
  SEEDANCE_1_5_MODEL_HELP_TEXT,
  SEEDANCE_1_5_RESOLUTION_OPTIONS,
  SEEDANCE_2_ACCESS_KEY,
  SEEDANCE_2_DURATION_OPTIONS,
  SEEDANCE_2_DURATION_TOOLTIP,
  SEEDANCE_2_MODEL_HELP_TEXT,
  SEEDANCE_2_RATIO_OPTIONS,
  SEEDANCE_2_RESOLUTION_OPTIONS,
  SEEDANCE_2_SEED_TOOLTIP,
  T2V_DURATION_OPTIONS,
  TEXT_TO_VIDEO_PROMPT_PLACEHOLDER,
  TEXT_TO_VIDEO_MODEL_TOOLTIP,
  TITLE_PROMPT_PREVIEW_LENGTH,
  TITLE_PROMPT_PREVIEW_START_INDEX,
  VIDEO_MODEL_OPTIONS,
  VIDEO_RATIO_OPTIONS,
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
import { generateTextToVideo } from "@/services/generate";
import { saveGeneratedContent } from "@/services/content";
import { sendGeneratedResultToDetect } from "@/utils/detectTransfer";
import type { ITextToVideoFormValues, IVideoGenerateResult } from "@/typings/generate";
import type { TGeneratedDetectTarget } from "@/typings/detect";
import { dataUrlToBlob, downloadMedia } from "@/utils/media";

const { Paragraph } = Typography;
const { TextArea } = Input;

const VIDEO_MODEL_OPTION_BADGES: Partial<Record<ITextToVideoFormValues["videoModel"], string>> = {
  "volc-seedance-1-5-pro": "推荐",
  "volc-seedance-2-fast": "快速",
  modelscope: "本地",
};

export const TextToVideoTab = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm<ITextToVideoFormValues>();
  const videoModel = Form.useWatch("videoModel", form);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IVideoGenerateResult | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [seedance2Authorized, setSeedance2Authorized] = useState(false);
  const [seedance2AccessKey, setSeedance2AccessKey] = useState("");
  const [seedance2AccessKeyInput, setSeedance2AccessKeyInput] = useState("");
  const [seedance2AuthOpen, setSeedance2AuthOpen] = useState(false);
  const isModelScope = videoModel === "modelscope";
  const isSeedance15Pro = videoModel === "volc-seedance-1-5-pro";
  const isSeedance2Fast = videoModel === "volc-seedance-2-fast";
  const isModernSeedance = isSeedance15Pro || isSeedance2Fast;
  const resolutionOptions = isSeedance15Pro ? SEEDANCE_1_5_RESOLUTION_OPTIONS : SEEDANCE_2_RESOLUTION_OPTIONS;
  const durationOptions = isSeedance15Pro ? SEEDANCE_1_5_DURATION_OPTIONS : SEEDANCE_2_DURATION_OPTIONS;
  const durationTooltip = isSeedance15Pro ? SEEDANCE_1_5_DURATION_TOOLTIP : SEEDANCE_2_DURATION_TOOLTIP;

  useEffect(() => {
    if (videoModel === "volc-seedance-1-5-pro" || videoModel === "volc-seedance-2-fast") {
      form.setFieldsValue({
        ratio: DEFAULT_SEEDANCE_2_RATIO,
        resolution: DEFAULT_SEEDANCE_2_RESOLUTION,
        duration: DEFAULT_T2V_DURATION,
        seed: DEFAULT_SEEDANCE_2_SEED,
        generateAudio: DEFAULT_SEEDANCE_2_GENERATE_AUDIO,
        watermark: DEFAULT_VIDEO_WATERMARK,
      });
    } else if (videoModel === "volc") {
      form.setFieldsValue({
        ratio: DEFAULT_VIDEO_RATIO,
        duration: DEFAULT_T2V_DURATION,
      });
    }
  }, [form, videoModel]);

  useEffect(() => {
    const videoUrl = result?.videoUrl;
    let objectUrl = "";

    if (!videoUrl) {
      setPreviewSrc(null);
      return undefined;
    }

    if (videoUrl.startsWith("http://") || videoUrl.startsWith("https://")) {
      setPreviewSrc(videoUrl);
      return undefined;
    }

    if (videoUrl.startsWith("data:")) {
      try {
        objectUrl = URL.createObjectURL(dataUrlToBlob(videoUrl));
        setPreviewSrc(objectUrl);
      } catch {
        setPreviewSrc(videoUrl);
      }

      return () => {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      };
    }

    setPreviewSrc(videoUrl);
    return undefined;
  }, [result?.videoUrl]);

  const handleGenerate = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      setResult(null);
      setResult(
        await generateTextToVideo({
          model: values.videoModel,
          prompt: values.prompt,
          ratio: values.ratio,
          duration: values.duration,
          frameCount: values.t2vFrames,
          inferenceSteps: values.t2vSteps,
          resolution: values.resolution,
          seed: values.seed,
          generateAudio: values.generateAudio,
          watermark: values.watermark,
          seedanceAccessKey: values.videoModel === "volc-seedance-2-fast" ? seedance2AccessKey : undefined,
        }),
      );
      message.success("视频生成成功！");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "生成失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleVideoModelChange = (value: string) => {
    if (value === "volc-seedance-2-fast" && !seedance2Authorized) {
      form.setFieldsValue({ videoModel: DEFAULT_VIDEO_MODEL });
      setSeedance2AccessKeyInput("");
      setSeedance2AuthOpen(true);
    }
  };

  const handleSeedance2AuthConfirm = () => {
    if (seedance2AccessKeyInput.trim() !== SEEDANCE_2_ACCESS_KEY) {
      message.error("授权口令不正确，请联系作者获取");
      return;
    }

    const normalizedKey = seedance2AccessKeyInput.trim();
    setSeedance2AccessKey(normalizedKey);
    setSeedance2Authorized(true);
    setSeedance2AuthOpen(false);
    form.setFieldsValue({ videoModel: "volc-seedance-2-fast" });
    message.success("Seedance 2.0 fast 已解锁");
  };

  const handleDownload = async () => {
    if (!result?.videoUrl) {
      return;
    }

    try {
      message.loading("正在下载视频（可能需要较长时间）...", MESSAGE_LOADING_DURATION_FOREVER);
      await downloadMedia(result.videoUrl, `ai-generated-video-${Date.now()}.mp4`);
      message.destroy();
      message.success("视频下载成功！");
    } catch {
      message.destroy();
      window.open(result.videoUrl, "_blank");
      message.info("已在新标签页打开视频，请右键保存");
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
        title: `AI 视频生成 - ${(values.prompt || "").substring(TITLE_PROMPT_PREVIEW_START_INDEX, TITLE_PROMPT_PREVIEW_LENGTH)}...`,
        url: result.videoUrl,
      });
      message.success({ content: "视频已保存！可在内容管理中查看", duration: MESSAGE_DURATION_SECONDS });
      setTimeout(() => navigate(DATA_OUTPUT_ROUTE), SAVE_NAVIGATION_DELAY_MS);
    } catch (error) {
      console.error("Save error:", error);
    }
  };

  const handleSendToDetect = (target: TGeneratedDetectTarget) => {
    const values = form.getFieldsValue();
    const sent = sendGeneratedResultToDetect({
      navigate,
      result,
      mediaType: "video",
      target,
      title: values.prompt,
    });

    if (!sent) {
      message.warning("暂无可送检的生成视频");
    }
  };

  return (
    <Row gutter={GRID_GUTTER} className="text-to-video-layout">
      <Col xs={COL_FULL_SPAN} lg={14}>
        <Card
          title="文生视频参数"
          bordered={false}
          className="text-to-image-config-card text-to-video-config-card"
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
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              videoModel: DEFAULT_VIDEO_MODEL,
              duration: DEFAULT_T2V_DURATION,
              ratio: DEFAULT_VIDEO_RATIO,
              t2vFrames: DEFAULT_MODELSCOPE_FRAMES,
              t2vSteps: DEFAULT_MODELSCOPE_STEPS,
              resolution: DEFAULT_SEEDANCE_2_RESOLUTION,
              seed: DEFAULT_SEEDANCE_2_SEED,
              generateAudio: DEFAULT_SEEDANCE_2_GENERATE_AUDIO,
              watermark: DEFAULT_VIDEO_WATERMARK,
            }}
          >
            <Form.Item
              label="生成模型"
              name="videoModel"
              tooltip={TEXT_TO_VIDEO_MODEL_TOOLTIP}
              rules={[{ required: true, message: "请选择模型" }]}
            >
              <Select onChange={handleVideoModelChange}>
                {VIDEO_MODEL_OPTIONS.map((option) => (
                  <Select.Option key={option.value} value={option.value}>
                    <span className="model-select-option">
                      <span className="model-select-option-label">{option.label}</span>
                      {VIDEO_MODEL_OPTION_BADGES[option.value] && (
                        <span className="model-select-option-badge">{VIDEO_MODEL_OPTION_BADGES[option.value]}</span>
                      )}
                    </span>
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            {isSeedance2Fast && (
              <Paragraph
                type="secondary"
                style={{ marginTop: COMPACT_HELP_TEXT_MARGIN_TOP, marginBottom: COMPACT_HELP_TEXT_MARGIN_BOTTOM }}
              >
                {SEEDANCE_2_MODEL_HELP_TEXT}
              </Paragraph>
            )}
            {isSeedance15Pro && (
              <Paragraph
                type="secondary"
                style={{ marginTop: COMPACT_HELP_TEXT_MARGIN_TOP, marginBottom: COMPACT_HELP_TEXT_MARGIN_BOTTOM }}
              >
                {SEEDANCE_1_5_MODEL_HELP_TEXT}
              </Paragraph>
            )}
            {isModelScope && (
              <Paragraph
                type="secondary"
                style={{ marginTop: COMPACT_HELP_TEXT_MARGIN_TOP, marginBottom: COMPACT_HELP_TEXT_MARGIN_BOTTOM }}
              >
                {MODELSCOPE_MODEL_HELP_TEXT}
              </Paragraph>
            )}
            <Form.Item label="提示词（Prompt）" name="prompt" rules={[{ required: true, message: "请输入提示词" }]}>
              <TextArea
                rows={DEFAULT_TEXTAREA_ROWS}
                placeholder={TEXT_TO_VIDEO_PROMPT_PLACEHOLDER}
                showCount
                maxLength={PROMPT_MAX_LENGTH}
              />
            </Form.Item>
            {!isModelScope && (
              <Row gutter={12}>
                {isModernSeedance && (
                  <Col xs={COL_FULL_SPAN} sm={12}>
                    <Form.Item label="分辨率" name="resolution">
                      <Select>
                        {resolutionOptions.map((option) => (
                          <Select.Option key={option.value} value={option.value}>
                            {option.label}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                )}
                <Col xs={COL_FULL_SPAN} sm={isModernSeedance ? 12 : COL_FULL_SPAN}>
                  <Form.Item label="画幅比例" name="ratio">
                    <Select>
                      {(isModernSeedance ? SEEDANCE_2_RATIO_OPTIONS : VIDEO_RATIO_OPTIONS).map((option) => (
                        <Select.Option key={option.value} value={option.value}>
                          {option.label}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            )}
            {isModelScope ? (
              <>
                <Form.Item
                  label="视频帧数 num_frames"
                  name="t2vFrames"
                  rules={[{ required: true, message: "请选择帧数" }]}
                  tooltip={MODELSCOPE_FRAMES_TOOLTIP}
                >
                  <Select>
                    {MODELSCOPE_FRAME_OPTIONS.map((option) => (
                      <Select.Option key={option.value} value={option.value}>
                        {option.label}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item
                  label="推理步数 num_inference_steps"
                  name="t2vSteps"
                  rules={[{ required: true, message: "请选择步数" }]}
                  tooltip={MODELSCOPE_STEPS_TOOLTIP}
                >
                  <Select>
                    {MODELSCOPE_STEP_OPTIONS.map((option) => (
                      <Select.Option key={option.value} value={option.value}>
                        {option.label}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </>
            ) : (
              <>
                <Form.Item
                  label="生成时长"
                  name="duration"
                  rules={[{ required: true, message: "请选择时长" }]}
                  tooltip={isModernSeedance ? durationTooltip : undefined}
                >
                  <Select>
                    {(isModernSeedance ? durationOptions : T2V_DURATION_OPTIONS).map((option) => (
                      <Select.Option key={option.value} value={option.value}>
                        {option.label}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
                {isModernSeedance && (
                  <div className="text-to-video-advanced">
                    <div className="text-to-image-advanced-title">
                      {isSeedance15Pro ? "Seedance 1.5 pro 高级控制" : "Seedance 2.0 fast 高级控制"}
                    </div>
                    <Row gutter={[12, 12]}>
                      <Col xs={COL_FULL_SPAN} sm={8}>
                        <Form.Item label="随机种子" name="seed" tooltip={SEEDANCE_2_SEED_TOOLTIP}>
                          <InputNumber min={-1} max={4294967295} precision={0} style={{ width: "100%" }} />
                        </Form.Item>
                      </Col>
                      <Col xs={COL_FULL_SPAN} sm={8}>
                        <Form.Item label="同步音频" name="generateAudio" valuePropName="checked">
                          <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                        </Form.Item>
                      </Col>
                      <Col xs={COL_FULL_SPAN} sm={8}>
                        <Form.Item label="视频水印" name="watermark" valuePropName="checked">
                          <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Divider />
                    <Space size={8} wrap className="text-to-video-advanced-tags">
                      <span>强校验参数</span>
                      <span>24 FPS</span>
                      <span>{isSeedance15Pro ? "支持 1080p" : "不启用 camera_fixed"}</span>
                    </Space>
                  </div>
                )}
              </>
            )}
          </Form>
        </Card>
      </Col>

      <Col xs={COL_FULL_SPAN} lg={10}>
        <MediaResultCard
          title="生成结果"
          className="text-to-image-result-card text-to-video-result-card"
          loading={loading}
          loadingText="正在生成视频，这可能需要较长时间..."
          emptyText="视频将在生成后显示在这里"
          result={result}
          videoSrc={previewSrc}
          onSendToDetect={handleSendToDetect}
          onDownload={handleDownload}
          onSave={handleSave}
          onReset={() => setResult(null)}
        />
      </Col>
      <Modal
        title="解锁 Seedance-2.0-Fast"
        open={seedance2AuthOpen}
        okText="校验并启用"
        cancelText="取消"
        onOk={handleSeedance2AuthConfirm}
        onCancel={() => setSeedance2AuthOpen(false)}
        destroyOnClose
      >
        <Paragraph type="secondary">
          该模型调用成本较高，请联系作者获取授权口令。校验通过后，本次页面会话内可继续使用该模型。
        </Paragraph>
        <Input.Password
          autoFocus
          placeholder="请输入授权口令"
          value={seedance2AccessKeyInput}
          onChange={(event) => setSeedance2AccessKeyInput(event.target.value)}
          onPressEnter={handleSeedance2AuthConfirm}
        />
      </Modal>
    </Row>
  );
};
