import { Layout, Menu } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import {
  HomeOutlined,
  ThunderboltOutlined,
  ScanOutlined,
  DatabaseOutlined,
  SafetyOutlined,
  UserOutlined,
  VideoCameraOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";

import { DScanLogoMark } from "@/components/common/DScanLogoMark";

const { Header, Sider, Content } = Layout;

type MenuItem = Required<MenuProps>["items"][number];

const menuItems: MenuItem[] = [
  { key: "/", icon: <HomeOutlined />, label: "首页" },
  {
    key: "generate",
    icon: <ThunderboltOutlined />,
    label: "生成模块",
    children: [
      { key: "/generate/deepfake", icon: <UserOutlined />, label: "Deepfake 人脸生成" },
      { key: "/generate/general", icon: <VideoCameraOutlined />, label: "多模态内容生成" },
    ],
  },
  {
    key: "detect",
    icon: <ScanOutlined />,
    label: "检测模块",
    children: [
      { key: "/detect/fake", icon: <WarningOutlined />, label: "虚假内容检测" },
      { key: "/detect/unsafe", icon: <SafetyOutlined />, label: "敏感内容检测" },
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
        className="app-header"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div className="app-brand" onClick={() => navigate("/")}>
          <DScanLogoMark className="app-brand-mark" />
          <div>
            <div className="app-brand-title">DScan</div>
            <div className="app-brand-subtitle">AIGC 安全检测与研究平台</div>
          </div>
        </div>
        <div className="app-header-right">
          <span className="app-header-stat">7+ 模型</span>
          <span className="app-header-stat-divider" />
          <span className="app-header-stat">95%+ 准确率</span>
          <span className="app-header-stat-divider" />
          <span className="app-header-stat">&lt;2s 响应</span>
        </div>
      </Header>
      <Layout style={{ flex: 1, minHeight: 0 }}>
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
        <Layout className="app-content-wrap">
          <Content className="app-content">{children}</Content>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
