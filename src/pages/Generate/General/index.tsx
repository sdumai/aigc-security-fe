import { Tabs, Typography } from "antd";
import { PictureOutlined, VideoCameraOutlined } from "@ant-design/icons";

import { ImageToVideoTab } from "@/components/Generation/General/ImageToVideoTab";
import { TextToImageTab } from "@/components/Generation/General/TextToImageTab";
import { TextToVideoTab } from "@/components/Generation/General/TextToVideoTab";
import { TITLE_LEVEL_TWO } from "@/constants/ui";

const { Title, Paragraph } = Typography;

const GeneralGeneratePage = () => {
  return (
    <div className="page-transition">
      <div className="page-header">
        <Title level={TITLE_LEVEL_TWO} className="page-title">
          多模态内容生成
        </Title>
        <Paragraph className="page-description">
          基于多模态大模型，支持文生图、文生视频、图生视频。输入文本或图像即可生成对应媒体，适用于安全研究、检测数据构建与效果评估。
        </Paragraph>
      </div>

      <Tabs
        defaultActiveKey="image"
        size="large"
        items={[
          {
            key: "image",
            label: (
              <span>
                <PictureOutlined /> 文生图
              </span>
            ),
            children: <TextToImageTab />,
          },
          {
            key: "t2v",
            label: (
              <span>
                <VideoCameraOutlined /> 文生视频
              </span>
            ),
            children: <TextToVideoTab />,
          },
          {
            key: "i2v",
            label: (
              <span>
                <VideoCameraOutlined /> 图生视频
              </span>
            ),
            children: <ImageToVideoTab />,
          },
        ]}
      />
    </div>
  );
};

export default GeneralGeneratePage;
