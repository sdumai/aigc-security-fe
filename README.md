# AIGC 安全性研究与工具平台

这是一个面向 AI 生成内容（AIGC）安全性研究的完整前端系统，提供内容生成、虚假检测、安全审核等完整工具链。

## 技术栈

- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **Ant Design** - UI 组件库
- **React Router v6** - 路由管理
- **Axios** - HTTP 客户端
- **MSW (Mock Service Worker)** - API Mock
- **Zustand** - 状态管理（可选）

## 功能模块

### 1. AIGC 内容生成
- **Deepfake 人脸生成**：支持人脸替换、人脸动画、属性编辑
- **多模态内容生成**：文本到图像、文本到视频

### 2. AIGC 内容检测
- **虚假内容检测**：识别 Deepfake、FaceSwap 等伪造内容
- **不安全内容检测**：识别暴力、色情、仇恨等违规内容

### 3. 数据流转
- **数据接入**：本地上传、网络爬取
- **数据输出**：生成内容管理、检测记录查看

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

应用将运行在 http://localhost:5173

### 构建生产版本

```bash
npm run build
```

### 预览生产构建

```bash
npm run preview
```

## 项目结构

```
aigc-security/
├── public/                 # 静态资源
│   ├── mock/              # Mock 资源文件
│   └── mockServiceWorker.js  # MSW Service Worker
├── src/
│   ├── components/        # 公共组件
│   │   └── Layout/        # 布局组件
│   ├── pages/            # 页面组件
│   │   ├── Home/         # 首页
│   │   ├── Generate/     # 生成模块
│   │   ├── Detect/       # 检测模块
│   │   └── Data/         # 数据流转模块
│   ├── mocks/            # MSW Mock 配置
│   │   ├── browser.ts    # Browser Worker
│   │   └── handlers.ts   # API Handlers
│   ├── routes/           # 路由配置
│   ├── utils/            # 工具函数
│   ├── App.tsx           # 根组件
│   ├── main.tsx          # 入口文件
│   └── index.css         # 全局样式
├── index.html            # HTML 模板
├── package.json          # 依赖配置
├── tsconfig.json         # TypeScript 配置
└── vite.config.ts        # Vite 配置
```

## 特性说明

### Mock API
本项目使用 MSW (Mock Service Worker) 拦截所有 API 请求，返回模拟数据。所有请求均不会发送到真实后端。

Mock 接口列表：
- `POST /api/generate/deepfake` - Deepfake 生成
- `POST /api/generate/image` - 图像生成
- `POST /api/generate/video` - 视频生成
- `POST /api/detect/fake` - 虚假内容检测
- `POST /api/detect/unsafe` - 不安全内容检测
- `POST /api/data/upload` - 文件上传
- `POST /api/data/crawl` - 网络爬取
- `GET /api/data/outputs` - 获取生成内容列表
- `GET /api/data/detections` - 获取检测记录

### 响应式设计
界面支持桌面端访问，使用 Ant Design 的栅格系统实现响应式布局。

### 交互特性
- 骨架屏加载
- 进度条显示
- 实时反馈
- 错误处理
- 文件预览
- 批量操作

## 开发说明

### 添加新页面
1. 在 `src/pages/` 创建新页面组件
2. 在 `src/routes/index.tsx` 添加路由
3. 在 `src/components/Layout/AppLayout.tsx` 添加菜单项

### 添加 Mock API
1. 在 `src/mocks/handlers.ts` 添加新的 handler
2. 使用 `http.post()` 或 `http.get()` 定义接口
3. 使用 `delay()` 模拟网络延迟

### 修改主题
在 `src/main.tsx` 的 `ConfigProvider` 中配置主题：

```tsx
<ConfigProvider theme={{
  token: {
    colorPrimary: '#1890ff',
    borderRadius: 6,
  },
}}>
```

## 注意事项

⚠️ **本项目仅供学术研究和技术演示使用**
- 所有 Deepfake 功能仅用于安全研究
- 请勿将本工具用于非法用途
- 生成的内容应标注 AI 生成标识

## License

MIT


