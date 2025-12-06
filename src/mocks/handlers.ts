import { http, HttpResponse, delay } from 'msw'

export const handlers = [
  // Deepfake 人脸生成
  http.post('/api/generate/deepfake', async () => {
    await delay(1000) // 模拟网络延迟
    return HttpResponse.json({
      success: true,
      imageUrl: '/mock/deepfake_result.jpg',
      message: '生成成功',
    })
  }),

  // 通用图像生成
  http.post('/api/generate/image', async () => {
    await delay(1200)
    return HttpResponse.json({
      success: true,
      imageUrl: 'https://picsum.photos/768/768',
      message: '图像生成成功',
    })
  }),

  // 视频生成
  http.post('/api/generate/video', async () => {
    await delay(2000)
    return HttpResponse.json({
      success: true,
      videoUrl: '/mock/generated_video.mp4',
      message: '视频生成成功',
    })
  }),

  // 虚假内容检测
  http.post('/api/detect/fake', async () => {
    await delay(800)
    return HttpResponse.json({
      success: true,
      isFake: true,
      confidence: 0.873,
      heatmapUrl: '/mock/heatmap.png',
      model: 'D3 视频检测模型',
      details: {
        faceRegion: { x: 120, y: 80, width: 200, height: 250 },
        artifacts: ['边缘失真', '光照不一致', '纹理异常'],
      },
    })
  }),

  // 不安全内容检测
  http.post('/api/detect/unsafe', async () => {
    await delay(700)
    return HttpResponse.json({
      success: true,
      violations: ['violence', 'sensitive'],
      risk: 'high',
      riskScore: 0.85,
      suggestions: [
        '建议模糊处理人物面部',
        '移除暴力相关元素',
        '添加内容警告标识',
      ],
      details: {
        violence: { score: 0.92, regions: [{ x: 100, y: 150, width: 300, height: 200 }] },
        sensitive: { score: 0.78, regions: [{ x: 250, y: 100, width: 150, height: 180 }] },
      },
    })
  }),

  // 文件上传
  http.post('/api/data/upload', async () => {
    await delay(1500)
    return HttpResponse.json({
      success: true,
      fileId: `file_${Date.now()}`,
      status: 'success',
      url: '/mock/uploaded_file.jpg',
      message: '上传成功',
    })
  }),

  // 网络爬取
  http.post('/api/data/crawl', async () => {
    await delay(3000)
    return HttpResponse.json({
      success: true,
      taskId: `task_${Date.now()}`,
      status: 'completed',
      filesCount: 15,
      message: '爬取完成',
    })
  }),

  // 获取已生成内容列表
  http.get('/api/data/outputs', async () => {
    await delay(500)
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: '1',
          type: 'image',
          title: 'Deepfake 人脸替换 - 名人效果',
          thumbnailUrl: 'https://picsum.photos/200/200?random=1',
          fullUrl: 'https://picsum.photos/800/800?random=1',
          createdAt: '2024-12-06 14:30:22',
          size: '2.3 MB',
        },
        {
          id: '2',
          type: 'video',
          title: 'AI 视频生成 - 未来城市',
          thumbnailUrl: 'https://picsum.photos/200/200?random=2',
          fullUrl: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
          createdAt: '2024-12-06 13:20:15',
          size: '15.7 MB',
        },
        {
          id: '3',
          type: 'image',
          title: 'StarGAN 属性编辑 - 年龄变化',
          thumbnailUrl: 'https://picsum.photos/200/200?random=3',
          fullUrl: 'https://picsum.photos/800/800?random=3',
          createdAt: '2024-12-06 12:10:45',
          size: '1.8 MB',
        },
        {
          id: '4',
          type: 'image',
          title: 'FOMM 人脸动画 - 表情驱动',
          thumbnailUrl: 'https://picsum.photos/200/200?random=4',
          fullUrl: 'https://picsum.photos/800/800?random=4',
          createdAt: '2024-12-06 11:05:30',
          size: '2.1 MB',
        },
        {
          id: '5',
          type: 'video',
          title: 'Deepfake 视频合成 - 演讲场景',
          thumbnailUrl: 'https://picsum.photos/200/200?random=5',
          fullUrl: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
          createdAt: '2024-12-05 16:45:20',
          size: '24.5 MB',
        },
        {
          id: '6',
          type: 'image',
          title: 'AI 图像生成 - 科幻场景',
          thumbnailUrl: 'https://picsum.photos/200/200?random=6',
          fullUrl: 'https://picsum.photos/800/800?random=6',
          createdAt: '2024-12-05 15:30:10',
          size: '3.2 MB',
        },
        {
          id: '7',
          type: 'image',
          title: 'SimSwap 人脸交换 - 动漫风格',
          thumbnailUrl: 'https://picsum.photos/200/200?random=7',
          fullUrl: 'https://picsum.photos/800/800?random=7',
          createdAt: '2024-12-05 10:15:33',
          size: '1.9 MB',
        },
        {
          id: '8',
          type: 'image',
          title: 'FaceShifter 高清合成',
          thumbnailUrl: 'https://picsum.photos/200/200?random=8',
          fullUrl: 'https://picsum.photos/800/800?random=8',
          createdAt: '2024-12-04 18:22:11',
          size: '4.1 MB',
        },
        {
          id: '9',
          type: 'video',
          title: 'AI 视频 - 自然风光',
          thumbnailUrl: 'https://picsum.photos/200/200?random=9',
          fullUrl: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
          createdAt: '2024-12-04 14:55:40',
          size: '18.3 MB',
        },
        {
          id: '10',
          type: 'image',
          title: 'AI 图像生成 - 赛博朋克',
          thumbnailUrl: 'https://picsum.photos/200/200?random=10',
          fullUrl: 'https://picsum.photos/800/800?random=10',
          createdAt: '2024-12-04 09:30:25',
          size: '2.7 MB',
        },
        {
          id: '11',
          type: 'image',
          title: 'StarGAN 性别转换效果',
          thumbnailUrl: 'https://picsum.photos/200/200?random=11',
          fullUrl: 'https://picsum.photos/800/800?random=11',
          createdAt: '2024-12-03 16:18:50',
          size: '2.5 MB',
        },
        {
          id: '12',
          type: 'image',
          title: 'AI 艺术创作 - 抽象画',
          thumbnailUrl: 'https://picsum.photos/200/200?random=12',
          fullUrl: 'https://picsum.photos/800/800?random=12',
          createdAt: '2024-12-03 11:42:15',
          size: '3.8 MB',
        },
      ],
    })
  }),

  // 保存生成的内容
  http.post('/api/data/save', async () => {
    await delay(300)
    return HttpResponse.json({
      success: true,
      message: '内容已保存到内容管理',
      id: `saved_${Date.now()}`,
    })
  }),

  // 获取检测历史记录
  http.get('/api/data/detections', async () => {
    await delay(500)
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: '1',
          type: 'fake',
          filename: 'suspicious_video.mp4',
          result: '虚假',
          confidence: 0.873,
          createdAt: '2024-12-06 14:20:00',
        },
        {
          id: '2',
          type: 'unsafe',
          filename: 'content_check.jpg',
          result: '高风险',
          riskScore: 0.85,
          createdAt: '2024-12-06 13:15:30',
        },
        {
          id: '3',
          type: 'fake',
          filename: 'test_image.png',
          result: '真实',
          confidence: 0.95,
          createdAt: '2024-12-06 12:00:00',
        },
        {
          id: '4',
          type: 'unsafe',
          filename: 'review_content.mp4',
          result: '中风险',
          riskScore: 0.62,
          createdAt: '2024-12-05 18:30:45',
        },
        {
          id: '5',
          type: 'fake',
          filename: 'deepfake_test.jpg',
          result: '虚假',
          confidence: 0.91,
          createdAt: '2024-12-05 15:22:10',
        },
        {
          id: '6',
          type: 'fake',
          filename: 'celebrity_video.mp4',
          result: '虚假',
          confidence: 0.88,
          createdAt: '2024-12-05 11:10:33',
        },
        {
          id: '7',
          type: 'unsafe',
          filename: 'social_post.png',
          result: '低风险',
          riskScore: 0.23,
          createdAt: '2024-12-04 16:45:20',
        },
        {
          id: '8',
          type: 'fake',
          filename: 'news_image.jpg',
          result: '真实',
          confidence: 0.97,
          createdAt: '2024-12-04 10:30:15',
        },
      ],
    })
  }),
]


