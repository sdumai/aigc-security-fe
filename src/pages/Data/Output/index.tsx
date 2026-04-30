import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Empty,
  Image,
  message,
  Modal,
  Row,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import {
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileImageOutlined,
  ReloadOutlined,
  SafetyOutlined,
  ScanOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import { deleteGeneratedSample, fetchDetectionRecords, fetchGeneratedSamples } from "@/services/content";
import type { IContentDetectionRecord, IContentSample, TGeneratedSourceModule } from "@/typings/content";
import type { TGeneratedDetectTarget } from "@/typings/detect";
import { sendContentSampleToDetect } from "@/utils/detectTransfer";
import { downloadMedia } from "@/utils/media";
import { getGenerationModelLabel } from "@/utils/modelLabels";

const { Paragraph, Text, Title } = Typography;

const SOURCE_MODULE_LABELS: Record<TGeneratedSourceModule, string> = {
  "text-to-image": "文生图",
  "text-to-video": "文生视频",
  "image-to-video": "图生视频",
  deepfake: "Deepfake",
  manual: "手动样本",
};

const DETECTION_TYPE_LABELS: Record<TGeneratedDetectTarget, string> = {
  fake: "AI 生成检测",
  unsafe: "敏感检测",
};

const formatDateTime = (value: string) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("zh-CN", { hour12: false });
};

const normalizePercentValue = (value?: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return value <= 1 ? value * 100 : value;
};

const formatScore = (record: IContentDetectionRecord) => {
  const confidence = normalizePercentValue(record.confidence);
  if (typeof confidence === "number") {
    return `${Math.round(confidence)}%`;
  }

  const riskScore = normalizePercentValue(record.riskScore);
  if (typeof riskScore === "number") {
    return `${Math.round(riskScore)}/100`;
  }

  return "-";
};

const getRecordNumericScore = (record: IContentDetectionRecord) => {
  if (record.type === "fake") {
    return normalizePercentValue(record.confidence);
  }

  return normalizePercentValue(record.riskScore);
};

const isHighRiskRecord = (record: IContentDetectionRecord) => {
  const score = getRecordNumericScore(record) || 0;

  if (record.type === "fake") {
    return !record.result.includes("通过") && score >= 90;
  }

  return record.result.includes("高") || score >= 80;
};

const getRecordTagColor = (record: IContentDetectionRecord) => {
  if (record.type === "fake") {
    return record.result.includes("通过") ? "success" : "error";
  }

  if (record.result.includes("高")) return "error";
  if (record.result.includes("中")) return "warning";
  return "success";
};

const buildDownloadFilename = (sample: IContentSample) => {
  if (sample.mediaFilename) return sample.mediaFilename;
  const extension = sample.type === "video" ? "mp4" : "jpg";
  return `${sample.title || "generated-sample"}.${extension}`;
};

const inferRecordDetectorModelName = (record: IContentDetectionRecord) => {
  const detectorModel = record.detectorModel || record.model;

  if (detectorModel && detectorModel.trim()) {
    if (detectorModel === "火山引擎") {
      return record.mediaType === "video" ? "Seed 2.0 Pro（视频 AI 生成检测）" : "Seed 2.0 Pro";
    }

    if (detectorModel === "视频 AI 生成识别") {
      return "Seed 2.0 Pro（视频 AI 生成检测）";
    }

    if (detectorModel.includes("火山方舟视觉模型") || detectorModel.includes("火山方舟视频理解模型")) {
      if (record.type === "unsafe") {
        return record.mediaType === "video" ? "Seed 2.0 Pro（视频敏感内容检测）" : "Seed 2.0 Pro（图片敏感内容检测）";
      }

      return record.mediaType === "video" ? "Seed 2.0 Pro（视频 AI 生成检测）" : "Seed 2.0 Pro";
    }

    return detectorModel;
  }

  if (record.type === "unsafe") {
    return record.mediaType === "video" ? "Seed 2.0 Pro（视频敏感内容检测）" : "Seed 2.0 Pro（图片敏感内容检测）";
  }

  return record.mediaType === "video" ? "Seed 2.0 Pro（视频 AI 生成检测）" : "Seed 2.0 Pro";
};

const DataOutputPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [samples, setSamples] = useState<IContentSample[]>([]);
  const [records, setRecords] = useState<IContentDetectionRecord[]>([]);
  const [selectedSample, setSelectedSample] = useState<IContentSample | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<IContentDetectionRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [recordDrawerOpen, setRecordDrawerOpen] = useState(false);

  const sampleById = useMemo(() => {
    return new Map(samples.map((sample) => [sample.id, sample]));
  }, [samples]);

  const selectedSampleRecords = useMemo(
    () => (selectedSample ? records.filter((record) => record.sampleId === selectedSample.id) : []),
    [records, selectedSample],
  );

  const selectedRecordSample = selectedRecord?.sampleId ? sampleById.get(selectedRecord.sampleId) || null : null;

  const getRecordLinkedSample = (record: IContentDetectionRecord) =>
    record.sampleId ? sampleById.get(record.sampleId) || null : null;

  const getRecordSourceTitle = (record: IContentDetectionRecord) => {
    const sample = getRecordLinkedSample(record);
    return sample?.title || record.sourceTitle || record.filename;
  };

  const getRecordSourcePrompt = (record: IContentDetectionRecord) => {
    const sample = getRecordLinkedSample(record);
    return sample?.prompt || record.sourcePrompt || record.filename;
  };

  const getRecordSourceModuleLabel = (record: IContentDetectionRecord) => {
    const sample = getRecordLinkedSample(record);
    const sourceModule = sample?.sourceModule || record.sourceModule;
    return sourceModule ? SOURCE_MODULE_LABELS[sourceModule] || "手动检测" : "手动检测";
  };

  const getRecordGenerationModelName = (record: IContentDetectionRecord) => {
    const sample = getRecordLinkedSample(record);
    return getGenerationModelLabel(sample?.model || record.sourceModel);
  };

  const getRecordDisplayModelName = (record: IContentDetectionRecord) =>
    getRecordGenerationModelName(record) || inferRecordDetectorModelName(record);

  const getRecordMediaUrl = (record: IContentDetectionRecord) => {
    const sample = getRecordLinkedSample(record);
    return sample?.fullUrl || record.sourceUrl || record.previewUrl || "";
  };

  const stats = useMemo(() => {
    const detectedSampleIds = new Set(records.map((record) => record.sampleId).filter(Boolean));
    const highRiskCount = records.filter(isHighRiskRecord).length;

    return {
      total: samples.length,
      image: samples.filter((sample) => sample.type === "image").length,
      video: samples.filter((sample) => sample.type === "video").length,
      detected: samples.filter(
        (sample) => sample.detectionStatus.fake || sample.detectionStatus.unsafe || detectedSampleIds.has(sample.id),
      ).length,
      highRisk: highRiskCount,
    };
  }, [records, samples]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [nextSamples, nextRecords] = await Promise.all([fetchGeneratedSamples(), fetchDetectionRecords()]);
      setSamples(nextSamples);
      setRecords(nextRecords);
    } catch (error) {
      console.error("Load content center error:", error);
      message.error("加载样本与检测记录失败，请确认后端代理已启动");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleOpenDetail = (sample: IContentSample) => {
    setSelectedSample(sample);
    setDrawerOpen(true);
  };

  const handleOpenRecordDetail = (record: IContentDetectionRecord) => {
    setSelectedRecord(record);
    setRecordDrawerOpen(true);
  };

  const handleSendToDetect = (sample: IContentSample, target: TGeneratedDetectTarget) => {
    sendContentSampleToDetect({ navigate, sample, target });
  };

  const handleDownload = async (sample: IContentSample) => {
    try {
      await downloadMedia(sample.fullUrl, buildDownloadFilename(sample));
      message.success("样本下载成功");
    } catch (error) {
      console.error("Download sample error:", error);
      window.open(sample.fullUrl, "_blank");
      message.info("已在新标签页打开样本，可手动保存");
    }
  };

  const handleDownloadRecordMedia = async (record: IContentDetectionRecord) => {
    const sample = getRecordLinkedSample(record);
    const url = getRecordMediaUrl(record);

    if (!url || url.startsWith("blob:")) {
      message.warning("该检测记录没有可下载的持久媒体地址");
      return;
    }

    try {
      await downloadMedia(url, sample ? buildDownloadFilename(sample) : record.filename);
      message.success("检测对象下载成功");
    } catch (error) {
      console.error("Download record media error:", error);
      window.open(url, "_blank");
      message.info("已在新标签页打开检测对象，可手动保存");
    }
  };

  const handleDelete = (sample: IContentSample) => {
    Modal.confirm({
      title: "删除样本",
      content: "只会从生成样本库移除该样本，已产生的检测记录会继续保留用于追溯。",
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        await deleteGeneratedSample(sample.id);
        message.success("样本已删除，检测记录已保留");
        if (selectedSample?.id === sample.id) {
          setDrawerOpen(false);
          setSelectedSample(null);
        }
        await loadData();
      },
    });
  };

  const renderMediaPreview = (sample: IContentSample, compact = false) => {
    const className = compact ? "content-media-thumb is-compact" : "content-media-thumb";

    if (sample.type === "video") {
      return (
        <div className={className}>
          <video src={sample.fullUrl} muted={compact} controls={!compact} preload="metadata" />
          <VideoCameraOutlined className="content-media-type-icon" />
        </div>
      );
    }

    return (
      <div className={className}>
        <Image src={sample.thumbnailUrl} alt={sample.title} preview={false} />
        <FileImageOutlined className="content-media-type-icon" />
      </div>
    );
  };

  const renderDetectionStatus = (sample: IContentSample) => (
    <Space size={6} wrap>
      <Tag color={sample.detectionStatus.fake ? "blue" : "default"}>
        AI 生成{sample.detectionStatus.fake ? "已测" : "未测"}
      </Tag>
      <Tag color={sample.detectionStatus.unsafe ? "orange" : "default"}>
        敏感{sample.detectionStatus.unsafe ? "已测" : "未测"}
      </Tag>
    </Space>
  );

  const isUsablePreviewUrl = (url?: string) => Boolean(url && !url.startsWith("blob:"));

  const renderRecordPreview = (record: IContentDetectionRecord, compact = true) => {
    const sample = getRecordLinkedSample(record);

    if (sample) {
      return renderMediaPreview(sample, compact);
    }

    const className = compact ? "content-media-thumb is-compact" : "content-media-thumb";
    const previewUrl = record.sourceThumbnailUrl || record.sourceUrl || record.previewUrl;

    if (isUsablePreviewUrl(previewUrl)) {
      if (record.mediaType === "video") {
        return (
          <div className={className}>
            <video src={previewUrl} muted={compact} controls={!compact} preload="metadata" />
            <VideoCameraOutlined className="content-media-type-icon" />
          </div>
        );
      }

      return (
        <div className={className}>
          <Image src={previewUrl} alt={record.filename} preview={false} />
          <FileImageOutlined className="content-media-type-icon" />
        </div>
      );
    }

    return (
      <div className={`${className} is-placeholder`}>
        {record.mediaType === "video" ? <VideoCameraOutlined /> : <FileImageOutlined />}
      </div>
    );
  };

  const renderRecordLabelDetails = (record: IContentDetectionRecord) => {
    const labels = Array.isArray(record.labels) ? record.labels.filter(Boolean) : [];

    if (labels.length === 0) {
      return <Text type="secondary">无异常标签</Text>;
    }

    return (
      <Space direction="vertical" size={6} className="content-record-label-list">
        {labels.map((label, index) => (
          <Text key={`${label}-${index}`}>{label}</Text>
        ))}
      </Space>
    );
  };

  const getRawResultObject = (record: IContentDetectionRecord): Record<string, unknown> => {
    return typeof record.rawResult === "object" && record.rawResult !== null
      ? (record.rawResult as Record<string, unknown>)
      : {};
  };

  const getRecordSuggestions = (record: IContentDetectionRecord): string[] => {
    const suggestions = getRawResultObject(record).suggestions;
    return Array.isArray(suggestions) ? suggestions.map(String) : [];
  };

  const sampleColumns: ColumnsType<IContentSample> = [
    {
      title: "样本",
      dataIndex: "title",
      width: 360,
      render: (_, sample) => (
        <Space size={12} align="center" className="content-sample-cell">
          {renderMediaPreview(sample, true)}
          <div className="content-sample-copy">
            <Text strong ellipsis={{ tooltip: sample.title }}>
              {sample.title}
            </Text>
            <Text
                type="secondary"
                className="content-sample-subtitle"
                ellipsis={{ tooltip: sample.prompt || getGenerationModelLabel(sample.model) || "-" }}
              >
                {sample.prompt || getGenerationModelLabel(sample.model) || "无生成参数"}
              </Text>
          </div>
        </Space>
      ),
    },
    {
      title: "类型",
      width: 100,
      render: (_, sample) => (
        <Tag icon={sample.type === "image" ? <FileImageOutlined /> : <VideoCameraOutlined />}>
          {sample.type === "image" ? "图片" : "视频"}
        </Tag>
      ),
    },
    {
      title: "来源",
      dataIndex: "sourceModule",
      width: 120,
      render: (value: TGeneratedSourceModule) => SOURCE_MODULE_LABELS[value] || "手动样本",
    },
    {
      title: "检测状态",
      width: 190,
      render: (_, sample) => renderDetectionStatus(sample),
    },
    {
      title: "最近结论",
      width: 180,
      render: (_, sample) =>
        sample.latestDetection ? (
          <Space direction="vertical" size={2}>
            <Tag color={sample.latestDetection.type === "fake" ? "blue" : "orange"}>
              {DETECTION_TYPE_LABELS[sample.latestDetection.type]}
            </Tag>
            <Text type="secondary">{sample.latestDetection.result}</Text>
          </Space>
        ) : (
          <Text type="secondary">暂无</Text>
        ),
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      width: 180,
      render: formatDateTime,
    },
    {
      title: "操作",
      fixed: "right",
      width: 210,
      render: (_, sample) => (
        <Space size={4}>
          <Tooltip title="查看详情">
            <Button type="text" icon={<EyeOutlined />} onClick={() => handleOpenDetail(sample)} />
          </Tooltip>
          <Tooltip title="送到 AI 生成检测">
            <Button type="text" icon={<ScanOutlined />} onClick={() => handleSendToDetect(sample, "fake")} />
          </Tooltip>
          <Tooltip title="送到敏感检测">
            <Button type="text" icon={<SafetyOutlined />} onClick={() => handleSendToDetect(sample, "unsafe")} />
          </Tooltip>
          <Tooltip title="下载">
            <Button type="text" icon={<DownloadOutlined />} onClick={() => void handleDownload(sample)} />
          </Tooltip>
          <Tooltip title="删除">
            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(sample)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const recordColumns: ColumnsType<IContentDetectionRecord> = [
    {
      title: "检测对象",
      width: 380,
      render: (_, record) => (
        <Space size={12} align="center" className="content-sample-cell">
          {renderRecordPreview(record, true)}
          <div className="content-sample-copy">
            <Text strong ellipsis={{ tooltip: getRecordSourceTitle(record) }}>
              {getRecordSourceTitle(record)}
            </Text>
            <Text
              type="secondary"
              className="content-sample-subtitle"
              ellipsis={{ tooltip: getRecordSourcePrompt(record) }}
            >
              {getRecordSourcePrompt(record)}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: "检测结论",
      width: 230,
      render: (_, record) => (
        <Space direction="vertical" size={4}>
          <Space size={6} wrap>
            <Tag color={record.type === "fake" ? "blue" : "orange"}>{DETECTION_TYPE_LABELS[record.type]}</Tag>
            <Tag color={getRecordTagColor(record)}>{record.result}</Tag>
          </Space>
          <Text type="secondary">分数：{formatScore(record)}</Text>
        </Space>
      ),
    },
    {
      title: "来源",
      width: 140,
      render: (_, record) => getRecordSourceModuleLabel(record),
    },
    {
      title: "模型",
      dataIndex: "model",
      width: 260,
      render: (_, record) => (
        <Text className="content-model-name" ellipsis={{ tooltip: getRecordDisplayModelName(record) }}>
          {getRecordDisplayModelName(record)}
        </Text>
      ),
    },
    {
      title: "时间",
      dataIndex: "createdAt",
      width: 180,
      render: formatDateTime,
    },
    {
      title: "操作",
      fixed: "right",
      width: 112,
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="查看详情">
            <Button type="text" icon={<EyeOutlined />} onClick={() => handleOpenRecordDetail(record)} />
          </Tooltip>
          <Tooltip title="下载检测对象">
            <Button type="text" icon={<DownloadOutlined />} onClick={() => void handleDownloadRecordMedia(record)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const compactRecordColumns: ColumnsType<IContentDetectionRecord> = [
    {
      title: "类型",
      width: 120,
      render: (_, record) => (
        <Tag color={record.type === "fake" ? "blue" : "orange"}>{DETECTION_TYPE_LABELS[record.type]}</Tag>
      ),
    },
    {
      title: "结果",
      width: 140,
      render: (_, record) => <Tag color={getRecordTagColor(record)}>{record.result}</Tag>,
    },
    {
      title: "分数",
      width: 90,
      render: (_, record) => formatScore(record),
    },
    {
      title: "时间",
      dataIndex: "createdAt",
      render: formatDateTime,
    },
  ];

  return (
    <div className="page-transition content-center-page">
      <div className="page-header">
        <Title level={2} className="page-title">
          样本与检测记录中心
        </Title>
        <Paragraph className="page-description">
          集中管理平台生成的图片/视频测试样本，并追踪 AI 生成检测与敏感内容检测结果。
        </Paragraph>
      </div>

      <Row gutter={[16, 16]} className="content-stat-row">
        <Col xs={12} lg={5}>
          <Card bordered={false} className="content-stat-card">
            <Statistic title="总样本" value={stats.total} />
          </Card>
        </Col>
        <Col xs={12} lg={5}>
          <Card bordered={false} className="content-stat-card">
            <Statistic title="图片样本" value={stats.image} />
          </Card>
        </Col>
        <Col xs={12} lg={5}>
          <Card bordered={false} className="content-stat-card">
            <Statistic title="视频样本" value={stats.video} />
          </Card>
        </Col>
        <Col xs={12} lg={5}>
          <Card bordered={false} className="content-stat-card is-detected">
            <Statistic title="已检测样本" value={stats.detected} />
          </Card>
        </Col>
        <Col xs={24} lg={4}>
          <Card bordered={false} className={`content-stat-card ${stats.highRisk > 0 ? "is-risk" : ""}`}>
            <Statistic
              title="高风险记录"
              value={stats.highRisk}
              valueStyle={{ color: stats.highRisk > 0 ? "#b91c1c" : undefined }}
            />
          </Card>
        </Col>
      </Row>

      <Tabs
        className="content-center-tabs"
        defaultActiveKey="samples"
        tabBarExtraContent={
          <Button icon={<ReloadOutlined />} onClick={() => void loadData()} loading={loading}>
            刷新
          </Button>
        }
        items={[
          {
            key: "samples",
            label: "生成样本",
            children: (
              <Table
                className="content-sample-table"
                rowKey="id"
                loading={loading}
                columns={sampleColumns}
                dataSource={samples}
                pagination={{ pageSize: 8, showSizeChanger: false }}
                scroll={{ x: 1320 }}
                locale={{
                  emptyText: (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="暂无样本。生成内容后点击保存，或使用一键送检自动写入样本库。"
                    />
                  ),
                }}
              />
            ),
          },
          {
            key: "records",
            label: "检测记录",
            children: (
              <Table
                rowKey="id"
                loading={loading}
                columns={recordColumns}
                dataSource={records}
                pagination={{ pageSize: 10, showSizeChanger: false }}
                scroll={{ x: 1320 }}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无检测记录" /> }}
              />
            ),
          },
        ]}
      />

      <Drawer
        title="样本详情"
        width={640}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        extra={
          selectedSample && (
            <Space>
              <Button icon={<ScanOutlined />} onClick={() => handleSendToDetect(selectedSample, "fake")}>
                AI 生成检测
              </Button>
              <Button icon={<SafetyOutlined />} onClick={() => handleSendToDetect(selectedSample, "unsafe")}>
                敏感检测
              </Button>
            </Space>
          )
        }
      >
        {selectedSample ? (
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <div className="content-detail-preview">{renderMediaPreview(selectedSample)}</div>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="标题">{selectedSample.title}</Descriptions.Item>
              <Descriptions.Item label="类型">{selectedSample.type === "image" ? "图片" : "视频"}</Descriptions.Item>
              <Descriptions.Item label="来源">{SOURCE_MODULE_LABELS[selectedSample.sourceModule]}</Descriptions.Item>
              <Descriptions.Item label="模型">{getGenerationModelLabel(selectedSample.model) || "-"}</Descriptions.Item>
              <Descriptions.Item label="大小">{selectedSample.size}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{formatDateTime(selectedSample.createdAt)}</Descriptions.Item>
              <Descriptions.Item label="检测状态">{renderDetectionStatus(selectedSample)}</Descriptions.Item>
              <Descriptions.Item label="生成描述">{selectedSample.prompt || "-"}</Descriptions.Item>
            </Descriptions>
            <div>
              <Title level={5}>检测历史</Title>
              <Table
                rowKey="id"
                size="small"
                columns={compactRecordColumns}
                dataSource={selectedSampleRecords}
                pagination={false}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无关联检测记录" /> }}
              />
            </div>
          </Space>
        ) : null}
      </Drawer>

      <Drawer
        title="检测记录详情"
        width={680}
        open={recordDrawerOpen}
        onClose={() => setRecordDrawerOpen(false)}
        extra={
          selectedRecordSample && (
            <Space>
              <Button icon={<ScanOutlined />} onClick={() => handleSendToDetect(selectedRecordSample, "fake")}>
                AI 生成检测
              </Button>
              <Button icon={<SafetyOutlined />} onClick={() => handleSendToDetect(selectedRecordSample, "unsafe")}>
                敏感检测
              </Button>
            </Space>
          )
        }
      >
        {selectedRecord ? (
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <div className="content-detail-preview">{renderRecordPreview(selectedRecord, false)}</div>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="检测类型">{DETECTION_TYPE_LABELS[selectedRecord.type]}</Descriptions.Item>
              <Descriptions.Item label="检测对象">
                {getRecordSourceTitle(selectedRecord)}
              </Descriptions.Item>
              <Descriptions.Item label="媒体类型">
                {selectedRecord.mediaType === "image" ? "图片" : "视频"}
              </Descriptions.Item>
              <Descriptions.Item label="来源">
                {getRecordSourceModuleLabel(selectedRecord)}
              </Descriptions.Item>
              <Descriptions.Item label="结果">
                <Tag color={getRecordTagColor(selectedRecord)}>{selectedRecord.result}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="分数">{formatScore(selectedRecord)}</Descriptions.Item>
              <Descriptions.Item label="生成模型">{getRecordGenerationModelName(selectedRecord) || "-"}</Descriptions.Item>
              <Descriptions.Item label="检测模型">{inferRecordDetectorModelName(selectedRecord)}</Descriptions.Item>
              <Descriptions.Item label="时间">{formatDateTime(selectedRecord.createdAt)}</Descriptions.Item>
              <Descriptions.Item label="标签/特征">{renderRecordLabelDetails(selectedRecord)}</Descriptions.Item>
            </Descriptions>

            {getRecordSuggestions(selectedRecord).length > 0 && (
              <div>
                <Title level={5}>处理建议</Title>
                <Space direction="vertical" size={6}>
                  {getRecordSuggestions(selectedRecord).map((suggestion, index) => (
                    <Text key={`${suggestion}-${index}`}>{suggestion}</Text>
                  ))}
                </Space>
              </div>
            )}

            <div>
              <Title level={5}>原始检测结果</Title>
              <pre className="content-record-json">{JSON.stringify(selectedRecord.rawResult || {}, null, 2)}</pre>
            </div>
          </Space>
        ) : null}
      </Drawer>
    </div>
  );
};

export default DataOutputPage;
