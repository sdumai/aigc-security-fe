import { CheckCircleOutlined, ExperimentOutlined } from "@ant-design/icons";
import { Space, Tag, Typography } from "antd";

import { IMAGE_MODEL_INTROS } from "@/constants/generate";
import type { TImageModel } from "@/typings/generate";

const { Paragraph, Text } = Typography;

export interface IImageModelIntroCardProps {
  selectedModel: TImageModel;
}

export const ImageModelIntroCard = ({ selectedModel }: IImageModelIntroCardProps) => {
  const selectedIntro = IMAGE_MODEL_INTROS.find((item) => item.model === selectedModel) || IMAGE_MODEL_INTROS[0];

  return (
    <section className="image-model-card">
      <div className="image-model-compact-main">
        <div className="image-model-compact-title">
          <Space size={8}>
            <ExperimentOutlined />
            <Text strong>{selectedIntro.name}</Text>
          </Space>
        </div>

        <Paragraph className="image-model-summary">{selectedIntro.summary}</Paragraph>

        <Space size={[6, 6]} wrap className="image-model-tags">
          {selectedIntro.strengths.map((strength) => (
            <Tag key={strength} icon={<CheckCircleOutlined />} color="success">
              {strength}
            </Tag>
          ))}
        </Space>
      </div>

      <div className="image-model-compact-side">
        <div className="image-model-side-label">模型差异</div>
        <Space size={[6, 6]} wrap>
          {IMAGE_MODEL_INTROS.filter((item) => item.model !== selectedModel).map((item) => (
            <Tag key={item.model} className="image-model-mini-tag">
              {item.name} · {item.badge}
            </Tag>
          ))}
        </Space>
      </div>
    </section>
  );
};
