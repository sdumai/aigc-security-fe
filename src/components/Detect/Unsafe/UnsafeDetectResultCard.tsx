import { Alert, Button, Card, Divider, List, Space, Tag, Typography } from "antd";
import { CheckCircleOutlined, DownloadOutlined, ExclamationCircleOutlined, SafetyOutlined, WarningOutlined } from "@ant-design/icons";

import { EMPTY_RESULT_COUNT, REPORT_LIST_START_INDEX, RISK_LABELS, RISK_SCORE_DENOMINATOR, VIOLATION_LABELS } from "@/constants/detect";
import {
  BODY_TEXT_FONT_SIZE,
  DEFAULT_BORDER_RADIUS,
  DEFAULT_SPACE_SIZE,
  DEFAULT_TEXT_FONT_SIZE,
  EMPTY_ICON_SIZE,
  FULL_WIDTH,
  MUTED_ICON_COLOR,
  RISK_SUMMARY_PADDING,
  SMALL_SPACE_SIZE,
  SMALL_TEXT_FONT_SIZE,
  TITLE_LEVEL_THREE,
  TRANSLUCENT_COLOR_SUFFIX,
  UNSAFE_TAG_PADDING,
} from "@/constants/ui";
import { DetectEmptyState, DetectLoadingState } from "@/components/Detect/common/DetectState";
import type { IRiskConfig, IUnsafeDetectionResult } from "@/typings/detect";
import { scoreToPercent } from "@/utils/detect";

const { Text, Title } = Typography;

const RISK_CONFIG: Record<IUnsafeDetectionResult["risk"], IRiskConfig> = {
  low: {
    ...RISK_LABELS.low,
    icon: <CheckCircleOutlined />,
  },
  medium: {
    ...RISK_LABELS.medium,
    icon: <ExclamationCircleOutlined />,
  },
  high: {
    ...RISK_LABELS.high,
    icon: <WarningOutlined />,
  },
};

export interface IUnsafeDetectResultCardProps {
  loading: boolean;
  result: IUnsafeDetectionResult | null;
  emptyTitle: string;
  emptyDescription: string;
  onDownloadReport: () => void;
}

export const UnsafeDetectResultCard = ({
  loading,
  result,
  emptyTitle,
  emptyDescription,
  onDownloadReport,
}: IUnsafeDetectResultCardProps) => {
  if (!result && !loading) {
    return (
      <Card title="检测结果" bordered={false}>
        <DetectEmptyState
          icon={<SafetyOutlined style={{ fontSize: EMPTY_ICON_SIZE, color: MUTED_ICON_COLOR, marginBottom: DEFAULT_SPACE_SIZE }} />}
          title={emptyTitle}
          description={emptyDescription}
        />
      </Card>
    );
  }

  if (loading) {
    return (
      <Card title="检测结果" bordered={false}>
        <DetectLoadingState text="检测中..." />
      </Card>
    );
  }

  if (!result) {
    return null;
  }

  const config = RISK_CONFIG[result.risk];

  return (
    <Card title="检测结果" bordered={false}>
      <Alert
        message="安全检测已完成"
        description={`检测到 ${result.violations.length} 个违规类型，风险等级：${config.text}`}
        type={result.risk === "low" ? "success" : result.risk === "medium" ? "warning" : "error"}
        showIcon
        style={{ marginBottom: DEFAULT_SPACE_SIZE }}
      />
      <Space direction="vertical" size="large" style={{ width: FULL_WIDTH }}>
        <div
          style={{
            textAlign: "center",
            padding: RISK_SUMMARY_PADDING,
            background: `${config.color}${TRANSLUCENT_COLOR_SUFFIX}`,
            borderRadius: DEFAULT_BORDER_RADIUS,
          }}
        >
          <div style={{ fontSize: EMPTY_ICON_SIZE, color: config.color }}>{config.icon}</div>
          <Title level={TITLE_LEVEL_THREE} style={{ color: config.color, marginTop: DEFAULT_SPACE_SIZE, marginBottom: DEFAULT_BORDER_RADIUS }}>
            {config.text}
          </Title>
          <Text style={{ fontSize: DEFAULT_TEXT_FONT_SIZE }}>风险评分：{result.riskScore}/{RISK_SCORE_DENOMINATOR}</Text>
        </div>

        {result.violations.length > EMPTY_RESULT_COUNT && (
          <>
            <Divider />
            <div>
              <Text strong style={{ fontSize: DEFAULT_TEXT_FONT_SIZE }}>
                检测到的违规类型
              </Text>
              <div style={{ marginTop: SMALL_SPACE_SIZE }}>
                {result.violations.map((violation) => (
                  <Tag
                    key={violation}
                    color="red"
                    style={{ fontSize: BODY_TEXT_FONT_SIZE, padding: UNSAFE_TAG_PADDING, marginBottom: DEFAULT_BORDER_RADIUS }}
                  >
                    {VIOLATION_LABELS[violation] || violation}
                  </Tag>
                ))}
              </div>
            </div>

            <div>
              <Text strong style={{ fontSize: DEFAULT_TEXT_FONT_SIZE }}>
                详细分析
              </Text>
              <List
                style={{ marginTop: SMALL_SPACE_SIZE }}
                size="small"
                bordered
                dataSource={Object.entries(result.details)}
                renderItem={([key, value]) => (
                  <List.Item>
                    <Space direction="vertical" style={{ width: FULL_WIDTH }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <Text strong>{VIOLATION_LABELS[key] || key}</Text>
                        <Text type="danger">{scoreToPercent(value.score)}%</Text>
                      </div>
                      {value.regions && value.regions.length > EMPTY_RESULT_COUNT && (
                        <Text type="secondary" style={{ fontSize: SMALL_TEXT_FONT_SIZE }}>
                          检测到 {value.regions.length} 处可疑区域
                        </Text>
                      )}
                    </Space>
                  </List.Item>
                )}
              />
            </div>
          </>
        )}

        {result.suggestions.length > EMPTY_RESULT_COUNT && (
          <>
            <Divider />
            <div>
              <Text strong style={{ fontSize: DEFAULT_TEXT_FONT_SIZE }}>
                整改建议
              </Text>
              <List
                style={{ marginTop: SMALL_SPACE_SIZE }}
                size="small"
                dataSource={result.suggestions}
                renderItem={(item, index) => (
                  <List.Item>
                    <Space>
                      <Tag color="orange">{index + REPORT_LIST_START_INDEX}</Tag>
                      <Text>{item}</Text>
                    </Space>
                  </List.Item>
                )}
              />
            </div>
          </>
        )}

        <Space style={{ width: FULL_WIDTH }} direction="vertical">
          <Button type="primary" block icon={<DownloadOutlined />} onClick={onDownloadReport}>
            下载检测报告
          </Button>
        </Space>
      </Space>
    </Card>
  );
};

export { RISK_CONFIG };
