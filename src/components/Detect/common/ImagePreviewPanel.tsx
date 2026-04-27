import { Image } from "antd";
import { EyeOutlined } from "@ant-design/icons";

import {
  DETECT_PREVIEW_MAX_HEIGHT,
  DETECT_STAGED_IMAGE_MAX_HEIGHT,
  DETECT_STAGED_PREVIEW_MAX_HEIGHT,
  DETECT_STAGED_PREVIEW_MIN_HEIGHT,
  BORDER_LIGHT,
  DEFAULT_BORDER_RADIUS,
  EMPTY_STATE_BACKGROUND,
  FULL_WIDTH,
  PANEL_BORDER_RADIUS,
  PREVIEW_MASK_ICON_SIZE,
  PREVIEW_PANEL_BACKGROUND,
} from "@/constants/ui";
import type { IFaceRegion } from "@/typings/detect";

export interface IImagePreviewPanelProps {
  src: string;
  alt: string;
  staged?: boolean;
  faceRegion?: IFaceRegion;
}

export const ImagePreviewPanel = ({ src, alt, staged = false, faceRegion }: IImagePreviewPanelProps) => {
  if (staged) {
    return (
      <div
        style={{
          minHeight: DETECT_STAGED_PREVIEW_MIN_HEIGHT,
          maxHeight: DETECT_STAGED_PREVIEW_MAX_HEIGHT,
          borderRadius: PANEL_BORDER_RADIUS,
          overflow: "hidden",
          background: PREVIEW_PANEL_BACKGROUND,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: PANEL_BORDER_RADIUS,
          border: `1px solid ${BORDER_LIGHT}`,
        }}
      >
        <div className="image-preview-wrap" style={{ maxWidth: FULL_WIDTH, maxHeight: DETECT_STAGED_IMAGE_MAX_HEIGHT }}>
          <Image
            src={src}
            alt={alt}
            style={{
              maxWidth: FULL_WIDTH,
              maxHeight: DETECT_STAGED_IMAGE_MAX_HEIGHT,
              objectFit: "contain",
              borderRadius: DEFAULT_BORDER_RADIUS,
            }}
            preview={{ mask: null }}
          />
          <div className="image-preview-mask">
            <EyeOutlined style={{ fontSize: PREVIEW_MASK_ICON_SIZE }} />
            <span>预览</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="heatmap-overlay"
      style={{
        maxHeight: DETECT_PREVIEW_MAX_HEIGHT,
        borderRadius: DEFAULT_BORDER_RADIUS,
        overflow: "hidden",
          background: EMPTY_STATE_BACKGROUND,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Image
        src={src}
        alt={alt}
        style={{
          width: FULL_WIDTH,
          maxHeight: DETECT_PREVIEW_MAX_HEIGHT,
          objectFit: "contain",
          borderRadius: DEFAULT_BORDER_RADIUS,
        }}
        preview={false}
      />
      {faceRegion && (
        <div
          className="heatmap-layer"
          style={{
            top: `${faceRegion.y}%`,
            left: `${faceRegion.x}%`,
            width: `${faceRegion.width}%`,
            height: `${faceRegion.height}%`,
          }}
        />
      )}
    </div>
  );
};
