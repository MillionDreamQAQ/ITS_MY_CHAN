import { Modal, Select, Button, Space, InputNumber, message } from "antd";
import { useState, useEffect } from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MenuOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import "./LevelSettingsModal.css";

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

const ChartConfigItem = ({ chart, index, onUpdate, onDelete, canDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chart.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`chart-config-item ${isDragging ? "dragging" : ""}`}
    >
      <Space style={{ width: "100%", justifyContent: "space-between" }}>
        <Space>
          <MenuOutlined
            {...attributes}
            {...listeners}
            className="drag-handle"
          />
          <span>图表 {index + 1}</span>
        </Space>
        <Space>
          <Select
            value={chart.klineType}
            options={KLINE_OPTIONS}
            style={{ width: 120 }}
            onChange={(value) => onUpdate({ ...chart, klineType: value })}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={onDelete}
            disabled={!canDelete}
          />
        </Space>
      </Space>
    </div>
  );
};

const LevelSettingsModal = ({ open, onClose, config, onSave }) => {
  const [localConfig, setLocalConfig] = useState(config);

  useEffect(() => {
    if (open) {
      setLocalConfig(config);
    }
  }, [open, config]);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = localConfig.charts.findIndex((c) => c.id === active.id);
      const newIndex = localConfig.charts.findIndex((c) => c.id === over.id);

      const newCharts = arrayMove(localConfig.charts, oldIndex, newIndex).map(
        (chart, index) => ({ ...chart, order: index })
      );

      setLocalConfig({ ...localConfig, charts: newCharts });
    }
  };

  const handleAddChart = () => {
    if (localConfig.charts.length >= 4) {
      message.warning("最多只能添加4个图表");
      return;
    }
    const newChart = {
      id: `chart-${Date.now()}`,
      klineType: "5m",
      order: localConfig.charts.length,
    };
    setLocalConfig({
      ...localConfig,
      charts: [...localConfig.charts, newChart],
    });
  };

  const handleDeleteChart = (id) => {
    if (localConfig.charts.length <= 2) {
      message.warning("至少需要保留2个图表");
      return;
    }
    const newCharts = localConfig.charts
      .filter((c) => c.id !== id)
      .map((c, index) => ({ ...c, order: index }));

    setLocalConfig({ ...localConfig, charts: newCharts });
  };

  const handleUpdateChart = (updatedChart) => {
    const newCharts = localConfig.charts.map((c) =>
      c.id === updatedChart.id ? updatedChart : c
    );
    setLocalConfig({ ...localConfig, charts: newCharts });
  };

  const handleHeightChange = (value) => {
    setLocalConfig({ ...localConfig, chartHeight: value });
  };

  const handleOk = () => {
    onSave(localConfig);
    onClose();
  };

  return (
    <Modal
      title="级别设置"
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      width={600}
      okText="确定"
      cancelText="取消"
    >
      <Space orientation="vertical" style={{ width: "100%" }} size="large">
        <div className="height-input-group">
          <Space.Compact style={{ display: "flex", alignItems: "center" }}>
            <span>图表高度：</span>
            <InputNumber
              value={localConfig.chartHeight}
              onChange={handleHeightChange}
              min={200}
              max={800}
              step={50}
              suffix="px"
              style={{ width: 120 }}
            />
          </Space.Compact>
        </div>

        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={localConfig.charts.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            {localConfig.charts.map((chart, index) => (
              <ChartConfigItem
                key={chart.id}
                chart={chart}
                index={index}
                onUpdate={handleUpdateChart}
                onDelete={() => handleDeleteChart(chart.id)}
                canDelete={localConfig.charts.length > 2}
              />
            ))}
          </SortableContext>
        </DndContext>

        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={handleAddChart}
          disabled={localConfig.charts.length >= 4}
          className="add-chart-btn"
        >
          添加图表 ({localConfig.charts.length}/4)
        </Button>
      </Space>
    </Modal>
  );
};

export default LevelSettingsModal;