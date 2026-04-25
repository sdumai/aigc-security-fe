import { Card, Row, Col, Button, Typography, Space, Tag, Tooltip } from "antd";
import { useNavigate } from "react-router-dom";
import {
  ThunderboltOutlined,
  ScanOutlined,
  DatabaseOutlined,
  RightOutlined,
  UserOutlined,
  SafetyOutlined,
  CheckCircleOutlined,
  RocketOutlined,
  SafetyCertificateOutlined,
  ApiOutlined,
} from "@ant-design/icons";

const { Title, Paragraph, Text } = Typography;

const HomePage = () => {
  const navigate = useNavigate();

  const coreFeatures = [
    {
      icon: <ThunderboltOutlined style={{ fontSize: 48, color: "#1e3a5f" }} />,
      title: "生成模块",
      description: "深度伪造人脸生成（换脸、人脸动画、属性编辑）与多模态图像/视频生成，用于安全研究与检测数据构建。",
      link: "/generate/deepfake",
      stats: "5+ 模型",
    },
    {
      icon: <ScanOutlined style={{ fontSize: 48, color: "#1e3a5f" }} />,
      title: "检测模块",
      description: "合成媒体与深度伪造检测、不安全内容检测（暴力、色情、仇恨等），输出风险等级与可解释分析。",
      link: "/detect/fake",
      stats: "95%+ 准确率",
    },
    {
      icon: <DatabaseOutlined style={{ fontSize: 48, color: "#1e3a5f" }} />,
      title: "内容与记录管理",
      description: "集中管理生成产物与检测记录，支持按类型筛选、预览、下载及元数据导出。",
      link: "/data/output",
      stats: "统一存储",
      disabled: true,
    },
  ];

  const quickActions = [
    { icon: <UserOutlined />, title: "深度伪造人脸生成", link: "/generate/deepfake" },
    { icon: <SafetyOutlined />, title: "合成媒体检测", link: "/detect/fake" },
    { icon: <DatabaseOutlined />, title: "内容与记录管理", link: "/data/output", disabled: true },
  ];

  return (
    <div className="page-transition">
      {/* 首屏标题区 */}
      <div
        style={{
          background: "var(--color-primary)",
          borderRadius: "var(--radius-lg)",
          padding: "28px 28px",
          marginBottom: 20,
          color: "white",
          textAlign: "center",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <RocketOutlined style={{ fontSize: 48, marginBottom: 16, opacity: 0.9 }} />
        <Title level={1} style={{ color: "white", marginBottom: 12, fontSize: 28, fontFamily: "var(--font-heading)" }}>
          AIGC 安全检测平台
        </Title>
        <Paragraph
          style={{
            fontSize: 15,
            color: "rgba(255, 255, 255, 0.88)",
            marginBottom: 28,
            maxWidth: 640,
            margin: "0 auto 28px",
            lineHeight: 1.7,
          }}
        >
          面向 AI
          生成内容（AIGC）安全研究的一体化工具：支持合成媒体生成与多模态内容生成、深度伪造与不安全内容检测，以及生成与检测记录的集中管理。本平台仅供学术研究与安全评估使用。
        </Paragraph>
        <Space size="middle">
          <Button
            type="primary"
            size="large"
            icon={<ThunderboltOutlined />}
            onClick={() => navigate("/generate/deepfake")}
            style={{
              background: "white",
              color: "var(--color-primary)",
              border: "none",
              height: 44,
              padding: "0 28px",
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            进入生成模块
          </Button>
          <Button
            size="large"
            icon={<SafetyOutlined />}
            onClick={() => navigate("/detect/fake")}
            style={{
              background: "rgba(255, 255, 255, 0.15)",
              color: "white",
              border: "1px solid rgba(255,255,255,0.5)",
              height: 44,
              padding: "0 28px",
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            进入检测模块
          </Button>
        </Space>
      </div>

      {/* 核心功能卡片 */}
      <Row gutter={[24, 24]} style={{ marginBottom: 20 }}>
        {coreFeatures.map((feature, index) => (
          <Col xs={24} md={8} key={index}>
            <Card
              hoverable={!feature.disabled}
              className={feature.disabled ? "" : "card-hover"}
              style={{
                height: "100%",
                border: "1px solid var(--color-border-light)",
                borderRadius: "var(--radius-lg)",
                boxShadow: "var(--shadow-sm)",
                opacity: feature.disabled ? 0.7 : 1,
                cursor: feature.disabled ? "not-allowed" : "pointer",
              }}
              onClick={() => !feature.disabled && navigate(feature.link)}
            >
              <div style={{ marginBottom: 20 }}>{feature.icon}</div>
              <Space direction="vertical" size="small" style={{ width: "100%" }}>
                <div>
                  <Space size={8} align="center">
                    <Title level={4} style={{ marginBottom: 0, fontFamily: "var(--font-heading)", fontSize: 16 }}>
                      {feature.title}
                    </Title>
                    {feature.disabled && <Tag color="default">暂未开放</Tag>}
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 4 }}>
                    {feature.stats}
                  </Text>
                </div>
                <Paragraph
                  style={{ color: "var(--color-text-secondary)", marginBottom: 16, minHeight: 60, fontSize: 13 }}
                >
                  {feature.description}
                </Paragraph>
                <Button
                  type="link"
                  block
                  icon={<RightOutlined />}
                  iconPosition="end"
                  disabled={feature.disabled}
                  style={{ padding: 0, height: "auto", fontWeight: 500 }}
                >
                  进入模块
                </Button>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 快捷入口 */}
      <Card
        bordered={false}
        style={{
          borderRadius: "var(--radius-lg)",
          marginBottom: 32,
          border: "1px solid var(--color-border-light)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <Title level={5} style={{ marginBottom: 20, fontFamily: "var(--font-heading)", color: "var(--color-text)" }}>
          <ApiOutlined style={{ marginRight: 8, color: "var(--color-primary)" }} />
          快捷入口
        </Title>
        <Row gutter={[16, 16]}>
          {quickActions.map((action, index) => (
            <Col xs={24} sm={12} md={8} key={index}>
              <Tooltip title={action.disabled ? "该模块暂未开放，敬请期待" : undefined}>
                <Button
                  size="large"
                  block
                  icon={action.icon}
                  disabled={action.disabled}
                  onClick={() => !action.disabled && navigate(action.link)}
                  style={{
                    height: 56,
                    fontSize: 15,
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--color-border)",
                    fontWeight: 500,
                    background: "var(--color-bg-content)",
                    color: "var(--color-text)",
                  }}
                >
                  {action.title}
                </Button>
              </Tooltip>
            </Col>
          ))}
        </Row>
      </Card>

      {/* 能力指标 */}
      <Card
        bordered={false}
        style={{
          borderRadius: "var(--radius-lg)",
          background: "var(--color-bg-muted)",
          border: "1px solid var(--color-border-light)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <Title
          level={5}
          style={{
            marginBottom: 24,
            textAlign: "center",
            fontFamily: "var(--font-heading)",
            color: "var(--color-text)",
          }}
        >
          <CheckCircleOutlined style={{ marginRight: 8, color: "var(--color-primary)" }} />
          平台能力指标
        </Title>
        <Row gutter={[24, 24]}>
          <Col xs={12} md={6}>
            <div
              style={{
                textAlign: "center",
                padding: "20px 16px",
                background: "var(--color-bg-content)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border-light)",
              }}
            >
              <ThunderboltOutlined style={{ fontSize: 32, color: "var(--color-primary)", marginBottom: 10 }} />
              <Title level={2} style={{ color: "var(--color-primary)", marginBottom: 6, fontSize: 28 }}>
                5+
              </Title>
              <Text style={{ fontSize: 13 }}>生成模型</Text>
            </div>
          </Col>
          <Col xs={12} md={6}>
            <div
              style={{
                textAlign: "center",
                padding: "20px 16px",
                background: "var(--color-bg-content)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border-light)",
              }}
            >
              <SafetyCertificateOutlined style={{ fontSize: 32, color: "var(--color-primary)", marginBottom: 10 }} />
              <Title level={2} style={{ color: "var(--color-primary)", marginBottom: 6, fontSize: 28 }}>
                95%+
              </Title>
              <Text style={{ fontSize: 13 }}>检测准确率</Text>
            </div>
          </Col>
          <Col xs={12} md={6}>
            <div
              style={{
                textAlign: "center",
                padding: "20px 16px",
                background: "var(--color-bg-content)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border-light)",
              }}
            >
              <RocketOutlined style={{ fontSize: 32, color: "var(--color-primary)", marginBottom: 10 }} />
              <Title level={2} style={{ color: "var(--color-primary)", marginBottom: 6, fontSize: 28 }}>
                &lt;2s
              </Title>
              <Text style={{ fontSize: 13 }}>平均响应时间</Text>
            </div>
          </Col>
          <Col xs={12} md={6}>
            <div
              style={{
                textAlign: "center",
                padding: "20px 16px",
                background: "var(--color-bg-content)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border-light)",
              }}
            >
              <SafetyOutlined style={{ fontSize: 32, color: "var(--color-primary)", marginBottom: 10 }} />
              <Title level={2} style={{ color: "var(--color-primary)", marginBottom: 6, fontSize: 28 }}>
                100%
              </Title>
              <Text style={{ fontSize: 13 }}>数据本地/可控</Text>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default HomePage;
