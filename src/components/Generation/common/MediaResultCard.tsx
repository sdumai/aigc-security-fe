import { Button, Card, Dropdown, Image, Space, Spin, Typography } from "antd";
import { DownloadOutlined, ReloadOutlined, SafetyOutlined, SaveOutlined, ScanOutlined } from "@ant-design/icons";
import type { ReactNode } from "react";

import {
  DEFAULT_BORDER_RADIUS,
  DEFAULT_SPACE_SIZE,
  EMPTY_STATE_BACKGROUND,
  EMPTY_STATE_PADDING,
  FULL_WIDTH,
  LOADING_STATE_PADDING,
  MEDIA_RESULT_IMAGE_WIDTH,
  MUTED_TEXT_COLOR,
  NO_SPACE,
  SECONDARY_TEXT_COLOR,
  SMALL_TEXT_FONT_SIZE,
} from "@/constants/ui";
import type { IGenerateResult } from "@/typings/generate";
import type { TGeneratedDetectTarget } from "@/typings/detect";

const { Paragraph } = Typography;

export interface IMediaResultCardProps {
  title: string;
  loading: boolean;
  loadingText: string;
  emptyIcon?: ReactNode;
  emptyText: string;
  result: IGenerateResult | null;
  imageAlt?: string;
  imageWidth?: string;
  videoTitle?: string;
  videoSrc?: string | null;
  className?: string;
  onSendToDetect?: (target: TGeneratedDetectTarget) => void;
  onDownload: () => void;
  onSave: () => void;
  onReset: () => void;
}

export const MediaResultCard = ({
  title,
  loading,
  loadingText,
  emptyIcon,
  emptyText,
  result,
  imageAlt = "生成结果",
  imageWidth = MEDIA_RESULT_IMAGE_WIDTH,
  videoTitle,
  videoSrc,
  className,
  onSendToDetect,
  onDownload,
  onSave,
  onReset,
}: IMediaResultCardProps) => {
  const currentVideoSrc = videoSrc || result?.videoUrl || "";
  const hasResultMedia = Boolean(result?.imageUrl || result?.videoUrl);

  return (
    <Card title={title} bordered={false} className={className}>
      {loading ? (
        <div className="media-result-loading" style={{ textAlign: "center", padding: LOADING_STATE_PADDING }}>
          <Spin size="large" />
          <Paragraph style={{ marginTop: DEFAULT_SPACE_SIZE, color: SECONDARY_TEXT_COLOR }}>{loadingText}</Paragraph>
        </div>
      ) : result ? (
        <div className="media-result-content">
          <div className="media-result-preview-shell">
            <div className="media-result-preview-surface">
              {result.videoUrl ? (
                <video
                  key={currentVideoSrc}
                  src={currentVideoSrc}
                  controls
                  title={videoTitle}
                  style={{ width: FULL_WIDTH, borderRadius: DEFAULT_BORDER_RADIUS }}
                >
                  您的浏览器不支持视频播放
                </video>
              ) : result.imageUrl ? (
                <Image
                  src={result.imageUrl}
                  alt={imageAlt}
                  style={{ width: imageWidth, borderRadius: DEFAULT_BORDER_RADIUS }}
                  fallback="https://via.placeholder.com/512x512?text=Generated+Result"
                />
              ) : null}
            </div>
          </div>
          <Space className="media-result-actions" style={{ marginTop: DEFAULT_SPACE_SIZE, width: FULL_WIDTH }} direction="vertical">
            {onSendToDetect && (
              <Dropdown
                trigger={["click"]}
                menu={{
                  items: [
                    { key: "fake", label: "送到 AI 生成检测", icon: <ScanOutlined /> },
                    { key: "unsafe", label: "送到敏感内容检测", icon: <SafetyOutlined /> },
                  ],
                  onClick: ({ key }) => onSendToDetect(key as TGeneratedDetectTarget),
                }}
              >
                <Button type="primary" block icon={<ScanOutlined />} disabled={!hasResultMedia}>
                  一键送到检测模块
                </Button>
              </Dropdown>
            )}
            <Button block icon={<DownloadOutlined />} onClick={onDownload}>
              下载到本地
            </Button>
            <Button block icon={<SaveOutlined />} onClick={onSave}>
              保存到内容管理
            </Button>
            <Button block icon={<ReloadOutlined />} onClick={onReset}>
              重新生成
            </Button>
          </Space>
        </div>
      ) : (
        <div
          className="media-result-empty"
          style={{
            textAlign: "center",
            padding: EMPTY_STATE_PADDING,
            background: EMPTY_STATE_BACKGROUND,
            borderRadius: DEFAULT_BORDER_RADIUS,
          }}
        >
          {emptyIcon}
          <Paragraph style={{ color: MUTED_TEXT_COLOR, marginTop: emptyIcon ? DEFAULT_SPACE_SIZE : NO_SPACE }}>{emptyText}</Paragraph>
          {!emptyIcon && <Paragraph style={{ color: MUTED_TEXT_COLOR, fontSize: SMALL_TEXT_FONT_SIZE }}>生成结果将在此处显示</Paragraph>}
        </div>
      )}
    </Card>
  );
};
