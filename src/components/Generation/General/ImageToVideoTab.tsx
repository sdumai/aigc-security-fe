import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Row,
  Segmented,
  Select,
  Space,
  Switch,
  Typography,
  Upload,
} from "antd";
import { DeleteOutlined, EyeOutlined, PlusOutlined, SlidersOutlined, ThunderboltOutlined } from "@ant-design/icons";
import type { UploadFile } from "antd";

import {
  DEFAULT_I2V_DURATION,
  DEFAULT_I2V_CAMERA_FIXED,
  DEFAULT_I2V_GENERATE_AUDIO,
  DEFAULT_I2V_MODE,
  DEFAULT_I2V_MODEL,
  DEFAULT_I2V_RESOLUTION,
  DEFAULT_I2V_SEED,
  DEFAULT_TEXTAREA_ROWS,
  DEFAULT_VIDEO_RATIO,
  DEFAULT_VIDEO_WATERMARK,
  EMPTY_UPLOAD_COUNT,
  I2V_LITE_RESOLUTION_OPTIONS,
  I2V_DURATION_OPTIONS,
  I2V_MAX_IMAGE_COUNT,
  I2V_REFERENCE_TOOLTIP,
  I2V_UPLOAD_TEXT,
  IMAGE_TO_VIDEO_MODE_HELP_TEXT,
  IMAGE_TO_VIDEO_MODE_OPTIONS,
  IMAGE_TO_VIDEO_MODEL_OPTIONS,
  IMAGE_TO_VIDEO_REFERENCE_MODE_MODELS,
  IMAGE_TO_VIDEO_PROMPT_PLACEHOLDER,
  PROMPT_MAX_LENGTH,
  SEEDANCE_1_5_DURATION_OPTIONS,
  SEEDANCE_1_5_DURATION_TOOLTIP,
  SEEDANCE_1_5_RESOLUTION_OPTIONS,
  SEEDANCE_2_ACCESS_KEY,
  SEEDANCE_2_DURATION_OPTIONS,
  SEEDANCE_2_DURATION_TOOLTIP,
  SEEDANCE_2_I2V_MAX_IMAGE_COUNT,
  SEEDANCE_2_RATIO_OPTIONS,
  SEEDANCE_2_RESOLUTION_OPTIONS,
  SEEDANCE_2_SEED_TOOLTIP,
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
import { MediaResultCard } from "@/components/Generation/common/MediaResultCard";
import { ImageToVideoModelIntroCard } from "@/components/Generation/General/ImageToVideoModelIntroCard";
import { generateImageToVideo } from "@/services/generate";
import { saveGeneratedContent } from "@/services/content";
import { sendGeneratedResultToDetect } from "@/utils/detectTransfer";
import type {
  IImageToVideoFormValues,
  IVideoGenerateResult,
  TImageToVideoMode,
  TImageToVideoModel,
} from "@/typings/generate";
import type { TGeneratedDetectTarget } from "@/typings/detect";
import {
  createUploadFile,
  downloadMedia,
  getBase64FromUploadFile,
  getUploadPreviewUrl,
  readBlobAsDataUrl,
} from "@/utils/media";
import { getGenerationModelLabel } from "@/utils/modelLabels";

const { Paragraph } = Typography;
const { TextArea } = Input;

const IMAGE_TO_VIDEO_MODEL_BADGES: Partial<Record<TImageToVideoModel, string>> = {
  "volc-seedance-lite-i2v": "默认",
  "volc-seedance-1-5-pro": "高质量",
  "volc-seedance-2-fast": "新版",
};

export const ImageToVideoTab = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm<IImageToVideoFormValues>();
  const watchedImageToVideoModel = Form.useWatch("imageToVideoModel", form);
  const watchedImageMode = Form.useWatch("imageMode", form);
  const imageToVideoModel = watchedImageToVideoModel || DEFAULT_I2V_MODEL;
  const imageMode = watchedImageMode || DEFAULT_I2V_MODE;
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IVideoGenerateResult | null>(null);
  const [savedSampleId, setSavedSampleId] = useState<string | undefined>();
  const [refImages, setRefImages] = useState<UploadFile[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [seedance2Authorized, setSeedance2Authorized] = useState(false);
  const [seedance2AccessKey, setSeedance2AccessKey] = useState("");
  const [seedance2AccessKeyInput, setSeedance2AccessKeyInput] = useState("");
  const [seedance2AuthOpen, setSeedance2AuthOpen] = useState(false);
  const isSeedance15Pro = imageToVideoModel === "volc-seedance-1-5-pro";
  const isSeedance2Fast = imageToVideoModel === "volc-seedance-2-fast";
  const isModernSeedance = isSeedance15Pro || isSeedance2Fast;
  const supportsCameraFixed = imageMode !== "reference" && !isSeedance2Fast;
  const imageModeOptions = useMemo(
    () =>
      IMAGE_TO_VIDEO_MODE_OPTIONS.filter((option) => {
        if (option.value !== "reference") return true;
        return IMAGE_TO_VIDEO_REFERENCE_MODE_MODELS.includes(imageToVideoModel);
      }),
    [imageToVideoModel],
  );
  const maxImageCount = useMemo(() => {
    if (imageMode === "first-frame") return 1;
    if (imageMode === "first-last-frame") return 2;
    return isSeedance2Fast ? SEEDANCE_2_I2V_MAX_IMAGE_COUNT : I2V_MAX_IMAGE_COUNT;
  }, [imageMode, isSeedance2Fast]);
  const minImageCount = imageMode === "first-last-frame" ? 2 : 1;
  const ratioOptions = useMemo(() => {
    if (imageMode === "reference" && imageToVideoModel === "volc-seedance-lite-i2v") {
      return VIDEO_RATIO_OPTIONS;
    }
    return SEEDANCE_2_RATIO_OPTIONS;
  }, [imageMode, imageToVideoModel]);
  const resolutionOptions = isSeedance2Fast
    ? SEEDANCE_2_RESOLUTION_OPTIONS
    : isSeedance15Pro
      ? SEEDANCE_1_5_RESOLUTION_OPTIONS
      : I2V_LITE_RESOLUTION_OPTIONS;
  const durationOptions = isSeedance2Fast
    ? SEEDANCE_2_DURATION_OPTIONS
    : isSeedance15Pro
      ? SEEDANCE_1_5_DURATION_OPTIONS
      : I2V_DURATION_OPTIONS;
  const durationTooltip = isSeedance2Fast
    ? SEEDANCE_2_DURATION_TOOLTIP
    : isSeedance15Pro
      ? SEEDANCE_1_5_DURATION_TOOLTIP
      : undefined;

  useEffect(() => {
    const nextMode = imageModeOptions.some((option) => option.value === imageMode)
      ? imageMode
      : imageModeOptions[0]?.value || DEFAULT_I2V_MODE;
    const currentRatio = form.getFieldValue("ratio");
    const nextRatio = ratioOptions.some((option) => option.value === currentRatio)
      ? currentRatio
      : nextMode === "reference" && imageToVideoModel === "volc-seedance-lite-i2v"
        ? DEFAULT_VIDEO_RATIO
        : "adaptive";
    const currentResolution = form.getFieldValue("resolution");
    const nextResolution = resolutionOptions.some((option) => option.value === currentResolution)
      ? currentResolution
      : DEFAULT_I2V_RESOLUTION;
    const currentDuration = form.getFieldValue("duration");
    const nextDuration = durationOptions.some((option) => option.value === currentDuration)
      ? currentDuration
      : DEFAULT_I2V_DURATION;

    form.setFieldsValue({
      imageMode: nextMode,
      ratio: nextRatio,
      resolution: nextResolution,
      duration: nextDuration,
      generateAudio: isModernSeedance ? DEFAULT_I2V_GENERATE_AUDIO : false,
      cameraFixed: supportsCameraFixed ? form.getFieldValue("cameraFixed") : DEFAULT_I2V_CAMERA_FIXED,
    });
  }, [
    durationOptions,
    form,
    imageMode,
    imageModeOptions,
    imageToVideoModel,
    isModernSeedance,
    ratioOptions,
    resolutionOptions,
    supportsCameraFixed,
  ]);

  useEffect(() => {
    setRefImages((currentImages) =>
      currentImages.length > maxImageCount ? currentImages.slice(0, maxImageCount) : currentImages,
    );
  }, [maxImageCount]);

  const handleUploadPreview = async (file: UploadFile) => {
    const url = await getUploadPreviewUrl(file);

    if (url) {
      setPreviewUrl(url);
      setPreviewOpen(true);
    }
  };

  const handleReferenceUpload = (file: File & { uid?: string }, batchFiles: Array<File & { uid?: string }>) => {
    const selectedBatch = Array.isArray(batchFiles) && batchFiles.length > 0 ? batchFiles : [file];

    if (selectedBatch.length > 1 && file.uid !== selectedBatch[0]?.uid) {
      return Upload.LIST_IGNORE;
    }

    const availableSlots = Math.max(0, maxImageCount - refImages.length);
    const filesToAppend = selectedBatch.slice(0, availableSlots);

    if (filesToAppend.length === 0) {
      message.info(`当前模式最多上传 ${maxImageCount} 张图片`);
      return Upload.LIST_IGNORE;
    }

    void Promise.all(
      filesToAppend.map(async (selectedFile) => createUploadFile(selectedFile, await readBlobAsDataUrl(selectedFile))),
    ).then((nextFiles) => {
      setRefImages([...refImages, ...nextFiles].slice(0, maxImageCount));
    });

    return Upload.LIST_IGNORE;
  };

  const getImageBase64List = async (mode: TImageToVideoMode) => {
    const imageBase64List: string[] = [];
    const imagesToRead =
      mode === "reference" ? refImages : refImages.slice(0, mode === "first-last-frame" ? 2 : 1);

    for (const image of imagesToRead) {
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

  const handleRemoveReferenceImage = (file: UploadFile) => {
    setRefImages(refImages.filter((item) => item.uid !== file.uid));
  };

  const handleGenerate = async () => {
    try {
      const values = await form.validateFields();

      if (refImages.length < minImageCount) {
        message.error(
          values.imageMode === "first-last-frame" ? "首尾帧控制需要上传 2 张图片" : "请上传至少 1 张图片",
        );
        return;
      }

      setLoading(true);
      setResult(null);
      setSavedSampleId(undefined);
      setResult(
        await generateImageToVideo({
          model: values.imageToVideoModel,
          imageMode: values.imageMode,
          prompt: values.prompt,
          imageBase64List: await getImageBase64List(values.imageMode),
          ratio: values.ratio,
          duration: values.duration,
          resolution: values.resolution,
          seed: values.seed,
          generateAudio: values.generateAudio,
          watermark: values.watermark,
          cameraFixed: values.cameraFixed,
          seedanceAccessKey: values.imageToVideoModel === "volc-seedance-2-fast" ? seedance2AccessKey : undefined,
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
      const modelLabel = getGenerationModelLabel(values.imageToVideoModel);
      const sample = await saveGeneratedContent({
        type: "video",
        title: `AI 图生视频 - ${(values.prompt || "").substring(TITLE_PROMPT_PREVIEW_START_INDEX, TITLE_PROMPT_PREVIEW_LENGTH)}...`,
        url: result.videoUrl,
        sourceModule: "image-to-video",
        model: modelLabel,
        prompt: values.prompt,
      });
      setSavedSampleId(sample.id);
      message.success({ content: "已保存到内容管理", duration: MESSAGE_DURATION_SECONDS });
      setTimeout(() => navigate(DATA_OUTPUT_ROUTE), SAVE_NAVIGATION_DELAY_MS);
    } catch (error) {
      console.error("Save error:", error);
    }
  };

  const handleSendToDetect = async (target: TGeneratedDetectTarget) => {
    if (!result?.videoUrl) {
      message.warning("暂无可送检的生成视频");
      return;
    }

    const values = form.getFieldsValue();
    const modelLabel = getGenerationModelLabel(values.imageToVideoModel);
    let sampleId = savedSampleId;

    try {
      if (!sampleId) {
        const sample = await saveGeneratedContent({
          type: "video",
          title: `AI 图生视频 - ${(values.prompt || "").substring(TITLE_PROMPT_PREVIEW_START_INDEX, TITLE_PROMPT_PREVIEW_LENGTH)}...`,
          url: result.videoUrl,
          sourceModule: "image-to-video",
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
      mediaType: "video",
      target,
      title: values.prompt,
      model: modelLabel,
      sourceModule: "image-to-video",
      sampleId,
    });

    if (!sent) {
      message.warning("暂无可送检的生成视频");
    }
  };

  const handleImageToVideoModelChange = (value: TImageToVideoModel) => {
    if (value === "volc-seedance-2-fast" && !seedance2Authorized) {
      form.setFieldsValue({ imageToVideoModel: DEFAULT_I2V_MODEL });
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
    form.setFieldsValue({ imageToVideoModel: "volc-seedance-2-fast" });
    message.success("Seedance 2.0 fast 已解锁");
  };

  return (
    <>
      <Row gutter={GRID_GUTTER} className="image-to-video-layout">
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
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                imageToVideoModel: DEFAULT_I2V_MODEL,
                imageMode: DEFAULT_I2V_MODE,
                duration: DEFAULT_I2V_DURATION,
                ratio: DEFAULT_VIDEO_RATIO,
                resolution: DEFAULT_I2V_RESOLUTION,
                seed: DEFAULT_I2V_SEED,
                generateAudio: DEFAULT_I2V_GENERATE_AUDIO,
                watermark: DEFAULT_VIDEO_WATERMARK,
                cameraFixed: DEFAULT_I2V_CAMERA_FIXED,
              }}
            >
              <Form.Item
                label="生成模型"
                name="imageToVideoModel"
                tooltip="图生视频统一由后端创建方舟异步任务并轮询结果"
                rules={[{ required: true, message: "请选择模型" }]}
              >
                <Select onChange={handleImageToVideoModelChange}>
                  {IMAGE_TO_VIDEO_MODEL_OPTIONS.map((option) => (
                    <Select.Option key={option.value} value={option.value}>
                      <span className="model-select-option">
                        <span className="model-select-option-label">{option.label}</span>
                        {IMAGE_TO_VIDEO_MODEL_BADGES[option.value] && (
                          <span className="model-select-option-badge">{IMAGE_TO_VIDEO_MODEL_BADGES[option.value]}</span>
                        )}
                      </span>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <ImageToVideoModelIntroCard selectedModel={imageToVideoModel} />
              <Form.Item label="图像控制方式" name="imageMode" rules={[{ required: true, message: "请选择图像控制方式" }]}>
                <Segmented block options={imageModeOptions} />
              </Form.Item>
              <Paragraph className="image-to-video-mode-help">{IMAGE_TO_VIDEO_MODE_HELP_TEXT[imageMode]}</Paragraph>
              <Form.Item
                className="image-to-video-upload-form-item"
                label={imageMode === "first-last-frame" ? "首帧 / 尾帧图片" : "参考图片"}
                required
                tooltip={
                  imageMode === "reference"
                    ? I2V_REFERENCE_TOOLTIP
                    : "按上传顺序读取图片；首帧驱动只使用第 1 张，首尾帧控制使用前 2 张"
                }
              >
                <Upload
                  accept="image/jpeg,image/png,image/jpg,image/webp"
                  multiple
                  showUploadList={false}
                  beforeUpload={handleReferenceUpload}
                >
                  <div className={`image-to-video-upload-panel ${maxImageCount > I2V_MAX_IMAGE_COUNT ? "is-many" : ""}`}>
                    <div className="image-to-video-upload-panel-head">
                      <div>
                        <span className="image-to-video-upload-title">{I2V_UPLOAD_TEXT}</span>
                        <span className="image-to-video-upload-count">
                          {refImages.length}/{maxImageCount}
                        </span>
                      </div>
                      <span className="image-to-video-upload-hint">点击空槽或拖入图片，支持一次选择多张</span>
                    </div>
                    <div className="image-to-video-upload-grid">
                      {Array.from({ length: maxImageCount }).map((_, index) => {
                        const file = refImages[index];
                        const previewSource = file?.url || file?.thumbUrl;

                        return (
                          <div
                            key={file?.uid || `reference-slot-${index}`}
                            className={`image-to-video-upload-slot ${file ? "has-image" : ""}`}
                          >
                            {file && previewSource ? (
                              <>
                                <img src={previewSource} alt={`参考图 ${index + 1}`} />
                                <span className="image-to-video-upload-index">图{index + 1}</span>
                                <div className="image-to-video-upload-actions">
                                  <Button
                                    type="text"
                                    size="small"
                                    icon={<EyeOutlined />}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      void handleUploadPreview(file);
                                    }}
                                  />
                                  <Button
                                    type="text"
                                    size="small"
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleRemoveReferenceImage(file);
                                    }}
                                  />
                                </div>
                              </>
                            ) : (
                              <div className="image-to-video-upload-empty">
                                <PlusOutlined />
                                <span>{index === refImages.length ? "添加图片" : `图${index + 1}`}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Upload>
              </Form.Item>
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
              <div className="text-to-image-advanced image-to-video-advanced">
                <div className="text-to-image-advanced-title">
                  <Space size={8}>
                    <SlidersOutlined />
                    <span>生成控制</span>
                  </Space>
                </div>
                <Row gutter={[12, 12]}>
                  <Col xs={COL_FULL_SPAN} md={12}>
                    <Form.Item label="分辨率" name="resolution" rules={[{ required: true, message: "请选择分辨率" }]}>
                      <Select>
                        {resolutionOptions.map((option) => (
                          <Select.Option key={option.value} value={option.value}>
                            {option.label}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col xs={COL_FULL_SPAN} md={12}>
                    <Form.Item label="画幅比例" name="ratio" rules={[{ required: true, message: "请选择画幅比例" }]}>
                      <Select>
                        {ratioOptions.map((option) => (
                          <Select.Option key={option.value} value={option.value}>
                            {option.label}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col xs={COL_FULL_SPAN} md={12}>
                    <Form.Item
                      label="生成时长"
                      name="duration"
                      rules={[{ required: true, message: "请选择时长" }]}
                      tooltip={durationTooltip}
                    >
                      <Select>
                        {durationOptions.map((option) => (
                          <Select.Option key={option.value} value={option.value}>
                            {option.label}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col xs={COL_FULL_SPAN} md={12}>
                    <Form.Item label="随机种子" name="seed" tooltip={SEEDANCE_2_SEED_TOOLTIP}>
                      <InputNumber min={-1} max={4294967295} precision={0} style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>
                  {isModernSeedance && (
                    <Col xs={COL_FULL_SPAN} md={12}>
                      <Form.Item label="同步音频" name="generateAudio" valuePropName="checked">
                        <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                      </Form.Item>
                    </Col>
                  )}
                  <Col xs={COL_FULL_SPAN} md={12}>
                    <Form.Item label="视频水印" name="watermark" valuePropName="checked">
                      <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                    </Form.Item>
                  </Col>
                  {supportsCameraFixed && (
                    <Col xs={COL_FULL_SPAN} md={12}>
                      <Form.Item
                        label="固定摄像头"
                        name="cameraFixed"
                        valuePropName="checked"
                        tooltip="参考图融合和 Seedance 2.0 Fast 不支持该参数"
                      >
                        <Switch checkedChildren="固定" unCheckedChildren="自由" />
                      </Form.Item>
                    </Col>
                  )}
                </Row>
                <Space size={8} wrap className="text-to-video-advanced-tags image-to-video-advanced-tags">
                  <span>强校验参数</span>
                  <span>
                    {imageMode === "reference" ? "参考图融合" : imageMode === "first-frame" ? "首帧驱动" : "首尾帧控制"}
                  </span>
                  <span>{isModernSeedance ? "24 FPS / 可同步音频" : "24 FPS"}</span>
                </Space>
              </div>
            </Form>
          </Card>
        </Col>

        <Col xs={COL_FULL_SPAN} lg={10}>
          <MediaResultCard
            title="生成结果"
            className="text-to-image-result-card text-to-video-result-card image-to-video-result-card"
            loading={loading}
            loadingText="正在生成视频，请稍候..."
            emptyText="图生视频结果将显示在这里"
            result={result}
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

      <ImagePreviewModal open={previewOpen} imageUrl={previewUrl} onClose={() => setPreviewOpen(false)} />
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
    </>
  );
};
