import { Layout, Menu } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import {
  HomeOutlined,
  ThunderboltOutlined,
  ScanOutlined,
  DatabaseOutlined,
  UserOutlined,
  VideoCameraOutlined,
  SafetyOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";

const { Header, Sider, Content } = Layout;

type MenuItem = Required<MenuProps>["items"][number];

const menuItems: MenuItem[] = [
  {
    key: "/",
    icon: <HomeOutlined />,
    label: "首页",
  },
  {
    key: "generate",
    icon: <ThunderboltOutlined />,
    label: "AIGC 生成",
    children: [
      {
        key: "/generate/deepfake",
        icon: <UserOutlined />,
        label: "Deepfake 人脸生成",
      },
      {
        key: "/generate/general",
        icon: <VideoCameraOutlined />,
        label: "多模态内容生成",
      },
    ],
  },
  {
    key: "detect",
    icon: <ScanOutlined />,
    label: "AIGC 检测",
    children: [
      {
        key: "/detect/fake",
        icon: <SafetyOutlined />,
        label: "虚假内容检测",
      },
      {
        key: "/detect/unsafe",
        icon: <SafetyOutlined />,
        label: "敏感内容检测",
      },
    ],
  },
  {
    key: "/data/output",
    icon: <DatabaseOutlined />,
    label: "内容管理",
  },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleMenuClick: MenuProps["onClick"] = (e) => {
    navigate(e.key);
  };

  // 获取当前选中的菜单项
  const getSelectedKeys = () => {
    return [location.pathname];
  };

  // 获取当前打开的子菜单
  const getOpenKeys = () => {
    const path = location.pathname;
    if (path.startsWith("/generate")) return ["generate"];
    if (path.startsWith("/detect")) return ["detect"];
    return [];
  };

  return (
    <Layout className="app-layout">
      <Header
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          padding: "0 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 2px 12px rgba(102, 126, 234, 0.3)",
          height: 64,
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            cursor: "pointer",
            flex: "0 0 auto",
          }}
          onClick={() => navigate("/")}
        >
          <div
            style={{
              background: "rgba(255, 255, 255, 0.2)",
              borderRadius: 10,
              padding: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <SafetyOutlined style={{ fontSize: 24, color: "white" }} />
          </div>
          <div>
            <div
              style={{
                color: "white",
                fontSize: 18,
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              AIGC 安全平台
            </div>
            <div
              style={{
                color: "rgba(255, 255, 255, 0.75)",
                fontSize: 11,
                lineHeight: 1.2,
                marginTop: 2,
              }}
            >
              AI Generated Content Security
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            color: "white",
            flex: "0 0 auto",
          }}
        >
          <div
            style={{
              textAlign: "center",
              padding: "0 12px",
            }}
          >
            <div
              style={{
                fontSize: 10,
                opacity: 0.75,
                lineHeight: 1.2,
                marginBottom: 2,
              }}
            >
              AI 生成
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>5+</div>
          </div>
          <div
            style={{
              width: 1,
              height: 28,
              background: "rgba(255, 255, 255, 0.25)",
            }}
          />
          <div
            style={{
              textAlign: "center",
              padding: "0 12px",
            }}
          >
            <div
              style={{
                fontSize: 10,
                opacity: 0.75,
                lineHeight: 1.2,
                marginBottom: 2,
              }}
            >
              准确率
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>95%+</div>
          </div>
          <div
            style={{
              width: 1,
              height: 28,
              background: "rgba(255, 255, 255, 0.25)",
            }}
          />
          <div
            style={{
              textAlign: "center",
              padding: "0 12px",
            }}
          >
            <div
              style={{
                fontSize: 10,
                opacity: 0.75,
                lineHeight: 1.2,
                marginBottom: 2,
              }}
            >
              响应
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>&lt;2s</div>
          </div>
        </div>
      </Header>
      <Layout>
        <Sider width={250} className="app-sider">
          <Menu
            mode="inline"
            selectedKeys={getSelectedKeys()}
            defaultOpenKeys={getOpenKeys()}
            items={menuItems}
            onClick={handleMenuClick}
            style={{ height: "100%", borderRight: 0 }}
          />
        </Sider>
        <Layout style={{ padding: "0 24px 24px" }}>
          <Content className="app-content">{children}</Content>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
