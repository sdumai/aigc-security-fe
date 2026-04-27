import { Button, Card, Form, Input, InputNumber, Radio, Select, Slider, Switch } from "antd";
import { EditOutlined, SwapOutlined, ThunderboltOutlined, VideoCameraOutlined } from "@ant-design/icons";
import type { FormInstance, UploadFile } from "antd";
import type { ReactNode } from "react";

import {
  ATTRIBUTE_EDIT_PROMPT_PLACEHOLDER,
  DEEPFAKE_DEFAULT_FUNCTION,
  DEEPFAKE_DEFAULT_MODEL,
  DEEPFAKE_FUNCTION_LABELS,
  DEEPFAKE_FUNCTION_OPTIONS,
  DEFAULT_FACE_SWAP_ADD_LOGO,
  DEFAULT_FACE_SWAP_DO_RISK,
  DEFAULT_FACE_SWAP_FACE_TYPE,
  DEFAULT_FACE_SWAP_LOGO_LANGUAGE,
  DEFAULT_FACE_SWAP_LOGO_OPACITY,
  DEFAULT_FACE_SWAP_LOGO_POSITION,
  DEFAULT_FACE_SWAP_RETURN_URL,
  DEFAULT_FACE_SWAP_SOURCE_LOCATION,
  DEFAULT_FACE_SWAP_SOURCE_SIMILARITY,
  DEFAULT_FACE_SWAP_TEMPLATE_LOCATION,
  DEFAULT_MODEL_OPTION_INDEX,
  DEFAULT_SEEDEDIT_SCALE,
  DEFAULT_SEEDEDIT_SEED,
  DEFAULT_SEEDEDIT_SEED_MODE,
  DEEPFAKE_MODEL_OPTIONS,
  DEEPFAKE_TARGET_TOOLTIPS,
  EMPTY_UPLOAD_COUNT,
  FACE_SWAP_FACE_TYPE_OPTIONS,
  FACE_SWAP_LOGO_LANGUAGE_OPTIONS,
  FACE_SWAP_LOGO_OPACITY_STEP,
  FACE_SWAP_LOGO_POSITION_OPTIONS,
  FACE_SWAP_LOGO_TEXT_MAX_LENGTH,
  FACE_SWAP_MODEL_V36,
  FACE_SWAP_SOURCE_SIMILARITY_STEP,
  FACE_ANIMATION_DEFAULT_PROMPT,
  FACE_ANIMATION_PROMPT_MAX_LENGTH,
  MAX_FACE_SWAP_LOCATION,
  MAX_FACE_SWAP_LOGO_OPACITY,
  MAX_FACE_SWAP_SOURCE_SIMILARITY,
  MAX_SEEDEDIT_SCALE,
  MAX_SEEDEDIT_SEED,
  MIN_FACE_SWAP_LOCATION,
  MIN_FACE_SWAP_LOGO_OPACITY,
  MIN_FACE_SWAP_SOURCE_SIMILARITY,
  MEDIUM_TEXTAREA_ROWS,
  MIN_SEEDEDIT_SCALE,
  MIN_SEEDEDIT_SEED,
  PROMPT_MAX_LENGTH,
  SEEDEDIT_SCALE_STEP,
  SEEDEDIT_SEED_MODE_OPTIONS,
  SHORT_TEXTAREA_ROWS,
} from "@/constants/generate";
import type { IDeepfakeFormValues, TDeepfakeFunction, TDeepfakeModel } from "@/typings/generate";
import { ImageUploadField } from "@/components/Generation/common/ImageUploadField";
import { DeepfakeCapabilityIntroCard } from "@/components/Generation/Deepfake/DeepfakeCapabilityIntroCard";
import { FaceSwapModelIntroCard } from "@/components/Generation/Deepfake/FaceSwapModelIntroCard";

const { TextArea } = Input;

const DEEPFAKE_FUNCTION_META: Record<TDeepfakeFunction, { icon: ReactNode; description: string }> = {
  faceswap: {
    icon: <SwapOutlined />,
    description: "双图换脸，推荐 3.6",
  },
  stargan: {
    icon: <EditOutlined />,
    description: "按文字修改人脸属性",
  },
  fomm: {
    icon: <VideoCameraOutlined />,
    description: "单图生成动作短视频",
  },
};

