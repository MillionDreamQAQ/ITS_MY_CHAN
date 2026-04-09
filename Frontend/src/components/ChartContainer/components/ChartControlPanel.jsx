import { useState, useEffect, useRef } from "react";
import { Button, DatePicker, InputNumber, Space } from "antd";
import { ReloadOutlined, FieldTimeOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import "./ChartControlPanel.css";

const KLINE_GROUPS = [
  { label: "月", value: "month" },
  { label: "周", value: "week" },
  { label: "日", value: "day" },
  { label: "60", value: "60m" },
  { label: "30", value: "30m" },
  { label: "15", value: "15m" },
  { label: "5", value: "5m" },
  { label: "1", value: "1m" },
];

/**
 * 图表控制面板组件
 * 包含 K线周期选择、K线数量输入和刷新按钮
 */
const ChartControlPanel = ({
  klineType,
  limit,
  replayDate,
  onKlineTypeChange,
  onLimitChange,
  onReplayDateChange,
  onRefresh,
  darkMode,
  canEditLevel = true,
  canEditLength = true,
}) => {
  const [localLimit, setLocalLimit] = useState(limit);
  const [localReplayDate, setLocalReplayDate] = useState(
    replayDate ? dayjs(replayDate) : null
  );
  const timerRef = useRef(null);

  useEffect(() => {
    setLocalLimit(limit);
  }, [limit]);

  useEffect(() => {
    setLocalReplayDate(replayDate ? dayjs(replayDate) : null);
  }, [replayDate]);

  const handleLocalLimitChange = (value) => {
    setLocalLimit(value);
    if (value) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        onLimitChange(value);
      }, 1000);
    }
  };

  const handleReplayDateChange = (date) => {
    setLocalReplayDate(date);
    if (date) {
      onReplayDateChange?.(date.format("YYYY-MM-DD HH:mm"));
    }
  };

  return (
    <div className={`chart-control-panel ${darkMode ? "dark" : ""}`}>
      <div className="kline-buttons">
        <Space.Compact>
          {KLINE_GROUPS.map((item) => (
            <Button
              key={item.value}
              type={klineType === item.value ? "primary" : "default"}
              size="medium"
              style={{ width: 32 }}
              disabled={klineType === item.value ? false : !canEditLevel}
              onClick={() => canEditLevel && onKlineTypeChange(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </Space.Compact>
      </div>
      {canEditLength && (
        <InputNumber
          value={localLimit}
          onChange={handleLocalLimitChange}
          placeholder="数据条数"
          changeOnWheel={true}
          step={1000}
          min={1000}
          max={20000}
          size="medium"
          className="limit-input"
        />
      )}
      {canEditLength && (
        <Button
          type="default"
          icon={<ReloadOutlined />}
          onClick={onRefresh}
          className="refresh-button"
          title="刷新数据"
          size="medium"
        />
      )}
      {canEditLength && (
        <Button
          type={replayDate ? "primary" : "default"}
          icon={<FieldTimeOutlined />}
          onClick={() => onReplayDateChange?.(replayDate ? null : dayjs().subtract(1, "day").format("YYYY-MM-DD HH:mm"))}
          className="replay-toggle-button"
          title={replayDate ? "关闭回放模式" : "开启回放模式"}
          size="medium"
        />
      )}
      {replayDate && (
        <DatePicker
          showTime
          value={localReplayDate}
          onChange={handleReplayDateChange}
          placeholder="选择回放时间"
          size="medium"
          className="replay-date-picker"
          allowClear={false}
        />
      )}
    </div>
  );
};

export default ChartControlPanel;
