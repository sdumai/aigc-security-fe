import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Col, message, Row, Tabs, Typography } from "antd";
import { PictureOutlined, VideoCameraOutlined } from "@ant-design/icons";
import type { UploadFile, UploadProps } from "antd";

import { DetectModelIntroCard } from "@/components/Detect/common/DetectModelIntroCard";
import { ImageDetectInputCard } from "@/components/Detect/common/ImageDetectInputCard";
import { VideoInputCard } from "@/components/Detect/common/VideoInputCard";
import { UnsafeDetectResultCard, RISK_CONFIG } from "@/components/Detect/Unsafe/UnsafeDetectResultCard";
import {
  DEFAULT_VIDEO_UNDERSTANDING_FPS,
  DETECT_STEP_INPUT,
  DETECT_STEP_READY,
  DETECT_STEP_RESULT,
  VIOLATION_LABELS,
} from "@/constants/detect";
import {
  COL_FULL_SPAN,
  COL_HALF_LG_SPAN,
  GRID_GUTTER,
  SCROLL_AFTER_RESULT_DELAY_MS,
  TITLE_LEVEL_TWO,
} from "@/constants/ui";
import { saveDetectionRecord } from "@/services/content";
import { detectUnsafeImage, detectUnsafeVideo } from "@/services/detect";
import type { TGeneratedSourceModule } from "@/typings/content";
import type {
  IDetectMediaBody,
  IGeneratedDetectTransfer,
  IUnsafeDetectionResult,
  TDetectContentKind,
  TDetectInputTab,
} from "@/typings/detect";
import { assertValidUrl, createImageDetectBody, createRemoteUploadFile, createUnsafeReport } from "@/utils/detect";
import {
  createFileFromTransfer,
  getDetectTargetLabel,
  getGeneratedDetectTransfer,
  shouldUseTransferAsFile,
} from "@/utils/detectTransfer";
import { createUploadFile, downloadTextFile, getBase64FromUploadFile } from "@/utils/media";

const { Title, Paragraph } = Typography;

