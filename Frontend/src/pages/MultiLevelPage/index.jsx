import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "antd";
import { SettingOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import ChartContainer from "../../components/ChartContainer";
import LevelSettingsModal from "./components/LevelSettingsModal";
import {
  useMultiLevelSync,
  useStockSearch,
} from "../../components/ChartContainer/hooks";
import { chanApi } from "../../services/api";
import { useTheme } from "../../contexts/ThemeContext";
import "./MultiLevelPage.css";

const DEFAULT_LEVELS = {
  top: "5m",
  middle: "30m",
  bottom: "day",
};

const DEFAULT_STOCK = "sh.000001";
const DEFAULT_LIMIT = 1000;

const MultiLevelPage = () => {
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode, messageApi } = useTheme();

  const [loading, setLoading] = useState(false);

  const [levels, setLevels] = useState(() => {
    const saved = localStorage.getItem("multiLevels");
    return saved ? JSON.parse(saved) : DEFAULT_LEVELS;
  });

  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem("favorites");
    return saved ? JSON.parse(saved) : [];
  });

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentStock, setCurrentStock] = useState(DEFAULT_STOCK);

  const [topData, setTopData] = useState(null);
  const [middleData, setMiddleData] = useState(null);
  const [bottomData, setBottomData] = useState(null);

  const topChartRef = useRef(null);
  const topSeriesRef = useRef(null);
  const topDataRef = useRef(null);

  const middleChartRef = useRef(null);
  const middleSeriesRef = useRef(null);
  const middleDataRef = useRef(null);

  const bottomChartRef = useRef(null);
  const bottomSeriesRef = useRef(null);
  const bottomDataRef = useRef(null);

  const chartRefs = useRef({
    top: topChartRef,
    middle: middleChartRef,
    bottom: bottomChartRef,
  });
  const seriesRefs = useRef({
    top: topSeriesRef,
    middle: middleSeriesRef,
    bottom: bottomSeriesRef,
  });
  const dataRefs = useRef({
    top: topDataRef,
    middle: middleDataRef,
    bottom: bottomDataRef,
  });

  const stockSearch = useStockSearch();

  useEffect(() => {
    localStorage.setItem("favorites", JSON.stringify(favorites));
  }, [favorites]);

  useMultiLevelSync(chartRefs, seriesRefs, dataRefs);

  const loadAllLevels = useCallback(async () => {
    showMessage(messageApi, "query", "info", "正在查询，请稍候...", 0);
    setLoading(true);
    try {
      const [topResult, middleResult, bottomResult] = await Promise.all([
        chanApi.calculateChan({
          code: currentStock,
          kline_type: levels.top,
          limit: DEFAULT_LIMIT,
        }),
        chanApi.calculateChan({
          code: currentStock,
          kline_type: levels.middle,
          limit: DEFAULT_LIMIT,
        }),
        chanApi.calculateChan({
          code: currentStock,
          kline_type: levels.bottom,
          limit: DEFAULT_LIMIT,
        }),
      ]);

      setTopData(topResult);
      setMiddleData(middleResult);
      setBottomData(bottomResult);
      showMessage(messageApi, "loadingData", "success", "数据加载成功！", 2);
    } catch (error) {
      messageApi.error("加载数据失败");
      console.error(error);
    } finally {
      messageApi.destroy("query");
      setLoading(false);
    }
  }, [currentStock, levels, messageApi]);

  useEffect(() => {
    loadAllLevels();
  }, [loadAllLevels]);

  const handleStockChange = useCallback((code) => {
    setCurrentStock(code);
  }, []);

  const handleSaveLevels = useCallback((newLevels) => {
    setLevels(newLevels);
    localStorage.setItem("multiLevels", JSON.stringify(newLevels));
  }, []);

  return (
    <>
      <div className="multi-level-page">
        <div className="multi-level-header">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/")}
          >
            返回主页
          </Button>
          <span className="page-title">多级别联立</span>
          <Button
            type="primary"
            icon={<SettingOutlined />}
            onClick={() => setSettingsOpen(true)}
          >
            级别设置
          </Button>
        </div>

        <div className="multi-level-content">
          <div className="chart-section top">
            <ChartContainer
              data={topData}
              darkMode={darkMode}
              favorites={favorites}
              showVolume={false}
              showSubChart={false}
              showTitle={true}
              showControl={false}
              showKlineInfo={false}
              stockSearch={stockSearch}
              chartRefOut={topChartRef}
              seriesRefOut={topSeriesRef}
              dataRefOut={topDataRef}
              currentStock={{
                code: currentStock,
                klineType: levels.top,
                limit: DEFAULT_LIMIT,
              }}
              onStockChange={handleStockChange}
            />
          </div>

          <div className="chart-section middle">
            <ChartContainer
              data={middleData}
              darkMode={darkMode}
              showVolume={false}
              showSubChart={false}
              showTitle={false}
              showControl={false}
              showKlineInfo={false}
              chartRefOut={middleChartRef}
              seriesRefOut={middleSeriesRef}
              dataRefOut={middleDataRef}
              currentStock={{
                code: currentStock,
                klineType: levels.middle,
                limit: DEFAULT_LIMIT,
              }}
            />
          </div>

          <div className="chart-section bottom">
            <ChartContainer
              data={bottomData}
              darkMode={darkMode}
              showVolume={false}
              showSubChart={false}
              showTitle={false}
              showControl={false}
              showKlineInfo={false}
              chartRefOut={bottomChartRef}
              seriesRefOut={bottomSeriesRef}
              dataRefOut={bottomDataRef}
              currentStock={{
                code: currentStock,
                klineType: levels.bottom,
                limit: DEFAULT_LIMIT,
              }}
            />
          </div>
        </div>

        <LevelSettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          levels={levels}
          onSave={handleSaveLevels}
        />
      </div>
    </>
  );
};

export default MultiLevelPage;
