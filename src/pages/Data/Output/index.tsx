import { useState, useEffect } from 'react'
import {
  Card,
  Row,
  Col,
  Image,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Select,
  Switch,
  message,
  Spin,
  Typography,
  Tabs,
  Empty,
} from 'antd'
import {
  DownloadOutlined,
  EyeOutlined,
  ShareAltOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  FileImageOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import request from '@/utils/request'

const { Title, Paragraph, Text } = Typography

interface OutputItem {
  id: string
  type: 'image' | 'video'
  title: string
  thumbnailUrl: string
  fullUrl: string
  createdAt: string
  size: string
}

interface DetectionRecord {
  id: string
  type: 'fake' | 'unsafe'
  filename: string
  result: string
  confidence?: number
  riskScore?: number
  createdAt: string
}

const DataOutputPage = () => {
  const [loading, setLoading] = useState(false)
  const [outputs, setOutputs] = useState<OutputItem[]>([])
  const [detections, setDetections] = useState<DetectionRecord[]>([])
  const [downloadModalVisible, setDownloadModalVisible] = useState(false)
  const [selectedItem, setSelectedItem] = useState<OutputItem | null>(null)
  const [previewModalVisible, setPreviewModalVisible] = useState(false)
  const [downloadForm] = Form.useForm()

  useEffect(() => {
    fetchOutputs()
    fetchDetections()
  }, [])

  const fetchOutputs = async () => {
    try {
      setLoading(true)
      const response: any = await request.get('/data/outputs')
      if (response && response.data) {
        setOutputs(response.data)
      }
    } catch (error) {
      console.error('Fetch outputs error:', error)
      message.error('加载生成内容失败')
      setOutputs([])
    } finally {
      setLoading(false)
    }
  }

  const fetchDetections = async () => {
    try {
      const response: any = await request.get('/data/detections')
      if (response && response.data) {
        setDetections(response.data)
      }
    } catch (error) {
      console.error('Fetch detections error:', error)
      setDetections([])
    }
  }

  const handlePreview = (item: OutputItem) => {
    setSelectedItem(item)
    setPreviewModalVisible(true)
  }

  const handleDownloadClick = (item: OutputItem) => {
    setSelectedItem(item)
    setDownloadModalVisible(true)
  }

  const handleDownload = async () => {
    try {
      const values = await downloadForm.validateFields()
      message.success(`正在下载 ${selectedItem?.title}，格式：${values.format}`)
      setDownloadModalVisible(false)
      downloadForm.resetFields()
    } catch (error) {
      console.error('Download error:', error)
    }
  }

  const renderOutputCard = (item: OutputItem) => (
    <Card
      key={item.id}
      hoverable
      cover={
        <div style={{ height: 200, overflow: 'hidden', background: '#f0f0f0' }}>
          <Image
            src={item.thumbnailUrl}
            alt={item.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            preview={false}
          />
        </div>
      }
      actions={[
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={() => handlePreview(item)}
        >
          预览
        </Button>,
        <Button
          type="text"
          icon={<DownloadOutlined />}
          onClick={() => handleDownloadClick(item)}
        >
          下载
        </Button>,
        <Button type="text" icon={<ShareAltOutlined />}>
          投放
        </Button>,
      ]}
    >
      <Card.Meta
        title={
          <Space>
            {item.type === 'image' ? (
              <FileImageOutlined style={{ color: '#1890ff' }} />
            ) : (
              <VideoCameraOutlined style={{ color: '#52c41a' }} />
            )}
            <Text ellipsis style={{ maxWidth: 180 }}>
              {item.title}
            </Text>
          </Space>
        }
        description={
          <Space direction="vertical" size={4}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              <ClockCircleOutlined /> {item.createdAt}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              大小：{item.size}
            </Text>
          </Space>
        }
      />
    </Card>
  )

  const outputsTab = (
    <div>
      <Paragraph type="secondary" style={{ marginBottom: 16 }}>
        展示所有通过平台生成的图像和视频内容，支持预览、下载和批量导出。
      </Paragraph>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <Spin size="large" />
        </div>
      ) : outputs.length > 0 ? (
        <>
          <Row gutter={[16, 16]}>
            {outputs.map((item) => (
              <Col xs={24} sm={12} md={8} lg={6} key={item.id}>
                {renderOutputCard(item)}
              </Col>
            ))}
          </Row>

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Button size="large" icon={<DownloadOutlined />}>
              批量导出
            </Button>
          </div>
        </>
      ) : (
        <Empty description="暂无生成内容" />
      )}
    </div>
  )

  const detectionsTab = (
    <div>
      <Paragraph type="secondary" style={{ marginBottom: 16 }}>
        记录所有检测任务的历史结果，包括虚假内容检测和不安全内容检测。
      </Paragraph>

      {detections.length > 0 ? (
        <Card>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {detections.map((record) => (
              <Card key={record.id} size="small">
                <Row align="middle">
                  <Col xs={24} sm={8}>
                    <Space>
                      <Tag color={record.type === 'fake' ? 'blue' : 'orange'}>
                        {record.type === 'fake' ? '虚假检测' : '安全检测'}
                      </Tag>
                      <Text strong>{record.filename}</Text>
                    </Space>
                  </Col>
                  <Col xs={24} sm={6}>
                    <Text>
                      结果：
                      <Tag
                        color={
                          record.result === '真实' || record.result.includes('低')
                            ? 'success'
                            : 'error'
                        }
                      >
                        {record.result}
                      </Tag>
                    </Text>
                  </Col>
                  <Col xs={24} sm={6}>
                    {record.confidence && (
                      <Text type="secondary">
                        置信度：{Math.round(record.confidence * 100)}%
                      </Text>
                    )}
                    {record.riskScore && (
                      <Text type="secondary">
                        风险：{Math.round(record.riskScore * 100)}%
                      </Text>
                    )}
                  </Col>
                  <Col xs={24} sm={4} style={{ textAlign: 'right' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {record.createdAt}
                    </Text>
                  </Col>
                </Row>
              </Card>
            ))}
          </Space>
        </Card>
      ) : (
        <Empty description="暂无检测记录" />
      )}
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <Title level={2} className="page-title">
          数据输出
        </Title>
        <Paragraph className="page-description">
          集中管理所有生成的内容和检测记录。
          支持按类型筛选、批量下载，并提供详细的元数据信息。
        </Paragraph>
      </div>

      <Tabs
        defaultActiveKey="outputs"
        size="large"
        items={[
          {
            key: 'outputs',
            label: '生成内容',
            icon: <PictureOutlined />,
            children: outputsTab,
          },
          {
            key: 'detections',
            label: '检测记录',
            icon: <EyeOutlined />,
            children: detectionsTab,
          },
        ]}
      />

      {/* 预览模态框 */}
      <Modal
        title={selectedItem?.title}
        open={previewModalVisible}
        onCancel={() => setPreviewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setPreviewModalVisible(false)}>
            关闭
          </Button>,
          <Button
            key="download"
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => {
              setPreviewModalVisible(false)
              if (selectedItem) handleDownloadClick(selectedItem)
            }}
          >
            下载
          </Button>,
        ]}
        width={800}
      >
        {selectedItem?.type === 'image' ? (
          <Image src={selectedItem.fullUrl} alt={selectedItem.title} />
        ) : (
          <video
            src={selectedItem?.fullUrl}
            controls
            style={{ width: '100%', maxHeight: 500 }}
          >
            您的浏览器不支持视频播放
          </video>
        )}
      </Modal>

      {/* 下载配置模态框 */}
      <Modal
        title="下载设置"
        open={downloadModalVisible}
        onOk={handleDownload}
        onCancel={() => {
          setDownloadModalVisible(false)
          downloadForm.resetFields()
        }}
        okText="开始下载"
        cancelText="取消"
      >
        <Form
          form={downloadForm}
          layout="vertical"
          initialValues={{
            format: selectedItem?.type === 'video' ? 'MP4' : 'PNG',
            resolution: 'original',
            batch: false,
          }}
        >
          <Form.Item
            label="文件格式"
            name="format"
            rules={[{ required: true, message: '请选择格式' }]}
          >
            <Select>
              {selectedItem?.type === 'video' ? (
                <>
                  <Select.Option value="MP4">MP4</Select.Option>
                  <Select.Option value="MOV">MOV</Select.Option>
                  <Select.Option value="AVI">AVI</Select.Option>
                </>
              ) : (
                <>
                  <Select.Option value="PNG">PNG</Select.Option>
                  <Select.Option value="JPG">JPG</Select.Option>
                  <Select.Option value="WEBP">WEBP</Select.Option>
                </>
              )}
            </Select>
          </Form.Item>

          <Form.Item
            label="分辨率"
            name="resolution"
            rules={[{ required: true, message: '请选择分辨率' }]}
          >
            <Select>
              <Select.Option value="original">原始分辨率</Select.Option>
              <Select.Option value="720p">720p</Select.Option>
              <Select.Option value="1080p">1080p</Select.Option>
              <Select.Option value="4k">4K</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="批量导出" name="batch" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default DataOutputPage


