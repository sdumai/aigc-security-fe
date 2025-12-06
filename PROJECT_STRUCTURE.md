# 项目结构说明

## 目录结构

```
aigc-security/
│
├── .cursor/                      # Cursor IDE 配置
│   └── tech-to-code.mdc         # MDC 技术文档
│
├── public/                       # 静态资源目录
│   ├── mock/                    # Mock 资源文件
│   │   ├── deepfake_result.jpg # Deepfake 生成结果占位图
│   │   └── heatmap.png         # 热力图占位图
│   ├── mockServiceWorker.js    # MSW Service Worker
│   └── vite.svg                # Vite 图标
│
├── src/                         # 源代码目录
│   │
│   ├── components/             # 全局组件
│   │   └── Layout/            # 布局组件
│   │       └── AppLayout.tsx  # 主布局（头部+侧边栏+内容区）
│   │
│   ├── pages/                 # 页面组件
│   │   ├── Home/             # 首页
│   │   │   └── index.tsx     # 平台介绍、功能卡片、快捷入口
│   │   │
│   │   ├── Generate/         # AIGC 生成模块
│   │   │   ├── Deepfake/    # Deepfake 人脸生成
│   │   │   │   └── index.tsx # 人脸替换、动画、属性编辑
│   │   │   └── General/     # 多模态内容生成
│   │   │       └── index.tsx # 图像生成、视频生成
│   │   │
│   │   ├── Detect/          # AIGC 检测模块
│   │   │   ├── Fake/       # 虚假内容检测
│   │   │   │   └── index.tsx # Deepfake 检测、可疑区域标注
│   │   │   └── Unsafe/     # 不安全内容检测
│   │   │       └── index.tsx # 违规内容识别、风险评估
│   │   │
│   │   └── Data/           # 数据流转模块
│   │       ├── Input/     # 数据接入
│   │       │   └── index.tsx # 本地上传、网络爬取
│   │       └── Output/    # 数据输出
│   │           └── index.tsx # 生成内容管理、检测记录
│   │
│   ├── mocks/              # MSW Mock 配置
│   │   ├── browser.ts     # Browser Worker 配置
│   │   └── handlers.ts    # API Mock Handlers
│   │
│   ├── routes/            # 路由配置
│   │   └── index.tsx     # React Router 配置
│   │
│   ├── utils/            # 工具函数
│   │   └── request.ts   # Axios 封装、拦截器
│   │
│   ├── App.tsx          # 根组件
│   ├── main.tsx         # 应用入口、MSW 初始化
│   └── index.css        # 全局样式
│
├── index.html            # HTML 模板
├── package.json          # 依赖配置
├── tsconfig.json         # TypeScript 配置
├── tsconfig.node.json    # Node TypeScript 配置
├── vite.config.ts        # Vite 配置
├── README.md             # 项目说明
├── USAGE.md              # 使用指南
└── PROJECT_STRUCTURE.md  # 项目结构（本文件）
```

## 核心文件说明

### 配置文件

#### `package.json`
- 项目依赖声明
- 核心依赖：React 18、Vite、Ant Design、MSW、Axios
- 脚本命令：dev（开发）、build（构建）、preview（预览）

#### `tsconfig.json`
- TypeScript 编译配置
- 启用严格模式
- 路径别名：`@/*` → `src/*`

#### `vite.config.ts`
- Vite 构建配置
- React 插件
- 路径别名解析
- 开发服务器端口：5173

### 入口文件

#### `src/main.tsx`
应用入口，负责：
- 初始化 MSW（Mock Service Worker）
- 配置 Ant Design 主题和中文语言
- 渲染根组件

#### `src/App.tsx`
根组件，负责：
- 初始化 React Router
- 应用布局容器

### 布局系统

#### `src/components/Layout/AppLayout.tsx`
主布局组件，包含：
- **顶部导航栏**：平台标题和 Logo
- **左侧菜单**：功能导航（首页、生成、检测、数据流转）
- **主内容区**：页面内容展示区域

