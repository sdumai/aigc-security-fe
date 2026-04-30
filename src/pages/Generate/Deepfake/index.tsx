import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Col, Form, message, Row, Typography } from "antd";
import type { UploadFile } from "antd";

import {
  DEEPFAKE_DEFAULT_FUNCTION,
  DEEPFAKE_DEFAULT_MODEL,
  DEEPFAKE_FUNCTION_LABELS,
  DEFAULT_SEEDEDIT_SCALE,
  EMPTY_UPLOAD_COUNT,
  PRIMARY_UPLOAD_INDEX,
  RANDOM_SEEDEDIT_SEED,
} from "@/constants/generate";
import { DATA_OUTPUT_ROUTE } from "@/constants/routes";
import {
  COL_FULL_SPAN,
  DEEPFAKE_RESULT_IMAGE_WIDTH,
  DEEPFAKE_CONFIG_LG_SPAN,
  DEEPFAKE_RESULT_LG_SPAN,
  MESSAGE_DURATION_SECONDS,
  MESSAGE_LOADING_DURATION_FOREVER,
  SAVE_NAVIGATION_DELAY_MS,
  TITLE_LEVEL_TWO,
} from "@/constants/ui";
import { DeepfakeGenerateForm } from "@/components/Generation/Deepfake/DeepfakeGenerateForm";
import { ImagePreviewModal } from "@/components/Generation/common/ImagePreviewModal";
import { MediaResultCard } from "@/components/Generation/common/MediaResultCard";
import {
  generateFaceAnimation,
  generateFaceSwap,
  generateSeedEdit,
} from "@/services/generate";
import { saveGeneratedContent } from "@/services/content";
import { sendGeneratedResultToDetect } from "@/utils/detectTransfer";
import type { IDeepfakeFormValues, IGenerateResult, TDeepfakeFunction } from "@/typings/generate";
import type { TGeneratedDetectTarget } from "@/typings/detect";
import { downloadMedia, getBase64FromUploadFile, getUploadPreviewUrl } from "@/utils/media";

const { Title, Paragraph } = Typography;

const isFormValidationError = (error: unknown): error is { errorFields: unknown[] } =>
  typeof error === "object" && error !== null && "errorFields" in error;

