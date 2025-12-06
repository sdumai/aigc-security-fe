import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  Tabs,
  Form,
  Input,
  Select,
  Button,
  Upload,
  Image,
  message,
  Spin,
  Typography,
  Space,
  Row,
  Col,
} from 'antd'
import { ThunderboltOutlined, UploadOutlined, PictureOutlined, VideoCameraOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd'
import request from '@/utils/request'

const { Title, Paragraph, Text } = Typography
const { TextArea } = Input

interface ImageResult {
  imageUrl: string
  message: string
}

interface VideoResult {
  videoUrl: string
  message: string
}

const GeneralGeneratePage = () => {
  const navigate = useNavigate()
  const [imageForm] = Form.useForm()
  const [videoForm] = Form.useForm()
  const [imageLoading, setImageLoading] = useState(false)
  const [videoLoading, setVideoLoading] = useState(false)
  const [imageResult, setImageResult] = useState<ImageResult | null>(null)
  const [videoResult, setVideoResult] = useState<VideoResult | null>(null)
  const [referenceImage, setReferenceImage] = useState<UploadFile[]>([])

  const handleImageGenerate = async () => {
    try {
      const values = await imageForm.validateFields()
      setImageLoading(true)
      setImageResult(null)

      const response: any = await request.post('/generate/image', values)
      setImageResult(response)
      message.success('图像生成成功！')
    } catch (error) {
      console.error('Generate error:', error)
    } finally {
      setImageLoading(false)
    }
  }

  const handleVideoGenerate = async () => {
    try {
      const values = await videoForm.validateFields()
      setVideoLoading(true)
      setVideoResult(null)

      const formData = new FormData()
      formData.append('prompt', values.prompt)
      formData.append('duration', values.duration)
      if (referenceImage.length > 0) {
        formData.append('reference', referenceImage[0].originFileObj as File)
      }

      const response: any = await request.post('/generate/video', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      setVideoResult(response)
      message.success('视频生成成功！')
    } catch (error) {
      console.error('Generate error:', error)
    } finally {
      setVideoLoading(false)
    }
  }

  const handleSaveImage = async () => {
    try {
      const values = imageForm.getFieldsValue()
      await request.post('/data/save', {
        type: 'image',
        title: `AI 图像生成 - ${values.prompt.substring(0, 20)}...`,
        url: imageResult?.imageUrl,
      })
      message.success({
        content: '图像已保存！可在内容管理中查看',
        duration: 3,
      })
      setTimeout(() => {
        navigate('/data/output')
      }, 1500)
    } catch (error) {
      console.error('Save error:', error)
    }
  }

  const handleSaveVideo = async () => {
    try {
      const values = videoForm.getFieldsValue()
      await request.post('/data/save', {
        type: 'video',
        title: `AI 视频生成 - ${values.prompt.substring(0, 20)}...`,
        url: videoResult?.videoUrl,
      })
      message.success({
        content: '视频已保存！可在内容管理中查看',
        duration: 3,
      })
      setTimeout(() => {
        navigate('/data/output')
      }, 1500)
    } catch (error) {
      console.error('Save error:', error)
    }
  }

  const imageTab = (
    <Row gutter={24}>
      <Col xs={24} lg={12}>
        <Card title="图像生成配置" bordered={false}>
          <Form
            form={imageForm}
            layout="vertical"
            initialValues={{
              size: '512x512',
            }}
          >
            <Form.Item
              label="提示词（Prompt）"
              name="prompt"
              rules={[{ required: true, message: '请输入提示词' }]}
            >
              <TextArea
                rows={4}
                placeholder="描述您想要生成的图像，例如：A futuristic city at sunset with flying cars"
                showCount
                maxLength={500}
              />
            </Form.Item>

            <Form.Item
              label="图像尺寸"
              name="size"
              rules={[{ required: true, message: '请选择尺寸' }]}
            >
              <Select>
                <Select.Option value="512x512">512 x 512</Select.Option>
                <Select.Option value="768x768">768 x 768</Select.Option>
                <Select.Option value="1024x1024">1024 x 1024</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                size="large"
                block
                icon={<ThunderboltOutlined />}
                loading={imageLoading}
                onClick={handleImageGenerate}
              >
                {imageLoading ? '生成中...' : '生成图片'}
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </Col>

      <Col xs={24} lg={12}>
        <Card title="生成结果" bordered={false}>
          {imageLoading ? (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <Spin size="large" />
              <Paragraph style={{ marginTop: 16, color: '#666' }}>
                正在生成图像，请稍候...
              </Paragraph>
            </div>
          ) : imageResult ? (
            <div>
              <Image
                src={imageResult.imageUrl}
                alt="生成的图像"
                style={{ width: '100%', borderRadius: 8 }}
              />
              <Space style={{ marginTop: 16, width: '100%' }} direction="vertical">
                <Button type="primary" block onClick={handleSaveImage}>
                  保存到内容管理
                </Button>
                <Button block icon={<UploadOutlined />}>
                  下载图片
                </Button>
                <Button block onClick={() => setImageResult(null)}>
                  重新生成
                </Button>
              </Space>
            </div>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '80px 20px',
                background: '#fafafa',
                borderRadius: 8,
              }}
            >
              <PictureOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />
              <Paragraph style={{ color: '#999', marginTop: 16 }}>
                图像将在生成后显示在这里
              </Paragraph>
            </div>
          )}
        </Card>
      </Col>
    </Row>
  )

  const videoTab = (
    <Row gutter={24}>
      <Col xs={24} lg={12}>
        <Card title="视频生成配置" bordered={false}>
          <Form
            form={videoForm}
            layout="vertical"
            initialValues={{
              duration: '2',
            }}
          >
            <Form.Item
              label="提示词（Prompt）"
              name="prompt"
              rules={[{ required: true, message: '请输入提示词' }]}
            >
              <TextArea
                rows={4}
                placeholder="描述您想要生成的视频，例如：A serene ocean wave at golden hour"
                showCount
                maxLength={500}
              />
            </Form.Item>

            <Form.Item label="参考图片（可选）" tooltip="上传参考图片可以帮助生成更符合预期的视频">
              <Upload
                listType="picture-card"
                fileList={referenceImage}
                maxCount={1}
                beforeUpload={(file) => {
                  setReferenceImage([file as any])
                  return false
                }}
                onRemove={() => setReferenceImage([])}
              >
                {referenceImage.length === 0 && (
                  <div>
                    <UploadOutlined />
                    <div style={{ marginTop: 8 }}>上传参考图</div>
                  </div>
                )}
              </Upload>
            </Form.Item>

            <Form.Item
              label="生成时长"
              name="duration"
              rules={[{ required: true, message: '请选择时长' }]}
            >
              <Select>
                <Select.Option value="2">2 秒</Select.Option>
                <Select.Option value="4">4 秒</Select.Option>
                <Select.Option value="6">6 秒</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                size="large"
                block
                icon={<ThunderboltOutlined />}
                loading={videoLoading}
                onClick={handleVideoGenerate}
              >
                {videoLoading ? '生成中...' : '生成视频'}
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </Col>

      <Col xs={24} lg={12}>
        <Card title="生成结果" bordered={false}>
          {videoLoading ? (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <Spin size="large" />
              <Paragraph style={{ marginTop: 16, color: '#666' }}>
                正在生成视频，这可能需要较长时间...
              </Paragraph>
            </div>
          ) : videoResult ? (
            <div>
              <video
                src={videoResult.videoUrl}
                controls
                style={{ width: '100%', borderRadius: 8 }}
              >
                您的浏览器不支持视频播放
              </video>
              <Space style={{ marginTop: 16, width: '100%' }} direction="vertical">
                <Button type="primary" block onClick={handleSaveVideo}>
                  保存到内容管理
                </Button>
                <Button block icon={<UploadOutlined />}>
                  下载视频
                </Button>
                <Button block onClick={() => setVideoResult(null)}>
                  重新生成
                </Button>
              </Space>
            </div>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '80px 20px',
                background: '#fafafa',
                borderRadius: 8,
              }}
            >
              <VideoCameraOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />
              <Paragraph style={{ color: '#999', marginTop: 16 }}>
                视频将在生成后显示在这里
              </Paragraph>
            </div>
          )}
        </Card>
      </Col>
    </Row>
  )

  return (
    <div className="page-transition">
      <div className="page-header">
        <Title level={2} className="page-title">
          多模态内容生成
        </Title>
        <Paragraph className="page-description">
          基于先进的 AI 模型，支持文本到图像、文本到视频的多模态内容生成。
          只需输入描述性文字，即可生成高质量的图像或视频内容。
        </Paragraph>
      </div>

      <Tabs
        defaultActiveKey="image"
        size="large"
        items={[
          {
            key: 'image',
            label: '图像生成',
            icon: <PictureOutlined />,
            children: imageTab,
          },
          {
            key: 'video',
            label: '视频生成',
            icon: <VideoCameraOutlined />,
            children: videoTab,
          },
        ]}
      />
    </div>
  )
}

export default GeneralGeneratePage