const UnsafeDetectPage = () => {
  const location = useLocation();
  const handledTransferKeyRef = useRef("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IUnsafeDetectionResult | null>(null);
  const [uploadedFile, setUploadedFile] = useState<UploadFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [contentKind, setContentKind] = useState<TDetectContentKind>("image");
  const [activeTab, setActiveTab] = useState<TDetectInputTab>("upload");
  const [currentStep, setCurrentStep] = useState(DETECT_STEP_INPUT);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [videoPreviewUrl, setVideoPreviewUrl] = useState("");
  const [videoUploadFileName, setVideoUploadFileName] = useState("");
  const [videoFps, setVideoFps] = useState(DEFAULT_VIDEO_UNDERSTANDING_FPS);
  const [videoInputTab, setVideoInputTab] = useState<TDetectInputTab>("upload");
  const [activeSampleId, setActiveSampleId] = useState<string | undefined>();
  const [activeTransfer, setActiveTransfer] = useState<IGeneratedDetectTransfer | null>(null);

  useEffect(() => {
    const transfer = getGeneratedDetectTransfer(location.state, "unsafe");

    if (!transfer) {
      return;
    }

    const transferKey = `${transfer.target}-${transfer.mediaType}-${transfer.createdAt}-${transfer.url.length}`;
    if (handledTransferKeyRef.current === transferKey) {
      return;
    }
    handledTransferKeyRef.current = transferKey;

    let cancelled = false;

    const applyTransfer = async () => {
      try {
        setLoading(false);
        setResult(null);
        setContentKind(transfer.mediaType);
        setCurrentStep(DETECT_STEP_READY);
        setActiveSampleId(transfer.sampleId);
        setActiveTransfer(transfer);

        if (transfer.mediaType === "image") {
          setVideoUrlInput("");
          setVideoPreviewUrl("");
          setVideoUploadFileName("");
          setVideoFile(null);

          if (shouldUseTransferAsFile(transfer)) {
            const file = await createFileFromTransfer(transfer);
            if (cancelled) return;
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

          if (shouldUseTransferAsFile(transfer)) {
            const file = await createFileFromTransfer(transfer);
            if (cancelled) return;
            setVideoInputTab("upload");
            setVideoFile(file);
            setVideoUrlInput("");
            setVideoPreviewUrl(transfer.url);
            setVideoUploadFileName(transfer.filename);
          } else {
            setVideoInputTab("url");
            setVideoFile(null);
            setVideoUrlInput(transfer.url);
            setVideoPreviewUrl(transfer.url);
            setVideoUploadFileName(transfer.filename);
          }
        }

        message.success(`已送入${getDetectTargetLabel("unsafe")}，可直接开始检测`);
      } catch (error) {
        console.error("Apply generated transfer error:", error);
        message.error(error instanceof Error ? error.message : "读取送检样本失败");
      }
    };

    void applyTransfer();

    return () => {
      cancelled = true;
    };
  }, [location.state]);

  const getCurrentFilename = () => {
    if (contentKind === "video") {
      return videoUploadFileName || videoFile?.name || videoUrlInput.split("/").pop() || "视频样本";
    }

    return uploadedFile?.name || urlInput.split("/").pop() || "图片样本";
  };

  const getDetectionModelName = () =>
    contentKind === "video" ? "Seed 2.0 Pro（视频敏感内容检测）" : "Seed 2.0 Pro（图片敏感内容检测）";

  const persistUnsafeDetectionRecord = async (nextResult: IUnsafeDetectionResult) => {
    try {
      await saveDetectionRecord({
        sampleId: activeSampleId,
        type: "unsafe",
        mediaType: contentKind,
        filename: getCurrentFilename(),
        result: RISK_CONFIG[nextResult.risk].text,
        riskScore: nextResult.riskScore,
        model: getDetectionModelName(),
        detectorModel: getDetectionModelName(),
        sourceModule: activeTransfer?.sourceModule as TGeneratedSourceModule | undefined,
        sourceTitle: activeTransfer?.title,
        sourceModel: activeTransfer?.model,
        sourcePrompt: activeTransfer?.title,
        sourceUrl: activeTransfer?.url,
        sourceThumbnailUrl: activeTransfer?.url,
        previewUrl: contentKind === "video" ? videoPreviewUrl || videoUrlInput : previewUrl,
        labels: nextResult.violations,
        rawResult: nextResult,
      });
    } catch (error) {
      console.error("Save unsafe detection record error:", error);
      message.warning("检测已完成，但历史记录保存失败");
    }
  };

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
      setVideoFps(DEFAULT_VIDEO_UNDERSTANDING_FPS);
      setActiveSampleId(undefined);
      setActiveTransfer(null);
      return;
    }

    setUploadedFile(null);
    setPreviewUrl("");
    setUrlInput("");
    setActiveSampleId(undefined);
    setActiveTransfer(null);
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
    setActiveSampleId(undefined);
    setActiveTransfer(null);
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
      setActiveSampleId(undefined);
      setActiveTransfer(null);
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
    setActiveSampleId(undefined);
    setActiveTransfer(null);
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
      setActiveSampleId(undefined);
      setActiveTransfer(null);
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

    try {
      setLoading(true);
      setResult(null);
      const nextResult = await detectUnsafeImage(await createImageDetectBody(activeTab, uploadedFile, urlInput));
      setResult(nextResult);
      await persistUnsafeDetectionRecord(nextResult);
      setCurrentStep(DETECT_STEP_RESULT);
      message.success("安全检测完成");
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
      body.fps = videoFps;

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

      const nextResult = await detectUnsafeVideo(body);
      setResult(nextResult);
      await persistUnsafeDetectionRecord(nextResult);
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
    <div className="page-transition detect-page unsafe-detect-page">
      <div className="page-header">
        <Title level={TITLE_LEVEL_TWO} className="page-title">
          不安全内容检测
        </Title>
        <Paragraph className="page-description">
          对图像/视频进行多维度安全审核：识别暴力、色情、仇恨符号等违规内容，输出风险等级与违规类型标签，支持内容安全审核与合规评估。
        </Paragraph>
      </div>

      <Tabs
        className="detect-top-tabs"
        activeKey={contentKind}
        onChange={(key) => {
          setContentKind(key as TDetectContentKind);
          setResult(null);
          setActiveSampleId(undefined);
          setActiveTransfer(null);
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
              <Row gutter={GRID_GUTTER} className="detect-workspace">
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
                    onActiveTabChange={(tab) => {
                      setActiveTab(tab);
                      setActiveSampleId(undefined);
                      setActiveTransfer(null);
                    }}
                    onUrlInputChange={setUrlInput}
                    onUrlLoad={handleUrlLoad}
                    onDetect={handleDetect}
                    onReset={resetDetection}
                    detectButtonText="开始检测"
                    modelIntro={<DetectModelIntroCard mode="unsafe" />}
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
              <Row gutter={GRID_GUTTER} className="detect-workspace">
                <Col xs={COL_FULL_SPAN} lg={COL_HALF_LG_SPAN}>
                  <VideoInputCard
                    title="上传待检测视频"
                    modelIntro={<DetectModelIntroCard mode="unsafe" />}
                    inputTab={videoInputTab}
                    loading={loading}
                    videoFile={videoFile}
                    videoUrlInput={videoUrlInput}
                    videoPreviewUrl={videoPreviewUrl}
                    videoUploadFileName={videoUploadFileName}
                    fps={videoFps}
                    detectButtonDisabled={!videoPreviewUrl && !videoFile && !videoUrlInput.trim()}
                    onInputTabChange={(tab) => {
                      setVideoInputTab(tab);
                      setActiveSampleId(undefined);
                      setActiveTransfer(null);
                      if (tab === "url") {
                        setVideoFile(null);
                        setVideoUploadFileName("");
                        setVideoPreviewUrl("");
                      }
                    }}
                    onVideoFileChange={handleVideoFileChange}
                    onVideoUrlInputChange={(value) => {
                      setVideoUrlInput(value);
                      setActiveSampleId(undefined);
                      setActiveTransfer(null);
                    }}
                    onFpsChange={setVideoFps}
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
