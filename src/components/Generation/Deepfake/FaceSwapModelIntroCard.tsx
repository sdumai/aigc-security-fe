import { CheckCircleOutlined, DeploymentUnitOutlined } from "@ant-design/icons";
import { Space, Tag, Typography } from "antd";

import { FACE_SWAP_MODEL_INTROS } from "@/constants/generate";
import type { TDeepfakeModel } from "@/typings/generate";

const { Paragraph, Text } = Typography;

const MODEL_SUMMARY_BY_VERSION: Record<string, string> = {
  "Volc FaceSwap 2.0": "稳定同步返回，适合单人快速替换。",
  "Volc FaceSwap 3.6": "融合边缘更自然，支持多人选脸。",
};

export interface IFaceSwapModelIntroCardProps {
  selectedModel?: TDeepfakeModel;
}

export const FaceSwapModelIntroCard = ({ selectedModel }: IFaceSwapModelIntroCardProps) => (
  <section className="faceswap-model-card">
    <div className="faceswap-model-card-header">
      <Space size={8}>
        <DeploymentUnitOutlined />
        <span>FaceSwap 模型</span>
      </Space>
      <Tag color="blue">人像融合</Tag>
    </div>

    <div className="faceswap-model-grid">
      {FACE_SWAP_MODEL_INTROS.map((item) => {
        const isActive = selectedModel === item.model;

        return (
          <div key={item.model} className={`faceswap-model-panel${isActive ? " is-active" : ""}`}>
            <div className="faceswap-model-panel-header">
              <div>
                <Text strong>{item.model}</Text>
                <div className="faceswap-model-version">{item.version}</div>
              </div>
              {isActive && <Tag color="processing">当前选择</Tag>}
            </div>

            <Paragraph className="faceswap-model-summary">{MODEL_SUMMARY_BY_VERSION[item.model]}</Paragraph>

            <Space size={[6, 6]} wrap className="faceswap-model-tags">
              {item.strengths.slice(0, 2).map((strength) => (
                <Tag key={strength} icon={<CheckCircleOutlined />} color="success">
                  {strength}
                </Tag>
              ))}
            </Space>
          </div>
        );
      })}
    </div>
  </section>
);
