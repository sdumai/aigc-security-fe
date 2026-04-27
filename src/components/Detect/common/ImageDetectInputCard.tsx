import { Button, Card, Input, Space, Tabs, Upload } from "antd";
import { LinkOutlined, ScanOutlined, UploadOutlined } from "@ant-design/icons";
import type { ReactNode } from "react";
import type { UploadFile, UploadProps } from "antd";

import { ImagePreviewPanel } from "@/components/Detect/common/ImagePreviewPanel";
import {
  DEFAULT_SPACE_SIZE,
  DETECT_PRIMARY_BUTTON_HEIGHT,
  BORDER_LIGHT,
  DEFAULT_BORDER_RADIUS,
  FULL_WIDTH,
  LARGE_TEXT_FONT_SIZE,
  LIGHT_BOX_SHADOW,
  MODEL_SELECTOR_BODY_PADDING,
  PANEL_BORDER_RADIUS,
  PANEL_BACKGROUND,
  PRIMARY_BLUE,
  SMALL_SPACE_SIZE,
  UPLOAD_AREA_PADDING,
  UPLOAD_ICON_SIZE,
} from "@/constants/ui";
import { DETECT_STEP_READY, DETECT_STEP_RESULT, EMPTY_RESULT_COUNT, SAMPLE_IMAGE_DETECT_URL } from "@/constants/detect";
import type { IFaceRegion, TDetectInputTab } from "@/typings/detect";

const { Dragger } = Upload;

export interface IImageDetectInputCardProps {
  title: string;
  activeTab: TDetectInputTab;
  loading: boolean;
  uploadedFile: UploadFile | null;
  previewUrl: string;
  currentStep: number;
  hasResult: boolean;
  urlInput: string;
  uploadHint: string;
  modelSelector?: ReactNode;
  detectButtonText: string;
  detectButtonDisabled?: boolean;
  faceRegion?: IFaceRegion;
  onActiveTabChange: (tab: TDetectInputTab) => void;
  onUrlInputChange: (value: string) => void;
  onUrlLoad: () => void;
  onDetect: () => void;
  onReset: () => void;
  uploadProps: UploadProps;
}

export const ImageDetectInputCard = ({
  title,
  activeTab,
  loading,
  uploadedFile,
  previewUrl,
  currentStep,
  hasResult,
  urlInput,
  uploadHint,
  modelSelector,
  detectButtonText,
  detectButtonDisabled = false,
  faceRegion,
  onActiveTabChange,
  onUrlInputChange,
  onUrlLoad,
  onDetect,
  onReset,
  uploadProps,
}: IImageDetectInputCardProps) => {
  const shouldShowStagedPreview =
    currentStep === DETECT_STEP_READY && uploadedFile !== null && previewUrl.length > EMPTY_RESULT_COUNT && !hasResult;
  const shouldShowInlinePreview =
    uploadedFile !== null && previewUrl.length > EMPTY_RESULT_COUNT && activeTab && !(currentStep === DETECT_STEP_READY && !hasResult);

  return (
    <Card title={title} bordered={false}>
      <Tabs
        activeKey={activeTab}
        onChange={(key) => onActiveTabChange(key as TDetectInputTab)}
        items={[
          {
            key: "upload",
            label: (
              <span>
                <UploadOutlined /> 本地上传
              </span>
            ),
            children: (
              <>
                {!uploadedFile && (
                  <Dragger {...uploadProps} style={{ padding: UPLOAD_AREA_PADDING }}>
                    <p className="ant-upload-drag-icon">
                      <UploadOutlined style={{ fontSize: UPLOAD_ICON_SIZE, color: PRIMARY_BLUE }} />
                    </p>
                    <p className="ant-upload-text" style={{ fontSize: LARGE_TEXT_FONT_SIZE }}>
                      点击或拖拽图片到此区域上传
                    </p>
                    <p className="ant-upload-hint">{uploadHint}</p>
                  </Dragger>
                )}

                {shouldShowInlinePreview && activeTab === "upload" && (
                  <ImagePreviewPanel src={previewUrl} alt="上传的内容" faceRegion={faceRegion} />
                )}
              </>
            ),
          },
          {
            key: "url",
            label: (
              <span>
                <LinkOutlined /> URL解析
              </span>
            ),
            children: (
              <>
                <Space.Compact style={{ width: FULL_WIDTH, marginBottom: DEFAULT_SPACE_SIZE }}>
                  <Input
                    size="large"
                    placeholder={SAMPLE_IMAGE_DETECT_URL}
                    value={urlInput}
                    onChange={(event) => onUrlInputChange(event.target.value)}
                    onPressEnter={onUrlLoad}
                    disabled={loading}
                  />
                  <Button type="primary" size="large" onClick={onUrlLoad} loading={loading} icon={<LinkOutlined />}>
                    加载
                  </Button>
                </Space.Compact>

                {shouldShowInlinePreview && activeTab === "url" && (
                  <ImagePreviewPanel src={previewUrl} alt="URL内容" faceRegion={faceRegion} />
                )}
              </>
            ),
          },
        ]}
      />

      {shouldShowStagedPreview && (
        <Space direction="vertical" size={DEFAULT_SPACE_SIZE} style={{ width: FULL_WIDTH, marginTop: DEFAULT_SPACE_SIZE }}>
          <ImagePreviewPanel src={previewUrl} alt="待检测图片" staged />
          {modelSelector && (
            <Card
              title="选择检测模型"
              size="small"
              bordered={false}
              style={{
                borderRadius: PANEL_BORDER_RADIUS,
                background: PANEL_BACKGROUND,
                border: `1px solid ${BORDER_LIGHT}`,
                boxShadow: LIGHT_BOX_SHADOW,
              }}
              bodyStyle={{ padding: MODEL_SELECTOR_BODY_PADDING }}
            >
              {modelSelector}
            </Card>
          )}
          <Space direction="vertical" style={{ width: FULL_WIDTH }} size={SMALL_SPACE_SIZE}>
            <Button
              type="primary"
              size="large"
              block
              icon={<ScanOutlined />}
              onClick={onDetect}
              loading={loading}
              disabled={loading || detectButtonDisabled}
              style={{ height: DETECT_PRIMARY_BUTTON_HEIGHT, borderRadius: DEFAULT_BORDER_RADIUS }}
            >
              {loading ? "检测中..." : detectButtonText}
            </Button>
            <Button block icon={<UploadOutlined />} onClick={onReset} disabled={loading} style={{ borderRadius: DEFAULT_BORDER_RADIUS }}>
              重新上传
            </Button>
          </Space>
        </Space>
      )}

      {!shouldShowStagedPreview && (
        <Space direction="vertical" style={{ width: FULL_WIDTH, marginTop: DEFAULT_SPACE_SIZE }} size={SMALL_SPACE_SIZE}>
          {currentStep === DETECT_STEP_RESULT && hasResult && (
            <Button
              type="primary"
              size="large"
              block
              icon={<ScanOutlined />}
              onClick={onDetect}
              loading={loading}
              disabled={loading || detectButtonDisabled}
              style={{ borderRadius: DEFAULT_BORDER_RADIUS }}
            >
              重新检测
            </Button>
          )}
          {uploadedFile && (
            <Button block icon={<UploadOutlined />} onClick={onReset} disabled={loading} style={{ borderRadius: DEFAULT_BORDER_RADIUS }}>
              重新上传
            </Button>
          )}
        </Space>
      )}
    </Card>
  );
};
