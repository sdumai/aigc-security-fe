import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Col, message, Row, Select, Tabs, Typography } from "antd";
import { PictureOutlined, VideoCameraOutlined } from "@ant-design/icons";
import type { UploadFile, UploadProps } from "antd";

import { DetectModelIntroCard } from "@/components/Detect/common/DetectModelIntroCard";
import { ImageDetectInputCard } from "@/components/Detect/common/ImageDetectInputCard";
import { VideoInputCard } from "@/components/Detect/common/VideoInputCard";
import { FakeDetectResultCard } from "@/components/Detect/Fake/FakeDetectResultCard";
import {
  DEFAULT_IMAGE_DETECT_BACKEND,
  DEFAULT_VIDEO_UNDERSTANDING_FPS,
  DETECT_STEP_INPUT,
  DETECT_STEP_READY,
  DETECT_STEP_RESULT,
  IMAGE_DETECT_BACKENDS,
  MAX_LOCAL_VIDEO_BASE64_BYTES,
  MAX_LOCAL_VIDEO_BASE64_MB,
} from "@/constants/detect";
import {
  COL_FULL_SPAN,
  COL_HALF_LG_SPAN,
  FULL_WIDTH,
  GRID_GUTTER,
  SCROLL_AFTER_RESULT_DELAY_MS,
  SMALL_SPACE_SIZE,
  TITLE_LEVEL_TWO,
} from "@/constants/ui";
import { detectFakeImage, detectFakeVideo } from "@/services/detect";
import type { IDetectMediaBody, IFakeDetectionResult, TDetectContentKind, TDetectInputTab, TImageDetectBackend } from "@/typings/detect";
import { assertValidUrl, createImageDetectBody, createRemoteUploadFile } from "@/utils/detect";
import { getDetectTargetLabel, getGeneratedDetectTransfer, isDataUrl } from "@/utils/detectTransfer";
import { createUploadFile, dataUrlToFile, getBase64FromUploadFile } from "@/utils/media";

const { Title, Paragraph } = Typography;

