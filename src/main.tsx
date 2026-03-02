import React from "react";
import ReactDOM from "react-dom/client";
import { ConfigProvider } from "antd";
import zhCN from "antd/es/locale/zh_CN";
import "dayjs/locale/zh-cn";
import App from "./App";
import "./index.css";

// 启动 Mock Service Worker
async function enableMocking() {
  if (!import.meta.env.DEV) {
    return;
  }

  try {
    const { worker } = await import("./mocks/browser");
    await worker.start({
      onUnhandledRequest: "bypass",
    });
  } catch (error) {
    console.error("Failed to start MSW:", error);
  }
}

// 先渲染应用，MSW 异步启动
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: "#1e3a5f",
          colorPrimaryHover: "#2c5282",
          borderRadius: 6,
          fontFamily: '"Noto Sans SC", "PingFang SC", sans-serif',
          colorText: "#1a202c",
          colorTextSecondary: "#4a5568",
        },
        components: {
          Card: { headerFontSize: 15 },
          Typography: { titleMarginBottom: "0.35em" },
        },
      }}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>,
);

// 异步启动 MSW
enableMocking();
