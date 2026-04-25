# AIGC 安全研究平台

本仓库是一个面向 AI 生成内容（AIGC）安全研究的毕业设计项目，围绕“内容生成、虚假内容检测、不安全内容审核、结果展示与实验分析”构建了一套前后端分离的研究原型平台。

平台当前支持图像与视频两类媒介，能够接入火山方舟/视觉智能等外部能力，也预留并封装了本地模型服务，例如 UniversalFakeDetect、Stable Diffusion 和 ModelScope Text-to-Video。项目重点不是单一模型演示，而是将多源生成与检测能力组织成统一的安全分析工具链。

## 功能概览

| 模块 | 功能 | 说明 |
| --- | --- | --- |
| 首页与导航 | 平台介绍、模块入口 | 统一进入生成、检测和数据管理页面 |
| Deepfake 人脸生成 | 人脸替换、人脸动画、属性编辑 | 通过后端代理调用外部生成能力 |
| 多模态内容生成 | 文生图、文生视频、图生视频 | 支持火山接口与本地模型服务 |
| 虚假内容检测 | 图像 AI 生成检测、视频 AI 生成检测、本地图像伪造检测 | 支持火山方舟视觉理解与 UniversalFakeDetect |
| 敏感内容检测 | 图像/视频安全审核 | 输出风险标签、处置建议与原因说明 |
| 内容与记录管理 | 生成结果与检测记录展示 | 当前仍处于原型阶段，部分能力为预留或 mock |
| 论文与实验材料 | 毕业论文、实验截图、样本说明 | 位于 `docs/` 目录 |

## 技术栈

前端：

- React 18
- TypeScript
- Vite
- Ant Design
- React Router
- Axios
- MSW，用于开发阶段 mock 部分接口

后端：

- Node.js
- Express
- dotenv
- CORS
- 原生 `fetch` 调用外部 API

本地模型服务：

- UniversalFakeDetect，图像伪造/AI 生成检测
- Stable Diffusion，文生图
- ModelScope Text-to-Video，文生视频
- FastAPI + Uvicorn 封装模型 HTTP 服务

## 项目结构

```text
aigc-security/
├── src/                         # 前端源码
│   ├── components/Layout/        # 页面布局与导航
│   ├── pages/Home/               # 首页
│   ├── pages/Generate/           # 内容生成页面
│   ├── pages/Detect/             # 虚假检测与敏感检测页面
│   ├── pages/Data/               # 内容与记录管理页面
│   ├── mocks/                    # MSW mock 接口
│   ├── routes/                   # 前端路由
│   └── utils/                    # 请求封装与 API 地址配置
├── server/
│   └── index.cjs                 # Node 后端代理服务
├── model/
│   ├── UniversalFakeDetect/      # 本地图像真假检测模型服务
│   ├── stable-diffusion/         # 本地文生图服务
│   └── ModelScopeT2V/            # 本地文生视频服务
├── datasets/                     # 实验样本与数据集
├── public/mock/                  # 前端 mock 静态资源
├── docs/                         # 毕业论文、开题、中期与实验文档
├── dist/                         # 前端生产构建结果
├── 快速部署.sh                   # 前端静态页面部署脚本
├── deploy-backend.sh             # Node 后端部署脚本
├── package.json
└── vite.config.ts
```

## 服务与端口

| 服务 | 默认端口 | 启动方式 | 作用 |
| --- | ---: | --- | --- |
| Vite 前端开发服务 | `53177` | `npm run dev` | 本地开发页面 |
| Node 后端代理 | `3001` | `npm run dev:proxy` | 统一代理外部 API 与本地模型 |
| UniversalFakeDetect | `8008` | `uvicorn api:app --host 0.0.0.0 --port 8008` | 本地图像伪造检测 |
| Stable Diffusion | `8009` | `uvicorn server:app --host 0.0.0.0 --port 8009` | 本地文生图 |
| ModelScope T2V | `8011` | `uvicorn server:app --host 0.0.0.0 --port 8011` | 本地文生视频 |
| 生产前端静态服务 | `53177` | `http-server dist -p 53177` | 服务器前端访问入口 |