### 页面组件

所有页面组件遵循统一结构：
```tsx
<div>
  <div className="page-header">
    <Title>页面标题</Title>
    <Paragraph>页面描述</Paragraph>
  </div>
  {/* 页面内容 */}
</div>
```

### Mock 系统

#### `src/mocks/browser.ts`
- 初始化 MSW Browser Worker
- 导出 worker 实例

#### `src/mocks/handlers.ts`
- 定义所有 Mock API Handlers
- 使用 `http.post()`、`http.get()` 拦截请求
- 使用 `delay()` 模拟网络延迟
- 返回预设 JSON 数据

#### `public/mockServiceWorker.js`
- MSW Service Worker 脚本
- 拦截浏览器网络请求
- 由 MSW 自动生成，不应手动修改

### 工具函数

#### `src/utils/request.ts`
Axios 实例封装：
- 统一 baseURL：`/api`
- 请求拦截器：添加认证信息（可扩展）
- 响应拦截器：统一错误处理、消息提示

### 路由系统

#### `src/routes/index.tsx`
React Router v6 配置：
- 声明式路由
- 路径与页面组件映射
- 支持嵌套路由

## 数据流

```
用户操作
   ↓
页面组件（Form/Upload）
   ↓
Axios Request（src/utils/request.ts）
   ↓
MSW Interceptor（src/mocks/handlers.ts）
   ↓
Mock Response（预设数据 + 延迟）
   ↓
页面组件（展示结果）
```

## 样式系统

### 全局样式
`src/index.css` 定义：
- 全局重置
- 布局基础样式
- 通用组件样式（卡片、上传区、结果展示）

### 组件样式
- 使用 Ant Design 内置样式
- 使用 `style` prop 进行内联样式
- 使用 `className` 引用全局样式类

### 主题配置
在 `src/main.tsx` 中通过 `ConfigProvider` 配置：
- 主色调：`#1890ff`（蓝色）
- 圆角：`6px`
- 语言：中文

## 扩展指南

### 添加新页面
1. 在 `src/pages/` 创建页面目录和组件
2. 在 `src/routes/index.tsx` 添加路由
3. 在 `src/components/Layout/AppLayout.tsx` 添加菜单项

### 添加 Mock API
1. 在 `src/mocks/handlers.ts` 添加新 handler
2. 定义请求方法、路径、响应数据
3. 在页面组件中调用 `request.post()` 或 `request.get()`

### 对接真实后端
1. 修改 `src/main.tsx`，移除 MSW 初始化
2. 修改 `src/utils/request.ts`，配置真实 API baseURL
3. 调整请求/响应数据结构以匹配后端 API
4. 添加认证逻辑（JWT、OAuth 等）

### 修改主题
在 `src/main.tsx` 的 `ConfigProvider` 中修改 `theme` 配置：
```tsx
<ConfigProvider theme={{
  token: {
    colorPrimary: '#1890ff',  // 主色
    colorSuccess: '#52c41a',  // 成功色
    colorError: '#ff4d4f',    // 错误色
    borderRadius: 6,          // 圆角
  },
}}>
```

## 性能优化建议

1. **代码分割**：使用 `React.lazy()` 懒加载路由组件
2. **图片优化**：使用 WebP 格式，添加懒加载
3. **Memo 优化**：对大型列表使用 `React.memo()`
4. **虚拟滚动**：大数据列表使用 `react-window`
5. **Tree Shaking**：按需引入 Ant Design 组件

## 安全性考虑

1. **XSS 防护**：React 默认转义输出，注意使用 `dangerouslySetInnerHTML`
2. **CSRF 防护**：真实后端需添加 CSRF Token
3. **文件上传**：验证文件类型和大小
4. **敏感数据**：不在前端存储敏感信息
5. **权限控制**：路由守卫、按钮权限控制


