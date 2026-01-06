import React, { useMemo } from "react";
import { Table, Tag, Empty, Button, Space, message } from "antd";
import { FileExcelOutlined, EyeOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { BUY_TYPE_COLORS, SELL_TYPE_COLORS } from "../../utils/utils";
import "./ResultPanel.css";

/**
 * 扫描结果面板
 */
const ResultPanel = ({
  results = [],
  loading = false,
  onSelectStock,
  taskStatus,
  onViewAllResults,
  viewingAll = false,
  allResultsData = null,
}) => {
  const nameFilters = useMemo(() => {
    const names = [...new Set(results.map((r) => r.name))];
    return names.map((n) => ({ text: n, value: n }));
  }, [results]);

  const bspTypeFilters = useMemo(() => {
    const typeSet = new Set();
    results.forEach((r) => {
      r.bsp_type.forEach((type) => {
        const key = `${r.is_buy ? "买" : "卖"}${type.toUpperCase()}`;
        const value = `${r.is_buy ? "buy" : "sell"}-${type}`;
        typeSet.add(JSON.stringify({ text: key, value }));
      });
    });
    return Array.from(typeSet).map((item) => JSON.parse(item));
  }, [results]);

  const handleExportExcel = () => {
    if (!results || results.length === 0) {
      message.warning("暂无数据可导出");
      return;
    }

    try {
      const wb = XLSX.utils.book_new();

      if (viewingAll && allResultsData && allResultsData.tasks) {
        const tasksData = allResultsData.tasks.map((task, index) => ({
          序号: index + 1,
          任务ID: task.id.substring(0, 8) + "...",
          创建时间: task.created_at,
          状态: task.status,
          股票池: task.stock_pool,
          板块: task.boards ? task.boards.join(", ") : "-",
          K线级别: task.kline_type,
          买点类型: task.buy_types.join(", "),
          卖点类型: task.sell_types.join(", "),
          "时间窗口(天)": task.time_window_days,
          找到买卖点数: task.found_count,
          "耗时(秒)": task.elapsed_time.toFixed(2),
        }));

        const ws1 = XLSX.utils.json_to_sheet(tasksData);
        ws1["!cols"] = [
          { wch: 6 },
          { wch: 15 },
          { wch: 20 },
          { wch: 10 },
          { wch: 10 },
          { wch: 20 },
          { wch: 10 },
          { wch: 15 },
          { wch: 12 },
          { wch: 12 },
          { wch: 12 },
        ];
        XLSX.utils.book_append_sheet(wb, ws1, "任务信息");
      }

      const resultsData = results.map((item, index) => ({
        序号: index + 1,
        股票代码: item.code,
        股票名称: item.name || "-",
        类型: item.is_buy
          ? "买" + item.bsp_type.join(",").toUpperCase()
          : "卖" + item.bsp_type.join(",").toUpperCase(),
        时间: item.bsp_time,
        价格: item.bsp_value.toFixed(2),
        K线级别: item.kline_type,
        ...(viewingAll && {
          任务ID: item.task_id?.substring(0, 8) + "..." || "-",
        }),
      }));

      const ws2 = XLSX.utils.json_to_sheet(resultsData);
      const cols = [
        { wch: 6 },
        { wch: 12 },
        { wch: 12 },
        { wch: 10 },
        { wch: 20 },
        { wch: 10 },
        { wch: 10 },
      ];
      if (viewingAll) cols.push({ wch: 15 });
      ws2["!cols"] = cols;

      XLSX.utils.book_append_sheet(wb, ws2, "扫描结果");

      const timestamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:-]/g, "")
        .replace("T", "_");
      const filename = viewingAll
        ? `扫描结果汇总_${timestamp}.xlsx`
        : `扫描结果_${timestamp}.xlsx`;

      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], { type: "application/octet-stream" });
      saveAs(blob, filename);

      message.success(`已导出 ${results.length} 条结果`);
    } catch (error) {
      console.error("导出Excel失败:", error);
      message.error("导出Excel失败，请重试");
    }
  };

  const columns = [
    {
      title: "代码",
      dataIndex: "code",
      key: "code",
      width: 100,
      sorter: (a, b) => a.code.localeCompare(b.code),
    },
    {
      title: "名称",
      dataIndex: "name",
      key: "name",
      width: 100,
      ellipsis: true,
      filters: nameFilters,
      onFilter: (value, record) => record.name.includes(value),
    },
    {
      title: "买卖点类型",
      dataIndex: "bsp_type",
      key: "bsp_type",
      width: 120,
      filters: bspTypeFilters,
      onFilter: (value, record) => {
        const [isBuy, type] = value.split("-");
        return (
          record.is_buy === (isBuy === "buy") && record.bsp_type.includes(type)
        );
      },
      render: (types, record) => (
        <>
          {types.map((type) =>
            record.is_buy ? (
              <Tag
                key={type}
                color={BUY_TYPE_COLORS[type]}
                style={{ marginBottom: 4, marginRight: 4 }}
              >
                买{type.toUpperCase()}
              </Tag>
            ) : (
              <Tag
                key={type}
                color={SELL_TYPE_COLORS[type]}
                style={{ marginBottom: 4, marginRight: 4 }}
              >
                卖{type.toUpperCase()}
              </Tag>
            )
          )}
        </>
      ),
    },
    {
      title: "时间",
      dataIndex: "bsp_time",
      key: "bsp_time",
      width: 140,
      sorter: (a, b) => a.bsp_time.localeCompare(b.bsp_time),
    },
    {
      title: "价格",
      dataIndex: "bsp_value",
      key: "bsp_value",
      width: 80,
      align: "left",
      sorter: (a, b) => a.bsp_value - b.bsp_value,
      render: (value) => value.toFixed(2) + " 元",
      defaultSortOrder: "descend",
    },
    {
      title: "K线级别",
      dataIndex: "kline_type",
      key: "kline_type",
      width: 80,
      render: (value) => {
        switch (value) {
          case "day":
            return "日线";
          case "week":
            return "周线";
          case "month":
            return "月线";
          case "hour":
            return "小时线";
          case "minute1":
            return "1分钟线";
          case "minute5":
            return "5分钟线";
          case "minute15":
            return "15分钟线";
          case "minute30":
            return "30分钟线";
          default:
            return value;
        }
      },
    },
  ];

  if (!results.length && !loading) {
    return (
      <div className="result-panel empty">
        <Empty
          description={
            taskStatus
              ? taskStatus === "running"
                ? "扫描进行中..."
                : "未找到符合条件的买卖点"
              : "请选择一个任务查看结果"
          }
        />
      </div>
    );
  }

  return (
    <div className="result-panel">
      <div className="result-header">
        <span className="result-title">
          {viewingAll ? "所有任务扫描结果" : "当前扫描结果"}
        </span>
        <Space size="small">
          {!viewingAll && (
            <Button
              type="primary"
              size="small"
              icon={<EyeOutlined />}
              onClick={onViewAllResults}
            >
              查看所有结果
            </Button>
          )}
          <Button
            type="primary"
            size="small"
            icon={<FileExcelOutlined />}
            onClick={handleExportExcel}
            disabled={!results || results.length === 0}
          >
            导出Excel
          </Button>
        </Space>
      </div>
      <div className="result-body">
        <Table
          columns={columns}
          dataSource={results}
          rowKey={(record) =>
            `${record.code}-${record.bsp_time}-${record.bsp_type.join("-")}`
          }
          size="small"
          loading={loading}
          pagination={{
            pageSize: 50,
            showSizeChanger: false,
            size: "small",
            showTotal: (total) => `共 ${total} 条`,
          }}
          onRow={(record) => ({
            onClick: () => onSelectStock?.(record),
            style: { cursor: "pointer" },
          })}
        />
      </div>
    </div>
  );
};

export default ResultPanel;
