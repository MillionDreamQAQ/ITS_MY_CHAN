import { Button } from "antd";
import { SearchOutlined, StarOutlined, StarFilled } from "@ant-design/icons";
import "./StockTitleBar.css";

/**
 * 股票标题栏组件
 * 显示股票名称、代码，提供搜索和收藏功能
 */
const StockTitleBar = ({
  stockName,
  stockCode,
  isFavorite,
  canSearch = true,
  onSearchClick,
  onToggleFavorite,
  darkMode,
}) => {
  return (
    <div className={`stock-title-bar ${darkMode ? "dark" : ""}`}>
      {canSearch && (
        <Button
          type="text"
          icon={<SearchOutlined />}
          onClick={onSearchClick}
          className="title-bar-btn search-btn"
          title="搜索股票 (Ctrl+F)"
          size="small"
        />
      )}
      <div
        className="stock-display"
        onClick={canSearch ? onSearchClick : undefined}
        style={{ cursor: canSearch ? "pointer" : "default" }}
      >
        {stockName && <span className="stock-name">{stockName}</span>}
        <span className="stock-code">{stockCode}</span>
      </div>
      <Button
        type="text"
        icon={isFavorite ? <StarFilled /> : <StarOutlined />}
        onClick={onToggleFavorite}
        className="title-bar-btn favorite-btn"
        title={isFavorite ? "取消收藏" : "收藏"}
        size="small"
        style={{
          color: isFavorite ? "#fadb14" : undefined,
        }}
      />
    </div>
  );
};

export default StockTitleBar;
