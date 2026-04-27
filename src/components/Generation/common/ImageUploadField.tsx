import { Upload } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import type { UploadFile } from "antd";

import { DEFAULT_IMAGE_UPLOAD_MAX_COUNT, EMPTY_UPLOAD_COUNT } from "@/constants/generate";
import { TINY_SPACE_SIZE } from "@/constants/ui";
import { createUploadFile, readBlobAsDataUrl } from "@/utils/media";

export interface IImageUploadFieldProps {
  fileList: UploadFile[];
  setFileList: (files: UploadFile[]) => void;
  onPreview: (file: UploadFile) => void;
  maxCount?: number;
  uploadText?: string;
  append?: boolean;
}

export const ImageUploadField = ({
  fileList,
  setFileList,
  onPreview,
  maxCount = DEFAULT_IMAGE_UPLOAD_MAX_COUNT,
  uploadText = "上传图片",
  append = false,
}: IImageUploadFieldProps) => {
  return (
    <Upload
      accept="image/jpeg,image/png,image/jpg"
      listType="picture-card"
      fileList={fileList}
      maxCount={maxCount}
      beforeUpload={(file) => {
        void readBlobAsDataUrl(file).then((dataUrl) => {
          const uploadFile = createUploadFile(file, dataUrl);
          setFileList(append ? [...fileList, uploadFile].slice(EMPTY_UPLOAD_COUNT, maxCount) : [uploadFile]);
        });
        return false;
      }}
      onRemove={(file) => {
        setFileList(fileList.filter((item) => item.uid !== file.uid));
      }}
      onPreview={onPreview}
    >
      {fileList.length < maxCount && (
        <div>
          <UploadOutlined />
          <div style={{ marginTop: TINY_SPACE_SIZE }}>{uploadText}</div>
        </div>
      )}
    </Upload>
  );
};
