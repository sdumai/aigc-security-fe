import { Button, Card, Form, Input, Radio, Select, Space } from "antd";
import { ThunderboltOutlined } from "@ant-design/icons";
import type { FormInstance, UploadFile } from "antd";

import {
  ATTRIBUTE_EDIT_PROMPT_PLACEHOLDER,
  DEEPFAKE_DEFAULT_FUNCTION,
  DEEPFAKE_DEFAULT_MODEL,
  DEEPFAKE_FUNCTION_OPTIONS,
  DEFAULT_MODEL_OPTION_INDEX,
  DEEPFAKE_MODEL_OPTIONS,
  DEEPFAKE_TARGET_TOOLTIPS,
  FACE_ANIMATION_DEFAULT_PROMPT,
  FACE_ANIMATION_PROMPT_MAX_LENGTH,
  MEDIUM_TEXTAREA_ROWS,
  PROMPT_MAX_LENGTH,
  SHORT_TEXTAREA_ROWS,
} from "@/constants/generate";
import type { IDeepfakeFormValues, TDeepfakeFunction } from "@/typings/generate";
import { ImageUploadField } from "@/components/Generation/common/ImageUploadField";

const { TextArea } = Input;

export interface IDeepfakeGenerateFormProps {
  form: FormInstance<IDeepfakeFormValues>;
  functionType: TDeepfakeFunction;
  targetFile: UploadFile[];
  sourceFile: UploadFile[];
  loading: boolean;
  setFunctionType: (value: TDeepfakeFunction) => void;
  setTargetFile: (files: UploadFile[]) => void;
  setSourceFile: (files: UploadFile[]) => void;
  onPreview: (file: UploadFile) => void;
  onGenerate: () => void;
}

export const DeepfakeGenerateForm = ({
  form,
  functionType,
  targetFile,
  sourceFile,
  loading,
  setFunctionType,
  setTargetFile,
  setSourceFile,
  onPreview,
  onGenerate,
}: IDeepfakeGenerateFormProps) => {
  return (
    <Card title="生成参数配置" bordered={false}>
      <Form form={form} layout="vertical" initialValues={{ function: DEEPFAKE_DEFAULT_FUNCTION, model: DEEPFAKE_DEFAULT_MODEL }}>
        <Form.Item
          label="上传目标人脸图片"
          name="target"
          tooltip={{
            title: DEEPFAKE_TARGET_TOOLTIPS[functionType],
            placement: "right",
          }}
        >
          <ImageUploadField fileList={targetFile} setFileList={setTargetFile} onPreview={onPreview} />
        </Form.Item>

        {functionType === "faceswap" && (
          <Form.Item
            label="上传驱动人脸"
            name="source"
            tooltip={{
              title: "提供替换人脸的源图像：其人脸身份与外观将迁移并融合至目标图的人脸区域",
              placement: "right",
            }}
          >
            <ImageUploadField fileList={sourceFile} setFileList={setSourceFile} onPreview={onPreview} />
          </Form.Item>
        )}

        {functionType === "fomm" && (
          <Form.Item
            label="动作描述"
            name="fommPrompt"
            tooltip={{
              title: "描述希望人脸做的动作，如：微笑、点头、说话。留空则使用默认自然微动",
              placement: "right",
            }}
          >
            <TextArea rows={SHORT_TEXTAREA_ROWS} placeholder={FACE_ANIMATION_DEFAULT_PROMPT} maxLength={FACE_ANIMATION_PROMPT_MAX_LENGTH} showCount />
          </Form.Item>
        )}

        {functionType === "stargan" && (
          <Form.Item
            label="编辑指令"
            name="editPrompt"
            rules={[{ required: true, message: "请输入编辑指令" }]}
            tooltip={{
              title: "用自然语言描述要对图片做的修改，如：把头发改成红色、加一副眼镜、换成微笑表情",
              placement: "right",
            }}
          >
            <TextArea rows={MEDIUM_TEXTAREA_ROWS} placeholder={ATTRIBUTE_EDIT_PROMPT_PLACEHOLDER} maxLength={PROMPT_MAX_LENGTH} showCount />
          </Form.Item>
        )}

        <Form.Item label="功能选择" name="function" rules={[{ required: true, message: "请选择功能" }]}>
          <Radio.Group
            onChange={(event) => {
              const nextFunctionType = event.target.value as TDeepfakeFunction;
              setFunctionType(nextFunctionType);
              form.setFieldsValue({ model: DEEPFAKE_MODEL_OPTIONS[nextFunctionType][DEFAULT_MODEL_OPTION_INDEX] });
            }}
          >
            <Space direction="vertical">
              {DEEPFAKE_FUNCTION_OPTIONS.map((option) => (
                <Radio key={option.value} value={option.value}>
                  {option.label}
                </Radio>
              ))}
            </Space>
          </Radio.Group>
        </Form.Item>

        <Form.Item label="模型选择" name="model" rules={[{ required: true, message: "请选择模型" }]}>
          <Select>
            {DEEPFAKE_MODEL_OPTIONS[functionType].map((model) => (
              <Select.Option key={model} value={model}>
                {model}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            size="large"
            block
            icon={<ThunderboltOutlined />}
            loading={loading}
            onClick={onGenerate}
          >
            {loading ? "生成中..." : "开始生成"}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};