说明：Vite 端口如果被占用，可能自动切换到下一个可用端口，例如 `53178`。

## 环境变量

后端默认读取仓库根目录下的 `.env.local`。该文件包含密钥，不应提交到 Git。

建议在项目根目录创建 `.env.local`：

```bash
# Node 后端代理端口，默认 3001
DETECT_PROXY_PORT=3001

# 火山方舟多模态理解/生成能力
VOLC_ARK_API_KEY=your_ark_api_key
VOLC_ARK_VISION_MODEL=your_vision_endpoint_id
VOLC_ARK_IMAGE_MODEL=your_text_to_image_model_or_endpoint
VOLC_ARK_T2V_MODEL=your_text_to_video_model_or_endpoint
VOLC_ARK_I2V_MODEL=your_image_to_video_model_or_endpoint

# 火山视觉智能类接口，如人像融合
VOLC_ACCESS_KEY=your_access_key
VOLC_SECRET_KEY=your_secret_key

# 本地模型服务地址，可不填，默认值如下
UNIVERSAL_FAKE_DETECT_URL=http://127.0.0.1:8008
STABLE_DIFFUSION_SERVICE_URL=http://127.0.0.1:8009
MODELSCOPE_T2V_URL=http://127.0.0.1:8011
```

生产前端通过 `.env.production` 指定后端地址：

```bash
VITE_API_BASE=http://10.102.32.144:3001
```

如果部署到其他服务器，需要同步修改 `.env.production` 中的 `VITE_API_BASE`。

## 本地运行

### 1. 安装依赖

```bash
npm install
```

### 2. 配置后端密钥

在项目根目录创建 `.env.local`，填入火山方舟、火山视觉智能以及本地模型服务地址。

如果暂时只调试页面布局，可以不配置密钥；涉及真实生成、检测、审核的功能会因为缺少密钥而返回错误提示。

### 3. 启动后端代理

```bash
npm run dev:proxy
```

成功后后端会监听：

```text
http://localhost:3001
```

修改 `server/index.cjs` 后需要手动重启后端：

```bash
lsof -nP -iTCP:3001 -sTCP:LISTEN
kill <PID>
npm run dev:proxy
```

### 4. 启动前端

另开一个终端：

```bash
npm run dev
```

默认访问：

```text
http://localhost:53177
```

也可以同时启动前端和后端：

```bash
npm run dev:all
```

### 5. 启动可选本地模型服务

如果只使用火山接口，可以不启动本地模型服务。若要验证本地模型能力，需要分别启动以下服务。

UniversalFakeDetect：

```bash
cd model/UniversalFakeDetect
pip install -r requirements-api.txt
uvicorn api:app --host 0.0.0.0 --port 8008
```

Stable Diffusion：

```bash
cd model/stable-diffusion
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8009
```

ModelScope Text-to-Video：

```bash
cd model/ModelScopeT2V
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8011
```

本地大模型服务首次启动可能需要下载权重，耗时较长，并且对显存、内存和磁盘空间有要求。

## 后端接口

后端统一入口为 `server/index.cjs`，核心接口如下：

| 类型 | 接口 | 说明 |
| --- | --- | --- |
| 检测 | `POST /api/detect/volc-image-aigc` | 火山方舟图像 AI 生成检测 |
| 检测 | `POST /api/detect/universal-fake-detect` | 代理 UniversalFakeDetect 本地模型 |
| 检测 | `POST /api/detect/volc-ims` | 图像敏感内容检测 |
| 检测 | `POST /api/detect/volc-video-ims` | 视频敏感内容检测 |
| 检测 | `POST /api/detect/volc-video-aigc` | 视频 AI 生成检测 |
| 生成 | `POST /api/generate/faceswap` | 人脸替换 |
| 生成 | `POST /api/generate/seededit` | 图像属性编辑 |
| 生成 | `POST /api/generate/fomm` | 人脸动画/图生视频类能力 |
| 生成 | `POST /api/generate/image` | 火山文生图 |
| 生成 | `POST /api/generate/image-stable-diffusion` | 本地 Stable Diffusion 文生图 |
| 生成 | `POST /api/generate/model-scope` | 本地 ModelScope 文生视频 |
| 生成 | `POST /api/generate/t2v` | 火山文生视频 |
| 生成 | `POST /api/generate/i2v` | 火山图生视频 |

