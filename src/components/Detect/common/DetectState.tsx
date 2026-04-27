import { Spin, Typography } from "antd";
import type { ReactNode } from "react";

import {
  DEFAULT_BORDER_RADIUS,
  DEFAULT_SPACE_SIZE,
  EMPTY_STATE_BACKGROUND,
  EMPTY_STATE_PADDING,
  LOADING_STATE_PADDING,
  MUTED_TEXT_COLOR,
  SECONDARY_TEXT_COLOR,
  SMALL_TEXT_FONT_SIZE,
} from "@/constants/ui";

const { Paragraph, Text } = Typography;

export interface IDetectEmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
}

export const DetectEmptyState = ({ icon, title, description }: IDetectEmptyStateProps) => {
  return (
    <div
      style={{
        textAlign: "center",
        padding: EMPTY_STATE_PADDING,
        background: EMPTY_STATE_BACKGROUND,
        borderRadius: DEFAULT_BORDER_RADIUS,
      }}
    >
      {icon}
      <Paragraph style={{ color: MUTED_TEXT_COLOR, marginBottom: DEFAULT_BORDER_RADIUS }}>{title}</Paragraph>
      <Text type="secondary" style={{ fontSize: SMALL_TEXT_FONT_SIZE }}>
        {description}
      </Text>
    </div>
  );
};

export interface IDetectLoadingStateProps {
  text: string;
}

export const DetectLoadingState = ({ text }: IDetectLoadingStateProps) => {
  return (
    <div
      style={{
        textAlign: "center",
        padding: LOADING_STATE_PADDING,
        background: EMPTY_STATE_BACKGROUND,
        borderRadius: DEFAULT_BORDER_RADIUS,
      }}
    >
      <Spin size="large" />
      <Paragraph style={{ marginTop: DEFAULT_SPACE_SIZE, color: SECONDARY_TEXT_COLOR }}>{text}</Paragraph>
    </div>
  );
};
