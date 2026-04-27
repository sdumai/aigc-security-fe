import { Button, Card, Input, message, Space, Tabs, Typography, Upload } from "antd";
import { LinkOutlined, ScanOutlined, UploadOutlined } from "@ant-design/icons";

import {
  DEFAULT_BORDER_RADIUS,
  DEFAULT_SPACE_SIZE,
  DEFAULT_TEXT_FONT_SIZE,
  FULL_FLEX,
  FULL_WIDTH,
  NO_SPACE,
  PRIMARY_BLUE,
  SMALL_SPACE_SIZE,
  SMALL_TEXT_FONT_SIZE,
  UPLOAD_ICON_SIZE,
  VIDEO_UPLOAD_AREA_PADDING,
} from "@/constants/ui";
import { MAX_LOCAL_VIDEO_BASE64_MB } from "@/constants/detect";
import type { TDetectInputTab } from "@/typings/detect";

const { Dragger } = Upload;
const { Paragraph } = Typography;

export interface IVideoInputCardProps {
  title: string;
  description?: React.ReactNode;
  inputTab: TDetectInputTab;
  loading: boolean;
  videoFile: File | null;
  videoUrlInput: string;
  videoPreviewUrl: string;
  videoUploadFileName: string;
  detectButtonDisabled: boolean;
  onInputTabChange: (tab: TDetectInputTab) => void;
  onVideoFileChange: (file: File) => void;
  onVideoUrlInputChange: (value: string) => void;
  onVideoUrlLoad?: () => void;
  onDetect: () => void;
  onReset: () => void;
}

export const VideoInputCard = ({
  title,
  description,
  inputTab,
  loading,
  videoFile,
  videoUrlInput,
  videoPreviewUrl,
  videoUploadFileName,
  detectButtonDisabled,
  onInputTabChange,
  onVideoFileChange,
  onVideoUrlInputChange,
  onVideoUrlLoad,
  onDetect,
  onReset,
}: IVideoInputCardProps) => {
  const handleVideoSelect = (file: File) => {
    if (!file.type.startsWith("video/")) {
      message.error("请选择视频文件（如 MP4）");
      return false;
    }

    onVideoFileChange(file);
    return false;
  };

  return (
    <Card title={title} bordered={false}>
      {description}
      <Tabs
        activeKey={inputTab}
        onChange={(key) => onInputTabChange(key as TDetectInputTab)}
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
                {!videoFile && !videoPreviewUrl && (
                  <Dragger
                    name="video"
                    multiple={false}
                    accept="video/*"
                    showUploadList={false}
                    customRequest={({ file }) => handleVideoSelect(file as File)}
                    disabled={loading}
                    style={{ padding: VIDEO_UPLOAD_AREA_PADDING, position: "relative" }}
                  >
                    <p className="ant-upload-drag-icon">
                      <UploadOutlined style={{ fontSize: UPLOAD_ICON_SIZE, color: PRIMARY_BLUE }} />
                    </p>
                    <p className="ant-upload-text" style={{ fontSize: DEFAULT_TEXT_FONT_SIZE }}>
                      点击或拖拽视频到此区域选择
                    </p>
                    <p className="ant-upload-hint">本地上传建议不超过 {MAX_LOCAL_VIDEO_BASE64_MB}MB</p>
                  </Dragger>
                )}
                {videoPreviewUrl && inputTab === "upload" && (
                  <video src={videoPreviewUrl} controls style={{ width: FULL_WIDTH, borderRadius: DEFAULT_BORDER_RADIUS }} title={videoUploadFileName} />
                )}
              </>
            ),
          },
          {
            key: "url",
            label: (
              <span>
                <LinkOutlined /> 视频 URL
              </span>
            ),
            children: (
              <>
                <Space.Compact style={{ width: FULL_WIDTH, marginBottom: SMALL_SPACE_SIZE }}>
                  <Input
                    size="large"
                    placeholder="https://example.com/video.mp4"
                    value={videoUrlInput}
                    onChange={(event) => onVideoUrlInputChange(event.target.value)}
                    onPressEnter={onVideoUrlLoad || onDetect}
                    disabled={loading}
                    style={{ flex: FULL_FLEX }}
                  />
                  <Button
                    type="primary"
                    size="large"
                    onClick={onVideoUrlLoad || onDetect}
                    loading={loading}
                    icon={onVideoUrlLoad ? <LinkOutlined /> : <ScanOutlined />}
                  >
                    {onVideoUrlLoad ? "加载" : "开始检测"}
                  </Button>
                </Space.Compact>
                {videoPreviewUrl && inputTab === "url" && (
                  <video src={videoPreviewUrl} controls style={{ width: FULL_WIDTH, borderRadius: DEFAULT_BORDER_RADIUS }} preload="metadata" />
                )}
              </>
            ),
          },
        ]}
      />
      <Paragraph type="secondary" style={{ marginTop: SMALL_SPACE_SIZE, marginBottom: NO_SPACE, fontSize: SMALL_TEXT_FONT_SIZE }}>
        本地上传将使用 Base64 直接检测；更大视频请使用视频 URL。
      </Paragraph>
      <Space direction="vertical" style={{ width: FULL_WIDTH, marginTop: DEFAULT_SPACE_SIZE }}>
        <Button
          type="primary"
          size="large"
          block
          icon={<ScanOutlined />}
          onClick={onDetect}
          loading={loading}
          disabled={loading || detectButtonDisabled}
        >
          {loading ? "检测中…" : "开始检测"}
        </Button>
        <Button block icon={<UploadOutlined />} onClick={onReset} disabled={loading}>
          重新输入
        </Button>
      </Space>
    </Card>
  );
};
