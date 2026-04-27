import { useState } from "react";
import { Col, message, Row, Select, Tabs, Typography } from "antd";
import { PictureOutlined, VideoCameraOutlined } from "@ant-design/icons";
import type { UploadFile, UploadProps } from "antd";

import { ImageDetectInputCard } from "@/components/Detect/common/ImageDetectInputCard";
import { VideoInputCard } from "@/components/Detect/common/VideoInputCard";
import { UnsafeDetectResultCard, RISK_CONFIG } from "@/components/Detect/Unsafe/UnsafeDetectResultCard";
import {
  DEFAULT_UNSAFE_MODEL,
  DETECT_STEP_INPUT,
  DETECT_STEP_READY,
  DETECT_STEP_RESULT,
  EMPTY_SELECTION_COUNT,
  SAFETY_DETECTION_MODELS,
  VIOLATION_LABELS,
} from "@/constants/detect";
import {
  COL_FULL_SPAN,
  COL_HALF_LG_SPAN,
  FULL_WIDTH,
  GRID_GUTTER,
  SCROLL_AFTER_RESULT_DELAY_MS,
  TITLE_LEVEL_TWO,
} from "@/constants/ui";
import { detectUnsafeImage, detectUnsafeVideo } from "@/services/detect";
import type { IDetectMediaBody, IUnsafeDetectionResult, TDetectContentKind, TDetectInputTab } from "@/typings/detect";
import { assertValidUrl, createImageDetectBody, createRemoteUploadFile, createUnsafeReport } from "@/utils/detect";
import { downloadTextFile } from "@/utils/media";
import { getBase64FromUploadFile } from "@/utils/media";

const { Title, Paragraph } = Typography;