const FakeDetectPage = () => {
  const location = useLocation();
  const handledTransferKeyRef = useRef("");
  const [detectType, setDetectType] = useState<TDetectContentKind>("image");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IFakeDetectionResult | null>(null);
  const [uploadedFile, setUploadedFile] = useState<UploadFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUploadFileName, setVideoUploadFileName] = useState("");
  const [videoPreviewUrl, setVideoPreviewUrl] = useState("");
  const [videoFps, setVideoFps] = useState(DEFAULT_VIDEO_UNDERSTANDING_FPS);
  const [activeTab, setActiveTab] = useState<TDetectInputTab>("upload");
  const [videoInputTab, setVideoInputTab] = useState<TDetectInputTab>("upload");
  const [imageDetectBackend, setImageDetectBackend] = useState<TImageDetectBackend>(DEFAULT_IMAGE_DETECT_BACKEND);
  const [currentStep, setCurrentStep] = useState(DETECT_STEP_INPUT);

  useEffect(() => {
    const transfer = getGeneratedDetectTransfer(location.state, "fake");

    if (!transfer) {
      return;
    }

    const transferKey = `${transfer.target}-${transfer.mediaType}-${transfer.createdAt}-${transfer.url.length}`;
    if (handledTransferKeyRef.current === transferKey) {
      return;
    }
    handledTransferKeyRef.current = transferKey;

    setLoading(false);
    setResult(null);
    setDetectType(transfer.mediaType);
    setCurrentStep(DETECT_STEP_READY);

    if (transfer.mediaType === "image") {
      setVideoUrl("");
      setVideoPreviewUrl("");
      setVideoFile(null);
      setVideoUploadFileName("");

      if (isDataUrl(transfer.url)) {
        const file = dataUrlToFile(transfer.url, transfer.filename);
        setActiveTab("upload");
        setUrlInput("");
        setUploadedFile(createUploadFile(file, transfer.url));
        setPreviewUrl(transfer.url);
      } else {
        setActiveTab("url");
        setUrlInput(transfer.url);
        setUploadedFile(createRemoteUploadFile(transfer.url));
        setPreviewUrl(transfer.url);
      }
    } else {
      setUploadedFile(null);
      setPreviewUrl("");
      setUrlInput("");

      if (isDataUrl(transfer.url)) {
        const file = dataUrlToFile(transfer.url, transfer.filename);
        setVideoInputTab("upload");
        setVideoFile(file);
        setVideoUrl("");
        setVideoPreviewUrl(transfer.url);
        setVideoUploadFileName(transfer.filename);
      } else {
        setVideoInputTab("url");
        setVideoFile(null);
        setVideoUrl(transfer.url);
        setVideoPreviewUrl(transfer.url);
        setVideoUploadFileName(transfer.filename);
      }
    }

    message.success(`已送入${getDetectTargetLabel("fake")}，可直接开始检测`);
  }, [location.state]);

  const scrollToResult = () => {
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), SCROLL_AFTER_RESULT_DELAY_MS);
  };

  const handleImageUpload: UploadProps["customRequest"] = async ({ file }) => {
    const uploadFile = file as File;

    if (!uploadFile.type.startsWith("image/")) {
      message.warning("当前为「图片 AI 合成检测」，仅支持图片。请选择 JPG、PNG 等图片文件。");
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

  const handleImageDetect = async () => {
    if (!uploadedFile) {
      message.warning("请先上传文件");
      return;
    }

    try {
      setLoading(true);
      setResult(null);
      const body = await createImageDetectBody(activeTab, uploadedFile, urlInput);
      setResult(await detectFakeImage({ body, backend: imageDetectBackend, previewUrl }));
      setCurrentStep(DETECT_STEP_RESULT);
      message.success("AI 图片生成检测完成");
      scrollToResult();
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "检测失败，请重试";
      const friendlyMessage =
        rawMessage === "Failed to fetch" || rawMessage.includes("NetworkError") || rawMessage.includes("Load failed")
          ? "请求失败：请先启动代理（另开终端执行 npm run dev:proxy 或 node server/index.cjs）"
          : rawMessage;
      message.error(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoFileChange = (file: File) => {
    setVideoFile(file);
    setVideoPreviewUrl(URL.createObjectURL(file));
    setVideoUploadFileName(file.name || "视频文件");
    setVideoUrl("");
    setCurrentStep(DETECT_STEP_READY);
    message.success("已选择视频，可点击开始检测");
  };

  const handleVideoDetect = async () => {
    const inputUrl = videoUrl.trim();
    const preview = videoPreviewUrl || inputUrl;

    if (!preview && !videoFile) {
      message.warning("请输入视频 URL 或选择本地视频");
      return;
    }

    try {
      setLoading(true);
      setResult(null);
      const body: IDetectMediaBody = {};
      body.fps = videoFps;

      if (videoFile) {
        if (videoFile.size > MAX_LOCAL_VIDEO_BASE64_BYTES) {
          message.warning(`本地上传建议不超过 ${MAX_LOCAL_VIDEO_BASE64_MB}MB，请使用视频 URL`);
          return;
        }
        body.videoBase64 = await getBase64FromUploadFile({
          uid: videoFile.name,
          name: videoFile.name,
          status: "done",
          originFileObj: videoFile as UploadFile["originFileObj"],
        });
      } else {
        assertValidUrl(inputUrl, "视频地址无效");
        body.videoUrl = inputUrl;
        setVideoPreviewUrl(inputUrl);
      }

      setResult(await detectFakeVideo({ body, previewUrl: preview }));
      setCurrentStep(DETECT_STEP_RESULT);
      message.success("视频检测完成");
      scrollToResult();
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "视频检测失败";
      const friendlyMessage =
        messageText.includes("Unexpected token") || messageText.includes("is not valid JSON")
          ? "代理未返回 JSON，请先启动 node server/index.cjs"
          : messageText;
      message.error(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetDetection = () => {
    setResult(null);
    setUploadedFile(null);
    setPreviewUrl("");
    setUrlInput("");
    setVideoUrl("");
    setVideoPreviewUrl("");
    setVideoFile(null);
    setVideoFps(DEFAULT_VIDEO_UNDERSTANDING_FPS);
    setVideoUploadFileName("");
    setCurrentStep(DETECT_STEP_INPUT);
    setImageDetectBackend(DEFAULT_IMAGE_DETECT_BACKEND);
  };

  const uploadProps: UploadProps = {
    name: "file",
    multiple: false,
    customRequest: handleImageUpload,
    showUploadList: false,
    accept: "image/*",
  };

  return (
    <div className="page-transition detect-page fake-detect-page">
      <div className="page-header">
        <Title level={TITLE_LEVEL_TWO} className="page-title">
          合成媒体与深度伪造检测
        </Title>
        <Paragraph className="page-description">
          本页提供两类检测入口：<strong>图片 AI 合成检测</strong>（判定单张图像是否经 AI 生成或篡改，支持
          Deepfake、FaceSwap 等，输出可疑区域定位与分析报告）、<strong>视频 AI 合成检测</strong>（对视频进行 AI
          生成/深度伪造判定）。
        </Paragraph>
      </div>

      <Tabs
        className="detect-top-tabs"
        activeKey={detectType}
        onChange={(key) => {
          setDetectType(key as TDetectContentKind);
          setResult(null);
          setCurrentStep(DETECT_STEP_INPUT);
        }}
        items={[
          {
            key: "image",
            label: (
              <span>
                <PictureOutlined /> 图片 AI 合成检测
              </span>
            ),
            children: (
              <Row gutter={GRID_GUTTER} className="detect-workspace">
                <Col xs={COL_FULL_SPAN} lg={COL_HALF_LG_SPAN}>
                  <ImageDetectInputCard
                    title="上传待检测图片"
                    activeTab={activeTab}
                    loading={loading}
                    uploadedFile={uploadedFile}
                    previewUrl={previewUrl}
                    currentStep={currentStep}
                    hasResult={Boolean(result)}
                    urlInput={urlInput}
                    uploadHint="仅支持图片格式（JPG、PNG）"
                    uploadProps={uploadProps}
                    faceRegion={result?.details.faceRegion}
                    onActiveTabChange={setActiveTab}
                    onUrlInputChange={setUrlInput}
                    onUrlLoad={handleUrlLoad}
                    onDetect={handleImageDetect}
                    onReset={resetDetection}
                    detectButtonText={`开始检测（${IMAGE_DETECT_BACKENDS.find((backend) => backend.value === imageDetectBackend)?.label || ""}）`}
                    modelIntro={<DetectModelIntroCard selectedBackend={imageDetectBackend} />}
                    modelSelector={
                      <Select
                        size="large"
                        value={imageDetectBackend}
                        onChange={(value) => setImageDetectBackend(value)}
                        optionLabelProp="label"
                        style={{ width: FULL_WIDTH }}
                      >
                        {IMAGE_DETECT_BACKENDS.map((backend) => (
                          <Select.Option key={backend.value} value={backend.value} label={backend.label}>
                            {backend.label}
                          </Select.Option>
                        ))}
                      </Select>
                    }
                  />
                </Col>
                <Col xs={COL_FULL_SPAN} lg={COL_HALF_LG_SPAN}>
                  <FakeDetectResultCard detectType={detectType} loading={loading} result={result} />
                </Col>
              </Row>
            ),
          },
          {
            key: "video",
            label: (
              <span>
                <VideoCameraOutlined /> 视频 AI 合成检测
              </span>
            ),
            children: (
              <Row gutter={GRID_GUTTER} className="detect-workspace">
                <Col xs={COL_FULL_SPAN} lg={COL_HALF_LG_SPAN}>
                  <VideoInputCard
                    title="上传待检测视频"
                    modelIntro={<DetectModelIntroCard selectedBackend="volc" />}
                    description={
                      <Paragraph type="secondary" style={{ marginBottom: SMALL_SPACE_SIZE }}>
                        对视频进行合成/深度伪造检测，使用<strong>火山引擎</strong>多模态视频理解。支持公网 URL
                        或本地上传（建议 ≤{MAX_LOCAL_VIDEO_BASE64_MB}MB）。
                      </Paragraph>
                    }
                    inputTab={videoInputTab}
                    loading={loading}
                    videoFile={videoFile}
                    videoUrlInput={videoUrl}
                    videoPreviewUrl={videoPreviewUrl}
                    videoUploadFileName={videoUploadFileName}
                    fps={videoFps}
                    detectButtonDisabled={!videoFile && !videoUrl.trim()}
                    onInputTabChange={(tab) => {
                      setVideoInputTab(tab);
                      if (tab === "url") {
                        setVideoFile(null);
                        setVideoUploadFileName("");
                      }
                    }}
                    onVideoFileChange={handleVideoFileChange}
                    onVideoUrlInputChange={(value) => {
                      setVideoUrl(value);
                      setVideoPreviewUrl("");
                    }}
                    onFpsChange={setVideoFps}
                    onDetect={handleVideoDetect}
                    onReset={resetDetection}
                  />
                </Col>
                <Col xs={COL_FULL_SPAN} lg={COL_HALF_LG_SPAN}>
                  <FakeDetectResultCard detectType={detectType} loading={loading} result={result} />
                </Col>
              </Row>
            ),
          },
        ]}
      />
    </div>
  );
};

export default FakeDetectPage;
