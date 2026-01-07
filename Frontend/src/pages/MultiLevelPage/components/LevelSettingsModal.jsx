import { Modal, Select, Form } from "antd";
import { useEffect } from "react";

const KLINE_OPTIONS = [
  { label: "月线", value: "month" },
  { label: "周线", value: "week" },
  { label: "日线", value: "day" },
  { label: "60分钟", value: "60m" },
  { label: "30分钟", value: "30m" },
  { label: "15分钟", value: "15m" },
  { label: "5分钟", value: "5m" },
  { label: "1分钟", value: "1m" },
];

const LevelSettingsModal = ({ open, onClose, levels, onSave }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      form.setFieldsValue(levels);
    }
  }, [open, levels, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onSave(values);
      onClose();
    } catch (error) {
      console.error("Validation failed:", error);
    }
  };

  return (
    <Modal
      title="级别设置"
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText="确定"
      cancelText="取消"
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="顶部图表（默认5分线）"
          name="top"
          rules={[{ required: true, message: "请选择顶部图表级别" }]}
        >
          <Select options={KLINE_OPTIONS} />
        </Form.Item>
        <Form.Item
          label="中间图表（默认30分线）"
          name="middle"
          rules={[{ required: true, message: "请选择中间图表级别" }]}
        >
          <Select options={KLINE_OPTIONS} />
        </Form.Item>
        <Form.Item
          label="底部图表（默认日线）"
          name="bottom"
          rules={[{ required: true, message: "请选择底部图表级别" }]}
        >
          <Select options={KLINE_OPTIONS} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default LevelSettingsModal;
