import { Alert, Card, Progress, Space, Tag, Typography } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined, ScanOutlined } from "@ant-design/icons";

import {
  EMPTY_RESULT_COUNT,
  FAKE_FAIL_COLOR,
  FAKE_PASS_COLOR,
  MAX_NORMALIZED_SCORE,
  MIN_NORMALIZED_SCORE,
  SCORE_DECIMAL_PLACES,
} from "@/constants/detect";
import {
  BODY_TEXT_FONT_SIZE,
  CAPTION_TEXT_FONT_SIZE,
  DEFAULT_SPACE_SIZE,
  DEFAULT_TEXT_FONT_SIZE,
  EMPTY_ICON_SIZE,
  FULL_WIDTH,
  LARGE_TEXT_FONT_SIZE,
  MONOSPACE_FONT_FAMILY,
  MUTED_ICON_COLOR,
  NO_SPACE,
  RESULT_FONT_WEIGHT,
  RESULT_HEADER_PADDING,
  RESULT_ICON_SIZE,
  SMALL_SPACE_SIZE,
  TINY_SPACE_SIZE,
} from "@/constants/ui";
import { DetectEmptyState, DetectLoadingState } from "@/components/Detect/common/DetectState";
import type { IFakeDetectionResult, TDetectContentKind } from "@/typings/detect";
import { scoreToPercent } from "@/utils/detect";

const { Paragraph, Text } = Typography;

export interface IFakeDetectResultCardProps {
  detectType: TDetectContentKind;
  loading: boolean;
  result: IFakeDetectionResult | null;
}

export const FakeDetectResultCard = ({ detectType, loading, result }: IFakeDetectResultCardProps) => {
  if (!result && !loading) {
    return (
      <Card title="检测结果" bordered={false}>
        <DetectEmptyState
          icon={<ScanOutlined style={{ fontSize: EMPTY_ICON_SIZE, color: MUTED_ICON_COLOR, marginBottom: DEFAULT_SPACE_SIZE }} />}
          title={detectType === "video" ? "输入视频 URL 或选择本地视频后点击开始检测" : "等待上传文件"}
          description={detectType === "video" ? "输入视频 URL 或选择本地视频后点击开始检测" : "上传后将显示检测结果"}
        />
      </Card>
    );
  }

  if (loading) {
    return (
      <Card title="检测结果" bordered={false}>
        <DetectLoadingState text={detectType === "video" ? "检测中…（视频理解分析中）" : "检测中..."} />
      </Card>
    );
  }

  if (!result) {
    return null;
  }

  const resultColor = result.isFake ? FAKE_FAIL_COLOR : FAKE_PASS_COLOR;
  const resultIcon = result.isFake ? (
    <CloseCircleOutlined style={{ fontSize: RESULT_ICON_SIZE, color: resultColor }} />
  ) : (
    <CheckCircleOutlined style={{ fontSize: RESULT_ICON_SIZE, color: resultColor }} />
  );

  return (
    <Card title="检测结果" bordered={false}>
      <Space direction="vertical" size="large" style={{ width: FULL_WIDTH }}>
        <div style={{ textAlign: "center", padding: RESULT_HEADER_PADDING }}>
          {resultIcon}
          <div style={{ marginTop: SMALL_SPACE_SIZE, fontSize: LARGE_TEXT_FONT_SIZE, fontWeight: RESULT_FONT_WEIGHT, color: resultColor }}>
            {result.isFake ? "识别结果：不通过" : "识别结果：通过 (Pass)"}
          </div>
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: TINY_SPACE_SIZE }}>
            <Text strong style={{ fontSize: DEFAULT_TEXT_FONT_SIZE }}>
              {result.details.segmentRatio != null ? "合成段数占比" : "AI生成概率"}
            </Text>
            <Text strong style={{ fontSize: DEFAULT_TEXT_FONT_SIZE, color: resultColor }}>
              {scoreToPercent(result.confidence)}%
            </Text>
          </div>
          <Progress
            percent={scoreToPercent(result.confidence)}
            status={result.isFake ? "exception" : "success"}
            strokeColor={resultColor}
          />
          <Paragraph
            type="secondary"
            style={{
              marginTop: SMALL_SPACE_SIZE,
              marginBottom: NO_SPACE,
              fontSize: BODY_TEXT_FONT_SIZE,
              fontFamily: MONOSPACE_FONT_FAMILY,
            }}
          >
            模型得分（{MIN_NORMALIZED_SCORE}～{MAX_NORMALIZED_SCORE}，越大越倾向 AI 生成/伪造）：
            <Text strong style={{ marginLeft: TINY_SPACE_SIZE, color: resultColor }}>
              {(result.rawScore ?? result.confidence).toFixed(SCORE_DECIMAL_PLACES)}
            </Text>
          </Paragraph>
          {result.details.segmentConclusion && (
            <Paragraph
              type="secondary"
              style={{
                marginTop: TINY_SPACE_SIZE,
                marginBottom: NO_SPACE,
                fontSize: CAPTION_TEXT_FONT_SIZE,
                wordBreak: "break-word",
                overflowWrap: "break-word",
              }}
            >
              {result.details.segmentConclusion}
            </Paragraph>
          )}
        </div>

        {result.details.artifacts && result.details.artifacts.length > EMPTY_RESULT_COUNT && (
          <div style={{ wordBreak: "break-word", overflowWrap: "break-word" }}>
            <Text strong>检测到的异常特征</Text>
            <div style={{ marginTop: TINY_SPACE_SIZE }}>
              {result.details.artifacts.map((artifact) => (
                <Tag
                  color="red"
                  key={artifact}
                  style={{
                    marginBottom: TINY_SPACE_SIZE,
                    maxWidth: FULL_WIDTH,
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                  }}
                >
                  {artifact}
                </Tag>
              ))}
            </div>
          </div>
        )}

        {result.details.faceRegion && (
          <Alert
            message="可疑区域已标注"
            description="红色高亮区域为算法判定的可疑篡改/伪造区域，供人工复核参考。"
            type="warning"
            showIcon
          />
        )}
      </Space>
    </Card>
  );
};
