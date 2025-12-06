import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/es/locale/zh_CN'
import 'dayjs/locale/zh-cn'
import App from './App'
import './index.css'

// 启动 Mock Service Worker
async function enableMocking() {
  if (!import.meta.env.DEV) {
    return
  }

  try {
    const { worker } = await import('./mocks/browser')
    await worker.start({
      onUnhandledRequest: 'bypass',
    })
  } catch (error) {
    console.error('Failed to start MSW:', error)
  }
}

// 先渲染应用，MSW 异步启动
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN} theme={{
      token: {
        colorPrimary: '#1890ff',
        borderRadius: 6,
      },
    }}>
      <App />
    </ConfigProvider>
  </React.StrictMode>,
)

// 异步启动 MSW
enableMocking()