const DeepfakeGeneratePage = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm<IDeepfakeFormValues>();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IGenerateResult | null>(null);
  const [targetFile, setTargetFile] = useState<UploadFile[]>([]);
  const [sourceFile, setSourceFile] = useState<UploadFile[]>([]);
  const [functionType, setFunctionType] = useState<TDeepfakeFunction>(DEEPFAKE_DEFAULT_FUNCTION);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState("");
  const selectedModel = Form.useWatch("model", form);

  const handleUploadPreview = async (file: UploadFile) => {
    const url = await getUploadPreviewUrl(file);

    if (url) {
      setPreviewImageUrl(url);
      setPreviewOpen(true);
    }
  };

  const getTargetImageBase64 = async () => {
    const imageBase64 = targetFile[PRIMARY_UPLOAD_INDEX] ? await getBase64FromUploadFile(targetFile[PRIMARY_UPLOAD_INDEX]) : "";

    if (!imageBase64) {
      throw new Error("无法读取目标人脸图片，请重新上传");
    }

    return imageBase64;
  };

  const handleGenerate = async () => {
    try {
      const values = await form.validateFields();

      if (targetFile.length === EMPTY_UPLOAD_COUNT) {
        message.warning("请上传目标人脸图片");
        return;
      }

      if (values.function === "faceswap" && sourceFile.length === EMPTY_UPLOAD_COUNT) {
        message.warning("请上传驱动人脸");
        return;
      }

      setLoading(true);
      setResult(null);

      if (values.function === "faceswap") {
        const templateBase64 = await getTargetImageBase64();
        const imageBase64 = sourceFile[PRIMARY_UPLOAD_INDEX] ? await getBase64FromUploadFile(sourceFile[PRIMARY_UPLOAD_INDEX]) : "";

        if (!imageBase64) {
          throw new Error("无法读取驱动人脸，请重新上传");
        }

        setResult(
          await generateFaceSwap({
            imageBase64,
            templateBase64,
            model: values.model,
            sourceSimilarity: values.faceSwapSourceSimilarity,
            doRisk: values.faceSwapDoRisk,
            faceType: values.faceSwapFaceType,
            sourceLocation: values.faceSwapSourceLocation,
            templateLocation: values.faceSwapTemplateLocation,
            returnUrl: values.faceSwapReturnUrl,
            addLogo: values.faceSwapAddLogo,
            logoPosition: values.faceSwapLogoPosition,
            logoLanguage: values.faceSwapLogoLanguage,
            logoOpacity: values.faceSwapLogoOpacity,
            logoText: values.faceSwapLogoText,
          }),
        );
        message.success("生成成功！");
        return;
      }

      if (values.function === "fomm") {
        const imageBase64 = await getTargetImageBase64();
        const prompt = values.fommPrompt?.trim();

        if (!prompt) {
          message.warning("请输入动作描述");
          return;
        }

        setResult(await generateFaceAnimation({ imageBase64, prompt }));
        message.success("生成成功！");
        return;
      }

      const prompt = values.editPrompt?.trim();

      if (!prompt) {
        message.warning("请输入编辑指令");
        return;
      }

      const imageBase64 = await getTargetImageBase64();
      const scale = typeof values.seedEditScale === "number" ? values.seedEditScale : DEFAULT_SEEDEDIT_SCALE;
      const seed = values.seedEditSeedMode === "fixed" ? values.seedEditSeed : RANDOM_SEEDEDIT_SEED;
      setResult(await generateSeedEdit({ imageBase64, prompt, scale, seed }));
      message.success("生成成功！");
    } catch (error) {
      if (isFormValidationError(error)) {
        message.warning("请完善必填项");
        return;
      }

      console.error("Generate error:", error);
      message.error(error instanceof Error ? error.message : "生成失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    const url = result?.videoUrl || result?.imageUrl;

    if (!url) {
      return;
    }

    const values = form.getFieldsValue();
    const currentFunctionType = values.function || DEEPFAKE_DEFAULT_FUNCTION;
    const isVideo = Boolean(result?.videoUrl);
    const filename = `deepfake-${currentFunctionType}-${Date.now()}.${isVideo ? "mp4" : "jpg"}`;

    try {
      message.loading("正在下载...", MESSAGE_LOADING_DURATION_FOREVER);
      await downloadMedia(url, filename);
      message.destroy();
      message.success("下载成功！");
    } catch (error) {
      message.destroy();
      console.error("Download error:", error);
      window.open(url, "_blank");
      message.info(isVideo ? "已在新标签页打开视频，请右键另存为" : "已在新标签页打开图片，请右键保存");
    }
  };

  const handleSave = async () => {
    const saveUrl = result?.videoUrl || result?.imageUrl;

    if (!saveUrl) {
      return;
    }

    try {
      const values = form.getFieldsValue();
      const currentFunctionType = values.function || DEEPFAKE_DEFAULT_FUNCTION;

      await saveGeneratedContent({
        type: result?.videoUrl ? "video" : "image",
        title: `Deepfake ${DEEPFAKE_FUNCTION_LABELS[currentFunctionType]}`,
        url: saveUrl,
        model: values.model,
      });
      message.success({ content: "内容已保存！可在内容管理中查看", duration: MESSAGE_DURATION_SECONDS });
      setTimeout(() => navigate(DATA_OUTPUT_ROUTE), SAVE_NAVIGATION_DELAY_MS);
    } catch (error) {
      console.error("Save error:", error);
    }
  };

  const handleSendToDetect = (target: TGeneratedDetectTarget) => {
    const values = form.getFieldsValue();
    const currentFunctionType = values.function || DEEPFAKE_DEFAULT_FUNCTION;
    const sent = sendGeneratedResultToDetect({
      navigate,
      result,
      mediaType: result?.videoUrl ? "video" : "image",
      target,
      title: `Deepfake ${DEEPFAKE_FUNCTION_LABELS[currentFunctionType]}`,
    });

    if (!sent) {
      message.warning("暂无可送检的生成结果");
    }
  };

  return (
    <div className="page-transition deepfake-page">
      <div className="page-header">
        <Title level={TITLE_LEVEL_TWO} className="page-title">
          深度伪造人脸生成
        </Title>
        <Paragraph className="page-description">
          提供三类生成能力：人脸替换（将源人脸融合至目标图像）、人脸动画（单张人脸图 + 动作描述 →
          短视频）、属性编辑（在保持身份一致下按文本修改属性）。本模块仅用于学术研究与深度伪造检测等安全相关用途，禁止用于造假、欺诈等非法场景。
        </Paragraph>
      </div>

      <Row gutter={[22, 22]} className="deepfake-workspace" align="top">
        <Col xs={COL_FULL_SPAN} lg={DEEPFAKE_CONFIG_LG_SPAN} className="deepfake-config-column">
          <DeepfakeGenerateForm
            form={form}
            functionType={functionType}
            selectedModel={selectedModel || DEEPFAKE_DEFAULT_MODEL}
            targetFile={targetFile}
            sourceFile={sourceFile}
            loading={loading}
            setFunctionType={setFunctionType}
            setTargetFile={setTargetFile}
            setSourceFile={setSourceFile}
            onPreview={handleUploadPreview}
            onGenerate={handleGenerate}
          />
        </Col>

        <Col xs={COL_FULL_SPAN} lg={DEEPFAKE_RESULT_LG_SPAN} className="deepfake-result-column">
          <MediaResultCard
            title="生成结果与预览"
            className="deepfake-result-card"
            loading={loading}
            loadingText="正在生成中，请稍候..."
            emptyText={'请配置参数并点击"开始生成"按钮'}
            result={result}
            imageWidth={DEEPFAKE_RESULT_IMAGE_WIDTH}
            videoTitle="人脸动画结果"
            onSendToDetect={handleSendToDetect}
            onDownload={handleDownload}
            onSave={handleSave}
            onReset={() => setResult(null)}
          />
        </Col>
      </Row>

      <ImagePreviewModal open={previewOpen} imageUrl={previewImageUrl} onClose={() => setPreviewOpen(false)} />
    </div>
  );
};

export default DeepfakeGeneratePage;