## Mock 与真实接口说明

开发环境中 `src/main.tsx` 会启动 MSW，并由 `src/mocks/handlers.ts` 对部分旧接口返回 mock 数据。未被 mock 命中的请求会继续走 Vite 代理或 `VITE_API_BASE`。

如果你要验证真实后端接口，需要注意：

- 前端开发服务通过 `vite.config.ts` 将 `/api` 代理到 `http://localhost:3001`。
- 生产构建通过 `.env.production` 的 `VITE_API_BASE` 指向远程后端。
- 若某个页面仍返回 mock 数据，检查 `src/mocks/handlers.ts` 是否拦截了同名接口。
- 若某个页面写死了远程后端地址，需要按目标环境调整为 `src/utils/apiBase.ts` 中的统一配置方式。

## 构建

```bash
npm run build
```

构建产物位于：

```text
dist/
```

本地预览生产构建：

```bash
npm run preview
```

## 部署

当前仓库保留了两个部署脚本：

| 脚本 | 作用 |
| --- | --- |
| `快速部署.sh` | 构建并部署前端静态页面，默认部署到 `10.102.32.144:53177` |
| `deploy-backend.sh` | 部署 Node 后端代理，默认后端端口为 `3001` |

### 前端部署

```bash
chmod +x 快速部署.sh
./快速部署.sh
```

脚本会执行：

```bash
npm run build
```

然后将 `dist/` 上传到服务器，并通过 `http-server` 运行在 `53177` 端口。

部署前需要确认：

- 已安装 `expect`，macOS 可使用 `brew install expect`。
- `.env.production` 中的 `VITE_API_BASE` 指向正确后端地址。
- 能访问目标服务器网络。

### 后端部署

```bash
chmod +x deploy-backend.sh
./deploy-backend.sh
```

后端部署脚本会将 Node 后端部署到服务器，并在 `3001` 端口提供 API。

部署前需要确认：

- 服务器上已安装 Node.js。
- 服务器上的 `.env.local` 已配置真实 API 密钥。
- `3001` 端口未被其他进程占用。
- 如果前端 API 地址有变化，需要重新构建并部署前端。

推荐部署顺序：

```text
1. 部署或重启后端
2. 确认 http://服务器地址:3001 可访问
3. 检查 .env.production 中 VITE_API_BASE
4. 执行 npm run build
5. 执行 ./快速部署.sh
6. 访问 http://服务器地址:53177
```

## 常见问题

### 后端修改后为什么页面没有变化？

`server/index.cjs` 没有热更新。修改后需要停止旧进程并重新启动：

```bash
lsof -nP -iTCP:3001 -sTCP:LISTEN
kill <PID>
npm run dev:proxy
```

### 请求为什么没有打到本地后端？

检查三点：

1. 后端是否监听 `3001`。
2. 前端是否使用相对路径 `/api` 或 `src/utils/apiBase.ts`。
3. MSW 是否拦截了当前接口。

### 生产前端为什么仍请求旧后端地址？

生产前端的后端地址在构建时写入。修改 `.env.production` 后必须重新执行：

```bash
npm run build
./快速部署.sh
```

### 本地模型服务启动很慢？

Stable Diffusion 和 ModelScope T2V 首次启动会下载模型权重，并加载到 CPU/GPU。建议先确认磁盘空间、网络和 Python 依赖，再单独访问对应服务的 `/health` 接口。

## 安全与合规说明

本项目仅用于学术研究、毕业设计和安全技术演示。

- 不得将 Deepfake、图像生成或视频生成能力用于违法违规用途。
- 不得使用本工具生成、传播或伪造真实个人的不当内容。
- 涉及 AI 生成的展示材料应明确标注生成来源。
- API 密钥只能放在本地或服务器环境变量中，不应写入前端代码或提交到仓库。
- 外部接口调用可能产生费用，测试时应控制请求频率。

## License

本项目用于毕业设计与学术研究，若复用其中模型或第三方接口，请同时遵守对应开源项目和服务平台的许可协议。
