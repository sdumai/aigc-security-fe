import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Col, Form, Input, message, Row, Select, Typography } from "antd";
import { ThunderboltOutlined, VideoCameraOutlined } from "@ant-design/icons";

import {
  DEFAULT_MODELSCOPE_FRAMES,
  DEFAULT_MODELSCOPE_STEPS,
  DEFAULT_T2V_DURATION,
  DEFAULT_TEXTAREA_ROWS,
  DEFAULT_VIDEO_MODEL,
  DEFAULT_VIDEO_RATIO,
  MODELSCOPE_FRAME_OPTIONS,
  MODELSCOPE_FRAMES_TOOLTIP,
  MODELSCOPE_MODEL_HELP_TEXT,
  MODELSCOPE_STEP_OPTIONS,
  MODELSCOPE_STEPS_TOOLTIP,
  PROMPT_MAX_LENGTH,
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
import { generateTextToVideo } from "@/services/generate";
import { saveGeneratedContent } from "@/services/content";
import type { ITextToVideoFormValues, IVideoGenerateResult } from "@/typings/generate";
import { dataUrlToBlob, downloadMedia } from "@/utils/media";

const { Paragraph } = Typography;
const { TextArea } = Input;

export const TextToVideoTab = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm<ITextToVideoFormValues>();
  const videoModel = Form.useWatch("videoModel", form);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IVideoGenerateResult | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

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

  return (
    <Row gutter={GRID_GUTTER}>
      <Col xs={COL_FULL_SPAN} lg={COL_HALF_LG_SPAN}>
        <Card title="文生视频参数" bordered={false}>
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              videoModel: DEFAULT_VIDEO_MODEL,
              duration: DEFAULT_T2V_DURATION,
              ratio: DEFAULT_VIDEO_RATIO,
              t2vFrames: DEFAULT_MODELSCOPE_FRAMES,
              t2vSteps: DEFAULT_MODELSCOPE_STEPS,
            }}
          >
            <Form.Item
              label="生成模型"
              name="videoModel"
              tooltip={TEXT_TO_VIDEO_MODEL_TOOLTIP}
              rules={[{ required: true, message: "请选择模型" }]}
            >
              <Select>
                {VIDEO_MODEL_OPTIONS.map((option) => (
                  <Select.Option key={option.value} value={option.value}>
                    {option.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            {videoModel === "modelscope" && (
              <Paragraph type="secondary" style={{ marginTop: COMPACT_HELP_TEXT_MARGIN_TOP, marginBottom: COMPACT_HELP_TEXT_MARGIN_BOTTOM }}>
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
            {videoModel !== "modelscope" && (
              <Form.Item label="画幅比例" name="ratio">
                <Select>
                  {VIDEO_RATIO_OPTIONS.map((option) => (
                    <Select.Option key={option.value} value={option.value}>
                      {option.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            )}
            {videoModel === "modelscope" ? (
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
              <Form.Item label="生成时长（秒）" name="duration" rules={[{ required: true, message: "请选择时长" }]}>
                <Select>
                  {T2V_DURATION_OPTIONS.map((option) => (
                    <Select.Option key={option.value} value={option.value}>
                      {option.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            )}
            <Form.Item>
              <Button
                type="primary"
                size="large"
                block
                icon={<ThunderboltOutlined />}
                loading={loading}
                onClick={handleGenerate}
              >
                {loading ? "生成中..." : "生成视频"}
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </Col>

      <Col xs={COL_FULL_SPAN} lg={COL_HALF_LG_SPAN}>
        <MediaResultCard
          title="生成结果"
          loading={loading}
          loadingText="正在生成视频，这可能需要较长时间..."
          emptyIcon={<VideoCameraOutlined style={{ fontSize: EMPTY_ICON_SIZE, color: MUTED_ICON_COLOR }} />}
          emptyText="视频将在生成后显示在这里"
          result={result}
          videoSrc={previewSrc}
          onDownload={handleDownload}
          onSave={handleSave}
          onReset={() => setResult(null)}
        />
      </Col>
    </Row>
  );
};