export interface IDeepfakeGenerateFormProps {
  form: FormInstance<IDeepfakeFormValues>;
  functionType: TDeepfakeFunction;
  selectedModel: TDeepfakeModel;
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
  selectedModel,
  targetFile,
  sourceFile,
  loading,
  setFunctionType,
  setTargetFile,
  setSourceFile,
  onPreview,
  onGenerate,
}: IDeepfakeGenerateFormProps) => {
  const modelOptions = DEEPFAKE_MODEL_OPTIONS[functionType];
  const isModelSelectDisabled = modelOptions.length === 1;
  const isFaceSwap = functionType === "faceswap";
  const isFaceSwapV36 = selectedModel === FACE_SWAP_MODEL_V36;
  const seedEditSeedMode = Form.useWatch("seedEditSeedMode", form) || DEFAULT_SEEDEDIT_SEED_MODE;
  const faceSwapAddLogo = Form.useWatch("faceSwapAddLogo", form) || DEFAULT_FACE_SWAP_ADD_LOGO;
  const formLayoutClassName = `deepfake-config-form deepfake-config-layout has-model-guide is-${functionType}${
    isFaceSwap ? " has-faceswap-advanced" : " has-prompt"
  }`;
  const targetImageRules = [
    {
      validator: () =>
        targetFile.length > EMPTY_UPLOAD_COUNT ? Promise.resolve() : Promise.reject(new Error("请上传目标人脸图片")),
    },
  ];
  const sourceImageRules = [
    {
      validator: () =>
        sourceFile.length > EMPTY_UPLOAD_COUNT ? Promise.resolve() : Promise.reject(new Error("请上传驱动人脸")),
    },
  ];

  return (
    <Card
      title="生成参数配置"
      bordered={false}
      className="deepfake-config-card"
      extra={
        <Button
          type="primary"
          className="deepfake-generate-action"
          icon={<ThunderboltOutlined />}
          loading={loading}
          onClick={onGenerate}
        >
          {loading ? "生成中..." : "开始生成"}
        </Button>
      }
    >
      <Form
        form={form}
        layout="vertical"
        className={formLayoutClassName}
        initialValues={{
          function: DEEPFAKE_DEFAULT_FUNCTION,
          model: DEEPFAKE_DEFAULT_MODEL,
          faceSwapSourceSimilarity: DEFAULT_FACE_SWAP_SOURCE_SIMILARITY,
          faceSwapDoRisk: DEFAULT_FACE_SWAP_DO_RISK,
          faceSwapFaceType: DEFAULT_FACE_SWAP_FACE_TYPE,
          faceSwapSourceLocation: DEFAULT_FACE_SWAP_SOURCE_LOCATION,
          faceSwapTemplateLocation: DEFAULT_FACE_SWAP_TEMPLATE_LOCATION,
          faceSwapReturnUrl: DEFAULT_FACE_SWAP_RETURN_URL,
          faceSwapAddLogo: DEFAULT_FACE_SWAP_ADD_LOGO,
          faceSwapLogoPosition: DEFAULT_FACE_SWAP_LOGO_POSITION,
          faceSwapLogoLanguage: DEFAULT_FACE_SWAP_LOGO_LANGUAGE,
          faceSwapLogoOpacity: DEFAULT_FACE_SWAP_LOGO_OPACITY,
          seedEditScale: DEFAULT_SEEDEDIT_SCALE,
          seedEditSeedMode: DEFAULT_SEEDEDIT_SEED_MODE,
          seedEditSeed: DEFAULT_SEEDEDIT_SEED,
        }}
      >
        <div className="deepfake-mode-fields">
          <Form.Item label="功能选择" name="function" rules={[{ required: true, message: "请选择功能" }]}>
            <Radio.Group
              className="deepfake-function-tabs"
              onChange={(event) => {
                const nextFunctionType = event.target.value as TDeepfakeFunction;
                setFunctionType(nextFunctionType);
                form.setFieldsValue({ model: DEEPFAKE_MODEL_OPTIONS[nextFunctionType][DEFAULT_MODEL_OPTION_INDEX] });
              }}
            >
              {DEEPFAKE_FUNCTION_OPTIONS.map((option) => {
                const meta = DEEPFAKE_FUNCTION_META[option.value];

                return (
                  <Radio.Button key={option.value} value={option.value}>
                    <span className="deepfake-function-option">
                      <span className="deepfake-function-icon">{meta.icon}</span>
                      <span className="deepfake-function-copy">
                        <span className="deepfake-function-title">{DEEPFAKE_FUNCTION_LABELS[option.value]}</span>
                        <span className="deepfake-function-description">{meta.description}</span>
                      </span>
                    </span>
                  </Radio.Button>
                );
              })}
            </Radio.Group>
          </Form.Item>
        </div>

        <div className="deepfake-upload-fields">
          <Form.Item
            label="上传目标人脸图片"
            name="target"
            rules={targetImageRules}
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
              rules={sourceImageRules}
              tooltip={{
                title: "提供替换人脸的源图像：其人脸身份与外观将迁移并融合至目标图的人脸区域",
                placement: "right",
              }}
            >
              <ImageUploadField fileList={sourceFile} setFileList={setSourceFile} onPreview={onPreview} />
            </Form.Item>
          )}
        </div>

        <div className="deepfake-config-guide">
          {functionType === "faceswap" ? (
            <FaceSwapModelIntroCard selectedModel={selectedModel} />
          ) : (
            <DeepfakeCapabilityIntroCard functionType={functionType} />
          )}
        </div>

        <div className="deepfake-model-fields">
          <Form.Item label="选择模型" name="model" rules={[{ required: true, message: "请选择模型" }]}>
            <Select disabled={isModelSelectDisabled}>
              {modelOptions.map((model) => (
                <Select.Option key={model} value={model}>
                  {model}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </div>

        {isFaceSwap && (
          <div className="faceswap-advanced-fields">
            <Form.Item
              className="faceswap-similarity-field"
              label="人脸相似度"
              tooltip={{
                title: "对应 source_similarity：0 保留模板脸部特征，1 最大化贴近输入人脸特征",
                placement: "right",
              }}
            >
              <Form.Item name="faceSwapSourceSimilarity" noStyle>
                <Slider
                  min={MIN_FACE_SWAP_SOURCE_SIMILARITY}
                  max={MAX_FACE_SWAP_SOURCE_SIMILARITY}
                  step={FACE_SWAP_SOURCE_SIMILARITY_STEP}
                  tooltip={{ formatter: (value) => `${Math.round((value || 0) * 100)}%` }}
                />
              </Form.Item>
              <div className="faceswap-slider-scale">
                <span>模板特征</span>
                <span>均衡</span>
                <span>输入脸特征</span>
              </div>
            </Form.Item>

            {!isFaceSwapV36 && (
              <Form.Item
                label="内容审核"
                name="faceSwapDoRisk"
                valuePropName="checked"
                tooltip={{
                  title: "对应 FaceSwap 2.x 的 do_risk，仅开启时显式传入",
                  placement: "right",
                }}
              >
                <Switch checkedChildren="开启" unCheckedChildren="默认" />
              </Form.Item>
            )}

            {isFaceSwapV36 && (
              <>
                <Form.Item
                  label="选脸方式"
                  name="faceSwapFaceType"
                  tooltip={{
                    title: "对应 face_type：当图中有多人脸时按面积、横向或纵向排序选取",
                    placement: "right",
                  }}
                >
                  <Radio.Group optionType="button" buttonStyle="solid">
                    {FACE_SWAP_FACE_TYPE_OPTIONS.map((option) => (
                      <Radio.Button key={option.value} value={option.value}>
                        {option.label}
                      </Radio.Button>
                    ))}
                  </Radio.Group>
                </Form.Item>

                <div className="faceswap-face-index-fields">
                  <Form.Item label="驱动脸序号" name="faceSwapSourceLocation">
                    <InputNumber min={MIN_FACE_SWAP_LOCATION} max={MAX_FACE_SWAP_LOCATION} precision={0} controls />
                  </Form.Item>

                  <Form.Item label="目标脸序号" name="faceSwapTemplateLocation">
                    <InputNumber min={MIN_FACE_SWAP_LOCATION} max={MAX_FACE_SWAP_LOCATION} precision={0} controls />
                  </Form.Item>
                </div>

                <Form.Item
                  label="返回链接"
                  name="faceSwapReturnUrl"
                  valuePropName="checked"
                  tooltip={{
                    title: "对应 return_url，链接有效期 24 小时；关闭时仍返回 Base64 图片",
                    placement: "right",
                  }}
                >
                  <Switch checkedChildren="URL" unCheckedChildren="Base64" />
                </Form.Item>

                <Form.Item
                  label="明水印"
                  name="faceSwapAddLogo"
                  valuePropName="checked"
                  tooltip={{
                    title: "对应 logo_info.add_logo，默认不添加明水印",
                    placement: "right",
                  }}
                >
                  <Switch
                    checkedChildren="添加"
                    unCheckedChildren="不添加"
                    onChange={(checked) => {
                      if (!checked) return;
                      const values = form.getFieldsValue();
                      form.setFieldsValue({
                        faceSwapLogoPosition: values.faceSwapLogoPosition || DEFAULT_FACE_SWAP_LOGO_POSITION,
                        faceSwapLogoLanguage: values.faceSwapLogoLanguage || DEFAULT_FACE_SWAP_LOGO_LANGUAGE,
                        faceSwapLogoOpacity:
                          typeof values.faceSwapLogoOpacity === "number"
                            ? values.faceSwapLogoOpacity
                            : DEFAULT_FACE_SWAP_LOGO_OPACITY,
                      });
                    }}
                  />
                </Form.Item>

                {faceSwapAddLogo && (
                  <div className="faceswap-logo-fields">
                    <Form.Item label="水印位置" name="faceSwapLogoPosition">
                      <Select>
                        {FACE_SWAP_LOGO_POSITION_OPTIONS.map((option) => (
                          <Select.Option key={option.value} value={option.value}>
                            {option.label}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>

                    <Form.Item label="水印语言" name="faceSwapLogoLanguage">
                      <Radio.Group optionType="button" buttonStyle="solid">
                        {FACE_SWAP_LOGO_LANGUAGE_OPTIONS.map((option) => (
                          <Radio.Button key={option.value} value={option.value}>
                            {option.label}
                          </Radio.Button>
                        ))}
                      </Radio.Group>
                    </Form.Item>

                    <Form.Item label="不透明度" name="faceSwapLogoOpacity">
                      <Slider
                        min={MIN_FACE_SWAP_LOGO_OPACITY}
                        max={MAX_FACE_SWAP_LOGO_OPACITY}
                        step={FACE_SWAP_LOGO_OPACITY_STEP}
                      />
                    </Form.Item>

                    <Form.Item label="自定义文案" name="faceSwapLogoText">
                      <Input placeholder="AI生成" maxLength={FACE_SWAP_LOGO_TEXT_MAX_LENGTH} />
                    </Form.Item>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {functionType !== "faceswap" && (
          <div className="deepfake-prompt-fields">
            {functionType === "fomm" && (
              <Form.Item
                label="动作描述"
                name="fommPrompt"
                rules={[{ required: true, whitespace: true, message: "请输入动作描述" }]}
                tooltip={{
                  title: "描述希望人脸做的动作，如：微笑、点头、说话",
                  placement: "right",
                }}
              >
                <TextArea
                  rows={SHORT_TEXTAREA_ROWS}
                  placeholder={FACE_ANIMATION_DEFAULT_PROMPT}
                  maxLength={FACE_ANIMATION_PROMPT_MAX_LENGTH}
                  showCount
                />
              </Form.Item>
            )}

            {functionType === "stargan" && (
              <Form.Item
                label="编辑指令"
                name="editPrompt"
                rules={[{ required: true, whitespace: true, message: "请输入编辑指令" }]}
                tooltip={{
                  title: "用自然语言描述要对图片做的修改，如：把头发改成红色、加一副眼镜、换成微笑表情",
                  placement: "right",
                }}
              >
                <TextArea
                  rows={MEDIUM_TEXTAREA_ROWS}
                  placeholder={ATTRIBUTE_EDIT_PROMPT_PLACEHOLDER}
                  maxLength={PROMPT_MAX_LENGTH}
                  showCount
                />
              </Form.Item>
            )}
          </div>
        )}

        {functionType === "stargan" && (
          <div className="seededit-advanced-fields">
            <Form.Item
              label="编辑强度"
              name="seedEditScale"
              tooltip={{
                title: "对应 SeedEdit 的 scale：数值越大越服从文字指令，原图约束越弱",
                placement: "right",
              }}
            >
              <Slider
                min={MIN_SEEDEDIT_SCALE}
                max={MAX_SEEDEDIT_SCALE}
                step={SEEDEDIT_SCALE_STEP}
                marks={{
                  [MIN_SEEDEDIT_SCALE]: "保守",
                  [DEFAULT_SEEDEDIT_SCALE]: "均衡",
                  [MAX_SEEDEDIT_SCALE]: "强改",
                }}
              />
            </Form.Item>

            <div className="seededit-seed-row">
              <Form.Item
                label="随机种子"
                name="seedEditSeedMode"
                tooltip={{
                  title: "随机生成适合探索效果；固定复现会在其他参数一致时尽量生成一致结果",
                  placement: "right",
                }}
              >
                <Radio.Group optionType="button" buttonStyle="solid">
                  {SEEDEDIT_SEED_MODE_OPTIONS.map((option) => (
                    <Radio.Button key={option.value} value={option.value}>
                      {option.label}
                    </Radio.Button>
                  ))}
                </Radio.Group>
              </Form.Item>

              {seedEditSeedMode === "fixed" && (
                <Form.Item label="Seed 值" name="seedEditSeed" rules={[{ required: true, message: "请输入固定种子" }]}>
                  <InputNumber
                    min={MIN_SEEDEDIT_SEED}
                    max={MAX_SEEDEDIT_SEED}
                    precision={0}
                    controls
                    className="seededit-seed-input"
                  />
                </Form.Item>
              )}
            </div>
          </div>
        )}
      </Form>
    </Card>
  );
};