const UnsafeDetectPage = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IUnsafeDetectionResult | null>(null);
  const [uploadedFile, setUploadedFile] = useState<UploadFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [contentKind, setContentKind] = useState<TDetectContentKind>("image");
  const [activeTab, setActiveTab] = useState<TDetectInputTab>("upload");
  const [selectedModels, setSelectedModels] = useState<string[]>([DEFAULT_UNSAFE_MODEL]);
  const [currentStep, setCurrentStep] = useState(DETECT_STEP_INPUT);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [videoPreviewUrl, setVideoPreviewUrl] = useState("");
  const [videoUploadFileName, setVideoUploadFileName] = useState("");
  const [videoInputTab, setVideoInputTab] = useState<TDetectInputTab>("upload");

  const scrollToResult = () => {
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), SCROLL_AFTER_RESULT_DELAY_MS);
  };

  const resetDetection = () => {
    setResult(null);
    setCurrentStep(DETECT_STEP_INPUT);

    if (contentKind === "video") {
      setVideoUrlInput("");
      setVideoPreviewUrl("");
      setVideoUploadFileName("");
      setVideoFile(null);
      return;
    }

    setUploadedFile(null);
    setPreviewUrl("");
    setUrlInput("");
    setSelectedModels([DEFAULT_UNSAFE_MODEL]);
  };

  const handleImageUpload: UploadProps["customRequest"] = async ({ file }) => {
    const uploadFile = file as File;

    if (!uploadFile.type.startsWith("image/")) {
      message.warning("当前仅支持图片检测，请上传图片（JPG、PNG 等）");
      return;
    }

    setUploadedFile({
      uid: uploadFile.name,
      name: uploadFile.name,
      status: "done",
      originFileObj: uploadFile as UploadFile["originFileObj"],
    });
    setPreviewUrl(URL.createObjectURL(uploadFile));
    setCurrentStep(DETECT_STEP_READY);
    message.success("文件上传成功，请选择检测方法");
  };

  const handleUrlLoad = () => {
    const nextUrl = urlInput.trim();

    if (!nextUrl) {
      message.warning("请输入URL地址");
      return;
    }

    try {
      assertValidUrl(nextUrl, "URL格式不正确，请输入有效的URL");
      setPreviewUrl(nextUrl);
      setUploadedFile(createRemoteUploadFile(nextUrl));
      setCurrentStep(DETECT_STEP_READY);
      message.success("URL加载成功，请选择检测方法");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "URL加载失败，请检查地址是否正确");
    }
  };

  const handleVideoFileChange = (file: File) => {
    setVideoFile(file);
    setVideoPreviewUrl(URL.createObjectURL(file));
    setVideoUploadFileName(file.name || "视频");
    setVideoUrlInput("");
    setCurrentStep(DETECT_STEP_READY);
    message.success("视频已选择，将使用 Base64 直接检测");
  };

  const handleVideoUrlLoad = () => {
    const nextUrl = videoUrlInput.trim();

    if (!nextUrl) {
      message.warning("请输入视频 URL");
      return;
    }

    try {
      assertValidUrl(nextUrl, "URL 格式不正确");
      setVideoFile(null);
      setVideoPreviewUrl(nextUrl);
      setVideoUploadFileName(nextUrl.split("/").pop() || "视频");
      setCurrentStep(DETECT_STEP_READY);
      message.success("已加载视频地址，可开始检测");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "URL 格式不正确");
    }
  };

  const handleDetect = async () => {
    if (contentKind === "video") {
      await handleVideoDetect();
      return;
    }

    if (!uploadedFile) {
      message.warning("请先上传文件");
      return;
    }

    if (selectedModels.length === EMPTY_SELECTION_COUNT) {
      message.warning("请至少选择一个检测模型");
      return;
    }

    try {
      setLoading(true);
      setResult(null);
      setResult(await detectUnsafeImage(await createImageDetectBody(activeTab, uploadedFile, urlInput)));
      setCurrentStep(DETECT_STEP_RESULT);
      message.success(`检测完成（${selectedModels.join(", ")}）`);
      scrollToResult();
    } catch (error) {
      console.error("Detection error:", error);
      message.error(error instanceof Error ? error.message : "检测失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleVideoDetect = async () => {
    if (!videoPreviewUrl && !videoFile && !videoUrlInput.trim()) {
      message.warning("请先上传视频或输入视频 URL 并加载");
      return;
    }

    try {
      setLoading(true);
      setResult(null);
      const body: IDetectMediaBody = {};

      if (videoFile) {
        body.videoBase64 = await getBase64FromUploadFile({
          uid: videoFile.name,
          name: videoFile.name,
          status: "done",
          originFileObj: videoFile as UploadFile["originFileObj"],
        });
      } else {
        const nextUrl = videoPreviewUrl || videoUrlInput.trim();
        assertValidUrl(nextUrl, "URL 格式不正确");
        body.videoUrl = nextUrl;
        setVideoPreviewUrl(nextUrl);
      }

      setResult(await detectUnsafeVideo(body));
      setCurrentStep(DETECT_STEP_RESULT);
      message.success("视频敏感检测完成");
      scrollToResult();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "检测失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = () => {
    if (!result) {
      return;
    }

    const reportContent = createUnsafeReport({
      result,
      filename: contentKind === "video" ? videoUploadFileName || "视频" : uploadedFile?.name || "未知",
      riskText: RISK_CONFIG[result.risk].text,
      violationLabels: VIOLATION_LABELS,
    });
    downloadTextFile(reportContent, `unsafe-detection-report-${Date.now()}.txt`);
    message.success("检测报告已下载！");
  };

  const uploadProps: UploadProps = {
    name: "file",
    multiple: false,
    customRequest: handleImageUpload,
    showUploadList: false,
    accept: "image/*",
  };

  return (
    <div className="page-transition">
      <div className="page-header">
        <Title level={TITLE_LEVEL_TWO} className="page-title">
          不安全内容检测
        </Title>
        <Paragraph className="page-description">
          对图像/视频进行多维度安全审核：识别暴力、色情、仇恨符号等违规内容，输出风险等级与违规类型标签，支持内容安全审核与合规评估。
        </Paragraph>
      </div>

      <Tabs
        activeKey={contentKind}
        onChange={(key) => {
          setContentKind(key as TDetectContentKind);
          setResult(null);
          setCurrentStep(DETECT_STEP_INPUT);
        }}
        size="large"
        style={{ marginBottom: GRID_GUTTER }}
        items={[
          {
            key: "image",
            label: (
              <span>
                <PictureOutlined /> 图片检测
              </span>
            ),
            children: (
              <Row gutter={GRID_GUTTER}>
                <Col xs={COL_FULL_SPAN} lg={COL_HALF_LG_SPAN}>
                  <ImageDetectInputCard
                    title="上传待检测内容"
                    activeTab={activeTab}
                    loading={loading}
                    uploadedFile={uploadedFile}
                    previewUrl={previewUrl}
                    currentStep={currentStep}
                    hasResult={Boolean(result)}
                    urlInput={urlInput}
                    uploadHint="支持图片（JPG、PNG 等）"
                    uploadProps={uploadProps}
                    onActiveTabChange={setActiveTab}
                    onUrlInputChange={setUrlInput}
                    onUrlLoad={handleUrlLoad}
                    onDetect={handleDetect}
                    onReset={resetDetection}
                    detectButtonText={`使用 ${selectedModels.length} 个模型开始检测`}
                    detectButtonDisabled={selectedModels.length === EMPTY_SELECTION_COUNT}
                    modelSelector={
                      <Select
                        mode="multiple"
                        size="large"
                        value={selectedModels}
                        onChange={setSelectedModels}
                        optionLabelProp="label"
                        placeholder="请选择检测模型/API"
                        style={{ width: FULL_WIDTH }}
                      >
                        {SAFETY_DETECTION_MODELS.map((model) => (
                          <Select.Option key={model.value} value={model.value} label={model.label}>
                            {model.label}
                          </Select.Option>
                        ))}
                      </Select>
                    }
                  />
                </Col>
                <Col xs={COL_FULL_SPAN} lg={COL_HALF_LG_SPAN}>
                  <UnsafeDetectResultCard
                    loading={loading}
                    result={result}
                    emptyTitle="等待上传文件"
                    emptyDescription="上传后将显示安全检测结果"
                    onDownloadReport={handleDownloadReport}
                  />
                </Col>
              </Row>
            ),
          },
          {
            key: "video",
            label: (
              <span>
                <VideoCameraOutlined /> 视频检测
              </span>
            ),
            children: (
              <Row gutter={GRID_GUTTER}>
                <Col xs={COL_FULL_SPAN} lg={COL_HALF_LG_SPAN}>
                  <VideoInputCard
                    title="上传待检测视频"
                    inputTab={videoInputTab}
                    loading={loading}
                    videoFile={videoFile}
                    videoUrlInput={videoUrlInput}
                    videoPreviewUrl={videoPreviewUrl}
                    videoUploadFileName={videoUploadFileName}
                    detectButtonDisabled={!videoPreviewUrl && !videoFile && !videoUrlInput.trim()}
                    onInputTabChange={setVideoInputTab}
                    onVideoFileChange={handleVideoFileChange}
                    onVideoUrlInputChange={setVideoUrlInput}
                    onVideoUrlLoad={handleVideoUrlLoad}
                    onDetect={handleDetect}
                    onReset={resetDetection}
                  />
                </Col>
                <Col xs={COL_FULL_SPAN} lg={COL_HALF_LG_SPAN}>
                  <UnsafeDetectResultCard
                    loading={loading}
                    result={result}
                    emptyTitle="等待上传视频"
                    emptyDescription="上传或输入视频 URL 后将显示安全检测结果"
                    onDownloadReport={handleDownloadReport}
                  />
                </Col>
              </Row>
            ),
          },
        ]}
      />
    </div>
  );
};

export default UnsafeDetectPage;
