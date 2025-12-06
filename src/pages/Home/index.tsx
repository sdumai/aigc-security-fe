import { Card, Row, Col, Button, Typography, Space, Divider } from 'antd'
import { useNavigate } from 'react-router-dom'
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
} from '@ant-design/icons'

const { Title, Paragraph, Text } = Typography

const HomePage = () => {
  const navigate = useNavigate()

  const coreFeatures = [
    {
      icon: <ThunderboltOutlined style={{ fontSize: 56, color: '#1890ff' }} />,
      title: 'AIGC 内容生成',
      description: '支持 Deepfake 人脸生成、人脸动画、属性编辑，以及多模态图像和视频生成能力',
      link: '/generate/deepfake',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      stats: '5+ 模型',
    },
    {
      icon: <ScanOutlined style={{ fontSize: 56, color: '#52c41a' }} />,
      title: 'AIGC 内容检测',
      description: '提供虚假内容检测和不安全内容检测，识别深度伪造、暴力、色情等违规内容',
      link: '/detect/fake',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      stats: '95%+ 准确率',
    },
    {
      icon: <DatabaseOutlined style={{ fontSize: 56, color: '#fa8c16' }} />,
      title: '内容管理',
      description: '统一管理所有生成内容和检测记录，支持预览、下载和批量导出',
      link: '/data/output',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      stats: '云端存储',
    },
  ]

  const quickActions = [
    {
      icon: <UserOutlined />,
      title: 'Deepfake 人脸生成',
      link: '/generate/deepfake',
    },
    {
      icon: <SafetyOutlined />,
      title: 'AI 图像检测',
      link: '/detect/fake',
    },
    {
      icon: <DatabaseOutlined />,
      title: '内容管理',
      link: '/data/output',
    },
  ]

  return (
    <div>
      {/* 英雄区域 */}
      <div
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 16,
          padding: '60px 40px',
          marginBottom: 40,
          color: 'white',
          textAlign: 'center',
          boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)',
        }}
      >
        <RocketOutlined style={{ fontSize: 64, marginBottom: 20 }} />
        <Title level={1} style={{ color: 'white', marginBottom: 16, fontSize: 42 }}>
          AIGC 安全性研究与工具平台
        </Title>
        <Paragraph style={{ fontSize: 18, color: 'rgba(255, 255, 255, 0.9)', marginBottom: 32, maxWidth: 800, margin: '0 auto 32px' }}>
          专注于 AI 生成内容的安全性研究，提供内容生成、虚假检测、安全审核等完整工具链
        </Paragraph>
        <Space size="large">
          <Button
            type="primary"
            size="large"
            icon={<ThunderboltOutlined />}
            onClick={() => navigate('/generate/deepfake')}
            style={{
              background: 'white',
              color: '#667eea',
              border: 'none',
              height: 48,
              padding: '0 32px',
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            开始生成
          </Button>
          <Button
            size="large"
            icon={<SafetyOutlined />}
            onClick={() => navigate('/detect/fake')}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: '2px solid white',
              height: 48,
              padding: '0 32px',
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            内容检测
          </Button>
        </Space>
      </div>

      {/* 核心功能卡片 */}
      <Row gutter={[24, 24]} style={{ marginBottom: 48 }}>
        {coreFeatures.map((feature, index) => (
          <Col xs={24} md={8} key={index}>
            <Card
              hoverable
              className="card-hover"
              style={{
                height: '100%',
                border: 'none',
                borderRadius: 16,
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
              }}
              onClick={() => navigate(feature.link)}
            >
              <div
                style={{
                  background: feature.gradient,
                  padding: '32px 24px',
                  textAlign: 'center',
                  marginBottom: 24,
                }}
              >
                <div style={{ filter: 'brightness(0) invert(1)' }}>{feature.icon}</div>
              </div>
              <Space direction="vertical" size="middle" style={{ width: '100%', padding: '0 24px 24px' }}>
                <div>
                  <Title level={4} style={{ marginBottom: 8 }}>
                    {feature.title}
                  </Title>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    {feature.stats}
                  </Text>
                </div>
                <Paragraph style={{ color: '#666', marginBottom: 16, minHeight: 66 }}>
                  {feature.description}
                </Paragraph>
                <Button
                  type="link"
                  block
                  icon={<RightOutlined />}
                  iconPosition="end"
                  style={{ padding: 0, height: 'auto', fontWeight: 600 }}
                >
                  了解更多
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
          borderRadius: 16,
          marginBottom: 32,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        }}
      >
        <Title level={3} style={{ marginBottom: 24 }}>
          <ApiOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          快捷入口
        </Title>
        <Row gutter={[16, 16]}>
          {quickActions.map((action, index) => (
            <Col xs={24} sm={12} md={8} key={index}>
              <Button
                size="large"
                block
                icon={action.icon}
                onClick={() => navigate(action.link)}
                style={{
                  height: 72,
                  fontSize: 16,
                  borderRadius: 12,
                  border: '2px solid #f0f0f0',
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)',
                }}
              >
                {action.title}
              </Button>
            </Col>
          ))}
        </Row>
      </Card>

      {/* 平台优势 */}
      <Card
        bordered={false}
        style={{
          borderRadius: 16,
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        }}
      >
        <Title level={3} style={{ marginBottom: 32, textAlign: 'center' }}>
          <CheckCircleOutlined style={{ marginRight: 8, color: '#52c41a' }} />
          平台优势
        </Title>
        <Row gutter={[24, 24]}>
          <Col xs={12} md={6}>
            <div
              style={{
                textAlign: 'center',
                padding: '24px 16px',
                background: 'white',
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              }}
            >
              <ThunderboltOutlined style={{ fontSize: 40, color: '#1890ff', marginBottom: 12 }} />
              <Title level={2} style={{ color: '#1890ff', marginBottom: 8, fontSize: 36 }}>
                5+
              </Title>
              <Text strong>主流生成模型</Text>
            </div>
          </Col>
          <Col xs={12} md={6}>
            <div
              style={{
                textAlign: 'center',
                padding: '24px 16px',
                background: 'white',
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              }}
            >
              <SafetyCertificateOutlined style={{ fontSize: 40, color: '#52c41a', marginBottom: 12 }} />
              <Title level={2} style={{ color: '#52c41a', marginBottom: 8, fontSize: 36 }}>
                95%+
              </Title>
              <Text strong>检测准确率</Text>
            </div>
          </Col>
          <Col xs={12} md={6}>
            <div
              style={{
                textAlign: 'center',
                padding: '24px 16px',
                background: 'white',
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              }}
            >
              <RocketOutlined style={{ fontSize: 40, color: '#722ed1', marginBottom: 12 }} />
              <Title level={2} style={{ color: '#722ed1', marginBottom: 8, fontSize: 36 }}>
                &lt;2s
              </Title>
              <Text strong>平均响应时间</Text>
            </div>
          </Col>
          <Col xs={12} md={6}>
            <div
              style={{
                textAlign: 'center',
                padding: '24px 16px',
                background: 'white',
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              }}
            >
              <SafetyOutlined style={{ fontSize: 40, color: '#fa8c16', marginBottom: 12 }} />
              <Title level={2} style={{ color: '#fa8c16', marginBottom: 8, fontSize: 36 }}>
                100%
              </Title>
              <Text strong>数据安全保护</Text>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  )
}

export default HomePage


