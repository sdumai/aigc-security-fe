import { Modal } from "antd";

import { FULL_WIDTH, IMAGE_PREVIEW_MODAL_WIDTH, MODAL_MAX_WIDTH } from "@/constants/ui";

export interface IImagePreviewModalProps {
  open: boolean;
  imageUrl: string;
  onClose: () => void;
}

export const ImagePreviewModal = ({ open, imageUrl, onClose }: IImagePreviewModalProps) => {
  return (
    <Modal
      title="预览"
      open={open}
      footer={null}
      onCancel={onClose}
      width={IMAGE_PREVIEW_MODAL_WIDTH}
      style={{ maxWidth: MODAL_MAX_WIDTH }}
      centered
    >
      {imageUrl && <img src={imageUrl} alt="预览" style={{ width: FULL_WIDTH, display: "block" }} />}
    </Modal>
  );
};
